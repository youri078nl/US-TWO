const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setup(themed){
 const window={};
 const art={dataset:{worldImageApplied:themed?'themed':'original'}};
 const stage={querySelector:()=>art};
 const document={readyState:'loading',addEventListener(){},getElementById:id=>id==='quest-board-stage'?stage:null};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','quest-board.js'),'utf8'),{window,document});
 return (tile,world)=>Array.from(window.USTwoQuestBoard.pathPoint(tile,world));
}
test('all 40 earned steps on shared board are distinct and in bounds',()=>{
 const point=setup(true),points=Array.from({length:41},(_,i)=>point(i,0));
 assert.equal(new Set(points.map(p=>p.join(','))).size,41);
 assert.ok(points.every(([x,y])=>x>=0&&x<=941&&y>=0&&y<=1672));
 assert.notDeepEqual(point(6,0),point(0,0));
});
test('at a world portal keep old world endpoint until server unlocks the next world',()=>{
 const point=setup(true);
 assert.notDeepEqual(point(40,0),point(40,1));
 assert.deepEqual(point(40,1),point(0,0));
 assert.deepEqual(point(46,1),point(6,0));
});
test('original artwork coordinates remain inside original image',()=>{
 const point=setup(false);
 assert.ok(Array.from({length:41},(_,i)=>point(i,0)).every(([x,y])=>x>=0&&x<=941&&y>=0&&y<=1672));
});
