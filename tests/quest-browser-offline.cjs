'use strict';
/* Real Chromium test: two tabs, durable IndexedDB, Web Locks and failed RPC retry.
   No real user accounts and no production database mutations. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/';
const uid='00000000-0000-4000-8000-000000000021';
const couple='00000000-0000-4000-8000-000000000022';
const exposedPages=new WeakSet();
async function install(page, handler) {
  if(!exposedPages.has(page)){
    await page.exposeFunction('testQuestRpc', handler);
    exposedPages.add(page);
  }
  await page.evaluate(({uid,couple})=>{
    let state={paired:true,initialized:true,revision:8,position:13,world_index:0,
      phase:'active',my_done:false,my_skip:false,partner_skip:false};
    window.USTwoQuestPilotBridge={
      identity:()=>({paired:true,userId:uid,coupleId:couple}),
      read:async()=>({...state}),
      readSuper:async()=>[],
      catalog:async()=>[],
      call:(name,args)=>window.testQuestRpc({name,args})
    };
    document.querySelector('#app-view').classList.remove('hidden');
    document.querySelector('#game-panel').classList.remove('hidden');
  },{uid,couple});
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext();
  const rpcCalls=[];let online=false;
   const actions=()=>rpcCalls.filter(c=>c.name==='us_quest_action');
  const handler=async call=>{
    rpcCalls.push(call);
    if(!online)return {data:null,error:{code:'',message:'network unavailable'}};
    return {data:{ok:true},error:null};
  };
  try {
    const first=await context.newPage();
    await first.goto(URL,{waitUntil:'networkidle',timeout:30000});
    await install(first,handler);
    await first.locator('#quest-pilot-refresh').click();
    await first.getByText(/Nieuwe serverreis: vak 13/).waitFor();
    first.on('dialog',d=>d.accept());
    await first.locator('#quest-pilot-complete').click();
    await first.getByText(/Wachtende acties: 1/).waitFor();
    assert.equal(actions().length,1);
    const requestId=actions()[0].args.p_request_id;
    assert.match(requestId,/^[0-9a-f-]{36}$/i);
    assert.equal(actions()[0].args.p_expected_revision,8);

    // Reload the same tab: the IndexedDB outbox must survive.
    await first.reload({waitUntil:'networkidle'});
    await install(first,async call=>handler(call));
    await first.locator('#quest-pilot-refresh').click();
    await first.getByText(/Wachtende acties: 1/).waitFor();

    // A second tab in the same browser account sees the same persisted action.
    const second=await context.newPage();
    await second.goto(URL,{waitUntil:'networkidle',timeout:30000});
    await install(second,async call=>handler(call));
    await second.locator('#quest-pilot-refresh').click();
    await second.getByText(/Wachtende acties: 1/).waitFor();

    online=true;
    // Both tabs try to flush concurrently. The Web Locks coordinator must
    // allow one committed replay of the original UUID, not two new requests.
    await Promise.all([
      first.locator('#quest-pilot-sync').click(),
      second.locator('#quest-pilot-sync').click()
    ]);
    await first.getByText(/Wachtende acties: 0/).waitFor();
    await second.locator('#quest-pilot-refresh').click();
    await second.getByText(/Wachtende acties: 0/).waitFor();
    assert.equal(actions().length,2,'only one retry should reach transport');
    assert.equal(actions()[1].args.p_request_id,requestId);
    console.log('PASS Chromium: offline queued action survives reload and is visible from second tab');
    console.log('PASS Chromium: concurrent online replay uses same UUID and exactly one transport retry');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
