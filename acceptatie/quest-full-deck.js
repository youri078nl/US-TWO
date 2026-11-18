/* US TWO canonical 258-card collection viewer.
 * Read-only: original server IDs remain authoritative, never creates rewards.
 * All 258 optional JPGs are stored locally per paired account.
 * Superdate content contains PUBLIC TITLE ONLY, no secret preparations.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const MAX_ARCHIVE=38_000_000, MAX_JPEG=500_000;
 const STORE='collection', DB='us-two-full-deck-258-v1';
 let cards=[],filtered=[],selected=0,account='',images=null,imageURL='',generation=0,loading=false;
 let activeState=null,activeImageURL='',activeImageIndex=-1,activeImageBlob=null;
 let lastRevealKey='',pendingReveal=null,previousRevealFocus=null;
 const say=s=>{if($('full-deck-status'))$('full-deck-status').textContent=s;};
 const PUBLIC_CARD_ROOT='./assets/cards/';
 let hostedArtworkReady=false, hostedArtworkChecked=false;
 async function checkHostedArtwork(){
  try{
   const response=await fetch(PUBLIC_CARD_ROOT+'US_TWO_W1_01.jpg',{method:'HEAD',cache:'no-store'});
   hostedArtworkReady=response.ok&&response.headers.get('content-type')?.startsWith('image/');
  }catch(_error){hostedArtworkReady=false;}
  hostedArtworkChecked=true;
  if(cards.length){render();renderActive();showReveal();}
 }

 const publicCardURL=i=>PUBLIC_CARD_ROOT+nameOf(i);
 const cardArtError=img=>{img.hidden=true;img.removeAttribute('src');};
 const nameOf=i=>i<240?('US_TWO_W'+(Math.floor(i/40)+1)+'_'+String(i%40+1).padStart(2,'0')+'.jpg'):'US_TWO_SUPERDATE_'+String(i-239).padStart(2,'0')+'.jpg';
 const u16=(dv,n)=>dv.getUint16(n,true),u32=(dv,n)=>dv.getUint32(n,true);
 let table=null;
 function crc32(bytes){
  if(!table)table=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  let value=0xffffffff;
  for(const b of bytes)value=table[(value^b)&255]^(value>>>8);
  return(value^0xffffffff)>>>0;
 }
 async function parseZIP(file){
  if(file.size>MAX_ARCHIVE||file.size<22)throw Error('Gebruik het mobiele pakket van 258 kaarten (maximaal 38 MB).');
  const buffer=await file.arrayBuffer(),dv=new DataView(buffer),bytes=new Uint8Array(buffer);
  let end=-1;
  for(let p=buffer.byteLength-22;p>=Math.max(0,buffer.byteLength-65557);p--){
   if(u32(dv,p)===0x06054b50){end=p;break;}
  }
  if(end<0||u16(dv,end+4)||u16(dv,end+6))throw Error('Geen geldig ZIP-pakket.');
  const count=u16(dv,end+10),dirBytes=u32(dv,end+12),dir=u32(dv,end+16);
  if(count<258||count>265||dir+dirBytes>end)throw Error('Het pakket bevat niet de volledige collectie.');
  let pos=dir,total=0;const map=new Map(),seen=new Set(),decoder=new TextDecoder('utf-8',{fatal:true});
  const names=new Map(Array.from({length:258},(_,i)=>[nameOf(i),i]));
  for(let i=0;i<count;i++){
   if(pos+46>end||u32(dv,pos)!==0x02014b50)throw Error('Beschadigde bestandslijst.');
   const flags=u16(dv,pos+8),method=u16(dv,pos+10),crc=u32(dv,pos+16),len=u32(dv,pos+24),packed=u32(dv,pos+20);
   const nameLen=u16(dv,pos+28),ext=u16(dv,pos+30),comment=u16(dv,pos+32),local=u32(dv,pos+42);
   if(pos+46+nameLen+ext+comment>end||local+30>dir)throw Error('Beschadigde ZIP-index.');
   const full=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));pos+=46+nameLen+ext+comment;
   if(seen.has(full))throw Error('Dubbel bestand in ZIP.');seen.add(full);
   if(['KAARTEN_INDEX.csv','KAARTEN_INDEX.json','LEES_MIJ.txt'].includes(full))continue;
   const filename=full.startsWith('Kaarten/')?full.slice(8):'';
   const idx=names.get(filename);
   if(idx===undefined||method!==0||flags&1||packed!==len||len<1000||len>MAX_JPEG)
    throw Error('Onverwachte kaart of ZIP-compressie: '+full.slice(0,80));
   if(u32(dv,local)!==0x04034b50||u16(dv,local+8)!==0)throw Error('Beschadigd bestandsrecord.');
   const ln=u16(dv,local+26),le=u16(dv,local+28),start=local+30+ln+le;
   if(start+len>dir||decoder.decode(bytes.subarray(local+30,local+30+ln))!==full)
    throw Error('ZIP-bestandsnamen of lengtes komen niet overeen.');
   const data=bytes.subarray(start,start+len);
   if(data[0]!==255||data[1]!==216||data[len-2]!==255||data[len-1]!==217||crc32(data)!==crc)
    throw Error('Beschadigde afbeelding '+filename);
   total+=len;if(total>32_000_000)throw Error('Afbeeldingen zijn te groot.');
   map.set(idx,new Blob([data.slice()],{type:'image/jpeg'}));
  }
  if(map.size!==258)throw Error('Niet alle 258 afbeeldingen zijn aanwezig.');
  return Array.from({length:258},(_,i)=>map.get(i));
 }
 function dbOpen(){
  return new Promise((ok,no)=>{
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
   req.onerror=()=>no(req.error);
   req.onsuccess=()=>ok(req.result);
  });
 }
 async function store(key,value,write=false){
  const db=await dbOpen();
  try{return await new Promise((ok,no)=>{
   const tx=db.transaction(STORE,write?'readwrite':'readonly');
   const request=write?tx.objectStore(STORE).put(value,key):tx.objectStore(STORE).get(key);
   request.onsuccess=()=>{if(!write)ok(request.result);};
   request.onerror=()=>no(request.error);
   if(write){tx.oncomplete=()=>ok();tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error);}
  });}finally{db.close();}
 }
 function clearImage(){
  if(imageURL){URL.revokeObjectURL(imageURL);imageURL='';}
  const pic=$('full-deck-image');
  if(pic){pic.hidden=true;pic.removeAttribute('src');}
 }
 function clearActiveImage(){
  if(activeImageURL){URL.revokeObjectURL(activeImageURL);activeImageURL='';}
  activeImageBlob=null;activeImageIndex=-1;
  const pic=$('quest-current-card-image');
  if(pic){pic.hidden=true;pic.removeAttribute('src');pic.alt='';}
 }
 function closeReveal(){
  const overlay=$('quest-card-reveal');
  if(!overlay||overlay.classList.contains('hidden'))return;
  overlay.classList.add('hidden');
  const pic=$('quest-card-reveal-image');if(pic){pic.removeAttribute('src');pic.hidden=true;}
  previousRevealFocus?.focus?.();previousRevealFocus=null;
 }
 function showReveal(){
  if(!pendingReveal||!account||!hostedArtworkReady)return;
  const panel=$('game-panel');
  if(!panel||panel.classList.contains('hidden')||document.visibilityState==='hidden')return;
  const {key,idx,phase,mode}=pendingReveal;
  if(key===lastRevealKey)return;
  const card=cards[idx],overlay=$('quest-card-reveal'),pic=$('quest-card-reveal-image');
  if(!card||!overlay||!pic)return;
  lastRevealKey=key;pendingReveal=null;previousRevealFocus=document.activeElement;
  try{sessionStorage.setItem('us-two-seen-invite:'+key,'1');}catch(_error){}
  $('quest-card-reveal-label').textContent=phase==='approval'?'UITNODIGING VAN JE PARTNER':'JULLIE NIEUWE OPDRACHT';
  $('quest-card-reveal-heading').textContent=card.title;
  $('quest-card-reveal-description').textContent=(phase==='approval'?'Je partner stelt deze opdracht voor. Bekijk de kaart en beslis of je meedoet.':'Deze opdracht staat klaar. Bekijk de kaart en start jullie avontuur.')+' · '+(mode==='afstand'?'Op afstand':'Samen');
  $('quest-card-reveal-continue').textContent=phase==='approval'?'Accepteren':'Datum plannen';
  pic.alt='Originele illustratie van '+card.title;pic.src=publicCardURL(idx);pic.hidden=false;
  pic.onerror=()=>{pic.hidden=true;};
  overlay.classList.remove('hidden');
  $('quest-card-reveal-continue')?.focus();
 }
 function queueReveal(state,idx){
  // Never replay an already accepted/active task on app launch.
  // Only an outstanding proposal to the OTHER partner is a new invitation.
  if(state.phase!=='approval'||state.proposer_id===account.split(':')[0]){
   pendingReveal=null;
   closeReveal();
   return;
  }
  const key=account+':'+state.date.id+':approval';
  let seen=false;
  try{seen=sessionStorage.getItem('us-two-seen-invite:'+key)==='1';}catch(_error){}
  if(seen||key===lastRevealKey){pendingReveal=null;return;}
  pendingReveal={key,idx,phase:'approval',mode:state.mode};
  showReveal();
 }
 function renderActive(){
  const panel=$('quest-current-card'),pic=$('quest-current-card-image');
  if(!panel||!pic)return;
  const state=activeState;
  const active=Boolean(account&&state?.paired&&state.initialized&&
    ['approval','active'].includes(state.phase)&&typeof state.date?.id==='string');
  const idx=active?cards.findIndex(card=>!card.superdate&&card.id===state.date.id):-1;
  if(idx<0){
   panel.hidden=true;
   pendingReveal=null;closeReveal();
   clearActiveImage();
   return;
  }
  const card=cards[idx], blob=images?.[idx];
  const publicURL=publicCardURL(idx);
  panel.hidden=false;
  $('quest-current-card-phase').textContent=state.phase==='approval'?'WACHT OP AKKOORD':'OPDRACHT ACTIEF';
  queueReveal(state,idx);
  $('quest-current-card-title').textContent=card.title;
  $('quest-current-card-meta').textContent=
    'Wereld '+(card.world+1)+' · '+card.minutes+' min · '+
    (state.phase==='approval'?'Voorstel wacht op goedkeuring':'Opdracht actief')+
    ' · '+(state.mode==='afstand'?'op afstand':'samen');
  if(blob instanceof Blob&&blob.type==='image/jpeg'){
   if(activeImageIndex!==idx||activeImageBlob!==blob||!activeImageURL){
    clearActiveImage();
    activeImageURL=URL.createObjectURL(blob);
    activeImageIndex=idx;activeImageBlob=blob;
    pic.src=activeImageURL;
   }
   pic.alt='Origineel US TWO-opdrachtkaartje: '+card.title;
   pic.hidden=false;
   $('quest-current-card-art-status').textContent='Goedgekeurde 2D-kaart, privé opgeslagen op dit toestel.';
  }else{
   clearActiveImage();
   pic.onerror=()=>{cardArtError(pic);$('quest-current-card-art-status').textContent='Illustratie nog niet online beschikbaar.';};
   pic.onload=()=>{$('quest-current-card-art-status').textContent='Originele US TWO-kaart automatisch geladen.';};
   if(hostedArtworkReady){
    if(pic.getAttribute('src')!==publicURL)pic.src=publicURL;
    pic.alt='Originele US TWO-opdrachtkaart: '+card.title;pic.hidden=false;
    $('quest-current-card-art-status').textContent='Kaartillustratie laden…';
   }else{
    $('quest-current-card-art-status').textContent=hostedArtworkChecked?
      'De originele illustraties zijn nog niet op de website gepubliceerd.':'Kaartillustraties controleren…';
   }
  }
 }
 function filter(){
  const world=$('full-deck-world')?.value||'all',search=($('full-deck-search')?.value||'').toLocaleLowerCase('nl').trim();
  filtered=cards.map((c,i)=>({c,i})).filter(({c})=>(world==='all'||world===String(c.world))&&(!search||(c.title+' '+(c.brief||'')).toLocaleLowerCase('nl').includes(search))).map(({i})=>i);
  if(!filtered.includes(selected))selected=filtered[0]??0;
  render();
 }
 function render(){
  const c=cards[selected],pic=$('full-deck-image');if(!c)return;
  if(!filtered.length){
   $('full-deck-title').textContent='Geen kaart gevonden';
   $('full-deck-description').textContent='Pas je zoekopdracht aan.';
   $('full-deck-count').textContent='0 / 0';
   clearImage();return;
  }
  const num=$('full-deck-card-number');if(num)num.textContent=c.superdate?'SUPERDATE '+String(c.idx).padStart(2,'0'):'KAART '+String(selected+1).padStart(3,'0');
  const showcase=$('full-deck-showcase');if(showcase)showcase.classList.toggle('is-superdate',Boolean(c.superdate));
  $('full-deck-title').textContent=c.title;
  $('full-deck-description').textContent=c.superdate
   ? 'De geheime voorbereiding wordt uitsluitend via het beveiligde superdatespel getoond.'
   : c.brief;
  $('full-deck-count').textContent=(filtered.indexOf(selected)+1)+' / '+filtered.length;
  $('full-deck-meta').textContent=c.superdate?'Superdate '+c.idx+' / 18':'Wereld '+(c.world+1)+' · '+c.minutes+' minuten · richtprijs samen €'+c.estimated_cost_eur;
  clearImage();
  $('full-deck-art-fallback')?.classList.remove('hidden');
  pic.onload=()=>{$('full-deck-art-fallback')?.classList.add('hidden');};
  pic.onerror=()=>{cardArtError(pic);$('full-deck-art-fallback')?.classList.remove('hidden');};
  if(account&&images?.[selected] instanceof Blob){
   imageURL=URL.createObjectURL(images[selected]);pic.src=imageURL;pic.alt='Goedgekeurde US TWO-kaart '+c.title;pic.hidden=false;
  }else if(hostedArtworkReady){
   pic.src=publicCardURL(selected);pic.alt='Originele US TWO-kaart '+c.title;pic.hidden=false;
  }
  $('full-deck-prev').disabled=filtered.length<2;
  $('full-deck-next').disabled=filtered.length<2;
 }
 function move(d){if(filtered.length<2)return;selected=filtered[(filtered.indexOf(selected)+d+filtered.length)%filtered.length];render();}
 async function load(accountKey){
  const n=++generation;clearImage();images=null;
  say('Privé-afbeeldingen op dit toestel controleren…');
  try{
   const saved=await store(accountKey);
   if(n!==generation||accountKey!==account)return;
   if(Array.isArray(saved?.pictures)&&saved.pictures.length===258&&saved.pictures.every(x=>x instanceof Blob)){
    images=saved.pictures;say('258 originele 2D-kaarten lokaal beschikbaar.');
   }else say('De 258 opdrachtteksten zijn beschikbaar. Importeer het mobiele ZIP-pakket voor de afbeeldingen.');
   render();renderActive();
  }catch(_err){if(n===generation)say('Kaartgegevens werken; lokale afbeeldingopslag is niet beschikbaar.');}
 }
 function update(identity,state){
  const key=identity?.paired&&identity.userId&&identity.coupleId?identity.userId+':'+identity.coupleId:'';
  if(key!==account){
   account=key;++generation;images=null;clearImage();clearActiveImage();lastRevealKey='';pendingReveal=null;closeReveal();
   $('full-deck-zip').disabled=!key||loading;
   if(key)load(key);else{say('Log in op jullie gekoppelde accounts om afbeeldingen te importeren.');render();}
  }
  activeState=key&&state?.paired?state:null;
  renderActive();
  if(state?.date?.id&&cards.length){
   const idx=cards.findIndex(c=>!c.superdate&&c.id===state.date.id);
   if(idx>=0&&$('full-deck-follow')?.checked){
    selected=idx;$('full-deck-world').value='all';$('full-deck-search').value='';filter();
   }
  }
 }
 function clear(){
  ++generation;account='';images=null;activeState=null;loading=false;clearImage();clearActiveImage();
  if($('full-deck-zip'))$('full-deck-zip').disabled=true;
  say('Kaartafbeeldingen verborgen na uitloggen.');
  render();
 }
 async function importZip(file){
  if(!file||!account||loading)return;
  const key=account,n=generation;loading=true;$('full-deck-zip').disabled=true;
  say('258 originele kaarten importeren en valideren…');
  try{
   const pictures=await parseZIP(file);
   if(account!==key||generation!==n)return;
   await store(key,{pictures,savedAt:Date.now()},true);
   if(account!==key||generation!==n)return;
   images=pictures;say('Alle 258 2D-kaarten privé geïmporteerd.');render();renderActive();
  }catch(e){if(account===key)say('Import mislukt: '+String(e.message||e));}
  finally{loading=false;if(account===key)$('full-deck-zip').disabled=false;}
 }
 async function init(){
  if(!$('full-deck-world'))return;
  try{
   const response=await fetch('./catalog/quest-full-258.json',{cache:'no-cache'});
   if(!response.ok)throw Error('Catalogus ontbreekt');
   const data=await response.json();
   if(data.ordinary?.length!==240||data.superdates?.length!==18)throw Error('Onvolledige catalogus');
   cards=[...data.ordinary.map(c=>({...c,superdate:false})),
      ...data.superdates.map(c=>({...c,world:'superdate',superdate:true}))];
   if(new Set(data.ordinary.map(c=>c.id)).size!==240)throw Error('Dubbele catalogus-ID');
   filter();renderActive();say('258 officiële kaarten geladen. Illustraties verschijnen automatisch zodra de webbestanden gepubliceerd zijn; lokaal importeren blijft mogelijk.');
   void checkHostedArtwork();
  }catch(_err){say('Volledige catalogus niet geladen; probeer deze testversie opnieuw te openen.');return;}
  $('full-deck-world').addEventListener('change',filter);
  $('full-deck-search').addEventListener('input',filter);
  $('full-deck-prev').addEventListener('click',()=>move(-1));
  $('full-deck-next').addEventListener('click',()=>move(1));
  const showcase=$('full-deck-showcase');
  if(showcase){
   let startX=0,startY=0,tracking=false;
   showcase.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    startX=event.clientX;startY=event.clientY;tracking=true;
   },{passive:true});
   showcase.addEventListener('pointerup',event=>{
    if(!tracking)return;
    tracking=false;
    const dx=event.clientX-startX,dy=event.clientY-startY;
    if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.3)move(dx<0?1:-1);
   },{passive:true});
   showcase.addEventListener('pointercancel',()=>{tracking=false;},{passive:true});
   showcase.setAttribute('tabindex','0');
   showcase.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight');
   showcase.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
     event.preventDefault();move(event.key==='ArrowRight'?1:-1);
    }
   });
  }
  $('full-deck-zip').addEventListener('change',async e=>{
   const file=e.currentTarget.files?.[0];e.currentTarget.value='';
   if(file)await importZip(file);
  });
  $('quest-card-reveal-close')?.addEventListener('click',closeReveal);
  $('quest-card-reveal-continue')?.addEventListener('click',()=>{
   const phase=activeState?.phase;
   closeReveal();
   if(phase==='approval'){
    const accept=$('quest-pilot-accept');
    if(accept&&!accept.disabled){accept.click();return;}
    $('quest-current-card')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
   }
   window.dispatchEvent(new CustomEvent('us-two-open-quest-agenda'));
  });
  $('quest-card-reveal')?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeReveal();}if(event.key==='Tab'){const buttons=[$('quest-card-reveal-close'),$('quest-card-reveal-continue')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons[1].focus();}else if(!event.shiftKey&&document.activeElement===buttons[1]){event.preventDefault();buttons[0].focus();}}});
  window.addEventListener('us-two-quest-game-open',showReveal);
  window.addEventListener('us-two-session-cleared',clear);
 }
 window.USTwoFullDeck=Object.freeze({update,clear,move,parseZIP,get cards(){return cards;}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
