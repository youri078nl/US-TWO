/* US TWO original world path, one common pawn and local-only private approved art. */
(() => {
 'use strict';
 const PATH=[
 [151,562],[250,515],[393,500],[518,499],[611,563],
 [729,604],[795,546],[912,473],[995,408],[1116,369],
 [1191,301],[1100,221],[951,192],[805,181],[671,183],
 [549,197],[419,228],[271,230],[191,319],[138,423]
 ];
 const $=id=>document.getElementById(id);
 const DB='us-two-private-pawn-v1',TABLE='images';
 const artChanged=()=>window.dispatchEvent(new Event('us-two-pawn-art-changed'));
 let activeKey='',position=null,revision=0,pictureUrl='',animationTimer=null;
 function storage(){
   return new Promise((resolve,reject)=>{
     const req=indexedDB.open(DB,1);
     req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(TABLE))req.result.createObjectStore(TABLE);};
     req.onerror=()=>reject(req.error);
     req.onsuccess=()=>resolve(req.result);
   });
 }
 async function stored(key,value,write=false){
   const db=await storage();
   try{
     return await new Promise((resolve,reject)=>{
       const tx=db.transaction(TABLE,write?'readwrite':'readonly');
       const request=write?tx.objectStore(TABLE).put(value,key):tx.objectStore(TABLE).get(key);
       request.onsuccess=()=>resolve(request.result);
       request.onerror=()=>reject(request.error);
       tx.onerror=()=>reject(tx.error);
     });
   }finally{db.close();}
 }
 function clearImage(){
   const img=$('quest-world-pawn-art');
   if(pictureUrl){URL.revokeObjectURL(pictureUrl);pictureUrl='';}
   img.hidden=true;
   img.removeAttribute('src');
   $('quest-world-fallback').hidden=false;
   artChanged();
 }
 function point(step){
   const k=((step%PATH.length)+PATH.length)%PATH.length;
   return PATH[k];
 }
 function move(step){
   const el=$('quest-world-pawn');
   if(!el)return;
   const [x,y]=point(step);
   el.style.left=(x/1279*100).toFixed(4)+'%';
   el.style.top=(y/720*100).toFixed(4)+'%';
 }
 function focusPawn(smooth=false){
   const scroller=$('quest-world-scroll'),map=$('quest-world-viewport');
   if(!scroller||!map)return;
   const [x,y]=point(position??0);
   const left=Math.max(0,Math.min(map.clientWidth-scroller.clientWidth,
     x/1279*map.clientWidth-scroller.clientWidth/2));
   const top=Math.max(0,Math.min(map.clientHeight-scroller.clientHeight,
     y/720*map.clientHeight-scroller.clientHeight/2));
   const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   if(typeof scroller.scrollTo==='function')
     scroller.scrollTo({left,top,behavior:smooth&&!reduce?'smooth':'auto'});
   else{scroller.scrollLeft=left;scroller.scrollTop=top;}
 }
 function cancelMotion(){
   if(animationTimer!==null){clearTimeout(animationTimer);animationTimer=null;}
 }
 async function loadImage(key){
   const token=++revision;
   clearImage();
   $('quest-world-art-status').textContent='Privé-pion op dit toestel controleren…';
   try{
     const file=await stored(key);
     if(token!==revision||key!==activeKey)return;
     if(file&&file instanceof Blob&&file.size>0&&file.size<=10_000_000&&['image/png','image/webp'].includes(file.type)){
       pictureUrl=URL.createObjectURL(file);
       $('quest-world-pawn-art').src=pictureUrl;
       $('quest-world-pawn-art').hidden=false;
       $('quest-world-fallback').hidden=true;
       $('quest-world-art-status').textContent='Jullie goedgekeurde pion is privé op dit toestel opgeslagen.';
       artChanged();
     }else{
       $('quest-world-art-status').textContent='Kies eenmaal de originele afbeelding van jullie drieën. De gouden hartmarkering blijft zichtbaar totdat je die kiest.';
     }
   }catch(_err){
     if(token===revision)$('quest-world-art-status').textContent='Lokale afbeelding kon niet worden gelezen. Kies het origineel opnieuw.';
   }
 }
 function clear(){
   ++revision;cancelMotion();activeKey='';position=null;clearImage();
   if($('quest-world-art-upload'))$('quest-world-art-upload').disabled=true;
   if($('quest-world-position'))$('quest-world-position').textContent='Geen gekoppelde serverstand geladen.';
 }
 function update(state,identity){
   if(!$('quest-world-pawn'))return;
   const key=identity?.paired&&identity?.userId&&identity?.coupleId?
       identity.userId+':'+identity.coupleId:'';
   if(!key||!state?.paired||!state?.initialized||!Number.isSafeInteger(state.position)||state.position<0){
     clear();return;
   }
   if(key!==activeKey){
     cancelMotion();activeKey=key;position=null;loadImage(key);
   }
   $('quest-world-art-upload').disabled=false;
   const next=state.position;
   const old=position;
   position=next;
   const world=Number.isInteger(state.world_index)?state.world_index+1:1;
   $('quest-world-position').textContent='Samen op vak '+next+' · wereld '+world+' van 6. De server bepaalt de voortgang.';
   cancelMotion();
   if(old===null||next<=old||next-old>6||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
     move(next);
     requestAnimationFrame(()=>focusPawn(old!==null));
     return;
   }
   let step=old;
   const tick=()=>{
     if(activeKey!==key||position!==next)return;
     step++;
     move(step);
     if(step<next)animationTimer=setTimeout(tick,240);
     else{animationTimer=null;focusPawn(true);}
   };
   animationTimer=setTimeout(tick,100);
 }
 const BASE_BOARD_WIDTH=()=>Math.max(window.innerWidth*2.2,window.innerHeight*3.55);
 const ZOOM_STEPS=[0.65,0.8,1,1.25,1.5,1.8,2.1];
 let zoomIndex=2;
 function setZoom(nextIndex){
   const scroller=$('quest-world-scroll'),map=$('quest-world-viewport');
   if(!scroller||!map)return;
   const index=Math.min(ZOOM_STEPS.length-1,Math.max(0,nextIndex));
   const oldW=map.getBoundingClientRect().width||BASE_BOARD_WIDTH();
   const cx=(scroller.scrollLeft+scroller.clientWidth/2)/oldW;
   const cy=(scroller.scrollTop+scroller.clientHeight/2)/(oldW*720/1279);
   zoomIndex=index;
   const width=BASE_BOARD_WIDTH()*ZOOM_STEPS[index];
   map.style.width=width+'px';
   scroller.scrollLeft=Math.max(0,cx*width-scroller.clientWidth/2);
   scroller.scrollTop=Math.max(0,cy*width*720/1279-scroller.clientHeight/2);
   if($('quest-world-zoom-label'))$('quest-world-zoom-label').textContent=Math.round(ZOOM_STEPS[index]*100)+'%';
   if($('quest-world-zoom-out'))$('quest-world-zoom-out').disabled=index===0;
   if($('quest-world-zoom-in'))$('quest-world-zoom-in').disabled=index===ZOOM_STEPS.length-1;
 }
 function bind(){
   const input=$('quest-world-art-upload');
   if(!input)return;
   move(0);
   $('quest-world-find-pawn')?.addEventListener('click',()=>focusPawn(true));
   $('quest-world-zoom-out')?.addEventListener('click',()=>setZoom(zoomIndex-1));
   $('quest-world-zoom-in')?.addEventListener('click',()=>setZoom(zoomIndex+1));
   $('quest-world-zoom-reset')?.addEventListener('click',()=>{setZoom(2);focusPawn(true);});
   window.addEventListener('resize',()=>setZoom(zoomIndex));
   setZoom(2);
   input.addEventListener('change',async()=>{
     const key=activeKey,file=input.files?.[0];input.value='';
     if(!key||!file)return;
     if(!['image/png','image/webp'].includes(file.type)||file.size>10_000_000||file.size<100){
       $('quest-world-art-status').textContent='Kies een geldige PNG of WebP van maximaal 10 MB.';return;
     }
     $('quest-world-art-status').textContent='Origineel privé opslaan…';
     try{await stored(key,file,true);if(activeKey===key)await loadImage(key);}
     catch(_err){if(activeKey===key)$('quest-world-art-status').textContent='Opslaan mislukt; probeer het bestand opnieuw.';}
   });
   window.addEventListener('us-two-session-cleared',clear);
 }
 window.USTwoQuestBoard=Object.freeze({update,clear,pathPoint:point,focusPawn});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
