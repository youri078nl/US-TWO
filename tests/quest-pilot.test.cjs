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
 const elements={};const ids=['quest-pilot-refresh','quest-pilot-start','quest-pilot-sync','quest-pilot-status','quest-pilot-pending','quest-pilot-message'];
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
 console.log('Web pilot checks:',passed+'/6 passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
