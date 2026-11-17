/* US TWO portrait board: one server-authoritative pawn, exact previously approved
 * 2D Youri/Kim and Pepsi bitmaps, deterministic tile-by-tile movement.
 * No secondary positions, 3D transforms, stock characters or game writes.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 // Coordinates measured on the approved 1024x1536 portrait path,
 // starting at the bottom portal and following the connected heart tiles.
 const PATH=[
  [158,1426],[260,1443],[417,1411],[563,1384],
  [433,1315],[304,1286],[244,1202],[283,1130],
  [410,1070],[570,1028],[712,989],[746,904],
  [624,868],[488,831],[335,788],[268,727],
  [350,675],[511,643],[608,578],[622,508],
  [563,453],[444,418],[315,393],[255,334],
  [305,287],[437,274],[567,252],[698,219],
  [821,180]
 ];
 const MAX=(PATH.length-1), DB='us-two-private-pawn-v1',TABLE='images';
 let activeKey='',position=null,revision=0,privateUrl='',defaultUrl='',defaultPromise=null;
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
  if(defaultUrl)return defaultUrl;
  if(defaultPromise)return defaultPromise;
  defaultPromise=(async()=>{
   const [couple,dog]=await Promise.all([
    loadBitMap('./assets/approved-youri-kim.webp'),
    loadBitMap('./assets/approved-pepsi.webp')
   ]);
   const canvas=document.createElement('canvas');canvas.width=280;canvas.height=212;
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('Geen 2D-tekenvlak beschikbaar');
   // Both ORIGINAL images retain their precise appearance and transparency.
   // Composite into ONE sprite, never a second pawn or dog on a different tile.
   ctx.clearRect(0,0,280,212);
   ctx.drawImage(couple,14,8,195,187);
   ctx.drawImage(dog,183,73,81,137);
   const png=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Sprite niet gemaakt')),'image/png'));
   defaultUrl=URL.createObjectURL(png);return defaultUrl;
  })().catch(error=>{defaultPromise=null;throw error;});
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
 function point(step){
  // The same route is reused visually when the next server world begins.
  // It never changes the actual stored global game position.
  const local=((step%(MAX+1))+(MAX+1))%(MAX+1);
  return PATH[local];
 }
 function move(step){
  const el=$('quest-world-pawn');if(!el)return;
  const [x,y]=point(step);el.hidden=false;
  el.style.left=(x/1024*100).toFixed(4)+'%';
  el.style.top=(y/1536*100).toFixed(4)+'%';
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
 function animate(from,to){
  cancelMotion();replaying=true;replayControls();
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   move(to);progress(from,to,to-from);replaying=false;replayControls();return;
  }
  move(from);progress(from,to,0);
  let step=0;
  const tick=()=>{
   if(!activeKey||position!==to){cancelMotion();return;}
   step++;move(from+step);progress(from,to,step);
   if(step<to-from)animationTimer=setTimeout(tick,235);
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
   if(status)status.textContent='Goedgekeurde Youri-, Kim- en Pepsi-pion actief.';
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
  ++revision;cancelMotion();activeKey='';position=null;lastMotion=null;
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
   cancelMotion();activeKey=key;position=null;lastMotion=null;
   loadImage(key);
  }
  $('quest-world-art-upload').disabled=false;
  const next=state.position,old=position;
  position=next;
  const world=Number.isInteger(state.world_index)?state.world_index+1:Math.min(6,Math.floor(next/40)+1);
  const names=['Liefdesbos','Avonturenland','Samen sterk','Droomwereld','Sterrenreis','Onze toekomst'];
  $('quest-world-heading').textContent='Wereld '+world+' · '+(names[world-1]||'Samen op pad');
  $('quest-world-cell').textContent='Vakje '+next+' ♡';
  $('quest-world-position').textContent='Samen op vak '+next+' · wereld '+world+' van 6. De server bepaalt de voortgang.';
  if(old===null||next<=old||next-old>8){
   cancelMotion();move(next);progress(next,next,0);
   if(old!==null&&next<old)lastMotion=null;
  }else{
   lastMotion={from:old,to:next};animate(old,next);
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
 function bind(){
  if(!$('quest-world-pawn'))return;
  move(0);$('quest-world-pawn').hidden=true;
  $('quest-world-art-upload')?.addEventListener('change',upload);
  $('quest-world-replay')?.addEventListener('click',()=>{
   if(!activeKey||!lastMotion||replaying||position!==lastMotion.to)return;
   animate(lastMotion.from,lastMotion.to);
  });
  window.addEventListener('us-two-session-cleared',clear);
  replayControls();
 }
 window.USTwoQuestBoard=Object.freeze({update,clear,pathPoint:point});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
