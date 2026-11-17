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
 let loaded=null,loading=null,shown=12,active=false;
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
    category:String(c.category||'Algemeen'),minutes:Number(c.minutes)||30,
    cost:Number(c.estimated_cost_eur)||0,remote:Boolean(c.remote),
    together:Boolean(c.together),source:'officieel',index:i
   }));
   const bonus=(Array.isArray(window.USTwoCardDeckData)?window.USTwoCardDeckData:[])
    .map((c,i)=>({
      key:'bonus-'+String(c.number||i+1),title:String(c.title||'').slice(0,120),
      description:Array.isArray(c.steps)?c.steps.join(' · '):'',
      instructions:'',category:String(c.category||'Bonus'),minutes:Number(c.minutes)||30,
      cost:null,remote:false,together:true,source:'bonus',index:i
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
   const corpus=normalize([c.title,c.description,c.instructions,c.category].join(' '));
   if(words.some(w=>!corpus.includes(w)))return false;
   if(category!=='all'&&c.category!==category)return false;
   if(!AREAS[area]?.test(corpus))return false;
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
 function render(){
  if(!active)return;
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
   instructions.textContent=c.instructions||c.description||'Geen aanvullende uitleg beschikbaar.';
   details.append(summary,instructions);
   const button=document.createElement('button');button.type='button';
   button.className='secondary-btn quest-date-choose';button.textContent='Kies deze date';
   button.dataset.dateKey=c.key;
   article.append(top,title,description,meta,details,button);list.append(article);
  }
  const more=$('quest-date-more');
  if(more){more.hidden=matches.length<=shown;more.disabled=matches.length<=shown;}
 }
 async function activate(){
  active=true;
  say('Dates laden…');
  try{await ensure();if(!active)return;say('Kies een date. De agenda opent zonder iets te versturen.');render();}
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
   const el=$(id);if(el)el.addEventListener(id==='quest-date-search'?'input':'change',()=>{shown=12;render();});
  }
  $('quest-date-surprise')?.addEventListener('click',()=>{
   if(!loaded?.length||!hasBridge()){say('De dates zijn nog niet beschikbaar.');return;}
   const options=current();
   if(!options.length){say('Geen dates passen bij de gekozen filters.');return;}
   const item=options[Math.floor(Math.random()*options.length)];
   window.USTwoDateBridge.choose({title:item.title,minutes:item.minutes,source:item.source});
  });
  $('quest-date-reset-filters')?.addEventListener('click',()=>{
   for(const id of ['quest-date-search','quest-date-area','quest-date-category','quest-date-budget','quest-date-mode','quest-date-duration']){
    const el=$(id);if(el)el.value=id==='quest-date-search'?'':id==='quest-date-sort'?'default':'all';
   }
   shown=12;render();
  });
  $('quest-date-more')?.addEventListener('click',()=>{shown+=12;render();});
  $('quest-date-results')?.addEventListener('click',event=>{
   const button=event.target.closest('button[data-date-key]');
   if(!button||!hasBridge())return;
   const item=loaded?.find(c=>c.key===button.dataset.dateKey);
   if(item)window.USTwoDateBridge.choose({title:item.title,minutes:item.minutes,source:item.source});
  });
  window.addEventListener('us-two-tab-changed',event=>{
   const isShown=event.detail?.tab==='discover';
   if(!isShown){active=false;return;}
   activate();
  });
  window.addEventListener('us-two-session-cleared',()=>{active=false;shown=12;
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
