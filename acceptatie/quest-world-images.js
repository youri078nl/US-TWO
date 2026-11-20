/* US TWO approved world artwork, private per-device. No game writes. */
(()=>{
'use strict';
const names=['Bergbos','Moulin Rouge','Middeleeuwen','Vakantie','Fantasie','Snoepland'];
const dbName='us-two-approved-worlds-v1',storeName='worlds';
const $=id=>document.getElementById(id);
let activeUrl='',lastWorld=-1,initialized=false,displayGeneration=0;
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
 if(!art)return;
 const generation=++displayGeneration;
 const world=worldNumber();
 if(!force&&lastWorld===world&&art.dataset.worldImageApplied==='themed')return;
 lastWorld=world;
 const blob=await access('world-'+(world+1)).catch(()=>null);
 if(generation!==displayGeneration)return;
 if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl='';}
 if(blob){
  activeUrl=URL.createObjectURL(blob);
  art.src=activeUrl;
  art.dataset.worldImageApplied='themed';
  window.dispatchEvent(new Event('us-two-world-art-updated'));
  art.alt='US TWO speelwereld '+(world+1)+': '+names[world];
 }else{
  art.src='./assets/us-two-user-board.png';
  art.dataset.worldImageApplied='original';
  window.dispatchEvent(new Event('us-two-world-art-updated'));
  art.alt='Origineel US TWO speelbord';
 }
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
  for(const [i,file] of picked)await access('world-'+i,file);
  lastWorld=-1;await display(true);
  lastSyncAttempt=0;syncWorldArt(true);
  if(status)status.textContent='Alle zes wereldkaarten opgeslagen. Open Bord om de kaart te bekijken.';
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
 if(syncing||(!force&&Date.now()-lastSyncAttempt<12000))return;
 const session=authSession();
 if(!session?.user?.id)return;
 syncing=true;lastSyncAttempt=Date.now();
 const status=$('quest-world-images-status');
 const headers={apikey:SYNC_KEY,Authorization:'Bearer '+session.access_token};
 try{
  const memberRes=await fetch(SYNC_URL+'/rest/v1/us_members?select=couple_id&user_id=eq.'+encodeURIComponent(session.user.id),{headers,cache:'no-store'});
  if(!memberRes.ok)throw new Error('Koppeling ophalen mislukt ('+memberRes.status+')');
  const memberships=await memberRes.json();
  const pair=memberships?.[0]?.couple_id;
  if(!pair){if(status)status.textContent='Geen gekoppeld koppel gevonden.';return;}
  let uploaded=0,downloaded=0,available=0;
  for(let i=1;i<=6;i++){
   const key='world-'+i;
   const path=pair+'/wereld-'+i+'.jpg';
   const url=SYNC_URL+'/storage/v1/object/us-two-world-art/'+path;
   const remote=await fetch(url,{headers,cache:'no-store'});
   if(remote.ok){
    available++;
    // The shared copy is authoritative: never overwrite it on another device.
    const blob=await access(key).catch(()=>null);
    if(!blob){
     const downloadedBlob=await remote.blob();
     if(!downloadedBlob.type.startsWith('image/')||downloadedBlob.size>6*1024*1024)throw new Error('Wereld '+i+' is geen geldige afbeelding.');
     await access(key,downloadedBlob);downloaded++;
    }
   }else if(remote.status===404||remote.status===400){
    const blob=await access(key).catch(()=>null);
    if(!blob)continue;
    const res=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':blob.type||'image/jpeg','x-upsert':'false'},body:blob});
    if(!res.ok){
     // Another device might have uploaded it in the meantime.
     if(res.status===409)continue;
     throw new Error('Upload wereld '+i+' mislukt ('+res.status+')');
    }
    available++;uploaded++;
   }else throw new Error('Cloudkaart '+i+' niet bereikbaar ('+remote.status+')');
  }
  if(downloaded)await display(true);
  if(status)status.textContent='Cloudkaarten: '+available+'/6 beschikbaar. '+(uploaded?'Geüpload: '+uploaded+'. ':'')+(downloaded?'Gedownload: '+downloaded+'.':'')+(available===6?' Beide telefoons kunnen ze gebruiken.':' Open eerst Android met de geïmporteerde kaarten.');
 }catch(e){
  if(status)status.textContent='Kaartsynchronisatie mislukt: '+(e?.message||'onbekende fout');
 }finally{syncing=false;}
}
function init(){
 if(initialized)return;initialized=true;
 const upload=$('quest-world-images-upload');
 const status=$('quest-world-images-status');
 if(status)status.textContent='Importfunctie gereed. Kies zes JPG-bestanden.';
 upload?.addEventListener('change',e=>{
  const files=[...e.target.files];
  if(status)status.textContent=files.length+' bestanden ontvangen. Opslaan…';
  importFiles(files);
 });
 setTimeout(()=>syncWorldArt(true),1800);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncWorldArt(true);});
 window.addEventListener('us-two-session-updated',()=>syncWorldArt(true));
 setInterval(()=>syncWorldArt(),30000);
 const heading=$('quest-world-heading');
 if(heading)new MutationObserver(()=>display()).observe(heading,{childList:true,characterData:true,subtree:true});
 display();
 document.querySelectorAll('#bottom-nav [data-tab="game"], [data-tab="game"]').forEach(el=>el.addEventListener('click',()=>setTimeout(()=>display(true),120)));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();