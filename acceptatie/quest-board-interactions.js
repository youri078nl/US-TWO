/* US TWO mobile board interaction. PURE VIEW TRANSFORMS:
 * drag, zoom, reset and visit locations. Never writes server game position.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const MAX=2.6;
 let zoom=1,x=0,y=0,drag=null,suppressLocationClick=false;
 const viewport=()=> $('quest-world-viewport');
 const stage=()=> $('quest-board-stage');
 function sizeStage(){
  const el=viewport(),node=stage(),img=node?.querySelector('.quest-world-art');
  if(!el||!node||!img)return;
  const w=img.naturalWidth||941,h=img.naturalHeight||1672;
  const ratio=w/h;
  // Portrait: preserve the approved full-width artwork. Landscape: make the
  // board wider than the phone so the player can pan left and right.
  const desiredWidth=ratio>1?Math.max(el.clientWidth*1.65,el.clientHeight*ratio):el.clientWidth;
  node.style.width=desiredWidth.toFixed(2)+'px';
  node.style.height=(desiredWidth/ratio).toFixed(2)+'px';
  node.style.aspectRatio=w+' / '+h;
  node.style.left=((el.clientWidth-desiredWidth)/2).toFixed(2)+'px';
 }
 function fitZoom(){
  const el=viewport(),board=stage();
  if(!el||!board)return 1;
  return Math.min(1,el.clientWidth/Math.max(1,board.offsetWidth),el.clientHeight/Math.max(1,board.offsetHeight));
 }
 function clamp(){
  const el=viewport();if(!el)return;
  const w=el.clientWidth,h=el.clientHeight,board=stage();
  const boardW=board?.offsetWidth||w,boardH=board?.offsetHeight||h;
  const maxX=Math.max(0,(zoom*boardW-w)/2),maxY=Math.max(0,(zoom*boardH-h)/2);
  x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));
 }
 function paint(){
  const node=stage(),el=viewport();if(!node||!el)return;
  sizeStage();
  // The full portrait image stays at its natural aspect ratio. Center it in
  // the shorter viewing window, then allow panning to BOTH distant ends.
  node.style.top=((el.clientHeight-node.offsetHeight)/2).toFixed(2)+'px';
  clamp();
  node.style.transform='translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0) scale('+zoom.toFixed(3)+')';
  const label=$('quest-board-zoom-level');if(label)label.textContent=Math.round(zoom*100)+'%';
  const minus=$('quest-board-zoom-out');if(minus)minus.disabled=zoom<=fitZoom()+.01;
  const plus=$('quest-board-zoom-in');if(plus)plus.disabled=zoom>=MAX-.01;
 }
 function changeZoom(value){
  zoom=Math.max(fitZoom(),Math.min(MAX,Math.round(value*100)/100));paint();
 }
 function reset(){sizeStage();zoom=fitZoom();x=0;y=0;drag=null;paint();}
 function centerPawn(){
  const pawn=$('quest-world-pawn'),el=viewport();
  if(!pawn||!el||pawn.hidden)return reset();
  zoom=Math.max(1.42,zoom);
  const left=Number.parseFloat(pawn.style.left),top=Number.parseFloat(pawn.style.top);
  if(!Number.isFinite(left)||!Number.isFinite(top))return reset();
  const board=stage();
  x=-(left/100-.5)*(board?.offsetWidth||el.clientWidth)*zoom;
  y=-(top/100-.5)*(board?.offsetHeight||el.clientHeight)*zoom;
  paint();
 }
 function onDown(event){
  if(event.button!==0)return;
  suppressLocationClick=false;
  if(drag)return;
  drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,
    originX:x,originY:y,shifted:false};
  // Capture immediately: on mobile a finger can leave a child element before
  // the movement threshold, otherwise the lower half becomes unreachable.
  try{viewport()?.setPointerCapture?.(event.pointerId);}catch(_e){}
 }
 function onMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(!drag.shifted){
   if(Math.hypot(dx,dy)<=6)return;
   drag.shifted=true;
  }
  if(event.cancelable)event.preventDefault();
  x=drag.originX+dx;y=drag.originY+dy;
  paint();
 }
 function onUp(event){
  if(!drag||event.pointerId!==drag.id)return;
  suppressLocationClick=drag.shifted;
  drag=null;
  try{if(viewport()?.hasPointerCapture?.(event.pointerId))viewport().releasePointerCapture(event.pointerId);}catch(_e){}
 }
 function bind(){
  const el=viewport();if(!el||!stage())return;
  // Remove the rejected 0–60 decorative overlay if an older cached module
  // injected it before this module ran. It is NOT part of the approved board.
  stage().querySelectorAll('#quest-route-guide').forEach(node=>node.remove());
  // A pan must never accidentally activate a location underneath the released finger.
  el.addEventListener('click',event=>{
   if(!suppressLocationClick)return;
   suppressLocationClick=false;
   event.preventDefault();event.stopImmediatePropagation();
  },true);
  el.addEventListener('pointerdown',onDown);
  el.addEventListener('pointermove',onMove,{passive:false});
  el.addEventListener('pointerup',onUp);
  el.addEventListener('pointercancel',onUp);
  el.addEventListener('lostpointercapture',()=>{drag=null;});
  el.addEventListener('wheel',event=>{
   if(!event.ctrlKey)return;
   event.preventDefault();
   changeZoom(zoom+(event.deltaY<0?.15:-.15));
  },{passive:false});
  $('quest-board-zoom-in')?.addEventListener('click',()=>changeZoom(zoom+.3));
  $('quest-board-zoom-out')?.addEventListener('click',()=>changeZoom(zoom-.3));
  $('quest-board-center')?.addEventListener('click',centerPawn);
  for(const button of el.querySelectorAll('button[data-location]')){
   button.addEventListener('click',()=>{
    // A location is a FILTER, never an extra pawn move or reward.
    window.USTwoDateBrowser?.openLocation(button.dataset.location);
   });
  }
  const art=stage().querySelector('.quest-world-art');
  if(art&&!art.complete)art.addEventListener('load',reset,{once:true});
  window.addEventListener('resize',paint);
  // Responsive layout changes (including browser address-bar changes) must
  // recalculate the visible board boundaries without resetting the drag.
  if(typeof ResizeObserver!=='undefined'){
   const observer=new ResizeObserver(()=>paint());
   observer.observe(el);observer.observe(stage());
  }
  window.addEventListener('us-two-session-cleared',reset);
  reset();
 }
 window.USTwoBoardInteraction=Object.freeze({
  reset,centerPawn,changeZoom,
  getState:()=>({zoom,x,y})
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
