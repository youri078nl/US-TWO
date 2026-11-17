'use strict';
/* Original full-catalog browser acceptance. No production account or DB mutations. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../catalog/quest-full-258.json'),'utf8'));
assert.equal(source.ordinary.length,240);assert.equal(source.superdates.length,18);
assert.equal(new Set(source.ordinary.map(x=>x.id)).size,240);
for(let w=0;w<6;w++)assert.equal(source.ordinary.filter(x=>x.world===w).length,40);
assert.ok(source.superdates.every(x=>Object.keys(x).every(k=>['idx','title','kind'].includes(k))),
 'Secret superdate details must not be shipped to public catalog');
function crc32(b){
 let crc=0xffffffff;
 for(const x of b){crc^=x;for(let i=0;i<8;i++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}
 return(crc^0xffffffff)>>>0;
}
function packed(){
 let offset=0,local=[],central=[];
 for(let index=0;index<258;index++){
  const name=index<240?('US_TWO_W'+(Math.floor(index/40)+1)+'_'+String(index%40+1).padStart(2,'0')+'.jpg'):
   ('US_TWO_SUPERDATE_'+String(index-239).padStart(2,'0')+'.jpg');
  const n=Buffer.from('Kaarten/'+name);
  const image=Buffer.alloc(1050,88);image[0]=255;image[1]=216;image[1048]=255;image[1049]=217;
  const crc=crc32(image);
  const loc=Buffer.alloc(30);loc.writeUInt32LE(0x04034b50,0);loc.writeUInt16LE(20,4);
  loc.writeUInt32LE(crc,14);loc.writeUInt32LE(image.length,18);loc.writeUInt32LE(image.length,22);loc.writeUInt16LE(n.length,26);
  local.push(loc,n,image);
  const dir=Buffer.alloc(46);dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);
  dir.writeUInt32LE(crc,16);dir.writeUInt32LE(image.length,20);dir.writeUInt32LE(image.length,24);
  dir.writeUInt16LE(n.length,28);dir.writeUInt32LE(offset,42);
  central.push(dir,n);offset+=loc.length+n.length+image.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(258,8);end.writeUInt16LE(258,10);
 end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:30000});
  await page.evaluate(()=>{
   document.getElementById('app-view').classList.remove('hidden');
   document.getElementById('game-panel').classList.remove('hidden');
   document.getElementById('full-deck-details').open=true;
  });
  await page.getByText('De stille fototocht',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.USTwoFullDeck.cards.length),258);
  await page.locator('#full-deck-world').selectOption('superdate');
  assert.equal(await page.locator('#full-deck-title').textContent(),'Het Geheime Complimentenfestival');
  assert.match(await page.locator('#full-deck-description').textContent(),/geheime voorbereiding/);
  assert.doesNotMatch(await page.locator('#full-deck-description').textContent(),/Schrijf zes verschillende complimentkaartjes/);
  await page.locator('#full-deck-world').selectOption('5');
  assert.equal(await page.locator('#full-deck-title').textContent(),'De missie naar Jupiter');
  await page.locator('#full-deck-world').selectOption('all');
  await page.evaluate(()=>window.USTwoFullDeck.update({paired:true,userId:'user-a',coupleId:'pair'},null));
  await page.getByText(/Importeer het mobiele ZIP-pakket/).waitFor();
  await page.locator('#full-deck-zip').setInputFiles({name:'US_TWO_258_KAARTEN_MOBIEL.zip',mimeType:'application/zip',buffer:packed()});
  await page.getByText(/Alle 258 2D-kaarten privé geïmporteerd/).waitFor({timeout:30000});
  assert.equal(await page.locator('#full-deck-image').evaluate(el=>el.src.startsWith('blob:')),true);
  // The active server quest ID, not the card title, determines the matching original illustration.
  const accountA={paired:true,userId:'user-a',coupleId:'pair'};
  await page.evaluate(identity=>window.USTwoFullDeck.update(identity,{
    paired:true,initialized:true,phase:'active',mode:'samen',date:{id:'free_dag_01',title:'De stille fototocht'}
  }),accountA);
  assert.equal(await page.locator('#quest-current-card').isVisible(),true);
  assert.equal(await page.locator('#quest-current-card-title').textContent(),'De stille fototocht');
  assert.equal(await page.locator('#quest-current-card-image').evaluate(el=>el.src.startsWith('blob:')),true);
  await page.locator('#quest-current-open-library').click();
  assert.equal(await page.locator('#full-deck-details').evaluate(el=>el.open),true);
  assert.equal(await page.locator('#full-deck-title').textContent(),'De stille fototocht');
  await page.evaluate(identity=>window.USTwoFullDeck.update(identity,{
    paired:true,initialized:true,phase:'active',mode:'afstand',date:{id:'not-a-real-card',title:'De stille fototocht'}
  }),accountA);
  assert.equal(await page.locator('#quest-current-card').isVisible(),false,
    'Do not guess illustration from a coincidentally matching title');
  await page.evaluate(identity=>window.USTwoFullDeck.update(identity,{
    paired:true,initialized:true,phase:'approval',mode:'afstand',date:{id:'free_dag_02',title:'Het omgekeerde interview'}
  }),accountA);
  assert.equal(await page.locator('#quest-current-card').isVisible(),true);
  assert.match(await page.locator('#quest-current-card-meta').textContent(),/Voorstel wacht op goedkeuring/);
  await page.evaluate(identity=>window.USTwoFullDeck.update(identity,{
    paired:true,initialized:true,phase:'choose',date:null
  }),accountA);
  assert.equal(await page.locator('#quest-current-card').isVisible(),false,
    'Choosing a new task must clear the previous private card');
  await page.evaluate(identity=>window.USTwoFullDeck.update(identity,{
    paired:true,initialized:true,phase:'active',mode:'samen',date:{id:'free_dag_01'}
  }),accountA);
  assert.equal(await page.locator('#quest-current-card').isVisible(),true);
  await page.evaluate(()=>window.USTwoFullDeck.update({paired:true,userId:'user-b',coupleId:'pair'},null));
  await page.getByText(/Importeer het mobiele ZIP-pakket/).waitFor();
  assert.equal(await page.locator('#full-deck-image').isVisible(),false);
  assert.equal(await page.locator('#quest-current-card-image').isVisible(),false,
    'The partner account must never see the previous account\'s local JPG');
  await page.evaluate(()=>window.dispatchEvent(new Event('us-two-session-cleared')));
  assert.equal(await page.locator('#quest-current-card').isVisible(),false);
  assert.equal(await page.locator('#full-deck-zip').isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS full 258-card gallery: 240+18, superdate privacy, world filtering, verified ZIP, account isolation and logout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
