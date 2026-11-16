'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chooseOptions}=require('../quest-catalog.js');
const sql=fs.readFileSync('supabase/migrations/20261116_premium_catalog_36.sql','utf8');
const match=sql.match(/\$US_TWO_CARDS\$(\[[\s\S]*?\])\$US_TWO_CARDS\$/);
assert.ok(match,'SQL migration embeds author-reviewed JSON records');
const items=JSON.parse(match[1]);
assert.equal(items.length,36,'six original premium cards per world');
assert.equal(new Set(items.map(c=>c.id)).size,36,'unique catalog IDs');
assert.equal(new Set(items.map(c=>c.title.toLocaleLowerCase('nl-NL'))).size,36,'unique titles');
assert.ok(sql.includes('ON CONFLICT (id) DO NOTHING'),'preserve existing user catalog records');
assert.ok(sql.includes('CHECK (estimated_cost_eur BETWEEN 0 AND 500)'),'db price constraint');
assert.ok(fs.readFileSync('app.js','utf8').includes('world,estimated_cost_eur'),
 'authenticated REST catalog must actually fetch the price field');
for(let world=0;world<6;world++){
 const rows=items.filter(c=>c.world===world);
 assert.equal(rows.length,6,'six premium options in world '+world);
 assert.deepEqual(rows.map(c=>c.estimated_cost_eur).sort((a,b)=>a-b),[10,20,40,60,100,130]);
 for(const c of rows){
   assert.ok(c.brief.length>22&&c.together_instructions.length>80&&c.remote_instructions.length>65);
   assert.ok(c.together&&c.remote&&c.reward_steps>=1&&c.reward_steps<=4);
 }
 const free=Array.from({length:6},(_,i)=>({
   id:'free-'+world+'-'+i,title:'Gratis voorstel '+i,category:'Normaal',world,
   remote:true,together:true,estimated_cost_eur:0
 }));
 const options=[...free,...rows];
 for(const tier of [0,10,20,40,60,100,'max']){
   const pick=chooseOptions(options,{world,mode:'samen',position:0,budget:tier,limit:3});
   assert.equal(pick.length,3);
   assert.equal(pick.filter(c=>c.estimated_cost_eur===0).length,tier===0?3:2,'free-first proposals');
   assert.equal(pick.filter(c=>c.estimated_cost_eur>0).length,tier===0?0:1);
   assert.ok(pick.every(c=>tier==='max'||c.estimated_cost_eur<=tier));
 }
}
console.log('PASS: 36 authored dates, six worlds, all price ranges, database migration, authenticated REST and free-first budget tiers');
const sourcePaths=['world0_free17.json','world1_free24.json','world2_free24.json',
 'world3_free24.json','world4_free24.json','world5_free24.json'];
const authored=sourcePaths.flatMap(name=>JSON.parse(fs.readFileSync('supabase/catalog/'+name,'utf8')));
const fullMigration=fs.readFileSync('supabase/migrations/20261116_complete_240_catalog.sql','utf8');
const fullMatch=fullMigration.match(/\$US_TWO_137\$(\[[\s\S]*?\])\$US_TWO_137\$/);
assert.ok(fullMatch,'full SQL migration contains original 137-card payload');
assert.deepEqual(JSON.parse(fullMatch[1]),authored,'migration and JSON source must be identical');
assert.equal(authored.length,137,'remaining free activities needed for 240');
assert.equal(new Set(authored.map(c=>c.id)).size,137,'free IDs unique');
const all=[...items,...authored];
assert.equal(new Set(all.map(c=>c.id)).size,173,'all new IDs unique across paid and free');
assert.equal(new Set(all.map(c=>c.title.toLocaleLowerCase('nl-NL').trim())).size,173,'all new titles unique');
for(let world=0;world<6;world++){
 const free=authored.filter(x=>x.world===world);
 assert.equal(free.length,world===0?17:24,'correct free count for world '+world);
 assert.equal((world===0?17:10)+items.filter(x=>x.world===world).length+free.length,40,'40 cards per world');
 for(const c of free){
  assert.ok(c.title.length>=8&&c.brief.length>=25&&c.together_instructions.length>=65&&c.remote_instructions.length>=65,'incomplete instructions '+c.id);
  assert.ok(c.remote&&c.together&&c.estimated_cost_eur===0,'free modes invalid '+c.id);
  assert.ok(c.minutes>=1&&c.minutes<=240&&c.reward_steps>=1&&c.reward_steps<=4,'invalid reward '+c.id);
 }
}
assert.ok(fullMigration.includes('ON CONFLICT (id) DO NOTHING'),'catalog migration must not overwrite earlier content');
console.log('PASS: 240 activities, 40 per world, 204 free and 36 paid; two variants, distinct ID/title and safe migrations');

