'use strict';
const assert=require('node:assert/strict');
const {deflateSync}=require('node:zlib');
const {chromium}=require('playwright');
const USER='00000000-0000-4000-8000-000000000091';
const OTHER='00000000-0000-4000-8000-000000000092';
const COUPLE='00000000-0000-4000-8000-000000000093';
function crc(data) {
 let c=0xffffffff;for(const b of data){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}
 return (c^0xffffffff)>>>0;
}
function png(seed){
 const w=24,h=24,raw=Buffer.alloc(h*(1+w*4));let pos=0;
 for(let y=0;y<h;y++){raw[pos++]=0;for(let x=0;x<w;x++){
  raw[pos++]=(x*11+seed*17)%255;raw[pos++]=(y*13+seed*21)%255;
  raw[pos++]=(x*5+y*7)%255;raw[pos++]=255;
 }}
 function chunk(tag,payload){
  const name=Buffer.from(tag,'ascii'),size=Buffer.alloc(4),sum=Buffer.alloc(4);
  size.writeUInt32BE(payload.length);sum.writeUInt32BE(crc(Buffer.concat([name,payload])));
  return Buffer.concat([size,name,payload,sum]);
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),
  chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
function zip(paths){
 let offset=0,local=[],central=[];
 for(const [path,data] of paths){
  const n=Buffer.from(path,'utf8');const crcValue=crc(data);
  const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50);l.writeUInt16LE(20,4);
  l.writeUInt32LE(crcValue,14);l.writeUInt32LE(data.length,18);l.writeUInt32LE(data.length,22);
  l.writeUInt16LE(n.length,26);local.push(l,n,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);
  c.writeUInt16LE(20,6);c.writeUInt32LE(crcValue,16);
  c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);
  c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);
  central.push(c,n);offset+=l.length+n.length+data.length;
 }
 const length=central.reduce((n,b)=>n+b.length,0);const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50);end.writeUInt16LE(paths.length,8);end.writeUInt16LE(paths.length,10);
 end.writeUInt32LE(length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,...central,end]);
}
async function setup(page,user) {
 await page.evaluate(({user,COUPLE})=>{
  const who={paired:true,userId:user,coupleId:COUPLE};
  const game={paired:true,initialized:true,phase:'active',position:4,
   date:{id:'demo-zip',title:'Samen dansen'}};
  document.getElementById('app-view').classList.remove('hidden');
  document.getElementById('game-panel').classList.remove('hidden');
  // Production only reveals the approved pawn after a paired server state.
  // This fixture supplies that state without modifying the live database.
  document.getElementById('quest-world-pawn').hidden=false;
  const img=document.getElementById('quest-world-pawn-art');
  img.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
  img.hidden=false;
  document.getElementById('quest-world-fallback').hidden=true;
  window.confirm=()=>true;
  window.USTwoCinematics.update(game,who);
  window.dispatchEvent(new Event('us-two-pawn-art-changed'));
 },{user,COUPLE});
 const options=page.locator('.quest-board-art-options');
 if(!await options.evaluate(el=>el.open))await options.locator('summary').first().click();
 const block=page.locator('.quest-pose-management');
 if(!await block.evaluate(e=>e.open))await block.locator('summary').click();
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext(),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await setup(page,USER);
  assert.equal(await page.locator('#quest-pose-scene').inputValue(),'dance');
  assert.equal(await page.locator('#quest-pose-zip').isDisabled(),false);
  const good=zip([
    ['dance/dance_01.png',png(1)],['dance/dance_02.png',png(2)],
    ['play/play_01.png',png(3)],['play/play_02.png',png(4)],
    ['README.txt',Buffer.from('US TWO')]
  ]);
  await page.locator('#quest-pose-zip').setInputFiles({name:'US_TWO_POSEPACK.zip',mimeType:'application/zip',buffer:good});
  await page.locator('#quest-pose-status').getByText(/2 2D-scènes veilig en privé geïmporteerd/).waitFor({timeout:15000});
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),true);
  const original=await page.locator('#quest-world-pawn-art').getAttribute('src');
  await page.locator('#quest-cinematic-play').click();
  await page.locator('#quest-world-pawn[data-framepack="true"]').waitFor();
  assert.equal(await page.locator('#quest-world-pawn-art').getAttribute('src'),original);
  await page.locator('#quest-world-pawn:not([data-framepack])').waitFor({timeout:8000});
  console.log('PASS real Chromium: local ZIP imported two scenes atomically; playback preserves original pawn');

  const bad=Buffer.from(good);bad[40]^=0x13;
  await page.locator('#quest-pose-zip').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:bad});
  await page.locator('#quest-pose-status').getByText(/niet geïmporteerd/).waitFor({timeout:8000}).catch(async error=>{
    throw Error('Bad package status: '+await page.locator('#quest-pose-status').textContent()+
      '; input disabled='+await page.locator('#quest-pose-zip').isDisabled()+
      '; '+error.message.slice(0,80));
  });
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),true);
  console.log('PASS corrupted archive rejected without erasing existing frames');

  await page.reload({waitUntil:'networkidle'});
  await setup(page,USER);
  await page.locator('#quest-pose-status').getByText(/2 originele beeldframes/).waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),true);
  await setup(page,OTHER);
  await page.locator('#quest-pose-status').getByText(/Nog geen goedgekeurde beeldreeks/).waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>window.USTwoPoseFrames.hasSelected()),false);
  await page.evaluate(()=>window.dispatchEvent(new Event('us-two-session-cleared')));
  assert.equal(await page.locator('#quest-pose-zip').isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS reloaded bundle persists per account, other account remains isolated, logout disables import');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
