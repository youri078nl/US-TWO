/* US TWO approved frame-by-frame 2D animations.
 * Uses ONLY user-supplied PNG/WebP frames, stored on THIS device for THIS account.
 * Zero server uploads, no synthesized replacement characters.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const DB='us-two-approved-pose-frames-v1',STORE='clips';
 const SCENES=['pepsi','kiss','hug','dance','walk','stars','five','play','calm'];
 const MAX_FRAMES=24,MAX_FRAME_BYTES=4_000_000,MAX_TOTAL=20_000_000;
 let account='',scene='',selected='',frames=null,loadedKey='',token=0,playing=false,urls=[],timer=null,sourceImage='';
 const key=(a,s)=>a+'::'+s;
 const name=(s)=>({pepsi:'Balspel met Pepsi',kiss:'Zoenen',hug:'Knuffelen',dance:'Dansen',
   walk:'Wandelen',stars:'Sterren kijken',five:'Samen vieren',play:'Spel en plezier',
   calm:'Rustig samen'})[s]||s;
 function status(message){if($('quest-pose-status'))$('quest-pose-status').textContent=message;}
 function open(){
  if(!window.indexedDB)return Promise.reject(Error('IndexedDB niet beschikbaar'));
  return new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
   req.onerror=()=>reject(req.error||Error('Opslag niet beschikbaar'));
   req.onsuccess=()=>resolve(req.result);
  });
 }
 async function read(k){
  const db=await open();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(k);
   r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
  });}finally{db.close();}
 }
 async function write(k,value,remove=false){
  const db=await open();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   if(remove)tx.objectStore(STORE).delete(k);else tx.objectStore(STORE).put(value,k);
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
   tx.onabort=()=>reject(tx.error||Error('Opslag geweigerd'));
  });}finally{db.close();}
 }
 function controls(){
  const enabled=Boolean(account);
  if($('quest-pose-scene'))$('quest-pose-scene').disabled=!enabled;
  if($('quest-pose-upload'))$('quest-pose-upload').disabled=!enabled||playing;
  if($('quest-pose-remove'))$('quest-pose-remove').disabled=!enabled||!loadedKey||!frames||playing;
 }
 function stop(){
  if(timer!==null){clearTimeout(timer);timer=null;}
  const image=$('quest-world-pawn-art');
  if(image&&urls.length){
   const now=image.getAttribute('src');
   if(now&&urls.includes(now)&&sourceImage&&!image.hidden)image.src=sourceImage;
  }
  urls.forEach(url=>URL.revokeObjectURL(url));urls=[];sourceImage='';
  playing=false;
  $('quest-world-pawn')?.removeAttribute('data-framepack');
  controls();
 }
 async function load(){
  const n=++token,k=account&&SCENES.includes(selected)?key(account,selected):'';
  frames=null;loadedKey='';
  controls();
  if(!k){status('Koppel eerst jullie accounts om goedgekeurde beeldreeksen lokaal te gebruiken.');return;}
  status('Goedgekeurde beeldreeks controleren…');
  try{
   const saved=await read(k);
   if(n!==token||key(account,selected)!==k)return;
   if(saved?.frames?.length>=2&&saved.frames.length<=MAX_FRAMES&&
     saved.frames.every(f=>f instanceof Blob&&['image/png','image/webp'].includes(f.type)&&f.size<=MAX_FRAME_BYTES)){
    frames=saved.frames;loadedKey=k;
    status(frames.length+' originele beeldframes op dit toestel geladen voor '+name(selected)+
      '. Deze blijven privé en veranderen de pion niet.');
   }else status('Nog geen goedgekeurde beeldreeks voor '+name(selected)+
     '. De bestaande eenvoudige beweging blijft beschikbaar.');
  }catch(_error){
   if(n===token)status('Lokale beeldreeks niet toegankelijk. De bestaande beweging blijft beschikbaar.');
  }
  controls();
 }
 function update(identity,activeScene){
  const next=identity?.paired&&identity?.userId&&identity?.coupleId?
    identity.userId+':'+identity.coupleId:'';
  const desired=SCENES.includes(activeScene)?activeScene:'';
  if(next===account&&desired===scene)return;
  stop();account=next;scene=desired;
  // Only expose the scenes for the paired account. The chosen pose may differ
  // from the active card, but playback NEVER uses the wrong scene.
  selected=desired||SCENES[0];
  if($('quest-pose-scene'))$('quest-pose-scene').value=selected;
  load();
 }
 function play(sceneToPlay,onFinished){
  if(!account||!SCENES.includes(sceneToPlay)||loadedKey!==key(account,sceneToPlay)||
     !frames||frames.length<2||playing)return false;
  const image=$('quest-world-pawn-art'),pawn=$('quest-world-pawn');
  if(!image||image.hidden||!image.getAttribute('src')||!pawn)return false;
  const current=frames;
  try{urls=current.map(frame=>URL.createObjectURL(frame));}catch(_e){stop();return false;}
  sourceImage=image.getAttribute('src');playing=true;
  pawn.setAttribute('data-framepack','true');
  let index=0;
  const tick=()=>{
   if(!playing)return;
   image.src=urls[index++];
   if(index<urls.length)timer=setTimeout(tick,Math.max(130,Math.min(280,220-Math.floor(urls.length/3))));
   else timer=setTimeout(()=>{
     stop();
     if(typeof onFinished==='function')onFinished();
   },300);
  };
  tick();controls();return true;
 }
 async function onUpload(){
  const input=$('quest-pose-upload');
  const list=Array.from(input?.files||[]);if(input)input.value='';
  if(!account||!SCENES.includes(selected))return;
  if(list.length<2||list.length>MAX_FRAMES||
    list.some(f=>!['image/png','image/webp'].includes(f.type)||f.size<100||f.size>MAX_FRAME_BYTES)||
    list.reduce((sum,f)=>sum+f.size,0)>MAX_TOTAL){
   status('Kies 2 tot 24 goedgekeurde PNG/WebP-frames, maximaal 4 MB per frame en 20 MB totaal.');
   return;
  }
  // Number-aware filename order means scene_2 precedes scene_10.
  const sorted=list.sort((a,b)=>a.name.localeCompare(b.name,'nl',{numeric:true,sensitivity:'base'}));
  const wanted=key(account,selected),n=++token;
  status('Beeldreeks lokaal opslaan…');
  try{
   await write(wanted,{frames:sorted,scene:selected,createdAt:new Date().toISOString(),
     version:1,filenames:sorted.map(f=>f.name)});
   if(account&&key(account,selected)===wanted&&n===token)await load();
  }catch(_err){if(n===token)status('Opslaan mislukt. Controleer beschikbare opslag op je toestel.');}
 }
 async function remove(){
  if(!account||!SCENES.includes(selected)||!loadedKey)return;
  if(!window.confirm('De lokale goedgekeurde beeldreeks voor '+name(selected)+' verwijderen? De originele pion blijft behouden.'))return;
  const target=key(account,selected),n=++token;
  stop();
  try{await write(target,null,true);if(n===token&&target===key(account,selected))await load();}
  catch(_err){if(n===token)status('Verwijderen van de lokale beeldreeks mislukt.');}
 }
 function clear(){++token;stop();account='';scene='';selected='';frames=null;loadedKey='';controls();
  status('Beeldreeksen verborgen na uitloggen. Opgeslagen frames blijven privé per account.');}
 function bind(){
  if(!$('quest-pose-upload'))return;
  $('quest-pose-upload').addEventListener('change',onUpload);
  $('quest-pose-scene')?.addEventListener('change',()=>{
   stop();selected=$('quest-pose-scene').value;load();
  });
  $('quest-pose-remove')?.addEventListener('click',remove);
  window.addEventListener('us-two-session-cleared',clear);
  window.addEventListener('us-two-pawn-art-changed',()=>{if(playing)stop();});
  window.addEventListener('us-two-tab-changed',e=>{if(e.detail?.tab!=='game')stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  controls();
 }
 window.USTwoPoseFrames=Object.freeze({update,play,stop,clear,hasSelected:()=>Boolean(frames&&loadedKey===key(account,scene)),sceneNames:SCENES});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
