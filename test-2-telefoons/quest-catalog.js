'use strict';
/**
 * Pure catalog selector. Filters untrusted API records, avoids recently completed
 * cards where alternatives exist, and rotates consistently with game position.
 * No random choices, so both devices with the same canonical state agree.
 */
function chooseOptions(rows,{world,mode,position,history=[],limit=3,budget='max',page=0}={}) {
  if(!Number.isSafeInteger(world)||world<0||world>5
    ||!Number.isSafeInteger(position)||position<0
    ||!['afstand','samen'].includes(mode)
    ||!Number.isSafeInteger(limit)||limit<1||limit>3
    ||!Number.isSafeInteger(page)||page<0||page>10000
    ||!(budget==='max'||[0,10,20,40,60,100].includes(budget))) throw Error('invalid_selection');
  const eligibility=mode==='afstand'?'remote':'together';
  const unique=new Map();
  for(const card of Array.isArray(rows)?rows:[]) {
    if(!card||typeof card.id!=='string'||!card.id||card.id.length>150||
      typeof card.title!=='string'||!card.title.trim()||
      card.world!==world||card.category==='Flirt'||card[eligibility]!==true) continue;
    // Existing zero-cost tasks use supplies already at home; no real-world prices implied.
    const cost=card.estimated_cost_eur??0;
    if(typeof cost!=='number'||!Number.isFinite(cost)||cost<0||
       (budget!=='max'&&cost>budget))continue;
    if(!unique.has(card.id))unique.set(card.id,{...card,estimated_cost_eur:cost});
  }
  const pool=[...unique.values()].sort((a,b)=>a.id.localeCompare(b.id));
  if(!pool.length)return [];
  const recent=new Set((Array.isArray(history)?history:[]).slice(0,Math.min(10,pool.length))
    .map(h=>typeof h==='string'?h:h?.id).filter(Boolean));
  const start=(position+(page*3))%pool.length;
  const ordered=[...pool.slice(start),...pool.slice(0,start)];
  const ranked=[...ordered.filter(x=>!recent.has(x.id)),...ordered.filter(x=>recent.has(x.id))];
  const free=ranked.filter(c=>c.estimated_cost_eur===0);
  const paid=ranked.filter(c=>c.estimated_cost_eur>0);
  // Prefer two zero-cost dates and one paid alternative when both exist.
  // The full choice remains available when there are fewer free options.
  const chosen=free.slice(0,Math.min(free.length,Math.min(2,limit)));
  if(paid.length&&chosen.length<limit)chosen.push(paid[0]);
  for(const c of ranked) {
    if(chosen.length>=limit)break;
    if(!chosen.some(x=>x.id===c.id))chosen.push(c);
  }
  return chosen.slice(0,limit);
}
if(typeof module!=='undefined'&&module.exports)module.exports={chooseOptions};
if(typeof globalThis!=='undefined')globalThis.USTwoQuestCatalog=Object.freeze({chooseOptions});
