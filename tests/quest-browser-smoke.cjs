'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Test the real legacy DOM renderer without touching connected accounts or server data.
 await page.route('**/app.js',async route=>{
  const response=await route.fetch();
  const code=await response.text();
  await route.fulfill({response,body:code+'\nwindow.__legacyBoardTest={state,renderBoard};'});
 });
 try {
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:30000});
  assert.equal(await page.title(),'US TWO | Samen op avontuur');
  const duo=await page.evaluate(()=>{
    const {state,renderBoard}=window.__legacyBoardTest;
    state.dashboard={couple_id:'test-couple',members:[{name:'Youri'},{name:'Kim'}]};
    state.board={position:13,chapter:1,next_super_cell:20,round:null};
    renderBoard();
    const original={
      tokenCount:document.querySelectorAll('#board-trail .board-pawn').length,
      markerClass:document.querySelector('#board-trail .board-pawn')?.className,
      caption:document.querySelector('#board-trail .pawns-caption')?.textContent,
      description:document.querySelector('#board-trail .board-map')?.getAttribute('aria-label'),
      tile:document.querySelector('#board-trail .map-cell.current .cell-number')?.textContent
    };
    state.board.position=15;
    renderBoard();
    return {...original,afterTokenCount:document.querySelectorAll('#board-trail .board-pawn').length,
      afterTile:document.querySelector('#board-trail .map-cell.current .cell-number')?.textContent};
  });
  assert.equal(duo.tokenCount,1,'never display independent pawn for each partner');
  assert.equal(duo.afterTokenCount,1,'subsequent server positions still have one pawn');
  assert.match(duo.markerClass,/board-pawn-duo/);
  assert.match(duo.caption,/Eén gezamenlijke pion: Youri en Kim/);
  assert.match(duo.description,/Eén gezamenlijke pion op vakje 13/);
  assert.equal(duo.tile,'13');
  assert.equal(duo.afterTile,'15');
  console.log('PASS Chromium legacy board: one shared couple marker across two positions');
  await page.evaluate(()=>{
    const userId='00000000-0000-4000-8000-000000000001';
    let game={paired:true,initialized:true,revision:5,position:12,world_index:0,
      phase:'choose',turn_user:userId,history:[]};
    const cards=[
      {id:'a',title:'Samen schilderen',world:0,category:'Creatief',together:true,remote:true,reward_steps:3,minutes:45,estimated_cost_eur:0},
      {id:'b',title:'Mini-festival',world:0,category:'Spel',together:true,remote:true,reward_steps:2,minutes:30,estimated_cost_eur:0},
      {id:'c',title:'Wandeling',world:0,category:'Buiten',together:true,remote:false,reward_steps:4,minutes:60,estimated_cost_eur:0}
    ];
    window.__requests=[];
    window.USTwoQuestPilotBridge={
      identity:()=>({paired:true,userId,coupleId:'00000000-0000-4000-8000-000000000002'}),
      read:async()=>({...game}),
      readSuper:async()=>[],
      catalog:async()=>cards,
      call:async(name,args)=>{
        window.__requests.push({name,args});
        if(name==='us_quest_action'&&args.p_action==='propose')
          game={...game,phase:'approval',proposer_id:userId,revision:game.revision+1,
            date:{title:cards.find(c=>c.id===args.p_date_id)?.title,steps:3},mode:'samen'};
        return {data:{...game},error:null};
      }
    };
    document.querySelector('#app-view').classList.remove('hidden');
    document.querySelector('#game-panel').classList.remove('hidden');
  });
  await page.locator('#quest-pilot-refresh').click();
  await page.getByText(/Nieuwe serverreis: vak 12/).waitFor();
  await page.locator('#quest-pilot-load-catalog').click();
  await page.locator('#quest-pilot-option-0').getByText(/Samen schilderen/).waitFor();
  assert.equal(await page.locator('[id^="quest-pilot-option-"]:not([disabled])').count(),3);
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#quest-pilot-option-0').click();
  await page.getByText(/status: approval/).waitFor();
  const requests=await page.evaluate(()=>window.__requests);
  assert.equal(requests.length,1);
  assert.equal(requests[0].name,'us_quest_action');
  assert.equal(requests[0].args.p_date_id,'a');
  assert.equal(requests[0].args.p_expected_revision,5);
  assert.match(await page.locator('#quest-pilot-task').textContent(),/Samen schilderen/);
  assert.deepEqual(errors,[]);
  console.log('PASS real Chromium browser renders and submits staged catalog proposal');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
