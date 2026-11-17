/* US TWO mobile board interaction. PURE VIEW TRANSFORMS:
 * drag, zoom, reset and visit locations. Never writes server game position.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const BASE=1.14,MAX=2.6;
 let zoom=BASE,x=0,y=0,drag=null,suppressLocationClick=false;
 const viewport=()=> $('quest-world-viewport');
 const stage=()=> $('quest-board-stage');
 function clamp(){
  const el=viewport();if(!el)return;
  const w=el.clientWidth,h=el.clientHeight;
  const maxX=Math.max(0,(zoom-1)*w/2),maxY=Math.max(0,(zoom-1)*h/2);
  x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));
 }
 function paint(){
  clamp();
  const node=stage();if(!node)return;
  node.style.transform='translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0) scale('+zoom.toFixed(3)+')';
  const label=$('quest-board-zoom-level');if(label)label.textContent=Math.round(zoom*100)+'%';
  const minus=$('quest-board-zoom-out');if(minus)minus.disabled=zoom<=1.01;
  const plus=$('quest-board-zoom-in');if(plus)plus.disabled=zoom>=MAX-.01;
 }
 function changeZoom(value){
  zoom=Math.max(1,Math.min(MAX,Math.round(value*100)/100));paint();
 }
 function reset(){zoom=BASE;x=0;y=0;drag=null;paint();}
 function centerPawn(){
  const pawn=$('quest-world-pawn'),el=viewport();
  if(!pawn||!el||pawn.hidden)return reset();
  zoom=Math.max(1.42,zoom);
  const left=Number.parseFloat(pawn.style.left),top=Number.parseFloat(pawn.style.top);
  if(!Number.isFinite(left)||!Number.isFinite(top))return reset();
  x=-(left/100-.5)*el.clientWidth*zoom;
  y=-(top/100-.5)*el.clientHeight*zoom;
  paint();
 }
 function onDown(event){
  if(event.button!==0)return;
  suppressLocationClick=false;
  if(drag)return;
  drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,
    originX:x,originY:y,shifted:false};
 }
 function onMove(event){
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(!drag.shifted){
   if(Math.hypot(dx,dy)<=6)return;
   drag.shifted=true;
   viewport()?.setPointerCapture?.(event.pointerId);
  }
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
  // A pan must never accidentally activate a location underneath the released finger.
  el.addEventListener('click',event=>{
   if(!suppressLocationClick)return;
   suppressLocationClick=false;
   event.preventDefault();event.stopImmediatePropagation();
  },true);
  el.addEventListener('pointerdown',onDown);
  el.addEventListener('pointermove',onMove);
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
  window.addEventListener('resize',paint);
  window.addEventListener('us-two-session-cleared',reset);
  reset();
 }
 window.USTwoBoardInteraction=Object.freeze({
  reset,centerPawn,changeZoom,
  getState:()=>({zoom,x,y})
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
