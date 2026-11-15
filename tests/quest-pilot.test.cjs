'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {indexedDB}=require('fake-indexeddb');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const bundle=fs.readFileSync('us-two-offline.js','utf8');
const pilot=fs.readFileSync('quest-pilot.js','utf8');
const catalogScript=fs.readFileSync('quest-catalog.js','utf8');
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
 const elements={};const ids=['quest-pilot-refresh','quest-pilot-start','quest-pilot-sync','quest-pilot-status','quest-pilot-pending','quest-pilot-message','quest-pilot-conflict','quest-pilot-resolve','quest-pilot-network','quest-pilot-task','quest-pilot-instructions','quest-pilot-accept','quest-pilot-reject','quest-pilot-cancel','quest-pilot-complete','quest-pilot-skip','quest-pilot-super-status','quest-pilot-super-consent','quest-pilot-super-timing','quest-pilot-super-prep','quest-pilot-super-finale','quest-pilot-super-ready','quest-pilot-super-reveal','quest-pilot-super-done','quest-pilot-super-skip','quest-pilot-mode','quest-pilot-budget','quest-pilot-load-catalog','quest-pilot-option-0','quest-pilot-option-1','quest-pilot-option-2'];
 for(const id of ids)elements[id]={disabled:false,textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};
 elements['quest-pilot-mode'].value='samen';
 elements['quest-pilot-budget'].value='0';
 const doc={readyState:'complete',getElementById:id=>elements[id]||null};
 const events={};
 const ctx={console,document:doc,indexedDB,crypto:require('node:crypto').webcrypto};
 ctx.addEventListener=(name,fn)=>{events[name]=fn;};
 ctx.globalThis=ctx;ctx.window=ctx;
 ctx.navigator={onLine:true,locks:{request:async(_key,_options,fn)=>fn()}};
 ctx.confirm=()=>true;
 const v={paired:true,userId:'00000000-0000-4000-8000-000000000001',coupleId:'00000000-0000-4000-8000-000000000002'};
 let server={paired:true,initialized:false,revision:0,position:0,phase:'choose'};
 let error=false,conflict=false,calls=[],superdates=[],catalog=[];
 ctx.USTwoQuestPilotBridge={
   identity:()=>v,
   read:async()=>({...server}),
   readSuper:async()=>superdates.map(x=>({...x})),
   catalog:async()=>catalog.map(x=>({...x})),
   call:async(name,args)=>{
     calls.push({name,args});
     if(error)return {data:null,error:{code:'',message:'network_error'}};
     if(conflict)return {data:null,error:{code:'40001',message:'stale_revision'}};
     if(name==='us_quest_action'&&args.p_action==='start'&&!server.initialized)
       server={...server,initialized:true};
     if(name==='us_quest_super_action') {
       superdates=superdates.map(x=>x.cell===args.p_cell?{
         ...x,revision:x.revision+1,
         ...(args.p_action==='ready'?{my_ready:true}:{}),
         ...(args.p_action==='reveal'?{my_reveal:true}:{}),
         ...(args.p_action==='done'?{my_done:true}:{}),
         ...(args.p_action==='skip'?{my_skip:true}:{})
       }:x);
     }
     if(name==='us_quest_action'&&args.p_action!=='start')
       server={...server,revision:server.revision+1,
         ...(args.p_action==='accept'?{phase:'active'}:{}),
         ...(args.p_action==='propose'?{phase:'approval',proposer_id:v.userId}:{}),
         ...(args.p_action==='reject'||args.p_action==='cancel'?{phase:'choose'}:{}),
         ...(args.p_action==='complete'?{my_done:true}:{}),
         ...(args.p_action==='skip'?{my_skip:true}:{})};
     return {data:{...server},error:null};
   }
 };
 vm.createContext(ctx);vm.runInContext(bundle,ctx);vm.runInContext(catalogScript,ctx);vm.runInContext(pilot,ctx);
 return {elements,v,ctx,calls,setError:x=>error=x,setConflict:x=>conflict=x,setServer:x=>server=x,
   click:async id=>elements[id].handlers.click(),setSuper:x=>superdates=x,setCatalog:x=>catalog=x,
   emit:name=>events[name]?.(),setOnline:online=>{ctx.navigator.onLine=online;events[online?'online':'offline']?.();}};
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
 const superTest=setup('super');
 superTest.setSuper([{cell:20,title:'Geheime superdate',revision:2,status:'preparing',
   my_prep:'Mijn eigen geheime opdracht',partner_ready:false,my_ready:false,can_reveal:false,
   prep_a:'NIET TONEN PARTNER',prep_b:'OOK NIET TONEN',finale_remote:'VERBODEN FINALE'}]);
 await superTest.click('quest-pilot-refresh');
 assert.match(superTest.elements['quest-pilot-super-prep'].textContent,/Mijn eigen geheime opdracht/);
 assert.doesNotMatch(superTest.elements['quest-pilot-super-prep'].textContent,/NIET TONEN/);
 assert.doesNotMatch(superTest.elements['quest-pilot-super-finale'].textContent,/VERBODEN FINALE/);
 assert.equal(superTest.elements['quest-pilot-super-reveal'].disabled,true);
 console.log('PASS show own preparation without leaking partner prep or locked finale');passed++;
 await superTest.click('quest-pilot-super-ready');
 assert.equal(superTest.calls[0].name,'us_quest_super_action');
 assert.equal(superTest.calls[0].args.p_cell,20);
 assert.equal(superTest.calls[0].args.p_expected_revision,2);
 assert.equal(superTest.elements['quest-pilot-super-ready'].disabled,true);
 console.log('PASS ready action uses independent superdate revision');passed++;
 const reveal=setup('reveal');
 reveal.setSuper([{cell:40,title:'Samen',revision:5,status:'preparing',my_ready:true,partner_ready:true,
   my_reveal:false,can_reveal:true,my_skip:false,partner_skip:false,finale_together:'NIET OPEN'}]);
 await reveal.click('quest-pilot-refresh');
 assert.equal(reveal.elements['quest-pilot-super-reveal'].disabled,false);
 await reveal.click('quest-pilot-super-reveal');
 assert.equal(reveal.calls[0].args.p_action,'reveal');
 assert.doesNotMatch(reveal.elements['quest-pilot-super-finale'].textContent,/NIET OPEN/);
 console.log('PASS reveal requires and records explicit consent while finale is hidden');passed++;
 const end=setup('superdone');
 end.setSuper([{cell:60,title:'Finale',revision:8,status:'revealed',
   my_ready:true,partner_ready:true,my_done:false,partner_done:false,my_skip:false,partner_skip:false,
   finale_together:'Veilige finale',finale_remote:'Veilige afstandsversie'}]);
 await end.click('quest-pilot-refresh');
 assert.match(end.elements['quest-pilot-super-finale'].textContent,/Veilige finale/);
 await end.click('quest-pilot-super-done');
 assert.equal(end.calls[0].args.p_action,'done');
 assert.equal(end.elements['quest-pilot-super-done'].disabled,true);
 console.log('PASS released finale and single completion confirmation');passed++;
 const chooser=setup('catalog');
 chooser.setServer({paired:true,initialized:true,revision:4,position:12,world_index:0,
   phase:'choose',turn_user:myId});
 chooser.setCatalog([
   {id:'A',title:'Schilderen',world:0,category:'Creatief',together:true,reward_steps:3,minutes:40},
   {id:'B',title:'Dansen',world:0,category:'Romantisch',together:true,reward_steps:2,minutes:20},
   {id:'BAD',title:'Verkeerde wereld',world:1,category:'Creatief',together:true},
   {id:'C',title:'Koken',world:0,category:'Creatief',together:true,reward_steps:3,minutes:50},
   {id:'SECRET',title:'Verboden kaart',world:0,category:'Flirt',together:true}
 ]);
 await chooser.click('quest-pilot-refresh');
 assert.equal(chooser.elements['quest-pilot-load-catalog'].disabled,false);
 await chooser.click('quest-pilot-load-catalog');
 assert.match(chooser.elements['quest-pilot-option-0'].textContent,/Schilderen/,chooser.elements['quest-pilot-message'].textContent);
 assert.match(chooser.elements['quest-pilot-option-2'].textContent,/Koken/);
 assert.doesNotMatch(chooser.elements['quest-pilot-option-2'].textContent,/Verboden/);
 await chooser.click('quest-pilot-option-0');
 assert.equal(chooser.calls[0].args.p_action,'propose');
 assert.equal(chooser.calls[0].args.p_date_id,'A');
 assert.equal(chooser.calls[0].args.p_mode,'samen');
 assert.equal(chooser.calls[0].args.p_expected_revision,4);
 console.log('PASS catalog filters world and category then proposes with server revision');passed++;
 const notTurn=setup('notturn');
 notTurn.setServer({paired:true,initialized:true,revision:4,position:12,world_index:0,
   phase:'choose',turn_user:otherId});
 await notTurn.click('quest-pilot-refresh');
 assert.equal(notTurn.elements['quest-pilot-load-catalog'].disabled,true);
 await notTurn.click('quest-pilot-load-catalog');
 assert.equal(notTurn.calls.length,0);
 assert.match(notTurn.elements['quest-pilot-message'].textContent,/niet aan de beurt/);
 console.log('PASS partner cannot propose outside turn');passed++;
 const unavailable=setup('unavailable');
 unavailable.setServer({paired:true,initialized:true,revision:6,position:88,world_index:2,
   phase:'choose',turn_user:myId});
 unavailable.setCatalog([{id:'WRONG',title:'Anders',world:3,category:'Creatief',together:true}]);
 await unavailable.click('quest-pilot-load-catalog');
 assert.equal(unavailable.elements['quest-pilot-option-0'].disabled,true);
 assert.equal(unavailable.calls.length,0);
 console.log('PASS wrong-world results cannot be proposed');passed++;
 const selector=setup('rotation');
 const input=[
   {id:'A',title:'Eerste',world:0,category:'Creatief',together:true},
   {id:'B',title:'Tweede',world:0,category:'Creatief',together:true},
   {id:'C',title:'Derde',world:0,category:'Creatief',together:true},
   {id:'D',title:'Vierde',world:0,category:'Creatief',together:true}
 ];
 const choices=selector.ctx.USTwoQuestCatalog.chooseOptions(input,{
   world:0,mode:'samen',position:0,history:[{id:'A'}],limit:3
 });
 assert.deepEqual([...choices].map(x=>x.id),['B','C','D']);
 console.log('PASS avoids recent assignment when alternative cards exist');passed++;
 const repeated=selector.ctx.USTwoQuestCatalog.chooseOptions(input,{
   world:0,mode:'samen',position:3,history:[{id:'D'},{id:'C'},{id:'A'},{id:'B'}],limit:3
 });
 assert.equal(repeated.length,3);
 assert.equal(new Set(repeated.map(x=>x.id)).size,3);
 console.log('PASS small or exhausted catalog still yields unique options');passed++;
 const privacy=setup('privacy');
 privacy.setSuper([{cell:20,revision:1,status:'revealed',my_prep:'PRIVÉ VOORBEREIDING',
   finale_together:'GEHEIME FINALE',my_done:false}]);
 await privacy.click('quest-pilot-refresh');
 assert.match(privacy.elements['quest-pilot-super-prep'].textContent,/PRIVÉ VOORBEREIDING/);
 privacy.emit('us-two-session-cleared');
 assert.doesNotMatch(privacy.elements['quest-pilot-super-prep'].textContent,/PRIVÉ VOORBEREIDING/);
 assert.doesNotMatch(privacy.elements['quest-pilot-super-finale'].textContent,/GEHEIME FINALE/);
 assert.equal(privacy.elements['quest-pilot-super-reveal'].disabled,true);
 console.log('PASS logout clears private preparation and finale from staged UI');passed++;
 const explanation=setup('mode-text');
 explanation.setServer({paired:true,initialized:true,position:6,revision:1,phase:'active',
   mode:'afstand',date:{title:'Koken',remoteText:'Bel tijdens het koken.',togetherText:'Kook samen aan tafel.',brief:'Maak samen iets.'}});
 await explanation.click('quest-pilot-refresh');
 assert.match(explanation.elements['quest-pilot-instructions'].textContent,/Bel tijdens het koken/);
 assert.doesNotMatch(explanation.elements['quest-pilot-instructions'].textContent,/Kook samen aan tafel/);
 console.log('PASS only selected play-mode instructions are shown');passed++;
 const fallback=setup('fallback-text');
 fallback.setServer({paired:true,initialized:true,position:6,revision:1,phase:'active',
   mode:'samen',date:{title:'Koken',remoteText:'',togetherText:'',brief:'Maak samen iets.'}});
 await fallback.click('quest-pilot-refresh');
 assert.match(fallback.elements['quest-pilot-instructions'].textContent,/Maak samen iets/);
 console.log('PASS existing brief is readable when detailed instructions are missing');passed++;
 const budgets=setup('budget-filter');
 const cards=[
  {id:'free1',title:'Gratis wandeling',world:0,category:'Buiten',together:true,estimated_cost_eur:0},
  {id:'free2',title:'Gratis tekenen',world:0,category:'Creatief',together:true,estimated_cost_eur:0},
  {id:'paid10',title:'Picknick',world:0,category:'Buiten',together:true,estimated_cost_eur:10},
  {id:'paid40',title:'Workshop',world:0,category:'Creatief',together:true,estimated_cost_eur:40},
  {id:'paid100',title:'Dagtrip',world:0,category:'Avontuur',together:true,estimated_cost_eur:100}
 ];
 for(const limit of [0,10,20,40,60,100,'max']){
   const result=budgets.ctx.USTwoQuestCatalog.chooseOptions(cards,{world:0,mode:'samen',position:0,budget:limit,limit:3});
   assert.ok(result.some(c=>c.estimated_cost_eur===0),'Gratis activiteiten ontbreken bij '+limit);
   assert.ok(result.every(c=>limit==='max'||c.estimated_cost_eur<=limit),'Budgetoverschrijding bij '+limit);
 }
 console.log('PASS all budget tiers retain free suggestions and enforce maximum');passed++;
 assert.equal(budgets.ctx.USTwoQuestCatalog.chooseOptions(cards,{world:0,mode:'samen',position:0,budget:0}).filter(x=>x.estimated_cost_eur>0).length,0);
 console.log('PASS zero-euro budget never shows paid dates');passed++;
 budgets.setServer({paired:true,initialized:true,revision:8,position:0,world_index:0,phase:'choose',turn_user:myId});
 budgets.setCatalog(cards);
 await budgets.click('quest-pilot-refresh');
 await budgets.click('quest-pilot-load-catalog');
 assert.match(budgets.elements['quest-pilot-option-0'].textContent,/gratis/);
 budgets.elements['quest-pilot-budget'].value='10';
 budgets.elements['quest-pilot-budget'].handlers.change();
 assert.equal(budgets.elements['quest-pilot-option-0'].disabled,true);
 await budgets.click('quest-pilot-load-catalog');
 assert.ok(budgets.elements['quest-pilot-option-0'].textContent.includes('gratis'));
 assert.equal(budgets.calls.length,0);
 console.log('PASS changing date budget invalidates stale choices without mutations');passed++;
 const mixed=budgets.ctx.USTwoQuestCatalog.chooseOptions(cards,{world:0,mode:'samen',position:0,budget:40,limit:3});
 assert.equal(mixed.filter(c=>c.estimated_cost_eur===0).length,2);
 assert.equal(mixed.filter(c=>c.estimated_cost_eur>0).length,1);
 console.log('PASS higher budget prioritizes two free dates and one paid option');passed++;
 const blocked=setup('revision-conflict');
 blocked.setServer({paired:true,initialized:true,revision:7,position:10,world_index:0,
   phase:'active',my_done:false,my_skip:false,partner_skip:false});
 await blocked.click('quest-pilot-refresh');
 blocked.setConflict(true);
 await blocked.click('quest-pilot-complete');
 assert.equal(blocked.calls.length,1);
 assert.match(blocked.elements['quest-pilot-pending'].textContent,/Wachtende acties: 1/);
 assert.equal(blocked.elements['quest-pilot-resolve'].disabled,false);
 blocked.setConflict(false);
 blocked.setServer({paired:true,initialized:true,revision:8,position:12,world_index:0,
   phase:'choose',turn_user:myId});
 await blocked.click('quest-pilot-resolve');
 assert.equal(blocked.calls.length,1,'recovery must not replay the blocked RPC');
 assert.match(blocked.elements['quest-pilot-pending'].textContent,/Wachtende acties: 0/);
 assert.equal(blocked.elements['quest-pilot-resolve'].disabled,true);
 console.log('PASS revision conflict requires server check and can cancel only local blocked action');passed++;
 const guard=setup('revision-guard');
 guard.setServer({paired:true,initialized:true,revision:5,position:2,phase:'active',
   my_done:false,my_skip:false,partner_skip:false});
 await guard.click('quest-pilot-refresh');
 guard.setConflict(true);
 await guard.click('quest-pilot-complete');
 guard.setConflict(false);
 await guard.click('quest-pilot-resolve');
 assert.match(guard.elements['quest-pilot-pending'].textContent,/Wachtende acties: 1/);
 assert.equal(guard.calls.length,1);
 console.log('PASS conflict recovery refuses cancellation without newer server revision');passed++;
 const network=setup('network-status');
 assert.match(network.elements['quest-pilot-network'].textContent,/Netwerk beschikbaar/);
 network.setOnline(false);
 assert.match(network.elements['quest-pilot-network'].textContent,/Offline/);
 network.setOnline(true);
 assert.match(network.elements['quest-pilot-network'].textContent,/opnieuw versturen/);
 assert.equal(network.calls.length,0);
 console.log('PASS offline indicator only advises manual replay and performs no automatic mutation');passed++;
 const superVotes=setup('consent-votes');
 const expiry=new Date(Date.now()+72*60*60*1000).toISOString();
 superVotes.setSuper([{cell:20,title:'Toestemmingstest',revision:4,status:'preparing',
   prep_until:expiry,my_prep:'ALLEEN MIJN GEHEIM',my_ready:true,partner_ready:true,
   my_reveal:true,partner_reveal:false,can_reveal:false,partner_done:false,my_done:false,
   finale_together:'VERBODEN FINALE'}]);
 await superVotes.click('quest-pilot-refresh');
 assert.match(superVotes.elements['quest-pilot-super-consent'].textContent,/toestemming finale: 1\/2/);
 assert.match(superVotes.elements['quest-pilot-super-consent'].textContent,/wacht op je partner/);
 assert.match(superVotes.elements['quest-pilot-super-timing'].textContent,/Voorbereiding nog/);
 assert.doesNotMatch(superVotes.elements['quest-pilot-super-finale'].textContent,/VERBODEN FINALE/);
 assert.equal(superVotes.elements['quest-pilot-super-reveal'].disabled,true);
 console.log('PASS first reveal vote stays private and cannot unlock early finale');passed++;
 superVotes.setSuper([{cell:20,title:'Toestemmingstest',revision:5,status:'preparing',
   prep_until:new Date(Date.now()-3600000).toISOString(),my_prep:'ALLEEN MIJN GEHEIM',
   my_ready:true,partner_ready:true,my_reveal:true,partner_reveal:false,can_reveal:true,
   finale_together:'VERBODEN FINALE'}]);
 await superVotes.click('quest-pilot-refresh');
 assert.match(superVotes.elements['quest-pilot-super-timing'].textContent,/verstreken/);
 assert.equal(superVotes.elements['quest-pilot-super-reveal'].disabled,true);
 console.log('PASS first consenting partner cannot vote twice when 72h expires');passed++;
 superVotes.setSuper([{cell:20,title:'Toestemmingstest',revision:6,status:'revealed',
   prep_until:new Date(Date.now()-3600000).toISOString(),my_prep:'ALLEEN MIJN GEHEIM',
   my_ready:true,partner_ready:true,my_reveal:true,partner_reveal:true,
   finale_together:'TOEGESTANE FINALE',finale_remote:'OP AFSTAND FINALE',
   my_done:true,partner_done:false}]);
 await superVotes.click('quest-pilot-refresh');
 assert.match(superVotes.elements['quest-pilot-super-consent'].textContent,/toestemming finale: 2\/2/);
 assert.match(superVotes.elements['quest-pilot-super-consent'].textContent,/voltooiing: 1\/2/);
 assert.match(superVotes.elements['quest-pilot-super-finale'].textContent,/TOEGESTANE FINALE/);
 assert.equal(superVotes.elements['quest-pilot-super-done'].disabled,true);
 console.log('PASS double consent shows finale and awaits separate completion');passed++;
 console.log('Web pilot checks:',passed+'/32 passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
