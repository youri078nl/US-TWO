'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const data=JSON.parse(fs.readFileSync('supabase/catalog/superdate_templates_18.json','utf8'));
const sql=fs.readFileSync('supabase/migrations/20261116_superdate_templates_18.sql','utf8');
assert.equal(data.length,18);
assert.deepEqual(data.map(x=>x.idx),Array.from({length:18},(_,i)=>i+1));
for(const field of ['title','prep_a','prep_b','finale_together','finale_remote']){
 assert.equal(new Set(data.map(x=>x[field])).size,18,'all content must be different: '+field);
}
for(const x of data){
 assert.ok(x.prep_a.length>=100&&x.prep_b.length>=100&&x.prep_a!==x.prep_b);
 assert.ok(x.finale_together.length>=100&&x.finale_remote.length>=100&&x.finale_together!==x.finale_remote);
 assert.ok(!/verplicht budget|moet betalen/i.test(x.prep_a+' '+x.prep_b),'no forced costs');
}
const match=sql.match(/\$US_TWO_SUPER\$(\[[\s\S]*?\])\$US_TWO_SUPER\$/);
assert.ok(match,'migration includes reviewed source');
assert.deepEqual(JSON.parse(match[1]),data,'migration must match authored source exactly');
assert.match(sql,/us_two_private\.quest_superdate_templates/,'content stored in private schema');
assert.match(sql,/ENABLE ROW LEVEL SECURITY/,'RLS defense in depth');
assert.match(sql,/REVOKE ALL ON TABLE/,'no access for anon or authenticated');
assert.match(sql,/SECURITY DEFINER/,'seed function retains restricted definer access');
assert.match(sql,/ON CONFLICT DO NOTHING/,'existing superdates not overwritten');
assert.match(sql,/interval '72 hours'/,'real 72-hour gate remains');
assert.match(sql,/v_idx:=\(\(p_cell\/20-1\)%18\)\+1/,'repeatable milestone template mapping');
console.log('PASS 18 distinct private superdate templates, two individualized preparations, two finales and 72-hour milestone gate');
