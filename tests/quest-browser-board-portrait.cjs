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
    return board?.complete&&board.naturalWidth===480&&board.naturalHeight===720&&
      !pawn.hidden&&pawn.complete&&pawn.naturalWidth>=200&&pawn.naturalHeight>=170;
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
   assert.ok(Math.abs(image.ratio-1.5)<0.03,'2:3 portrait board expected');
   assert.ok(image.scroll<=image.client+1,'mobile page must not horizontally overflow');
   assert.ok(image.cardWidth>=width-60,'board must be nearly full width');
   assert.equal(image.tile,'3');
   assert.equal(image.hidden,false);
   assert.match(image.board,/ustwo-board-portrait\.(avif|webp)/);
   // Browsers without AVIF must still display the exact portrait board in WebP.
   const fallback=await page.evaluate(async()=>{
     const res=await fetch('./assets/ustwo-board-portrait.webp');
     if(!res.ok)return {ok:false};
     const bitmap=await createImageBitmap(await res.blob());
     const out={ok:true,w:bitmap.width,h:bitmap.height};
     bitmap.close();return out;
   });
   assert.deepEqual(fallback,{ok:true,w:480,h:720});
   assert.match(image.pawnSrc,/^blob:/);
   assert.equal(await page.locator('#quest-world-heading').textContent(),'Wereld 1 · Liefdesbos');
   assert.equal(await page.locator('#quest-world-cell').textContent(),'Vakje 3 ♡');
   assert.equal(await page.locator('#quest-world-pawn').count(),1);
   const waypoints=await page.evaluate(()=>[0,28,29,30,39,40].map(n=>window.USTwoQuestBoard.pathPoint(n)));
   assert.deepEqual(waypoints[0],waypoints[5],'world 2 begins at the start portal only on step 40');
   for(const i of [2,3,4])assert.notDeepEqual(waypoints[0],waypoints[i],
     'canonical world must not wrap early at tile '+[0,28,29,30,39,40][i]);
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
   await page.screenshot({path:'/tmp/us-two-board-'+width+'.png',fullPage:true});
   await page.evaluate(()=>window.dispatchEvent(new Event('us-two-session-cleared')));
   assert.equal(await page.locator('#quest-world-pawn').isVisible(),false);
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS 320/390px US TWO portrait board, genuine Youri+Kim+Pepsi sprite, server-based tile motion, replay and logout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
