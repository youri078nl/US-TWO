'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  // App code is an ES module. Expose read-only test handles by intercepting
  // the JS response in this isolated browser context; production stays unchanged.
  await page.route('**/app.js',async route=>{
    const response=await route.fetch();
    const code=await response.text();
    await route.fulfill({response,body:code+'\nwindow.__calendarTestHooks={state,renderCalendar,amsterdamDay,clearSession};'});
  });
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  const result=await page.evaluate(()=>{
    const {state,renderCalendar,amsterdamDay,clearSession}=window.__calendarTestHooks;
    const user='00000000-0000-4000-8000-000000000081';
    const couple='00000000-0000-4000-8000-000000000082';
    const when=new Date(Date.now()+4*86400000);
    when.setHours(14,0,0,0);
    const confirmed=when.toISOString();
    const next=new Date(when.getTime()+86400000).toISOString();
    state.session={user:{id:user},access_token:'mock-token'};
    state.dashboard={couple_id:couple,members:[{id:user},{id:'other'}],dates:[
      {id:'legacy-1',title:'Bestaande afspraak',status:'accepted',start_at:confirmed}
    ]};
    state.tab='dates';
    document.getElementById('dates-panel').classList.remove('hidden');
    state.calendarMonth=amsterdamDay(when).slice(0,7);
    state.calendarSelected=amsterdamDay(when);
    const who={userId:user,coupleId:couple};
    const game={paired:true,initialized:true,phase:'active',
      date:{id:'catalog-a',title:'Nieuwe spelreisdate'},
      schedule:{status:'confirmed',confirmed_at:confirmed,pending_at:null,pending_by:null}};
    window.USTwoQuestCalendar.update(game,who);
    const first=document.getElementById('calendar-day-detail').textContent;
    const count=()=>document.getElementById('calendar-day-detail').querySelectorAll('.calendar-event').length;
    const initial=count();
    window.USTwoQuestCalendar.update(game,who);
    const repeated=count();
    game.schedule.pending_at=next;
    game.schedule.pending_by=user;
    window.USTwoQuestCalendar.update(game,who);
    state.calendarSelected=amsterdamDay(new Date(next));
    renderCalendar();
    const proposed=document.getElementById('calendar-day-detail').textContent;
    const pendingCount=count();
    window.USTwoQuestCalendar.update(game,{userId:'different-account',coupleId:couple});
    state.calendarSelected=amsterdamDay(when);renderCalendar();
    const unauthorized=document.getElementById('calendar-day-detail').textContent;
    window.USTwoQuestCalendar.update(game,who);
    clearSession();
    state.calendarSelected=amsterdamDay(when);
    renderCalendar();
    const loggedOut=document.getElementById('calendar-day-detail').textContent;
    return {first,initial,repeated,proposed,pendingCount,unauthorized,loggedOut};
  });
  assert.match(result.first,/Bestaande afspraak/);
  assert.match(result.first,/Nieuwe spelreisdate/);
  assert.match(result.first,/Bevestigde spelreisdate/);
  assert.equal(result.initial,2,'one legacy and one canonical event');
  assert.equal(result.repeated,2,'refresh must not duplicate date');
  assert.match(result.proposed,/Eigen datumvoorstel/);
  assert.equal(result.pendingCount,1,'pending proposal on different date');
  assert.doesNotMatch(result.unauthorized,/Nieuwe spelreisdate/);
  assert.doesNotMatch(result.loggedOut,/Nieuwe spelreisdate/);
  console.log('PASS Chromium: same-month canonical date and legacy entry, no duplication, pending date and logout isolation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
