'use strict';
/**
 * Pure catalog selector. Filters untrusted API records, avoids recently completed
 * cards where alternatives exist, and rotates consistently with game position.
 * No random choices, so both devices with the same canonical state agree.
 */
function chooseOptions(rows,{world,mode,position,history=[],limit=3}={}) {
  if(!Number.isSafeInteger(world)||world<0||world>5
    ||!Number.isSafeInteger(position)||position<0
    ||!['afstand','samen'].includes(mode)
    ||!Number.isSafeInteger(limit)||limit<1||limit>3) throw Error('invalid_selection');
  const eligibility=mode==='afstand'?'remote':'together';
  const unique=new Map();
  for(const card of Array.isArray(rows)?rows:[]) {
    if(!card||typeof card.id!=='string'||!card.id||card.id.length>150||
      typeof card.title!=='string'||!card.title.trim()||
      card.world!==world||card.category==='Flirt'||card[eligibility]!==true) continue;
    if(!unique.has(card.id))unique.set(card.id,{...card});
  }
  const pool=[...unique.values()].sort((a,b)=>a.id.localeCompare(b.id));
  if(!pool.length)return [];
  const recent=new Set((Array.isArray(history)?history:[]).slice(0,Math.min(10,pool.length))
    .map(h=>typeof h==='string'?h:h?.id).filter(Boolean));
  const start=position%pool.length;
  const ordered=[...pool.slice(start),...pool.slice(0,start)];
  return [...ordered.filter(x=>!recent.has(x.id)),...ordered.filter(x=>recent.has(x.id))].slice(0,limit);
}
if(typeof module!=='undefined'&&module.exports)module.exports={chooseOptions};
if(typeof globalThis!=='undefined')globalThis.USTwoQuestCatalog=Object.freeze({chooseOptions});
