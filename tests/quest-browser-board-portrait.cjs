'use strict';
/* Mobile acceptance: real portrait bitmap + original approved composite pawn.
 * Static assets and the canonical quest state, no fake rewards or DB writes.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,390]){
   const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:25000});
   await page.evaluate(()=>{
    const app=document.getElementById('app-view'),game=document.getElementById('game-panel');
    app.classList.remove('hidden');game.classList.remove('hidden');
    window.USTwoQuestBoard.update({paired:true,initialized:true,position:3,world_index:0,revision:3},
     {paired:true,userId:'00000000-0000-4000-8000-000000000011',
      coupleId:'00000000-0000-4000-8000-000000000022'});
   });
   await page.waitForFunction(()=>{
    const board=document.querySelector('.quest-world-art');
    const pawn=document.querySelector('#quest-world-pawn-art');
    return board?.complete&&board.naturalWidth===941&&board.naturalHeight===1672&&
      !pawn.hidden&&pawn.complete&&pawn.naturalWidth===1149&&pawn.naturalHeight===1369;
   },null,{timeout:15000});
   const image=await page.evaluate(()=>{
    const v=document.querySelector('#quest-world-viewport').getBoundingClientRect();
    const pawn=document.getElementById('quest-world-pawn');
    const card=document.getElementById('quest-board-card').getBoundingClientRect();
    const art=document.getElementById('quest-world-pawn-art');
    const picture=document.querySelector('.quest-world-art');
    return {ratio:v.height/v.width,scroll:document.documentElement.scrollWidth,
     client:document.documentElement.clientWidth,cardWidth:card.width,
     tile:pawn.dataset.tile,pawnSrc:art.src,board:picture.currentSrc,
     pixelWidth:art.naturalWidth,pixelHeight:art.naturalHeight,
     hidden:pawn.hidden,caption:document.getElementById('quest-world-step-caption').textContent};
   });
   assert.ok(Math.abs(image.ratio-1672/941)<0.03,'original 941:1672 portrait board expected');
   assert.ok(image.scroll<=image.client+1,'mobile page must not horizontally overflow');
   assert.ok(image.cardWidth>=width-60,'board must be nearly full width');
   assert.equal(image.tile,'3');
   assert.equal(image.hidden,false);
   assert.match(image.board,/us-two-user-board\.png/);
   assert.equal(await page.locator('.quest-board-label').count(),0,
     'location names are already baked into the user source art: no duplicate labels');
   // Browsers without AVIF must still display the exact portrait board in WebP.
   const fallback=await page.evaluate(async()=>{
     const res=await fetch('./assets/us-two-user-board.png');
     if(!res.ok)return {ok:false};
     const bitmap=await createImageBitmap(await res.blob());
     const out={ok:true,w:bitmap.width,h:bitmap.height};
     bitmap.close();return out;
   });
   assert.deepEqual(fallback,{ok:true,w:941,h:1672});
   assert.match(image.pawnSrc,/us-two-user-pawn\.png$/);
   assert.ok(image.pixelWidth===1149&&image.pixelHeight===1369,
     'exact supplied high resolution transparent 2D characters must be displayed');
   assert.equal(await page.locator('#quest-world-heading').textContent(),'Wereld 1 · Liefdesbos');
   assert.equal(await page.locator('#quest-world-cell').textContent(),'Vakje 3 ♡');
   assert.equal(await page.locator('#quest-world-pawn').count(),1);
   const waypoints=await page.evaluate(()=>[0,28,39,40,59,60].map(n=>window.USTwoQuestBoard.pathPoint(n)));
   assert.deepEqual(waypoints[0],waypoints[5],'world 2 begins at start portal at canonical tile 60');
   for(const i of [1,2,3,4])assert.notDeepEqual(waypoints[0],waypoints[i],
     'canonical world must not wrap early at tile '+[0,28,39,40,59,60][i]);
   const gated=await page.evaluate(()=>window.USTwoQuestBoard.pathPoint(60,0));
   assert.notDeepEqual(gated,waypoints[0],'uncompleted superdate gate holds pawn at end portal at tile 60');
   assert.equal(await page.locator('#quest-world-approved-couple').isVisible(),false);
   assert.equal(await page.locator('#quest-world-approved-pepsi').isVisible(),false);
   await page.evaluate(()=>window.USTwoQuestBoard.update(
    {paired:true,initialized:true,position:6,world_index:0,revision:4},
    {paired:true,userId:'00000000-0000-4000-8000-000000000011',
     coupleId:'00000000-0000-4000-8000-000000000022'}));
   await page.waitForFunction(()=>document.querySelector('#quest-world-pawn').dataset.tile==='6',null,{timeout:5500});
   assert.match(await page.locator('#quest-world-step-caption').textContent(),/3 → 6 · stap 3\/3 · vakje 6/);
   await page.locator('#quest-world-replay:not([disabled])').click();
   await page.waitForFunction(()=>document.querySelector('#quest-world-pawn').dataset.tile==='6',null,{timeout:5500});
   await page.waitForFunction(()=>!document.querySelector('#quest-world-replay').disabled,null,{timeout:5500});
   // A reload must restore last completed animation from the server log.
   await page.evaluate(()=>{
    window.dispatchEvent(new Event('us-two-session-cleared'));
    window.USTwoQuestBoard.update({paired:true,initialized:true,position:6,world_index:0,revision:4,
      history:[{id:'date-test',from:3,to:6,steps:3}]},
      {paired:true,userId:'00000000-0000-4000-8000-000000000011',
       coupleId:'00000000-0000-4000-8000-000000000022'});
   });
   await page.locator('#quest-world-replay:not([disabled])').waitFor({timeout:5000});
   assert.match(await page.locator('#quest-world-step-caption').textContent(),/3 → 6 · stap 3\/3 · vakje 6/);
   // World boundary is at sixty server steps, NOT forty catalogue quests.
   await page.evaluate(()=>{
    window.USTwoQuestBoard.clear();
    window.USTwoQuestBoard.update({paired:true,initialized:true,position:59,world_index:0,revision:6},
     {paired:true,userId:'00000000-0000-4000-8000-000000000011',
      coupleId:'00000000-0000-4000-8000-000000000022'});
    window.USTwoQuestBoard.update({paired:true,initialized:true,position:62,world_index:1,revision:7},
     {paired:true,userId:'00000000-0000-4000-8000-000000000011',
      coupleId:'00000000-0000-4000-8000-000000000022'});
   });
   await page.waitForFunction(()=>document.querySelector('#quest-world-pawn').dataset.tile==='62',null,{timeout:5500});
   assert.equal(await page.locator('#quest-world-heading').textContent(),'Wereld 2 · Avonturenland');
   assert.match(await page.locator('#quest-world-step-caption').textContent(),/59 → 62 · stap 3\/3 · vakje 62/);
   await page.screenshot({path:'/tmp/us-two-board-'+width+'.png',fullPage:true});
   await page.evaluate(()=>window.dispatchEvent(new Event('us-two-session-cleared')));
   assert.equal(await page.locator('#quest-world-pawn').isVisible(),false);
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS 320/390px original 941x1672 portrait board, exact 1149x1369 user-supplied pawn, server-based tile motion, replay and logout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
