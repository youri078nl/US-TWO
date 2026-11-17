'use strict';
/* Real Chromium UI regression: approved portrait board remains original,
 * its location buttons work, drag and zoom are view-only, and a date goes
 * to Agenda without submitting a server invitation or moving the pawn.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errors=[],inviteRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/rpc/us_propose_date'))inviteRequests.push(r.url());});
  await page.route('**/app.js',async route=>{
   const response=await route.fetch(),code=await response.text();
   await route.fulfill({response,body:code+'\nwindow.__dateTest={state,setTab};'});
  });
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:30000});
  await page.evaluate(()=>{
   const user='00000000-0000-4000-8000-000000000021',couple='00000000-0000-4000-8000-000000000022';
   const {state,setTab}=window.__dateTest;
   state.session={user:{id:user},access_token:'test-only',expires_at:9999999999};
   state.dashboard={couple_id:couple,members:[{user_id:user},{user_id:'other'}],dates:[]};
   window.USTwoQuestPilotBridge={
    identity:()=>({paired:true,userId:user,coupleId:couple}),
    read:async()=>({paired:true,initialized:true,revision:3,position:3,world_index:0,
      phase:'choose',turn_user:user,history:[]}),
    readSuper:async()=>[],catalog:async()=>[],
    call:async()=>{throw Error('No gameplay mutations are expected while choosing a date');}
   };
   document.querySelector('#app-view').classList.remove('hidden');
   document.querySelector('#bottom-nav').classList.remove('hidden');
   setTab('game');
  });
  await page.waitForFunction(()=>document.querySelector('#quest-world-pawn')?.dataset.tile==='3');
  assert.equal(await page.locator('.quest-board-label').count(),0);
  assert.equal(await page.locator('.quest-world-art').getAttribute('src'),'./assets/us-two-user-board.png');
  const rect=await page.locator('#quest-world-viewport').boundingBox();
  const initial=await page.evaluate(()=>window.USTwoBoardInteraction.getState());
  assert.ok(initial.zoom>1,'mobile board should begin slightly draggable');
  await page.mouse.move(rect.x+rect.width*.47,rect.y+rect.height*.54);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.55,rect.y+rect.height*.48,{steps:6});
  await page.mouse.up();
  const moved=await page.evaluate(()=>window.USTwoBoardInteraction.getState());
  assert.ok(Math.abs(moved.x-initial.x)>2||Math.abs(moved.y-initial.y)>2,'drag must pan the real board');
  await page.locator('#quest-board-zoom-in').click();
  const zoomed=await page.evaluate(()=>window.USTwoBoardInteraction.getState());
  assert.ok(zoomed.zoom>moved.zoom,'plus button must zoom');
  await page.locator('#quest-board-zoom-out').click();
  await page.locator('#quest-board-center').click();
  assert.equal(await page.locator('#quest-world-pawn').getAttribute('data-tile'),'3',
   'visual pan and zoom must never change the server tile');
  await page.evaluate(()=>window.USTwoBoardInteraction.reset());
  for(const [location,id]of [
    ['living','quest-location-living'],
    ['airport','quest-location-airport'],
    ['beach','quest-location-beach'],
    ['forest','quest-location-forest'],
    ['cinema','quest-location-cinema'],
    ['wellness','quest-location-wellness'],
    ['cafe','quest-location-cafe']
  ]){
   await page.locator('#'+id).click();
   await page.locator('#discover-panel:not(.hidden)').waitFor({timeout:12000});
   await page.waitForFunction(()=>document.querySelector('#quest-date-area')?.value===location);
   await page.waitForFunction(()=>document.querySelectorAll('.quest-date-choose').length>0,null,{timeout:12000});
   assert.equal(await page.locator('#quest-date-area').inputValue(),location);
   await page.evaluate(()=>window.__dateTest.setTab('game'));
   await page.evaluate(()=>window.USTwoBoardInteraction.reset());
  }
  await page.locator('[data-tab=discover]').click();
  await page.locator('#discover-panel:not(.hidden)').waitFor();
  await page.locator('#quest-date-area').selectOption('all');
  await page.locator('#quest-date-count').getByText(/290 beschikbare dates/).waitFor({timeout:12000});
  await page.locator('#quest-date-search').fill('wandeling');
  await page.waitForFunction(()=>document.querySelectorAll('.quest-date-choose').length>=1);
  const title=await page.locator('.quest-date-tile').first().locator('h3').textContent();
  await page.locator('.quest-date-choose').first().click();
  await page.locator('#dates-panel:not(.hidden)').waitFor();
  assert.equal(await page.locator('#date-title').inputValue(),title);
  assert.equal(await page.locator('#date-when').inputValue(),'','date selection must not schedule an appointment');
  assert.match(await page.locator('#date-form-selected').textContent(),/Gekozen date/);
  assert.equal(inviteRequests.length,0,'no invitation may be sent without explicit form submission');
  assert.equal(await page.locator('#quest-world-pawn').getAttribute('data-tile'),'3');
  assert.deepEqual(errors,[]);
  console.log('PASS original art, drag + zoom + center, 7 active map destinations incl Bos, 290 date catalog, Agenda prefill, no invite/game mutation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
