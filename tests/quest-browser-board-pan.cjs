'use strict';
// True Chromium layout regression: portrait phone, giant unmodified board image,
// two-axis scrolling, deterministic pawn coordinates and approved art mirroring.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  const result=await page.evaluate(async()=>{
   document.querySelector('#app-view')?.classList.remove('hidden');
   document.querySelector('#game-panel')?.classList.remove('hidden');
   document.querySelector('#quest-pilot')?.classList.remove('hidden');
   const sc=document.getElementById('quest-world-scroll');
   const map=document.getElementById('quest-world-viewport');
   const art=map.querySelector('.quest-world-art');
   const rect=map.getBoundingClientRect();
   const widthRatio=rect.width/rect.height;
   const metrics={clientWidth:sc.clientWidth,clientHeight:sc.clientHeight,
     scrollWidth:sc.scrollWidth,scrollHeight:sc.scrollHeight,
     ratio:widthRatio,pawnCount:map.querySelectorAll('#quest-world-pawn').length};
   sc.scrollTo({left:sc.scrollWidth-sc.clientWidth,top:sc.scrollHeight-sc.clientHeight,behavior:'auto'});
   metrics.bottomRight=sc.scrollLeft>100&&sc.scrollTop>100;
   sc.scrollTo({left:0,top:0,behavior:'auto'});
   // Explicit find button works even before any authenticated game state is present.
   document.getElementById('quest-world-find-pawn').click();
   await new Promise(resolve=>setTimeout(resolve,750));
   metrics.focusX=sc.scrollLeft;metrics.focusY=sc.scrollTop;
   metrics.imageUnchanged=art.getAttribute('src')==='./assets/ustwo-world-original.webp';
   metrics.cardVisible=!!document.querySelector('#quest-card');
   return metrics;
  });
  assert.ok(result.scrollWidth>result.clientWidth*1.9,'wide panorama must scroll horizontally');
  assert.ok(result.scrollHeight>result.clientHeight*1.5,'tall map must scroll vertically');
  assert.ok(Math.abs(result.ratio-1279/720)<.03,'approved panorama must never stretch');
  assert.equal(result.pawnCount,1,'one common pawn only');
  assert.equal(result.imageUnchanged,true,'original board art must be unchanged');
  assert.equal(result.bottomRight,true,'both axes must really scroll');
  assert.ok(result.focusY>100,'find-pawn should move vertically to starting tile');
  assert.ok(result.focusX>20,'find-pawn should move horizontally to starting tile');
  assert.equal(result.cardVisible,true);
  console.log('PASS Chromium phone: giant original-ratio world, dual-axis touch pan, one pawn, center button, story card');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
