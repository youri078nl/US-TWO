/* US TWO portrait board: one server-authoritative pawn, exact previously approved
 * 2D Youri/Kim and Pepsi bitmaps, deterministic tile-by-tile movement.
 * No secondary positions, 3D transforms, stock characters or game writes.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 // The author's original art is 941x1672. Waypoints follow its PINK heart
 // tiles from the lower-right gold portal, around the cinema, towards the airport.
 // They are IMAGE coordinates, not screen pixels, so mobile scaling is exact.
 const ART_WIDTH=941, ART_HEIGHT=1672;
 const PATH=[
  [810,1000],[783,982],[743,958],[687,930],[625,916],
  [569,894],[509,872],[449,851],[396,825],[348,802],
  [311,769],[288,736],[297,697],[328,662],[374,634],
  [418,603],[442,572],[443,543],[419,513],[388,481],
  [351,454],[348,423],[373,402],[412,382],[458,364],
  [518,346],[580,331],[648,329],[710,341],[777,369],[839,399]
 ];
 // Server and client both use 40 earned steps per world (240 across six worlds).
 // Bergbos has a different illustrated route from the original board.
 // Coordinates are measured on the approved 409x626 Bergbos preview.
 // Six themed maps use the same S-shaped route geometry. All coordinates
 // are normalized against the 409x626 approved portrait artwork.
 // Start is the lowest heart tile at the bottom-right, not the large characters.
 const THEMED_PATH=[
  // Measured along the visible heart road. The start is the bottom heart gate.
  [257,548],[280,552],[305,556],[330,556],[355,551],[377,543],[381,519],[377,491],[362,466],
  [335,450],[300,437],[265,424],[229,410],[193,396],
  [157,382],[123,370],[88,355],[62,337],[49,317],
  [57,298],[78,283],[108,270],[142,257],[176,245],
  [211,233],[245,220],[269,205],[270,190],[253,175],
  [224,164],[192,154],[162,144],[141,132],[150,119],
  [180,113],[215,108],[250,104],[284,99],[317,95]
 ].map(([x,y])=>[x*ART_WIDTH/409,y*ART_HEIGHT/626]);
 // Exact logical board: 40 distinct DOM cells. The background is decorative.
 // Reuse this same function for rendering and for pawn movement.
 function tilePoint(tile){
  const n=Math.max(0,Math.min(40,tile));
  const f=n*(THEMED_PATH.length-1)/40;
  const a=Math.floor(f),b=Math.min(THEMED_PATH.length-1,a+1),t=f-a;
  return [THEMED_PATH[a][0]*(1-t)+THEMED_PATH[b][0]*t,
          THEMED_PATH[a][1]*(1-t)+THEMED_PATH[b][1]*t];
 }
 function buildTiles(){
  const stage=$('quest-board-stage');if(!stage||$('quest-board-tiles'))return;
  const layer=document.createElement('div');
  layer.id='quest-board-tiles';layer.className='quest-board-tiles';
  layer.setAttribute('aria-label','40 speelvakjes, van start tot het wereldportaal');
  for(let i=1;i<=40;i++){
   const [x,y]=tilePoint(i);
   const el=document.createElement('span');
   el.className='quest-board-tile';el.dataset.tile=String(i);
   el.style.left=(x/ART_WIDTH*100).toFixed(4)+'%';
   el.style.top=(y/ART_HEIGHT*100).toFixed(4)+'%';
   el.textContent=String(i);el.setAttribute('aria-label','Vak '+i);
   layer.appendChild(el);
  }
  const pawn=$('quest-world-pawn');stage.insertBefore(layer,pawn||null);
 }
 function updateTiles(step){
  const layer=$('quest-board-tiles');if(!layer)return;
  const local=((step%40)+40)%40;
  const completed=step>0&&local===0?40:local;
  for(const el of layer.children){
   const n=Number(el.dataset.tile);
   el.classList.toggle('is-completed',n<=completed);
   el.classList.toggle('is-current',n===completed);
  }
 }
 const CELLS_PER_WORLD=40, DB='us-two-private-pawn-v1',TABLE='images';
 const WORLD_NAMES=['Bergbos','Moulin Rouge','Middeleeuwen','Vakantie','Fantasie','Snoepland'];
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
  // Forty canonical moves along illustrated anchors. Every server tile is a
  // distinct interpolation point until the next world actually unlocks.
  const local=((step%CELLS_PER_WORLD)+CELLS_PER_WORLD)%CELLS_PER_WORLD;
  const previousWorld=((Math.floor(step/CELLS_PER_WORLD)-1)%6+6)%6;
  const heldAtPortal=step>0&&local===0&&Number.isInteger(serverWorld)&&serverWorld===previousWorld;
  const art=$('quest-world-stage')||$('quest-board-stage');
  const hasThemedArt=art?.querySelector('.quest-world-art')?.dataset.worldImageApplied==='themed';
  const anchors=hasThemedArt?THEMED_PATH:PATH;
  if(hasThemedArt)return tilePoint(heldAtPortal?40:local).map(Math.round);
  const fraction=(heldAtPortal?CELLS_PER_WORLD:local)*(anchors.length-1)/CELLS_PER_WORLD;
  const a=Math.floor(fraction),b=Math.min(anchors.length-1,a+1),t=fraction-a;
  return [Math.round(anchors[a][0]*(1-t)+anchors[b][0]*t),
          Math.round(anchors[a][1]*(1-t)+anchors[b][1]*t)];
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
  updateTiles(step);
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
 function bind(){
  if(!$('quest-world-pawn'))return;
  buildTiles();move(0);$('quest-world-pawn').hidden=true;
  $('quest-world-art-upload')?.addEventListener('change',upload);
  $('quest-world-replay')?.addEventListener('click',()=>{
   if(!activeKey||!lastMotion||replaying||position!==lastMotion.to)return;
   animate(lastMotion.from,lastMotion.to,null,worldIndex);
  });
  window.addEventListener('us-two-world-art-updated',()=>{if(position!==null)move(position,worldIndex);});
  window.addEventListener('us-two-session-cleared',clear);
  replayControls();
 }
 window.USTwoQuestBoard=Object.freeze({update,clear,pathPoint:point});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
