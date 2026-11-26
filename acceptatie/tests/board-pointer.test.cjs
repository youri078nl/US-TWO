// Targeted regression test for acceptatie board interactions. Run: node --test acceptatie/tests/board-pointer.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  class Element {
    constructor() { this.handlers = {}; this.style = {}; this.dataset = {}; this.clientWidth = 300; this.clientHeight = 500; this.hidden = false; this.disabled = false; this.textContent = ''; this.captured = null; }
    addEventListener(type, fn, capture = false) { (this.handlers[type] ||= []).push({fn, capture: capture === true}); }
    setPointerCapture(id) { this.captured = id; }
    hasPointerCapture(id) { return this.captured === id; }
    releasePointerCapture(id) { if(this.captured === id) this.captured = null; }
    querySelectorAll() { return [button]; }
  }
  const viewport = new Element(), stage = new Element(), button = new Element(), pawn = new Element();
  button.dataset.location = 'forest';
  const elements = {'quest-world-viewport':viewport,'quest-board-stage':stage,'quest-world-pawn':pawn,'quest-board-zoom-level':new Element(),'quest-board-zoom-in':new Element(),'quest-board-zoom-out':new Element(),'quest-board-center':new Element()};
  const opened = [];
  const win = { USTwoDateBrowser:{openLocation:(v)=>opened.push(v)}, addEventListener(){} };
  const quickButton=new Element();quickButton.dataset.quickLocation='living';
  const doc = {readyState:'complete',getElementById:id=>elements[id]||null,querySelectorAll:selector=>selector==='[data-quick-location]'?[quickButton]:[]};
  const code = fs.readFileSync(path.join(__dirname,'..','quest-board-interactions.js'),'utf8');
  vm.runInNewContext(code,{window:win,document:doc,Math,Number,Object});
  function emit(el,type,extra={}) {
    const event = {type,button:0,pointerId:1,clientX:100,clientY:100,deltaY:0,ctrlKey:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
    // Capture on the viewport precedes a button's own bubbling handler.
    for(const h of (viewport.handlers[type]||[]).filter(x=>x.capture))h.fn(event);
    if(el===button&&!event.stopped)for(const h of button.handlers[type]||[])h.fn(event);
    if(!event.stopped)for(const h of (viewport.handlers[type]||[]).filter(x=>!x.capture))h.fn(event);
    return event;
  }
  return {emit,button,quickButton,viewport,opened,win};
}
test('ordinary tap on a location opens that location',()=>{
  const s=setup();
  s.emit(s.button,'pointerdown');
  s.emit(s.button,'pointerup');
  s.emit(s.button,'click');
  assert.deepEqual(s.opened,['forest']);
});
test('drag starting on a hotspot pans without opening a location',()=>{
  const s=setup();
  s.emit(s.button,'pointerdown');
  s.emit(s.button,'pointermove',{clientX:140});
  s.emit(s.button,'pointerup',{clientX:140});
  s.emit(s.button,'click');
  assert.deepEqual(s.opened,[]);
  assert.equal(s.win.USTwoBoardInteraction.getState().x!==0,true);
});
test('tiny finger jitter remains a tap',()=>{
  const s=setup();
  s.emit(s.button,'pointerdown');
  s.emit(s.button,'pointermove',{clientX:103});
  s.emit(s.button,'pointerup',{clientX:103});
  s.emit(s.button,'click');
  assert.deepEqual(s.opened,['forest']);
});

test('quick location button also opens the date filter',()=>{
  const s=setup();
  for(const h of s.quickButton.handlers.click||[])h.fn({});
  assert.deepEqual(s.opened,['living']);
});
