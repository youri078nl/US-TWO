/* US TWO portrait board: one server-authoritative pawn, exact previously approved
 * 2D Youri/Kim and Pepsi bitmaps, deterministic tile-by-tile movement.
 * No secondary positions, 3D transforms, stock characters or game writes.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 // The wide board is 1672x941. The game route is a SINGLE, ordered
 // 61-point path (start + 60 moves). The decorative paths in the painting
 // are not treated as extra branches or server game states.
 const ART_WIDTH=1672, ART_HEIGHT=941;
 const ROUTE_ANCHORS=[
  [110,765],[330,790],[580,806],[830,813],[1060,790],[1270,780],[1500,730],
  [1570,625],[1520,520],[1370,460],[1150,420],[920,412],[700,415],
  [480,408],[270,397],[95,373],[70,315],[250,300],[470,285],
  [700,280],[940,285],[1180,300],[1410,320],[1560,355]
 ];
 function makePath(){
  const distances=[0];
  for(let i=1;i<ROUTE_ANCHORS.length;i++){
   const [x,y]=ROUTE_ANCHORS[i],[px,py]=ROUTE_ANCHORS[i-1];
   distances.push(distances[i-1]+Math.hypot(x-px,y-py));
  }
  const total=distances[distances.length-1],points=[];
  for(let step=0;step<=60;step++){
   const d=total*step/60;
   let i=1;while(i<distances.length-1&&distances[i]<d)i++;
   const t=(d-distances[i-1])/(distances[i]-distances[i-1]);
   const [x0,y0]=ROUTE_ANCHORS[i-1],[x1,y1]=ROUTE_ANCHORS[i];
   points.push([Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t)]);
  }
  return points;
 }
 const PATH=makePath();
 // Supabase us_two_private.quest_world uses SIXTY steps per world, NOT 40.
 // The 40 authored quests per world are a catalogue size, not route length.
 const CELLS_PER_WORLD=60, DB='us-two-private-pawn-v1',TABLE='images';
 const WORLD_NAMES=['Liefdesbos','Avonturenland','Samen sterk','Droomwereld','Sterrenreis','Onze toekomst'];
 let activeKey='',position=null,worldIndex=null,revision=0,privateUrl='',defaultPromise=null;
 let animationTimer=null,lastMotion=null,replaying=false;
 const artChanged=()=>window.dispatchEvent(new Event('us-two-pawn-art-changed'));
 function storage(){
  return new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(TABLE))req.result.createObjectStore(TABLE);};
   req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);
  });
 }
 async function stored(key,value,write=false){
  const db=await storage();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(TABLE,write?'readwrite':'readonly');
   const r=write?tx.objectStore(TABLE).put(value,key):tx.objectStore(TABLE).get(key);
   r.onsuccess=()=>resolve(r.result);
   r.onerror=()=>reject(r.error);
   tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
 }
 function loadBitMap(src){
  return new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(Error('Goedgekeurde 2D-pion ontbreekt: '+src));
   img.src=src;
  });
 }
 async function defaultArt(){
  if(defaultPromise)return defaultPromise;
  const src='./assets/us-two-user-pawn.png';
  // Use the exact 1149x1369 transparent original. Previously compositing two
  // small thumbnails onto a 280px canvas noticeably reduced facial detail.
  defaultPromise=loadBitMap(src).then(img=>{
   if(img.naturalWidth!==1149||img.naturalHeight!==1369)
    throw Error('Onjuist formaat van de originele pion');
   return src;
  }).catch(error=>{defaultPromise=null;throw error;});
  return defaultPromise;
 }
 function showImage(url){
  const img=$('quest-world-pawn-art');if(!img)return;
  img.src=url;img.hidden=false;
  const pair=$('quest-world-approved-couple'),dog=$('quest-world-approved-pepsi');
  if(pair)pair.hidden=true;if(dog)dog.hidden=true;
  $('quest-world-fallback').hidden=true;
  artChanged();
 }
 function clearPrivate(){
  if(privateUrl){URL.revokeObjectURL(privateUrl);privateUrl='';}
 }
 function point(step,serverWorld=null){
  const local=((step%CELLS_PER_WORLD)+CELLS_PER_WORLD)%CELLS_PER_WORLD;
  const previousWorld=((Math.floor(step/CELLS_PER_WORLD)-1)%6+6)%6;
  const heldAtFinish=step>0&&local===0&&Number.isInteger(serverWorld)&&serverWorld===previousWorld;
  return PATH[heldAtFinish?CELLS_PER_WORLD:local];
 }
 function renderWorld(step,serverWorld){
  const world=Number.isInteger(serverWorld)?serverWorld:Math.floor(step/CELLS_PER_WORLD)%6;
  $('quest-world-heading').textContent='Wereld '+(world+1)+' · '+(WORLD_NAMES[world]||'Samen op pad');
  $('quest-world-cell').textContent='Vakje '+step+' ♡';
  const local=((step%CELLS_PER_WORLD)+CELLS_PER_WORLD)%CELLS_PER_WORLD;
  const progress=$('quest-world-progress-fill');
  if(progress)progress.style.width=(local/CELLS_PER_WORLD*100).toFixed(2)+'%';
  const label=$('quest-world-progress-label');
  if(label)label.textContent=local+' van '+CELLS_PER_WORLD+' stappen · volgende wereld over '+(CELLS_PER_WORLD-local);
 }
 function move(step,serverWorld=null){
  const el=$('quest-world-pawn');if(!el)return;
  const [x,y]=point(step,serverWorld);el.hidden=false;
  el.style.left=(x/ART_WIDTH*100).toFixed(4)+'%';
  el.style.top=(y/ART_HEIGHT*100).toFixed(4)+'%';
  el.dataset.tile=String(step);
 }
 function cancelMotion(){
  if(animationTimer!==null){clearTimeout(animationTimer);animationTimer=null;}
  replaying=false;
 }
 function progress(from,to,step){
  const el=$('quest-world-step-caption');
  if(el)el.textContent=from===to?'Vakje '+to+' · samen op pad':
   from+' → '+to+' · stap '+step+'/'+(to-from)+' · vakje '+(from+step);
 }
 function replayControls(){
  const btn=$('quest-world-replay');
  if(btn)btn.disabled=!lastMotion||!activeKey||replaying;
 }
 function animate(from,to,oldWorld=null,newWorld=worldIndex){
  cancelMotion();replaying=true;replayControls();
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   move(to,newWorld);renderWorld(to,newWorld);
   progress(from,to,to-from);replaying=false;replayControls();return;
  }
  const firstWorld=Number.isInteger(oldWorld)?oldWorld:Math.floor(from/CELLS_PER_WORLD)%6;
  move(from,firstWorld);renderWorld(from,firstWorld);progress(from,to,0);
  let step=0;
  // Keep each earned tile visible, without a 60-step animation taking minutes.
  const interval=Math.max(85,Math.min(235,3000/Math.max(1,to-from)));
  const tick=()=>{
   if(!activeKey||position!==to){cancelMotion();return;}
   step++;
   const at=from+step;
   const shownWorld=at===to?newWorld:Math.floor(at/CELLS_PER_WORLD)%6;
   move(at,shownWorld);renderWorld(at,shownWorld);progress(from,to,step);
   if(step<to-from)animationTimer=setTimeout(tick,interval);
   else{animationTimer=null;replaying=false;replayControls();}
  };
  animationTimer=setTimeout(tick,160);
 }
 async function loadImage(key){
  const token=++revision;
  clearPrivate();
  const status=$('quest-world-art-status');
  if(status)status.textContent='Originele 2D-pion instellen…';
  try{
   const url=await defaultArt();
   if(token!==revision||key!==activeKey)return;
   showImage(url);
   if(status)status.textContent='Jouw originele scherpe Youri-, Kim- en Pepsi-pion actief.';
  }catch(_error){
   if(token===revision&&key===activeKey){
    // Never replace approved people with invented stock characters.
    $('quest-world-fallback').hidden=false;
    if(status)status.textContent='De originele 2D-pion kon niet worden geladen. Controleer je verbinding.';
   }
  }
  try{
   const file=await stored(key);
   if(token!==revision||key!==activeKey)return;
   if(file instanceof Blob&&file.size>=100&&file.size<=10_000_000&&['image/png','image/webp'].includes(file.type)){
    privateUrl=URL.createObjectURL(file);showImage(privateUrl);
    if(status)status.textContent='Je gekozen originele pion is privé op dit toestel opgeslagen.';
   }
  }catch(_error){if(token===revision&&status)status.textContent='Goedgekeurde pion actief. Privé-opslag tijdelijk niet beschikbaar.';}
 }
 function clear(){
  ++revision;cancelMotion();activeKey='';position=null;worldIndex=null;lastMotion=null;
  clearPrivate();const pawn=$('quest-world-pawn');if(pawn)pawn.hidden=true;
  const art=$('quest-world-pawn-art');if(art){art.hidden=true;art.removeAttribute('src');}
  if($('quest-world-art-upload'))$('quest-world-art-upload').disabled=true;
  if($('quest-world-position'))$('quest-world-position').textContent='Geen gekoppelde serverstand geladen.';
  if($('quest-world-step-caption'))$('quest-world-step-caption').textContent='Log in om jullie vakje te zien.';
  replayControls();artChanged();
 }
 function update(state,identity){
  const key=identity?.paired&&identity.userId&&identity.coupleId?
   identity.userId+':'+identity.coupleId:'';
  if(!key||!state?.paired||!state?.initialized||!Number.isSafeInteger(state.position)||state.position<0){
   clear();return;
  }
  if(key!==activeKey){
   cancelMotion();activeKey=key;position=null;worldIndex=null;lastMotion=null;
   loadImage(key);
  }
  $('quest-world-art-upload').disabled=false;
  const next=state.position,old=position,oldWorld=worldIndex;
  const newWorld=Number.isInteger(state.world_index)?
   state.world_index:Math.floor(next/CELLS_PER_WORLD)%6;
  position=next;worldIndex=newWorld;
  $('quest-world-position').textContent='Samen op vak '+next+' · wereld '+(newWorld+1)+' van 6. De server bepaalt de voortgang.';
  if(old===null){
   // Server completion history survives a browser restart. Restore replay
   // without claiming points again or automatically moving the real game.
   const h=Array.isArray(state.history)?state.history.find(x=>
    Number.isSafeInteger(x?.from)&&Number.isSafeInteger(x?.to)&&
    x.from>=0&&x.to===next&&x.to>x.from):null;
   lastMotion=h?{from:h.from,to:h.to}:null;
   move(next,newWorld);renderWorld(next,newWorld);
   if(lastMotion)progress(lastMotion.from,next,next-lastMotion.from);
   else progress(next,next,0);
  }else if(next===old){
   // Do not interrupt an ongoing step animation when a background poll repeats
   // the same position. A superdate unlock can change the world at this tile.
   if(!replaying){move(next,newWorld);renderWorld(next,newWorld);}
  }else if(next<old){
   cancelMotion();lastMotion=null;
   move(next,newWorld);renderWorld(next,newWorld);progress(next,next,0);
  }else{
   lastMotion={from:old,to:next};
   animate(old,next,oldWorld,newWorld);
  }
  replayControls();
 }
 async function upload(){
  const input=$('quest-world-art-upload'),key=activeKey,file=input?.files?.[0];
  if(input)input.value='';if(!key||!file)return;
  if(!['image/png','image/webp'].includes(file.type)||file.size>10_000_000||file.size<100){
   $('quest-world-art-status').textContent='Gebruik een originele PNG/WebP van maximaal 10 MB.';return;
  }
  $('quest-world-art-status').textContent='Privé-pion opslaan…';
  try{await stored(key,file,true);if(activeKey===key)await loadImage(key);}
  catch(_error){if(activeKey===key)$('quest-world-art-status').textContent='Opslaan mislukt. De goedgekeurde standaardpion blijft bestaan.';}
 }
 function drawRoute(){
  const stage=$('quest-board-stage');if(!stage||stage.querySelector('#quest-route-guide'))return;
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.id='quest-route-guide';
  svg.setAttribute('viewBox','0 0 1672 941');svg.setAttribute('aria-hidden','true');
  const line=document.createElementNS(ns,'polyline');
  line.setAttribute('points',PATH.map(p=>p.join(',')).join(' '));
  line.setAttribute('fill','none');line.setAttribute('stroke','#ffe6aa');
  line.setAttribute('stroke-width','5');line.setAttribute('stroke-dasharray','10 8');
  line.setAttribute('stroke-linecap','round');line.setAttribute('opacity','.85');
  svg.appendChild(line);
  PATH.forEach(([x,y],i)=>{
   const dot=document.createElementNS(ns,'circle');
   dot.setAttribute('cx',x);dot.setAttribute('cy',y);
   dot.setAttribute('r',i%10===0?12:5);
   dot.setAttribute('fill',i%10===0?'#fff4bc':'#ff9d67');
   dot.setAttribute('stroke','#6a2a4e');dot.setAttribute('stroke-width','2');
   svg.appendChild(dot);
   if(i%10===0){
    const label=document.createElementNS(ns,'text');
    label.setAttribute('x',x);label.setAttribute('y',y+4);
    label.setAttribute('text-anchor','middle');label.setAttribute('font-size','12');
    label.setAttribute('font-weight','bold');label.setAttribute('fill','#391b30');
    label.textContent=String(i);svg.appendChild(label);
   }
  });
  stage.insertBefore(svg,stage.querySelector('#quest-world-pawn'));
 }
 function bind(){
  if(!$('quest-world-pawn'))return;
  drawRoute();
  move(0);$('quest-world-pawn').hidden=true;
  $('quest-world-art-upload')?.addEventListener('change',upload);
  $('quest-world-replay')?.addEventListener('click',()=>{
   if(!activeKey||!lastMotion||replaying||position!==lastMotion.to)return;
   animate(lastMotion.from,lastMotion.to,null,worldIndex);
  });
  window.addEventListener('us-two-session-cleared',clear);
  replayControls();
 }
 window.USTwoQuestBoard=Object.freeze({update,clear,pathPoint:point});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
