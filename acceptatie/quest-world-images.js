/* US TWO approved world artwork, private per-device. No game writes. */
(()=>{
'use strict';
const names=['Bergbos','Moulin Rouge','Middeleeuwen','Vakantie','Fantasie','Snoepland'];
const dbName='us-two-approved-worlds-v1',storeName='worlds';
const $=id=>document.getElementById(id);
let activeUrl='',lastWorld=-1,initialized=false;
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
 const world=worldNumber();
 if(!force&&lastWorld===world)return;
 lastWorld=world;
 const blob=await access('world-'+(world+1)).catch(()=>null);
 if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl='';}
 if(blob){
  activeUrl=URL.createObjectURL(blob);
  art.src=activeUrl;
  art.alt='US TWO speelwereld '+(world+1)+': '+names[world];
 }else{
  art.src='./assets/us-two-user-board.png';
  art.alt='Origineel US TWO speelbord';
 }
}
async function importFiles(files){
 const status=$('quest-world-images-status');
 const picked=new Map();
 for(const file of files){
  const match=/^wereld-([1-6])\.(jpe?g|png|webp)$/i.exec(file.name);
  if(!match||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>6*1024*1024)continue;
  picked.set(Number(match[1]),file);
 }
 if(picked.size!==6){if(status)status.textContent='Selecteer alle zes bestanden wereld-1.jpg t/m wereld-6.jpg tegelijk.';return;}
 try{
  for(const [i,file] of picked)await access('world-'+i,file);
  lastWorld=-1;await display(true);
  if(status)status.textContent='Alle zes wereldkaarten opgeslagen op dit toestel.';
 }catch(e){if(status)status.textContent='Opslaan mislukt: '+(e?.message||'onbekende fout');}
}
function init(){
 if(initialized)return;initialized=true;
 $('quest-world-images-upload')?.addEventListener('change',e=>importFiles([...e.target.files]));
 const heading=$('quest-world-heading');
 if(heading)new MutationObserver(()=>display()).observe(heading,{childList:true,characterData:true,subtree:true});
 display();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();