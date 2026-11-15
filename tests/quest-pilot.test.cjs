'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {indexedDB}=require('fake-indexeddb');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const bundle=fs.readFileSync('us-two-offline.js','utf8');
const pilot=fs.readFileSync('quest-pilot.js','utf8');
let passed=0;const check=(name,fn)=>{fn();console.log('PASS',name);passed++;};
check('staging markup and scripts are referenced',()=>{
 assert.match(html,/id="quest-pilot"/);
 assert.match(html,/src="\.\/us-two-offline\.js"/);
 assert.match(html,/src="\.\/quest-pilot\.js"/);
 assert.match(sw,/us-two-offline\.js/);assert.match(sw,/quest-pilot\.js/);
});
check('bridge reuses authenticated, refreshing app RPC',()=>{
 assert.match(app,/USTwoQuestPilotBridge/);
 assert.match(app,/read:\s*\(\)\s*=>\s*rpc\('us_quest_state'\)/);
});
function setup(name) {
 const elements={};const ids=['quest-pilot-refresh','quest-pilot-start','quest-pilot-sync','quest-pilot-status','quest-pilot-pending','quest-pilot-message','quest-pilot-task','quest-pilot-accept','quest-pilot-reject','quest-pilot-cancel','quest-pilot-complete','quest-pilot-skip'];
 for(const id of ids)elements[id]={disabled:false,textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};
 const doc={readyState:'complete',getElementById:id=>elements[id]||null};
 const ctx={console,document:doc,indexedDB,crypto:require('node:crypto').webcrypto};
 ctx.globalThis=ctx;ctx.window=ctx;
 ctx.navigator={locks:{request:async(_key,_options,fn)=>fn()}};
 ctx.confirm=()=>true;
 const v={paired:true,userId:'00000000-0000-4000-8000-000000000001',coupleId:'00000000-0000-4000-8000-000000000002'};
 let server={paired:true,initialized:false,revision:0,position:0,phase:'choose'};
 let error=false,calls=[];
 ctx.USTwoQuestPilotBridge={
   identity:()=>v,
   read:async()=>({...server}),
   call:async(name,args)=>{
     calls.push({name,args});
     if(error)return {data:null,error:{code:'',message:'network_error'}};
     if(name==='us_quest_action'&&args.p_action==='start'&&!server.initialized)
       server={...server,initialized:true};
     if(name==='us_quest_action'&&args.p_action!=='start')
       server={...server,revision:server.revision+1,
         ...(args.p_action==='accept'?{phase:'active'}:{}),
         ...(args.p_action==='reject'||args.p_action==='cancel'?{phase:'choose'}:{}),
         ...(args.p_action==='complete'?{my_done:true}:{}),
         ...(args.p_action==='skip'?{my_skip:true}:{})};
     return {data:{...server},error:null};
   }
 };
 vm.createContext(ctx);vm.runInContext(bundle,ctx);vm.runInContext(pilot,ctx);
 return {elements,v,ctx,calls,setError:x=>error=x,setServer:x=>server=x,
   click:async id=>elements[id].handlers.click()};
}
async function main(){
 const demo=setup('one');
 await demo.click('quest-pilot-refresh');
 assert.match(demo.elements['quest-pilot-status'].textContent,/vak 0/);
 assert.equal(demo.elements['quest-pilot-refresh'].disabled,false);
 console.log('PASS authenticated quest state is readable');passed++;
 await demo.click('quest-pilot-start');
 assert.equal(demo.calls.length,1);
 assert.equal(demo.calls[0].name,'us_quest_action');
 assert.equal(demo.calls[0].args.p_expected_revision,0);
 assert.match(demo.elements['quest-pilot-status'].textContent,/status: choose/);
 assert.match(demo.elements['quest-pilot-pending'].textContent,/Wachtende acties: 0/);
 console.log('PASS start goes through persistent outbox to quest RPC');passed++;
 const offline=setup('two');offline.setError(true);
 await offline.click('quest-pilot-refresh');
 await offline.click('quest-pilot-start');
 assert.match(offline.elements['quest-pilot-pending'].textContent,/Wachtende acties: 1/);
 const firstId=offline.calls[0].args.p_request_id;
 assert.equal(offline.elements['quest-pilot-refresh'].disabled,false);
 offline.setError(false);
 await offline.click('quest-pilot-sync');
 assert.equal(offline.calls.length,2);
 assert.equal(offline.calls[1].args.p_request_id,firstId);
 assert.match(offline.elements['quest-pilot-pending'].textContent,/Wachtende acties: 0/);
 console.log('PASS offline retry preserves original request ID');passed++;
 const unpaired=setup('three');unpaired.v.paired=false;
 await unpaired.click('quest-pilot-refresh');
 assert.match(unpaired.elements['quest-pilot-message'].textContent,/gekoppeld account/);
 assert.equal(unpaired.elements['quest-pilot-refresh'].disabled,false);
 assert.equal(unpaired.calls.length,0);
 console.log('PASS unpaired client cannot send mutations');passed++;
 const myId='00000000-0000-4000-8000-000000000001';
 const otherId='00000000-0000-4000-8000-000000000003';
 const accepted=setup('accepted');
 accepted.setServer({paired:true,initialized:true,revision:7,position:12,phase:'approval',proposer_id:otherId,date:{title:'Wandeling',steps:3},mode:'samen'});
 await accepted.click('quest-pilot-refresh');
 assert.equal(accepted.elements['quest-pilot-accept'].disabled,false);
 assert.equal(accepted.elements['quest-pilot-cancel'].disabled,true);
 assert.match(accepted.elements['quest-pilot-task'].textContent,/Wandeling/);
 await accepted.click('quest-pilot-accept');
 assert.equal(accepted.calls[0].args.p_action,'accept');
 assert.equal(accepted.calls[0].args.p_expected_revision,7);
 assert.equal(accepted.elements['quest-pilot-complete'].disabled,false);
 console.log('PASS partner accepts proposal using canonical revision');passed++;
 const own=setup('own');
 own.setServer({paired:true,initialized:true,revision:3,position:6,phase:'approval',proposer_id:myId});
 await own.click('quest-pilot-refresh');
 assert.equal(own.elements['quest-pilot-accept'].disabled,true);
 assert.equal(own.elements['quest-pilot-cancel'].disabled,false);
 await own.click('quest-pilot-accept');
 assert.equal(own.calls.length,0);
 assert.match(own.elements['quest-pilot-message'].textContent,/niet toegestaan/);
 console.log('PASS proposer cannot accept own proposal');passed++;
 const finished=setup('finished');
 finished.setServer({paired:true,initialized:true,revision:9,position:8,phase:'active',my_done:false,my_skip:false,partner_skip:false,date:{title:'Koken',steps:4}});
 await finished.click('quest-pilot-refresh');
 await finished.click('quest-pilot-complete');
 assert.equal(finished.calls.length,1);
 assert.equal(finished.calls[0].args.p_action,'complete');
 assert.equal(finished.elements['quest-pilot-complete'].disabled,true);
 await finished.click('quest-pilot-complete');
 assert.equal(finished.calls.length,1);
 console.log('PASS completion confirmation cannot be sent twice');passed++;
 const skip=setup('skip');
 skip.setServer({paired:true,initialized:true,revision:11,position:8,phase:'active',my_done:false,my_skip:false,partner_skip:false});
 await skip.click('quest-pilot-refresh');
 await skip.click('quest-pilot-skip');
 assert.equal(skip.calls[0].args.p_action,'skip');
 assert.equal(skip.elements['quest-pilot-skip'].disabled,true);
 assert.equal(skip.elements['quest-pilot-complete'].disabled,true);
 console.log('PASS skip disables incompatible completion');passed++;
 console.log('Web pilot checks:',passed+'/10 passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
