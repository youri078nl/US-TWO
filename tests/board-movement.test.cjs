// Run: node --test tests/board-movement.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');
const functions = ['waypointIndex', 'movementDelay'].map(name => {
  const match = source.match(new RegExp('function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
  assert.ok(match, name + ' must exist in production app.js');
  return match[0];
}).join('\n');
const context = vm.createContext({});
vm.runInContext(functions, context);
const index = context.waypointIndex;
const delay = context.movementDelay;
test('20 board waypoints wrap exactly at the end of a lap', () => {
  assert.equal(index(1,20),0);
  assert.equal(index(20,20),19);
  assert.equal(index(21,20),0);
  assert.equal(index(40,20),19);
  assert.equal(index(41,20),0);
  assert.equal(index(101,20),0);
});
test('invalid positions do not silently put a pawn on a random cell', () => {
  for (const value of [0,-1,1.5,NaN,Infinity]) assert.throws(()=>index(value,20));
  assert.throws(()=>index(1,0));
});
test('movement delay is bounded for both short and large earned moves', () => {
  assert.equal(delay(1,2),240);
  assert.equal(delay(1,21),240);
  assert.equal(delay(1,101),50);
  assert.equal(delay(1,1001),45);
});
test('every earned position has one deterministic waypoint', () => {
  for (let from=1;from<=60;from++) {
    for (const steps of [1,2,5,20,31,100]) {
      const sequence=Array.from({length:steps},(_,i)=>index(from+i+1,20));
      assert.equal(sequence.length,steps);
      assert.equal(sequence.at(-1),index(from+steps,20));
    }
  }
});
