'use strict';
const assert=require('node:assert/strict');
const {deflateSync}=require('node:zlib');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:8765/';
const USER='00000000-0000-4000-8000-000000000081';
const OTHER='00000000-0000-4000-8000-000000000089';
const COUPLE='00000000-0000-4000-8000-000000000082';
function crc32(data){
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
 const label=Buffer.from(type,'ascii'),size=Buffer.alloc(4),sum=Buffer.alloc(4);
 size.writeUInt32BE(data.length);sum.writeUInt32BE(crc32(Buffer.concat([label,data])));
 return Buffer.concat([size,label,data,sum]);
}
function png(seed){
 const width=24,height=24,raw=Buffer.alloc(height*(1+width*4));
 let pos=0;
 for(let y=0;y<height;y++){
  raw[pos++]=0;
  for(let x=0;x<width;x++){raw[pos++]=(x*11+seed*17)%255;raw[pos++]=(y*17+seed*29)%255;raw[pos++]=(x*3+y*7)%255;raw[pos++]=255;}
 }
 const hdr=Buffer.alloc(13);hdr.writeUInt32BE(width,0);hdr.writeUInt32BE(height,4);
 hdr[8]=8;hdr[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',hdr),
   chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
async function setup(page,user){
 await page.evaluate(({user,COUPLE})=>{
  const who={paired:true,userId:user,coupleId:COUPLE};
  const game={paired:true,initialized:true,phase:'active',position:4,
    date:{id:'demo-frames',title:'Samen dansen'}};
  document.getElementById('app-view').classList.remove('hidden');
  document.getElementById('game-panel').classList.remove('hidden');
  const img=document.getElementById('quest-world-pawn-art');
  img.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
  img.hidden=false;
  document.getElementById('quest-world-fallback').hidden=true;
  window.USTwoCinematics.update(game,who);
  window.dispatchEvent(new Event('us-two-pawn-art-changed'));
 },{user,COUPLE});
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext();
  const page=await context.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:'networkidle',timeout:30000});
  await setup(page,USER);
  assert.equal(await page.locator('#quest-pose-scene').inputValue(),'dance');
  await page.locator('#quest-pose-status').getByText(/Nog geen goedgekeurde beeldreeks/).waitFor();
  assert.equal(await page.locator('#quest-cinematic-play').isDisabled(),false);

  // Name-aware ordering should place frame 2 before frame 10.
  await page.locator('#quest-pose-upload').setInputFiles([
   {name:'pose_10.png',mimeType:'image/png',buffer:png(10)},
   {name:'pose_2.png',mimeType:'image/png',buffer:png(2)},
   {name:'pose_1.png',mimeType:'image/png',buffer:png(1)}
  ]);
  await page.locator('#quest-pose-status').getByText(/3 originele beeldframes/).waitFor();
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),true);
  const original=await page.locator('#quest-world-pawn-art').getAttribute('src');
  assert.equal(await page.locator('#quest-world-pose-frame').isHidden(),false);
  assert.match(await page.locator('#quest-world-pose-frame').getAttribute('src'),/^blob:/);
  await page.locator('#quest-cinematic-play').click();
  await page.locator('#quest-world-pawn[data-framepack="true"]').waitFor();
  assert.match(await page.locator('#quest-world-pose-frame').getAttribute('src'),/^blob:/);
  assert.equal(await page.locator('#quest-world-pawn-art').getAttribute('src'),original);
  await page.locator('#quest-world-pawn:not([data-framepack])').waitFor({timeout:10000});
  assert.equal(await page.locator('#quest-world-pawn-art').getAttribute('src'),original);
  assert.equal(await page.locator('#quest-world-pose-frame').isHidden(),false);
  assert.equal(await page.locator('#quest-world-pawn').getAttribute('data-scene'),null);
  console.log('PASS frame-by-frame poses play above the untouched original character image');

  // Reload same origin: the saved frames survive page close via IndexedDB.
  await page.reload({waitUntil:'networkidle'});
  await setup(page,USER);
  await page.locator('#quest-pose-status').getByText(/3 originele beeldframes/).waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),true);
  console.log('PASS local pose frames survive browser reload');

  // Different account cannot read this pair's local pack.
  await setup(page,OTHER);
  await page.locator('#quest-pose-status').getByText(/Nog geen goedgekeurde beeldreeks/).waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),false);
  assert.equal(await page.locator('#quest-world-pose-frame').isHidden(),true);
  console.log('PASS saved animation stays isolated by user identity');

  await setup(page,USER);
  await page.locator('#quest-pose-status').getByText(/3 originele beeldframes/).waitFor({timeout:10000});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('#quest-cinematic-play').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.USTwoCinematics.play()),false);
  assert.equal(await page.locator('#quest-world-pawn').getAttribute('data-framepack'),null);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.dispatchEvent(new Event('us-two-session-cleared')));
  assert.equal(await page.locator('#quest-pose-upload').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),false);
  assert.equal(await page.locator('#quest-world-pose-frame').isHidden(),true);
  assert.match(await page.locator('#quest-pose-status').textContent(),/uitloggen/);
  assert.deepEqual(errors,[]);
  console.log('PASS reduced motion, logout and privacy clean-up');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
