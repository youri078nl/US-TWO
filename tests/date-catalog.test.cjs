// Run: node --test tests/date-catalog.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function getArray(name){
  const start=app.indexOf('const '+name+' = Object.freeze(');
  assert.ok(start>=0,name+' declaration exists');
  const first=app.indexOf('[',start);
  const end=app.indexOf(']);',first);
  assert.ok(first>=0&&end>=0,name+' array ends');
  return Function('return '+app.slice(first,end+1))();
}
const ideas=getArray('DATE_IDEAS');
const categories=getArray('DATE_CATEGORIES');
test('every existing date has a valid category',()=>{
  assert.equal(ideas.length,12);
  assert.equal(categories.length,ideas.length);
  const allowed=['creatief','romantisch','avontuur','spel'];
  for(const category of categories)assert.ok(allowed.includes(category),category);
});
test('all dates have valid duration budget and location',()=>{
  for(const [title,duration,budget,place,description] of ideas){
    assert.ok(typeof title==='string'&&title.length>0);
    assert.ok(Number.isInteger(duration)&&duration>0);
    assert.ok(Number.isFinite(budget)&&budget>=0);
    assert.ok(['thuis','buiten','beide'].includes(place));
    assert.ok(typeof description==='string'&&description.length>0);
  }
});
test('date filter and calendar controls exist',()=>{
  for(const id of ['idea-category','idea-budget','idea-duration','idea-place','idea-results','date-title','date-duration']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.ok(app.includes("$('idea-category').addEventListener('change',renderDateIdeas)"));
  assert.ok(app.includes("if(a==='choose-idea')"));
});
