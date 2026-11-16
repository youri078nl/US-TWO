'use strict';
/* Real Chromium: two isolated browser profiles, shared simulated schedule RPC.
   No production credentials or live server writes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/';
const players=['00000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000062'];
const coupleId='00000000-0000-4000-8000-000000000063';
const state={revision:8,phase:'active',position:11,planned_at:null,pending_at:null,pending_by:null,status:'unscheduled'};
const calls=[];
function readState(){
  return {paired:true,initialized:true,revision:state.revision,phase:state.phase,
    position:state.position,world_index:0,turn_user:players[0],
    schedule:state.planned_at||state.pending_at?{
      status:state.status,confirmed_at:state.planned_at,
      pending_at:state.pending_at,pending_by:state.pending_by
    }:null};
}
async function setup(page,user){
  await page.exposeFunction('testScheduleRead',async()=>readState());
  await page.exposeFunction('testScheduleCall',async ({name,args})=>{
    calls.push({name,args,user});
    if(name!=='us_quest_schedule_action')return {error:{code:'22023',message:'not_allowed'},data:null};
    if(args.p_expected_revision!==state.revision)
      return {error:{code:'40001',message:'stale_revision'},data:null};
    switch(args.p_action){
      case 'propose':
        if(state.pending_by&&state.pending_by!==user)return {error:{code:'22023',message:'pending'},data:null};
        state.pending_at=args.p_time;state.pending_by=user;break;
      case 'accept':
        if(!state.pending_at||state.pending_by===user)return {error:{code:'22023',message:'not_partner'},data:null};
        state.planned_at=state.pending_at;state.status='confirmed';state.pending_at=null;state.pending_by=null;break;
      case 'reject':
        if(!state.pending_at||state.pending_by===user)return {error:{code:'22023',message:'not_partner'},data:null};
        state.pending_at=null;state.pending_by=null;break;
      case 'cancel':
        if(!state.pending_at||state.pending_by!==user)return {error:{code:'22023',message:'not_proposer'},data:null};
        state.pending_at=null;state.pending_by=null;break;
      default:return {error:{code:'22023',message:'unknown'},data:null};
    }
    state.revision++;
    return {error:null,data:readState()};
  });
  await page.evaluate(({user,coupleId})=>{
    window.confirm=()=>true;
    window.USTwoQuestPilotBridge={
      identity:()=>({userId:user,coupleId,paired:true}),
      read:()=>window.testScheduleRead(),readSuper:async()=>[],catalog:async()=>[],
      call:(name,args)=>window.testScheduleCall({name,args})
    };
    document.querySelector('#app-view').classList.remove('hidden');
    document.querySelector('#game-panel').classList.remove('hidden');
  },{user,coupleId});
  await page.locator('#quest-pilot-refresh').click();
  await page.locator('#quest-pilot-schedule-propose').waitFor();
  await page.locator('#quest-pilot-schedule-status').getByText(/Nog geen datum bevestigd/).waitFor({timeout:10000});
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  await Promise.all(pages.map(p=>p.goto(URL,{waitUntil:'networkidle'})));
  await Promise.all(pages.map((p,i)=>setup(p,players[i])));
  const [one,two]=pages;
  const planned=new Date(Date.now()+96*3600*1000);
  const pad=x=>String(x).padStart(2,'0');
  const local=planned.getFullYear()+'-'+pad(planned.getMonth()+1)+'-'+pad(planned.getDate())+
    'T'+pad(planned.getHours())+':'+pad(planned.getMinutes());
  await one.locator('#quest-pilot-schedule-time').fill(local);
  await one.locator('#quest-pilot-schedule-propose').click();
  await one.locator('#quest-pilot-schedule-status').getByText(/Jouw voorstel/).waitFor({timeout:10000});
  assert.equal(calls.length,1);
  assert.equal(state.pending_by,players[0]);
  assert.equal(await one.locator('#quest-pilot-schedule-accept').isDisabled(),true);
  await two.locator('#quest-pilot-refresh').click();
  await two.locator('#quest-pilot-schedule-status').getByText(/Voorstel van je partner/).waitFor({timeout:10000});
  assert.equal(await two.locator('#quest-pilot-schedule-accept').isDisabled(),false);
  assert.equal(await two.locator('#quest-pilot-schedule-cancel').isDisabled(),true);
  await two.locator('#quest-pilot-schedule-accept').click();
  await two.locator('#quest-pilot-schedule-status').getByText(/Bevestigde datum/).waitFor({timeout:10000});
  assert.equal(state.status,'confirmed');
  assert.equal(calls.length,2);
  assert.equal(calls[0].args.p_expected_revision,8);
  assert.equal(calls[1].args.p_expected_revision,9);
  await one.locator('#quest-pilot-refresh').click();
  await one.locator('#quest-pilot-schedule-status').getByText(/Bevestigde datum/).waitFor({timeout:10000});
  assert.equal(await one.locator('#quest-pilot-schedule-accept').isDisabled(),true);
  console.log('PASS Chromium: two isolated devices propose and confirm same date with sequential server revisions');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
