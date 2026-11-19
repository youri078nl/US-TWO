/* US TWO Dates: an independent, searchable date collection. Read-only
 * catalog, no gameplay mutations, and never sends an agenda invitation itself.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const AREAS=Object.freeze({
  all:{label:'Alle plekken',test:()=>true},
  living:{label:'Woonkamer',test:t=>/thuis|woonkamer|bank|huis|keuken|tafel|spel|quiz|foto|muziek|dans|puzzel|film|knus|diner|knutsel|creatief|schilder/.test(t)},
  airport:{label:'Vliegveld',test:t=>/reis|avontuur|route|eiland|vlieg|verre|ontdek|missie|wereld|speurtocht|landen|toekomst|schat/.test(t)},
  beach:{label:'Strand',test:t=>/strand|water|zee|zand|zon|picknick|buiten|zomer|schelp|kust|boot|meer|zwem/.test(t)},
  forest:{label:'Bos',test:t=>/bos|wandel|natuur|park|buiten|route|boom|bloem|lucht|speur|dieren|pepsi|groen|picknick/.test(t)},
  cinema:{label:'Bioscoop',test:t=>/film|bioscoop|trailer|kijk|cinema|popcorn|serie|video|theater|acteur|acteer|script|scène/.test(t)},
  wellness:{label:'Wellness',test:t=>/massage|rust|ontspan|yoga|kalm|adem|wellness|knuffel|verwen|spa|stretch|meditatie|warm/.test(t)},
  cafe:{label:'Café',test:t=>/caf[eé]|koffie|restaurant|eten|drinken|picknick|thee|gesprek|diner|menu|keuken|tafel|hapje|proef/.test(t)}
 });
 const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 let loaded=null,loading=null,shown=12,active=false,proposalKeys=[],proposalRound=0,proposalSeen=new Set();
 const hasBridge=()=>typeof window.USTwoDateBridge?.choose==='function';
 const say=t=>{if($('quest-date-status'))$('quest-date-status').textContent=t;};
 const opt=(select,value,label)=>{
  const el=document.createElement('option');
  el.value=value;el.textContent=label;select.append(el);
 };
 async function ensure(){
  if(loaded)return loaded;
  if(loading)return loading;
  loading=(async()=>{
   const response=await fetch('./catalog/quest-full-258.json');
   if(!response.ok)throw Error('Datelijst kan niet worden geladen (HTTP '+response.status+').');
   const source=await response.json();
   if(!Array.isArray(source.ordinary)||source.ordinary.length!==240)
    throw Error('De officiële collectie is niet compleet.');
   const official=source.ordinary.map((c,i)=>({
    key:'quest-'+String(c.id),title:String(c.title||'').slice(0,120),
    description:String(c.brief||''),instructions:String(c.together_instructions||''),
    remoteInstructions:String(c.remote_instructions||''),
    category:String(c.category||'Algemeen'),minutes:Number(c.minutes)||30,
    cost:Number(c.estimated_cost_eur)||0,remote:Boolean(c.remote),
    together:Boolean(c.together),source:'officieel',index:i,artIndex:i
   }));
   const bonus=(Array.isArray(window.USTwoCardDeckData)?window.USTwoCardDeckData:[])
    .map((c,i)=>({
      key:'bonus-'+String(c.number||i+1),title:String(c.title||'').slice(0,120),
      description:Array.isArray(c.steps)?c.steps.join(' · '):'',
      instructions:'',remoteInstructions:'',category:String(c.category||'Bonus'),minutes:Number(c.minutes)||30,
      cost:null,remote:false,together:true,source:'bonus',index:i,artIndex:240+i
    }));
   loaded=[...official,...bonus];
   const categories=[...new Set(loaded.map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'nl'));
   const select=$('quest-date-category'),old=select?.value||'all';
   if(select){select.replaceChildren();opt(select,'all','Alle categorieën');
    for(const c of categories)opt(select,c,c);select.value=categories.includes(old)?old:'all';}
   return loaded;
  })().catch(e=>{loading=null;throw e;});
  return loading;
 }
 function current(){
  const all=loaded||[];
  const search=normalize($('quest-date-search')?.value).trim();
  const category=$('quest-date-category')?.value||'all';
  const area=$('quest-date-area')?.value||'all';
  const budget=$('quest-date-budget')?.value||'all';
  const mode=$('quest-date-mode')?.value||'all';
  const duration=$('quest-date-duration')?.value||'all';
  const words=search.split(/\s+/).filter(Boolean);
  const matches=all.filter(c=>{
   const corpus=normalize([c.title,c.description,c.instructions,c.remoteInstructions,c.category].join(' '));
   if(words.some(w=>!corpus.includes(w)))return false;
   if(category!=='all'&&c.category!==category)return false;
   const locationCorpus=normalize([c.title,c.description,c.instructions,c.category].join(' '));
   if(!AREAS[area]?.test(locationCorpus))return false;
   if(budget!=='all'&&(c.cost===null||c.cost>Number(budget)))return false;
   if(duration!=='all'&&c.minutes>Number(duration))return false;
   if(mode==='together'&&!c.together)return false;
   if(mode==='remote'&&!c.remote)return false;
   return true;
  });
  const sort=$('quest-date-sort')?.value||'default';
  if(sort==='shortest')matches.sort((a,b)=>a.minutes-b.minutes);
  else if(sort==='longest')matches.sort((a,b)=>b.minutes-a.minutes);
  else if(sort==='cheapest')matches.sort((a,b)=>(a.cost??Infinity)-(b.cost??Infinity));
  else if(sort==='title')matches.sort((a,b)=>a.title.localeCompare(b.title,'nl'));
  return matches;
 }
 function nextProposals(){
  const options=current();
  // Cycle through the matching collection before repeating previous suggestions.
  let pool=options.filter(x=>!proposalSeen.has(x.key));
  if(pool.length<Math.min(3,options.length)){
   proposalSeen=new Set(proposalKeys);
   pool=options.filter(x=>!proposalSeen.has(x.key));
   if(!pool.length)pool=options.slice();
  }
  for(let i=pool.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  proposalKeys=pool.slice(0,3).map(x=>x.key);
  proposalKeys.forEach(key=>proposalSeen.add(key));
  proposalRound++;
  renderProposals();
 }
 function addArtwork(card,item){
  const img=document.createElement('img');
  const i=item.artIndex;
  const filename=i>=240?'US_TWO_SUPERDATE_'+String(i-239).padStart(2,'0')+'.jpg':
   'US_TWO_W'+(Math.floor(i/40)+1)+'_'+String(i%40+1).padStart(2,'0')+'.jpg';
  const dedicated={
   'ruimtestenen uit de keuken':'US_TWO_DATE_Ruimtestenen_uit_de_keuken.jpg',
   'ontwerp een nieuwe feestdag':'US_TWO_DATE_Ontwerp_een_nieuwe_feestdag.jpg'
  };
  const custom=dedicated[normalize(item.title).trim()];
  img.src=custom?'./assets/dates/'+custom:'./assets/cards/'+filename;
  img.alt='Geïllustreerde US TWO-datekaart: '+item.title;
  img.loading='lazy';img.decoding='async';
  img.className='quest-date-artwork';
  img.onerror=()=>{if(custom){img.onerror=()=>img.remove();img.src='./assets/cards/'+filename;}else img.remove();};
  const frame=document.createElement('div');
  frame.className='quest-date-art-frame';
  const ribbon=document.createElement('span');
  ribbon.className='quest-date-art-ribbon';ribbon.textContent='♡ US TWO · DATE ♡';
  const caption=document.createElement('div');caption.className='quest-date-art-caption';
  const captionType=document.createElement('span');captionType.textContent='♡ JULLIE DATE ♡';
  const captionTitle=document.createElement('strong');captionTitle.textContent=item.title;
  const captionInfo=document.createElement('span');captionInfo.textContent=item.minutes+' min · '+(item.cost===0?'Gratis':item.cost===null?'Bonusdate':'± €'+item.cost);
  caption.append(captionType,captionTitle,captionInfo);
  frame.append(img,ribbon,caption);
  card.append(frame);
 }
 // Een date-missie komt uit dezelfde officiële collectie en blijft zichtbaar
 // in de gedeelde agenda via de bestaande uitnodigingstitel (geen schemawijziging).
 function linkedMission(item){
  const choices=(loaded||[]).filter(c=>c.source==='officieel'&&c.key!==item.key&&
   (item.remote&&!item.together?c.remote:c.together)&&
   (item.cost===null||c.cost===null||c.cost<=Math.max(0,item.cost)));
  if(!choices.length)return null;
  const words=normalize([item.title,item.description,item.category].join(' ')).split(/[^a-z0-9]+/).filter(w=>w.length>=5);
  const score=c=>{
   const text=normalize([c.title,c.description,c.category].join(' '));
   return words.reduce((n,w)=>n+(text.includes(w)?1:0),0)+(c.category===item.category?3:0);
  };
  choices.sort((a,b)=>score(b)-score(a)||a.key.localeCompare(b.key));
  return choices[0];
 }
 function plan(item,withMission){
  if(!hasBridge())return;
  const mission=withMission?linkedMission(item):null;
  const title=mission?(item.title+' | Missie: '+mission.title).slice(0,120):item.title;
  window.USTwoDateBridge.choose({title,minutes:item.minutes,source:item.source});
 }
 function addMissionChoice(card,item){
  const mission=linkedMission(item);
  if(!mission)return;
  const details=document.createElement('details');
  details.className='quest-date-details quest-date-mission';
  const summary=document.createElement('summary');
  summary.textContent='✦ Bijpassende date-missie';
  const description=document.createElement('p');
  description.textContent=mission.title+' · '+mission.description;
  const instructions=document.createElement('p');
  instructions.textContent=(item.remote&&!item.together?mission.remoteInstructions:mission.instructions)||mission.description;
  const button=document.createElement('button');
  button.type='button';button.className='secondary-btn';
  button.dataset.dateKey=item.key;button.dataset.withMission='true';
  button.textContent='Plan deze date met missie';
  details.append(summary,description,instructions,button);
  card.append(details);
 }
 function renderProposals(){
  const target=$('quest-date-proposal-results');
  if(!target||!active)return;
  target.replaceChildren();
  const available=current();
  const proposals=proposalKeys.map(k=>available.find(x=>x.key===k)).filter(Boolean);
  if(!proposals.length){
   const p=document.createElement('p');p.className='muted';
   p.textContent=available.length?'Tik op Toon drie andere dates voor voorstellen.':'Geen passende dates. Pas de zoekfilters aan.';
   target.append(p);return;
  }
  for(const item of proposals){
   const card=document.createElement('article');card.className='quest-date-tile quest-date-proposal';
   const category=document.createElement('span');category.className='quest-date-chip';category.textContent=item.category;
   const heading=document.createElement('h3');heading.textContent=item.title;
   const meta=document.createElement('p');meta.className='quest-date-meta';
   meta.textContent=item.minutes+' minuten · '+(item.cost===null?'Bonusdate':item.cost===0?'Gratis':'± €'+item.cost)+' · '+(item.remote&&item.together?'Samen of op afstand':item.remote?'Op afstand':'Samen');
   const description=document.createElement('p');description.textContent=item.description;
   const button=document.createElement('button');button.type='button';button.className='primary-btn';
   button.textContent='Kies deze date ♡';button.dataset.dateKey=item.key;
   card.append(category);addArtwork(card,item);card.append(heading,meta,description);addMissionChoice(card,item);card.append(button);target.append(card);
  }
 }
 function render(){
  if(!active)return;
  renderProposals();
  const list=$('quest-date-results');if(!list)return;
  list.replaceChildren();
  const matches=current();
  const visible=matches.slice(0,shown);
  const count=$('quest-date-count');
  if(count)count.textContent=matches.length+' beschikbare dates · '+visible.length+' zichtbaar';
  if(!matches.length){const p=document.createElement('p');p.className='muted';
   p.textContent='Geen passende dates. Kies een andere plek of pas de filters aan.';list.append(p);}
  for(const c of visible){
   const article=document.createElement('article');article.className='quest-date-tile';
   const top=document.createElement('div');top.className='quest-date-tile-top';
   const category=document.createElement('span');category.className='quest-date-chip';
   category.textContent=c.category;
   const price=document.createElement('span');price.className='quest-date-price';
   price.textContent=c.cost===null?'Bonuskaart':c.cost===0?'Gratis':'± €'+c.cost;
   top.append(category,price);
   const title=document.createElement('h3');title.textContent=c.title;
   const description=document.createElement('p');description.textContent=c.description;
   const meta=document.createElement('p');meta.className='quest-date-meta';
   meta.textContent=c.minutes+' minuten · '+(c.remote&&c.together?'Samen of op afstand':c.remote?'Op afstand':'Samen');
   const details=document.createElement('details');details.className='quest-date-details';
   const summary=document.createElement('summary');summary.textContent='Bekijk de date';
   const instructions=document.createElement('p');
   details.append(summary);
   const mode=$('quest-date-mode')?.value||'all';
   const instructionText=mode==='remote'&&c.remote?c.remoteInstructions||c.description
    :c.instructions||c.description;
   instructions.textContent=instructionText||'Geen aanvullende uitleg beschikbaar.';
   details.append(instructions);
   if(mode==='all'&&c.together&&c.remote&&c.remoteInstructions){
    const togetherHeading=document.createElement('strong');togetherHeading.textContent='Samen';
    details.insertBefore(togetherHeading,instructions);
   }
   if(mode==='all'&&c.together&&c.remote&&c.remoteInstructions&&c.remoteInstructions!==instructionText){
    const remoteHeading=document.createElement('strong');remoteHeading.textContent='Op afstand';
    const remoteDetail=document.createElement('p');remoteDetail.textContent=c.remoteInstructions;
    details.append(remoteHeading,remoteDetail);
   }
   const button=document.createElement('button');button.type='button';
   button.className='secondary-btn quest-date-choose';button.textContent='Kies deze date';
   button.dataset.dateKey=c.key;
   article.append(top);addArtwork(article,c);article.append(title,description,meta,details);addMissionChoice(article,c);article.append(button);list.append(article);
  }
  const more=$('quest-date-more');
  if(more){more.hidden=matches.length<=shown;more.disabled=matches.length<=shown;}
 }
 async function activate(){
  active=true;
  say('Dates laden…');
  try{await ensure();if(!active)return;say('Kies een date. De agenda opent zonder iets te versturen.');if(!proposalKeys.length)nextProposals();render();}
  catch(e){say(String(e.message||e));}
 }
 function openLocation(area){
  const selected=AREAS[area]?area:'all';
  const select=$('quest-date-area');
  if(select)select.value=selected;
  shown=12;
  window.USTwoDateBridge?.open();
  activate();
 }
 function bind(){
  const panel=$('discover-panel');if(!panel)return;
  const areas=$('quest-date-area');areas.replaceChildren();
  for(const [key,info]of Object.entries(AREAS))opt(areas,key,info.label);
  for(const id of ['quest-date-search','quest-date-area','quest-date-budget','quest-date-category','quest-date-mode','quest-date-duration','quest-date-sort']){
   const el=$(id);if(el)el.addEventListener(id==='quest-date-search'?'input':'change',()=>{shown=12;proposalSeen.clear();nextProposals();render();});
  }
  $('quest-date-refresh-proposals')?.addEventListener('click',()=>nextProposals());
  $('quest-date-proposal-results')?.addEventListener('click',event=>{
   const button=event.target.closest('button[data-date-key]');
   if(!button||!hasBridge())return;
   const item=loaded?.find(c=>c.key===button.dataset.dateKey);
   if(item)plan(item,button.dataset.withMission==='true');
  });
  $('quest-date-surprise')?.addEventListener('click',()=>{
   if(!loaded?.length||!hasBridge()){say('De dates zijn nog niet beschikbaar.');return;}
   const options=current();
   if(!options.length){say('Geen dates passen bij de gekozen filters.');return;}
   const item=options[Math.floor(Math.random()*options.length)];
   window.USTwoDateBridge.choose({title:item.title,minutes:item.minutes,source:item.source});
  });
  $('quest-date-reset-filters')?.addEventListener('click',()=>{
   for(const id of ['quest-date-search','quest-date-area','quest-date-category','quest-date-budget','quest-date-mode','quest-date-duration','quest-date-sort']){
    const el=$(id);if(el)el.value=id==='quest-date-search'?'':id==='quest-date-sort'?'default':'all';
   }
   shown=12;nextProposals();render();
  });
  $('quest-date-more')?.addEventListener('click',()=>{shown+=12;render();});
  $('quest-date-results')?.addEventListener('click',event=>{
   const button=event.target.closest('button[data-date-key]');
   if(!button||!hasBridge())return;
   const item=loaded?.find(c=>c.key===button.dataset.dateKey);
   if(item)plan(item,button.dataset.withMission==='true');
  });
  window.addEventListener('us-two-tab-changed',event=>{
   const isShown=event.detail?.tab==='discover';
   if(!isShown){active=false;return;}
   activate();
  });
  window.addEventListener('us-two-session-cleared',()=>{active=false;shown=12;proposalKeys=[];proposalSeen.clear();
   if($('quest-date-search'))$('quest-date-search').value='';
   if($('quest-date-area'))$('quest-date-area').value='all';
   if($('quest-date-category'))$('quest-date-category').value='all';
   for(const id of ['quest-date-budget','quest-date-mode','quest-date-duration'])if($(id))$(id).value='all';
   if($('quest-date-sort'))$('quest-date-sort').value='default';
   if($('quest-date-results'))$('quest-date-results').replaceChildren();
  });
 }
 window.USTwoDateBrowser=Object.freeze({openLocation,render,available:()=>loaded?.length??0});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
