/* US TWO approved world artwork, private per-device. No game writes. */
(()=>{
'use strict';
const names=['Bergbos','Moulin Rouge','Middeleeuwen','Vakantie','Fantasie','Snoepland'];
const dbName='us-two-approved-worlds-v1',storeName='worlds';
const $=id=>document.getElementById(id);
let activeUrl='',lastWorld=-1,initialized=false,displayGeneration=0,shownKey='',syncPair='',syncEpoch=0;
const verified=new Set();
function pairId(){const s=authSession(),id=window.USTwoQuestPilotBridge?.identity?.();return id?.paired&&id.userId===s?.user?.id?id.coupleId:null;}
function keyFor(pair,n){return pair+'/world-'+n;}
function pending(on){const stage=$('quest-board-stage');if(stage)stage.dataset.artPending=String(on);}
function clearArt(){syncEpoch++;displayGeneration++;shownKey='';lastWorld=-1;syncPair='';lastSyncAttempt=0;verified.clear();if(activeUrl)URL.revokeObjectURL(activeUrl);activeUrl='';const art=document.querySelector('#quest-board-stage .quest-world-art');if(art){art.src='./assets/us-two-user-board.png';art.dataset.worldImageApplied='original';}pending(true);}
function openDb(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open(dbName,1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(storeName))req.result.createObjectStore(storeName);};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
async function access(key,blob){const db=await openDb();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction(storeName,blob?'readwrite':'readonly');
 const req=blob?tx.objectStore(storeName).put(blob,key):tx.objectStore(storeName).get(key);
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}finally{db.close();}}
function worldNumber(){
 const text=$('quest-world-heading')?.textContent||'';
 const match=/Wereld\s+(\d+)/i.exec(text);
 return match?Math.min(5,Math.max(0,Number(match[1])-1)):0;
}
async function display(force=false){
 const art=document.querySelector('#quest-board-stage .quest-world-art');
 const pair=pairId(),world=worldNumber(),key=pair?keyFor(pair,world+1):'';
 if(!art||!pair){pending(true);return;}
 if(!force&&shownKey===key)return;
 const generation=++displayGeneration;
 if(shownKey!==key)pending(true);
 // Never read the old per-device, unscoped images as an authoritative board.
 const blob=await access(key).catch(()=>null);
 if(generation!==displayGeneration||pairId()!==pair||worldNumber()!==world)return;
 if(!blob||!verified.has(key)){pending(true);return;}
 const url=URL.createObjectURL(blob),image=new Image();image.src=url;
 try{await image.decode();}catch(_e){URL.revokeObjectURL(url);return;}
 if(generation!==displayGeneration||pairId()!==pair||worldNumber()!==world){URL.revokeObjectURL(url);return;}
 const old=activeUrl;activeUrl=url;shownKey=key;lastWorld=world;
 art.src=url;art.dataset.worldImageApplied='themed';
 art.alt='US TWO speelwereld '+(world+1)+': '+names[world];
 $('quest-board-stage').style.aspectRatio=image.naturalWidth+' / '+image.naturalHeight;
 pending(false);
 if(old)URL.revokeObjectURL(old);
 window.dispatchEvent(new Event('us-two-world-art-updated'));
}
async function importFiles(files){
 const status=$('quest-world-images-status');
 const picked=new Map();
 for(const file of files){
  // Android's document picker can return an empty MIME type or append (1)
  // to files downloaded more than once. The extension and size are sufficient
  // for candidate selection; the browser decodes the image on display.
  const name=(file.name||'').normalize('NFC');
  const match=/(?:^|[\\/])wereld[-_ ]?([1-6])(?:\s*\(\d+\))?\.(jpe?g|png|webp)$/i.exec(name);
  if(!match||file.size===0||file.size>6*1024*1024)continue;
  picked.set(Number(match[1]),file);
 }
 // Android image/gallery pickers frequently replace filenames with numeric IDs.
 // Only fall back when exactly six distinct valid images were selected.
 if(picked.size===0&&files.length===6){
  const numeric=files.every(f=>/^\d+\.(jpe?g|png|webp)$/i.test(f.name||'')&&f.size>0&&f.size<=6*1024*1024);
  if(numeric){
   const ordered=[...files].sort((a,b)=>Number(a.name.split('.')[0])-Number(b.name.split('.')[0]));
   ordered.forEach((file,i)=>picked.set(i+1,file));
  }
 }
 if(picked.size!==6){
  const found=[...picked.keys()].sort((a,b)=>a-b).join(', ')||'geen';
  const namesOnPhone=files.map(f=>f.name||'(zonder naam)').join('; ');
  if(status)status.textContent='Geselecteerd: '+files.length+' bestanden. Herkende werelden: '+found+'. Bestandsnamen: '+namesOnPhone;
  return;
 }
 try{
  const pair=pairId();if(!pair)throw Error('Koppel eerst jullie accounts.');
  for(const [i,file] of picked)await access('import/'+keyFor(pair,i),file);
  lastSyncAttempt=0;await syncWorldArt(true);
 }catch(e){if(status)status.textContent='Opslaan mislukt: '+(e?.message||'onbekende fout');}
}
const SYNC_URL='https://vuigivzwkxelsisbjjlk.supabase.co';
const SYNC_KEY='sb_publishable_BVJP4ggWOXgt8SXVTXof8Q_yGcoqmX7';
let syncing=false,lastSyncAttempt=0;

function authSession(){
 try{
  const key='us-two-web-session-v2:'+new URL('./',location.href).pathname;
  const session=JSON.parse(localStorage.getItem(key)||'null');
  return session?.access_token?session:null;
 }catch{return null;}
}
async function syncWorldArt(force=false){
 const pair=pairId(),session=authSession();
 if(!pair||!session?.access_token)return;
 if(syncPair!==pair){clearArt();syncPair=pair;}
 if(syncing||(!force&&Date.now()-lastSyncAttempt<60000))return;
 syncing=true;lastSyncAttempt=Date.now();
 const epoch=syncEpoch,valid=()=>epoch===syncEpoch&&pairId()===pair;
 const status=$('quest-world-images-status');
 const headers={apikey:SYNC_KEY,Authorization:'Bearer '+session.access_token};
 try{
  const current=worldNumber()+1,order=[current,...[1,2,3,4,5,6].filter(n=>n!==current)];
  let available=0;
  for(const n of order){
   if(!valid())return;
   const key=keyFor(pair,n),url=SYNC_URL+'/storage/v1/object/us-two-world-art/'+pair+'/wereld-'+n+'.jpg';
   // Revalidate the active board first; shared objects win over every old local copy.
   let remote=await fetch(url,{headers,cache:'no-store'});
   if(!valid())return;
   if(remote.status===404||remote.status===400){
    const file=await access('import/'+key).catch(()=>null);
    if(!file)continue;
    const uploaded=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':file.type||'image/jpeg','x-upsert':'false'},body:file});
    if(!uploaded.ok&&uploaded.status!==409)throw Error('Upload wereld '+n+' mislukt ('+uploaded.status+')');
    remote=await fetch(url,{headers,cache:'no-store'});
   }
   if(!remote.ok)throw Error('Cloudkaart '+n+' niet bereikbaar ('+remote.status+')');
   const blob=await remote.blob();
   if(!blob.type.startsWith('image/')||blob.size<100||blob.size>6*1024*1024)throw Error('Ongeldige wereldkaart '+n);
   if(!valid())return;
   await access(key,blob);
   if(!valid())return;
   verified.add(key);available++;
   if(n===worldNumber()+1&&shownKey!==key)await display(true);
  }
  if(valid()&&status)status.textContent='Gedeelde cloudkaarten: '+available+'/6.';
 }catch(e){if(valid()&&status)status.textContent='Kaart synchroniseren: '+(e?.message||'onbekende fout');}
 finally{syncing=false;if(pairId()&&pairId()!==pair)syncWorldArt(true);}
}
function init(){
 if(initialized)return;initialized=true;
 const upload=$('quest-world-images-upload');
 const status=$('quest-world-images-status');
 if(status)status.textContent='Importfunctie gereed. Kies zes JPG-bestanden.';
 $('quest-world-images-sync')?.addEventListener('click',()=>syncWorldArt(true));
 upload?.addEventListener('change',e=>{
  const files=[...e.target.files];
  if(status)status.textContent=files.length+' bestanden ontvangen. Opslaan…';
  importFiles(files);
 });
 setTimeout(()=>syncWorldArt(true),1800);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncWorldArt(true);});
 window.addEventListener('us-two-session-updated',()=>syncWorldArt(true));
 window.addEventListener('us-two-session-cleared',clearArt);
 window.addEventListener('us-two-board-state',()=>{display();syncWorldArt();});
 setInterval(()=>syncWorldArt(),60000);
 const heading=$('quest-world-heading');
 if(heading)new MutationObserver(()=>display()).observe(heading,{childList:true,characterData:true,subtree:true});
 display();
 document.querySelectorAll('#bottom-nav [data-tab="game"], [data-tab="game"]').forEach(el=>el.addEventListener('click',()=>setTimeout(()=>{display();syncWorldArt();},120)));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();