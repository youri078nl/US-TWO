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
 let account='',scene='',selected='',frames=null,loadedKey='',token=0,playing=false,urls=[],timer=null,previewUrl='';
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
  if($('quest-pose-zip'))$('quest-pose-zip').disabled=!enabled||playing;
  if($('quest-pose-remove'))$('quest-pose-remove').disabled=!enabled||!loadedKey||!frames||playing;
 }
 function hidePreview(){
  const preview=$('quest-world-pose-frame');
  if(preview){preview.hidden=true;preview.removeAttribute('src');}
  if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}
 }
 function showPreview(){
  const image=$('quest-world-pose-frame'),original=$('quest-world-pawn-art');
  if(!image||!original||original.hidden||!original.getAttribute('src')||
     playing||!frames?.length||selected!==scene||loadedKey!==key(account,scene))return;
  if(!previewUrl)previewUrl=URL.createObjectURL(frames[0]);
  image.src=previewUrl;image.hidden=false;
 }
 function stop(){
  if(timer!==null){clearTimeout(timer);timer=null;}
  const preview=$('quest-world-pose-frame');
  if(preview){
   if(previewUrl&&loadedKey===key(account,scene)){
    preview.src=previewUrl;preview.hidden=false;
   }else{preview.hidden=true;preview.removeAttribute('src');}
  }
  urls.forEach(url=>URL.revokeObjectURL(url));urls=[];
  playing=false;
  $('quest-world-pawn')?.removeAttribute('data-framepack');
  controls();
 }
 async function load(){
  const n=++token,k=account&&SCENES.includes(selected)?key(account,selected):'';
  frames=null;loadedKey='';hidePreview();
  controls();
  if(!k){status('Koppel eerst jullie accounts om goedgekeurde beeldreeksen lokaal te gebruiken.');return;}
  status('Goedgekeurde beeldreeks controleren…');
  try{
   const saved=await read(k);
   if(n!==token||key(account,selected)!==k)return;
   if(saved?.frames?.length>=2&&saved.frames.length<=MAX_FRAMES&&
     saved.frames.every(f=>f instanceof Blob&&['image/png','image/webp'].includes(f.type)&&f.size<=MAX_FRAME_BYTES)){
    frames=saved.frames;loadedKey=k;
    showPreview();
    status(frames.length+' originele beeldframes op dit toestel geladen voor '+name(selected)+
      '. Deze blijven privé en veranderen de pion niet.');
   }else status('Nog geen goedgekeurde beeldreeks voor '+name(selected)+
     '. De bestaande eenvoudige beweging blijft beschikbaar.');
  }catch(_error){
   if(n===token)status('Lokale beeldreeks niet toegankelijk. De bestaande beweging blijft beschikbaar.');
  }
  controls();
  window.dispatchEvent(new Event('us-two-poses-changed'));
 }
 async function writeBundle(wanted,entries){
  const db=await open();
  try{
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      try{
        for(const entry of entries){
          tx.objectStore(STORE).put({
            frames:entry.frames,scene:entry.scene,createdAt:new Date().toISOString(),
            version:1,filenames:entry.filenames
          },key(wanted,entry.scene));
        }
      }catch(error){tx.abort();reject(error);return;}
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error||Error('Opslag geweigerd'));
      tx.onabort=()=>reject(tx.error||Error('Opslag afgebroken'));
    });
  }finally{db.close();}
 }
 async function importBundle(){
  const input=$('quest-pose-zip'),file=input?.files?.[0];
  if(input)input.value='';
  if(!file||!account||playing)return;
  const wanted=account,n=++token;
  status('Posepakket controleren. De beelden worden niet verstuurd.');
  try{
    if(!window.USTwoPoseArchive?.parseZip)
      throw Error('De lokale ZIP-lezer kon niet worden geladen.');
    const entries=await window.USTwoPoseArchive.parseZip(file);
    if(wanted!==account||n!==token)return;
    if(!window.confirm('Importeer '+entries.length+' goedgekeurde 2D-scènes uitsluitend op dit toestel? Bestaande lokale beeldreeksen voor die scènes worden vervangen.'))return;
    if(wanted!==account||n!==token)return;
    await writeBundle(wanted,entries);
    if(wanted!==account||n!==token)return;
    await load();
    status(entries.length+' 2D-scènes veilig en privé geïmporteerd voor dit account. De bestaande personages en de gezamenlijke pion blijven behouden.');
  }catch(error){
    if(wanted===account&&n===token)
      status('Posepakket niet geïmporteerd: '+String(error?.message||error).slice(0,180));
  }
 }
 function update(identity,activeScene){
  const next=identity?.paired&&identity?.userId&&identity?.coupleId?
    identity.userId+':'+identity.coupleId:'';
  const desired=SCENES.includes(activeScene)?activeScene:'';
  if(next===account&&desired===scene)return;
  stop();hidePreview();account=next;scene=desired;
  // Only expose the scenes for the paired account. The chosen pose may differ
  // from the active card, but playback NEVER uses the wrong scene.
  selected=desired||SCENES[0];
  if($('quest-pose-scene'))$('quest-pose-scene').value=selected;
  load();
 }
 function play(sceneToPlay,onFinished){
  if(!account||!SCENES.includes(sceneToPlay)||loadedKey!==key(account,sceneToPlay)||
     !frames||frames.length<2||playing)return false;
  const image=$('quest-world-pose-frame'),original=$('quest-world-pawn-art'),pawn=$('quest-world-pawn');
  if(!image||!original||original.hidden||!original.getAttribute('src')||!pawn)return false;
  const current=frames;
  try{urls=current.map(frame=>URL.createObjectURL(frame));}catch(_e){stop();return false;}
  playing=true;image.hidden=false;
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
 function clear(){++token;stop();hidePreview();account='';scene='';selected='';frames=null;loadedKey='';controls();
  status('Beeldreeksen verborgen na uitloggen. Opgeslagen frames blijven privé per account.');}
 function bind(){
  if(!$('quest-pose-upload'))return;
  $('quest-pose-upload').addEventListener('change',onUpload);
  $('quest-pose-zip')?.addEventListener('change',importBundle);
  $('quest-pose-scene')?.addEventListener('change',()=>{
   stop();hidePreview();selected=$('quest-pose-scene').value;load();
  });
  $('quest-pose-remove')?.addEventListener('click',remove);
  window.addEventListener('us-two-session-cleared',clear);
  window.addEventListener('us-two-pawn-art-changed',()=>{
    if(playing)stop();
    if($('quest-world-pawn-art')?.hidden)hidePreview();
    else showPreview();
  });
  window.addEventListener('us-two-tab-changed',e=>{if(e.detail?.tab!=='game')stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  controls();
 }
 async function approvedSequence(sceneName){
  if(!account||!SCENES.includes(sceneName))return null;
  const forAccount=account;
  try{
   const saved=await read(key(forAccount,sceneName));
   if(account!==forAccount||!Array.isArray(saved?.frames)||saved.frames.length<2||saved.frames.length>MAX_FRAMES)return null;
   return saved.frames.every(frame=>frame instanceof Blob&&['image/png','image/webp'].includes(frame.type)&&frame.size<=MAX_FRAME_BYTES)
    ?saved.frames:null;
  }catch(_error){return null;}
 }
 async function approvedStill(sceneName){
  if(!account||!SCENES.includes(sceneName))return null;
  const forAccount=account;
  try{
   const saved=await read(key(forAccount,sceneName));
   if(account!==forAccount)return null;
   const frame=saved?.frames?.[0];
   return saved?.frames?.length>=2&&frame instanceof Blob&&
     ['image/png','image/webp'].includes(frame.type)&&frame.size<=MAX_FRAME_BYTES?frame:null;
  }catch(_error){return null;}
 }
 window.USTwoPoseFrames=Object.freeze({update,play,stop,clear,approvedStill,approvedSequence,hasSelected:()=>Boolean(frames&&loadedKey===key(account,scene)),sceneNames:SCENES});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
