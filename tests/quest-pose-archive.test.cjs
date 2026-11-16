'use strict';
const assert=require('node:assert/strict');
const Archive=require('../quest-pose-archive.js');
function image(seed){
 const b=Buffer.alloc(144,seed&255);
 b.write('RIFF',0,'ascii');b.writeUInt32LE(136,4);b.write('WEBP',8,'ascii');
 return b;
}
function archive(entries){
 let offset=0;
 const locals=[],central=[];
 for(const [name,payload,method=0] of entries){
  const filename=Buffer.from(name,'utf8'),data=Buffer.from(payload);
  const crc=Archive.crc32(data);
  const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50,0);
  l.writeUInt16LE(20,4);l.writeUInt16LE(method,8);
  l.writeUInt32LE(crc,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(data.length,22);
  l.writeUInt16LE(filename.length,26);
  locals.push(l,filename,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);
  c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(method,10);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);
  c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);
  central.push(c,filename);
  offset+=l.length+filename.length+data.length;
 }
 const size=central.reduce((n,b)=>n+b.length,0);
 const tail=Buffer.alloc(22);tail.writeUInt32LE(0x06054b50,0);
 tail.writeUInt16LE(entries.length,8);tail.writeUInt16LE(entries.length,10);
 tail.writeUInt32LE(size,12);tail.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,...central,tail]);
}
function decode(b){
 const copy=Uint8Array.from(b).buffer;
 return Archive.readArchive(copy);
}
const valid=archive([
 ['pepsi/pepsi_01.webp',image(1)],
 ['pepsi/pepsi_02.webp',image(2)],
 ['kiss/kiss_01.webp',image(3)],
 ['kiss/kiss_02.webp',image(4)],
 ['README.txt',Buffer.from('US TWO pose pack')]
]);
const entries=decode(valid);
assert.equal(entries.length,2);
assert.deepEqual(entries.map(x=>x.scene),['pepsi','kiss']);
assert.deepEqual(entries.map(x=>x.frames.length),[2,2]);
assert.equal(entries[0].frames[0].type,'image/webp');
assert.ok(entries[0].frames.every(x=>x.size===144));
assert.throws(()=>decode(archive([
 ['pepsi/pepsi_01.webp',image(1)],['pepsi/pepsi_01.webp',image(1)]
])),/dubbel frame/);
assert.throws(()=>decode(archive([
 ['pepsi/pepsi_01.webp',image(1)],['pepsi/pepsi_03.webp',image(3)]
])),/onvolledig/);
assert.throws(()=>decode(archive([['../evil.webp',image(1)]])),/Onverwacht bestand/);
assert.throws(()=>decode(archive([['pepsi/pepsi_01.webp',image(1),8]])),/ongecomprimeerde/);
const corrupt=Buffer.from(valid);corrupt[30+Buffer.byteLength('pepsi/pepsi_01.webp')+20]^=1;
assert.throws(()=>decode(corrupt),/beschadigd/);
assert.throws(()=>decode(Buffer.alloc(10)),/ongeldig formaat/);
console.log('PASS ZIP posepack: two scenes, trusted frame signatures, CRC, duplicate/traversal/recompression guards and contiguous numbering');
