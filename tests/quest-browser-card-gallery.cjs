'use strict';
const assert=require('node:assert/strict'),zlib=require('node:zlib');
const {chromium}=require('playwright');
const archive=require('../quest-card-archive.js');
const cards=require('../quest-card-data.js');
assert.equal(cards.length,50);
assert.equal(new Set(cards.map(x=>x.id)).size,50);
for(const x of cards){assert.equal(x.steps.length,3);assert.match(x.image,/^US_TWO_kaart_\d{2}\.jpg$/);}
// A deterministic ZIP with all 50 card names, a correct CRC and DEFLATE data.
function makeZip(){
 const local=[],central=[];let offset=0;
 for(let n=1;n<=50;n++){
  const name=Buffer.from('Kaartjes/'+archive.filename(n));
  // Synthetic JPEG fixture: parser verifies SOI, EOI, size and CRC.
  const jpg=Buffer.alloc(1200,65+n);jpg[0]=255;jpg[1]=216;jpg[1198]=255;jpg[1199]=217;
  const compressed=zlib.deflateRawSync(jpg),crc=archive.crc32(jpg);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);
  h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);
  h.writeUInt32LE(jpg.length,22);h.writeUInt16LE(name.length,26);
  local.push(h,name,compressed);
  const d=Buffer.alloc(46);d.writeUInt32LE(0x02014b50,0);d.writeUInt16LE(20,4);d.writeUInt16LE(20,6);
  d.writeUInt16LE(8,10);d.writeUInt32LE(crc,16);d.writeUInt32LE(compressed.length,20);
  d.writeUInt32LE(jpg.length,24);d.writeUInt16LE(name.length,28);d.writeUInt32LE(offset,42);
  central.push(d,name);offset+=h.length+name.length+compressed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(50,8);end.writeUInt16LE(50,10);
 end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   document.getElementById('app-view').classList.remove('hidden');
   document.getElementById('game-panel').classList.remove('hidden');
   document.getElementById('quest-card-library').open=true;
   window.USTwoCardGallery.update({paired:true,userId:'aaaa1111',coupleId:'shared7777'});
  });
  await page.getByText('De eerste blik',{exact:true}).waitFor();
  assert.equal(await page.locator('#quest-card-steps li').count(),3);
  assert.equal(await page.locator('#quest-card-image').isVisible(),false);
  await page.locator('#quest-cards-filter').selectOption('SPANNEND 18+');
  assert.equal(await page.locator('#quest-card-title').textContent(),'Een fluistergeheim');
  await page.locator('#quest-cards-next').click();
  assert.equal(await page.locator('#quest-card-title').textContent(),'Raad de aanraking');
  await page.locator('#quest-cards-filter').selectOption('all');
  const zip=makeZip();
  await page.locator('#quest-cards-zip').setInputFiles({name:'US_TWO_50_kaartjes_MOBIEL.zip',mimeType:'application/zip',buffer:zip});
  await page.getByText(/50\/50 originele US TWO-kaartjes/).waitFor({timeout:20000});
  const result=await page.evaluate(async()=>{
   const gallery=window.USTwoCardGallery;
   const imported=document.getElementById('quest-card-image').src.startsWith('blob:');
   gallery.show(49);
   await new Promise(r=>setTimeout(r,100));
   const final={title:document.getElementById('quest-card-title').textContent,
     index:document.getElementById('quest-cards-count').textContent,
     steps:document.querySelectorAll('#quest-card-steps li').length,
     image:document.getElementById('quest-card-image').src.startsWith('blob:')};
   gallery.update({paired:true,userId:'bbbb2222',coupleId:'shared7777'});
   await new Promise(r=>setTimeout(r,150));
   const separated=document.getElementById('quest-card-image').hidden;
   window.dispatchEvent(new Event('us-two-session-cleared'));
   const loggedOut=document.getElementById('quest-card-image').hidden&&
     document.getElementById('quest-cards-zip').disabled;
   return {imported,final,separated,loggedOut};
  });
  assert.equal(result.imported,true);assert.equal(result.final.title,'Een wens voor twee');
  assert.equal(result.final.steps,3);assert.equal(result.final.image,true);
  assert.equal(result.separated,true);assert.equal(result.loggedOut,true);
  assert.deepEqual(errors,[]);
  console.log('PASS 50 original card metadata, ZIP import, category filters, gallery navigation and account separation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
