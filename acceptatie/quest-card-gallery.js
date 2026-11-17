/* US TWO 50-card gallery: original JPG art, private device storage.
 * The deck is read-only inspiration. Cards are NOT automatically server quests.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const DATA=window.USTwoCardDeckData;
 if(!Array.isArray(DATA)||DATA.length!==50)return;
 const DB='us-two-50-original-cards-v1',STORE='decks';
 let account='',index=0,ready=false,busy=false,rev=0,objectUrl='';
 const image=$('quest-card-image');
 const status=s=>{if($('quest-cards-status'))$('quest-cards-status').textContent=s;};
 function clearURL(){
  if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl='';}
  if(image){image.hidden=true;image.removeAttribute('src');}
 }
 function openDB(){
  return new Promise((resolve,reject)=>{
   if(!window.indexedDB)return reject(Error('Opslag op dit toestel ontbreekt.'));
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
   req.onerror=()=>reject(req.error||Error('Lokale opslag mislukt.'));
   req.onsuccess=()=>resolve(req.result);
  });
 }
 async function getDeck(key){
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(key);
   req.onsuccess=()=>resolve(req.result||null);
   req.onerror=()=>reject(req.error);
  });}finally{db.close();}
 }
 async function saveDeck(key,map){
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   // All or nothing: a half-import cannot replace a previously complete set.
   const record={images:Array.from({length:50},(_,i)=>map.get(i+1)),savedAt:Date.now()};
   tx.objectStore(STORE).put(record,key);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||Error('Opslaan mislukt.'));
   tx.onabort=()=>reject(tx.error||Error('Opslagruimte onvoldoende.'));
  });}finally{db.close();}
 }
 const current=()=>DATA[index];
 const deckStatus=()=>account?(ready?'50 originele kaarten op dit toestel beschikbaar.':'Kaarteninformatie beschikbaar. Importeer het originele ZIP-pakket voor de afbeeldingen.'):'Koppel eerst jullie accounts.';
 const categoryList=(category)=>DATA.filter(c=>category==='all'||c.category===category);
 function renderInfo(){
  const c=current(),cat=$('quest-cards-filter')?.value||'all';
  const available=categoryList(cat);
  if(!c)return;
  if(!available.some(x=>x.number===c.number)){index=DATA.indexOf(available[0]||DATA[0]);}
  const card=current();
  if($('quest-card-title'))$('quest-card-title').textContent=card.title;
  if($('quest-card-meta'))$('quest-card-meta').textContent=
    'Kaart '+card.number+' van 50 · '+card.category+' · '+card.minutes+' min · Samen';
  if($('quest-card-steps')){
   const list=$('quest-card-steps');list.replaceChildren();
   for(const line of card.steps){const li=document.createElement('li');li.textContent=line;list.append(li);}
  }
  const place=available.findIndex(x=>x.number===card.number);
  if($('quest-cards-count'))$('quest-cards-count').textContent=(place+1)+' / '+available.length;
  for(const id of ['quest-cards-prev','quest-cards-next'])if($(id))$(id).disabled=!account||busy||available.length<2;
 }
 async function renderImage(){
  const num=current()?.number,key=account,n=++rev;
  clearURL();
  if(!key||!ready||!num)return;
  try{
   const record=await getDeck(key);
   if(n!==rev||key!==account||current()?.number!==num)return;
   const blob=record?.images?.[num-1];
   if(blob instanceof Blob&&blob.type==='image/jpeg'&&blob.size>1000){
    objectUrl=URL.createObjectURL(blob);
    image.src=objectUrl;
    image.alt='Origineel US TWO-kaartje '+num+': '+current().title;
    image.hidden=false;
   }
  }catch(_error){if(n===rev)status('Lokale kaartafbeeldingen zijn tijdelijk niet beschikbaar.');}
 }
 function render(){renderInfo();renderImage();}
 function setBusy(b){
  busy=b;
  for(const id of ['quest-cards-zip','quest-cards-jpg','quest-cards-filter'])
   if($(id))$(id).disabled=b||!account;
  for(const id of ['quest-cards-prev','quest-cards-next'])
   if($(id))$(id).disabled=b||!account;
 }
 async function importImages(getImages){
  if(!account||busy)return;
  const key=account,epoch=rev;
  setBusy(true);status('50 kaartafbeeldingen lokaal controleren en importeren…');
  try{
   const map=await getImages();
   if(key!==account)throw Error('Account gewijzigd tijdens importeren. Probeer opnieuw.');
   await saveDeck(key,map);
   if(key!==account)return;
   ready=true;status('50/50 originele US TWO-kaartjes op dit toestel geïmporteerd.');
   render();
  }catch(error){if(key===account)status('Import niet gelukt: '+String(error.message||error));}
  finally{if(key===account)setBusy(false);}
 }
 async function load(key){
  const n=++rev;
  ready=false;clearURL();renderInfo();status('Lokale kaartencollectie controleren…');
  try{
   const record=await getDeck(key);
   if(n!==rev||key!==account)return;
   ready=Array.isArray(record?.images)&&record.images.length===50&&
     record.images.every(x=>x instanceof Blob&&x.type==='image/jpeg');
   status(deckStatus());render();
  }catch(_error){if(n===rev){ready=false;status('Opslag niet beschikbaar; de opdrachtteksten blijven zichtbaar.');}}
 }
 function update(identity){
  const key=identity?.paired&&identity.userId&&identity.coupleId?
   String(identity.userId)+':'+String(identity.coupleId):'';
  if(key===account)return;
  ++rev;account=key;ready=false;index=0;clearURL();
  setBusy(false);
  if(!key){status('Log in met jullie gekoppelde accounts om kaartafbeeldingen te bekijken.');renderInfo();return;}
  load(key);
 }
 function clear(){++rev;account='';ready=false;index=0;clearURL();setBusy(false);status('Kaartafbeeldingen verborgen na uitloggen.');renderInfo();}
 function step(dir){
  if(!account||busy)return;
  const list=categoryList($('quest-cards-filter')?.value||'all');
  const p=list.findIndex(c=>c.number===current().number);
  const next=list[(p+dir+list.length)%list.length];
  if(next){index=DATA.indexOf(next);render();}
 }
 function bind(){
  if(!$('quest-cards-filter'))return;
  for(const c of new Set(DATA.map(x=>x.category))){
   const opt=document.createElement('option');opt.value=c;opt.textContent=c;$('quest-cards-filter').append(opt);
  }
  $('quest-cards-filter').addEventListener('change',()=>{index=DATA.indexOf(categoryList($('quest-cards-filter').value)[0]||DATA[0]);render();});
  $('quest-cards-prev').addEventListener('click',()=>step(-1));
  $('quest-cards-next').addEventListener('click',()=>step(1));
  $('quest-cards-zip').addEventListener('change',async e=>{
   const file=e.currentTarget.files?.[0];e.currentTarget.value='';
   if(!file)return;
   await importImages(async()=>{
    if(file.size>32_000_000)throw Error('ZIP-pakket groter dan 32 MB.');
    return window.USTwoCardArchive.read(await file.arrayBuffer());
   });
  });
  $('quest-cards-jpg').addEventListener('change',async e=>{
   const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value='';
   if(files.length)await importImages(()=>window.USTwoCardArchive.readImages(files));
  });
  window.addEventListener('us-two-session-cleared',clear);
  renderInfo();status('Koppel eerst jullie accounts om de 50 kaartjes te bekijken.');
 }
 window.USTwoCardGallery=Object.freeze({update,clear,step,items:DATA,show:(i)=>{if(!Number.isInteger(i)||i<0||i>=50)return;index=i;render();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
