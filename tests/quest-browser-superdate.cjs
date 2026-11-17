'use strict';
/* Real Chromium, two isolated browser contexts and fake deterministic RPC.
   Validates client UX and privacy, NOT Supabase authorization or 72h backend. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/';
const USERS=['00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000042'];
const COUPLE='00000000-0000-4000-8000-000000000043';
const db={revision:1,status:'preparing',ready:new Set(USERS),reveal:new Set(),done:new Set(),
  time:new Date(Date.now()-3600000).toISOString(),position:20};
const calls=[];
function stateFor(user){
  return [{cell:20,title:'Ontgrendelde superdate',status:db.status,revision:db.revision,
    prep_until:db.time,my_prep:user===USERS[0]?'GEHEIM VAN A':'GEHEIM VAN B',
    my_ready:db.ready.has(user),partner_ready:db.ready.size>1,
    my_reveal:db.reveal.has(user),partner_reveal:USERS.some(other=>other!==user&&db.reveal.has(other)),
    my_done:db.done.has(user),partner_done:USERS.some(other=>other!==user&&db.done.has(other)),
    my_skip:false,partner_skip:false,
    can_reveal:db.status==='preparing'&&db.ready.size===2,
    finale_together:db.status==='revealed'||db.status==='completed'?'SAMEN FINALE':null,
    finale_remote:db.status==='revealed'||db.status==='completed'?'AFSTAND FINALE':null}];
}
async function install(page,user){
  await page.exposeFunction('testState',async()=>stateFor(user));
  await page.exposeFunction('testRpc',async({name,args})=>{
    calls.push({user,name,args});
    if(name!=='us_quest_super_action')return {data:{},error:null};
    if(args.p_expected_revision!==db.revision)return {data:null,error:{code:'40001',message:'stale_revision'}};
    if(args.p_action==='reveal'){
      if(db.status!=='preparing'||db.ready.size!==2)return {data:null,error:{code:'22023',message:'superdate_locked'}};
      db.reveal.add(user);if(db.reveal.size===2)db.status='revealed';
    }else if(args.p_action==='done'){
      if(db.status!=='revealed')return {data:null,error:{code:'22023',message:'superdate_locked'}};
      db.done.add(user);if(db.done.size===2){db.status='completed';db.position+=5;}
    }else return {data:null,error:{code:'22023',message:'action_not_allowed'}};
    db.revision++;
    return {data:stateFor(user),error:null};
  });
  await page.evaluate(({user,COUPLE})=>{
    // Deterministic confirmation for the protocol flow; cancellation is tested separately.
    window.confirm=()=>true;
    window.USTwoQuestPilotBridge={
      identity:()=>({paired:true,userId:user,coupleId:COUPLE}),
      read:async()=>({paired:true,initialized:true,position:20,revision:1,phase:'choose',world_index:0,turn_user:user}),
      readSuper:()=>window.testState(),
      catalog:async()=>[],
      call:(name,args)=>window.testRpc({name,args})
    };
    document.querySelector('#app-view').classList.remove('hidden');
    document.querySelector('#game-panel').classList.remove('hidden');
  },{user,COUPLE});

}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const a=await browser.newContext(),b=await browser.newContext();
  const alice=await a.newPage(),bob=await b.newPage();
  await Promise.all([alice.goto(URL,{waitUntil:'networkidle'}),bob.goto(URL,{waitUntil:'networkidle'})]);
  await Promise.all([install(alice,USERS[0]),install(bob,USERS[1])]);
  await Promise.all([alice.locator('#quest-pilot-refresh').click(),bob.locator('#quest-pilot-refresh').click()]);
  await alice.locator('#quest-pilot-super-prep').getByText(/GEHEIM VAN A/).waitFor({timeout:6000}).catch(async e=>{throw Error('Alice state: '+await alice.locator('#quest-pilot-message').textContent()+' | '+await alice.locator('#quest-pilot-super-status').textContent()+' | '+e.message)});
  // The two separate Chromium contexts finish their own asynchronous reads independently.
  // Do not assert Bob's private data before Bob's server read has completed.
  await bob.locator('#quest-pilot-super-prep').getByText(/GEHEIM VAN B/).waitFor({timeout:6000}).catch(async e=>{throw Error('Bob state: '+await bob.locator('#quest-pilot-message').textContent()+' | '+await bob.locator('#quest-pilot-super-status').textContent()+' | '+e.message)});
  assert.match(await alice.locator('#quest-pilot-super-prep').textContent(),/GEHEIM VAN A/);
  assert.doesNotMatch(await alice.locator('#quest-pilot-super-prep').textContent(),/GEHEIM VAN B/);
  assert.match(await bob.locator('#quest-pilot-super-prep').textContent(),/GEHEIM VAN B/);
  assert.doesNotMatch(await bob.locator('#quest-pilot-super-prep').textContent(),/GEHEIM VAN A/);
  assert.doesNotMatch(await alice.locator('#quest-pilot-super-finale').textContent(),/SAMEN FINALE/);
  await alice.locator('#quest-pilot-super-reveal').click();
  await alice.locator('#quest-pilot-super-consent').getByText(/toestemming finale: 1\/2/).waitFor({timeout:10000});
  assert.equal(db.reveal.size,1,'Expected first persisted consent');
  assert.doesNotMatch(await alice.locator('#quest-pilot-super-finale').textContent(),/SAMEN FINALE/);
  assert.equal(await alice.locator('#quest-pilot-super-reveal').isDisabled(),true);
  await bob.locator('#quest-pilot-refresh').click();
  await bob.locator('#quest-pilot-super-reveal').click();
  await bob.locator('#quest-pilot-super-finale').getByText(/SAMEN FINALE/).waitFor({timeout:10000});
  assert.equal(db.reveal.size,2);
  assert.equal(db.status,'revealed');
  assert.match(await bob.locator('#quest-pilot-super-finale').textContent(),/SAMEN FINALE/);
  await alice.locator('#quest-pilot-refresh').click();
  await alice.locator('#quest-pilot-super-finale').getByText(/SAMEN FINALE/).waitFor({timeout:10000});
  assert.match(await alice.locator('#quest-pilot-super-finale').textContent(),/SAMEN FINALE/);
  await alice.locator('#quest-pilot-super-done').click();
  await alice.locator('#quest-pilot-super-consent').getByText(/voltooiing: 1\/2/).waitFor({timeout:10000});
  assert.equal(db.position,20,'first completion gives no bonus');
  assert.equal(db.done.size,1);
  await bob.locator('#quest-pilot-refresh').click();
  await bob.locator('#quest-pilot-super-done').click();
  await bob.locator('#quest-pilot-super-status').getByText(/status completed/).waitFor({timeout:10000});
  assert.equal(db.position,25,'only second completion gives bonus');
  assert.equal(db.done.size,2);
  assert.equal(calls.filter(c=>c.args.p_action==='done').length,2);
  console.log('PASS Chromium two contexts: private prep isolated, two consents reveal, two completions grant bonus once');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
