// Real rendering in Chromium and WebKit with synthetic identities and mock cloud art.
// No production requests, credentials, mutations, or private content.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium,webkit}=require('playwright');
const dir=path.resolve(__dirname,'..');
const pair='00000000-0000-4000-8000-000000000001';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const cloudImage=fs.readFileSync(path.join(dir,'assets/us-two-user-board.png'));
let server,origin;
test.before(async()=>{
 server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  const relative=u.pathname.replace(/^\/acceptatie\/?/,'')||'index.html';
  const f=path.resolve(dir,relative);
  if(!f.startsWith(dir+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
  let data=fs.readFileSync(f);
  if(relative==='index.html'){
   // Keep real layout and CSS, isolate the board from account login and agenda code.
   data=data.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(data);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 origin='http://127.0.0.1:'+server.address().port;
});
test.after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});
async function render(browserType,viewport,userId){
 const browser=await browserType.launch({headless:true});
 try{
  const context=await browser.newContext({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://vuigivzwkxelsisbjjlk.supabase.co/**',async route=>{
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,OPTIONS','access-control-expose-headers':'etag','etag':'"synthetic-art-1"'};
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(route.request().url().includes('/storage/v1/object/us-two-world-art/'))return route.fulfill({status:200,headers:{...headers,'content-type':'image/png'},body:cloudImage});
   return route.fulfill({status:403,headers});
  });
  await page.goto(origin+'/acceptatie/');
  await page.evaluate(({pair,userId})=>{
   document.querySelector('#auth-view').classList.add('hidden');
   document.querySelector('#app-view').classList.remove('hidden');
   document.querySelector('#bottom-nav').classList.remove('hidden');
   document.querySelector('#game-panel').classList.remove('hidden');
   document.body.classList.add('us-two-board-only');
   localStorage.setItem('us-two-web-session-v2:/acceptatie/',JSON.stringify({access_token:'synthetic',user:{id:userId}}));
   window.USTwoQuestPilotBridge={identity:()=>({paired:true,userId,coupleId:pair})};
   window.USTwoDateBrowser={openLocation:value=>window.lastLocation=value};
  },{pair,userId});
  for(const file of ['quest-board.js','quest-board-interactions.js','quest-world-images.js'])await page.addScriptTag({url:origin+'/acceptatie/'+file});
  await page.evaluate(({pair,userId})=>{
   window.testIdentity={paired:true,userId,coupleId:pair};
   window.testState={paired:true,initialized:true,position:6,world_index:0,revision:21,history:[]};
   window.USTwoQuestBoard.update(window.testState,window.testIdentity);
  },{pair,userId});
  await page.waitForFunction(()=>document.querySelector('#quest-board-stage').dataset.artPending==='false'&&document.querySelector('#quest-world-pawn').dataset.tile==='6',{},{timeout:20000});
  const position=await page.evaluate(()=>{
   const stage=document.querySelector('#quest-board-stage'),art=document.querySelector('.quest-world-art'),pawn=document.querySelector('#quest-world-pawn'),marker=document.querySelector('#quest-shared-cell-marker');
   const s=stage.getBoundingClientRect(),a=art.getBoundingClientRect(),m=marker.getBoundingClientRect(),p=pawn.getBoundingClientRect();
   return {x:parseFloat(pawn.style.left),y:parseFloat(pawn.style.top),marker:marker.textContent,
    imageMatches:Math.abs(s.width-a.width)<2&&Math.abs(s.height-a.height)<2,
    pinAligned:Math.abs(m.x+m.width/2-(p.x+p.width/2))<2&&Math.abs(m.y+m.height/2-p.bottom)<2,
    source:art.dataset.worldImageApplied,viewport:document.querySelector('#quest-world-viewport').clientWidth};
  });
  assert.equal(position.marker,'6');assert.equal(position.source,'themed');assert.ok(position.imageMatches);assert.ok(position.pinAligned);assert.ok(position.viewport>0);
  await page.evaluate(()=>window.USTwoQuestBoard.update({...window.testState,position:9,revision:22},window.testIdentity));
  await page.waitForFunction(()=>document.querySelector('#quest-world-pawn').dataset.tile==='9');
  await page.evaluate(()=>window.USTwoQuestBoard.update(window.testState,window.testIdentity));
  assert.equal(await page.locator('#quest-shared-cell-marker').textContent(),'9','stale revision cannot move pawn backwards');
  for(const location of ['living','beach','airport','forest']){
   await page.locator('.quest-board-location-overlay [data-quick-location="'+location+'"]').click();
   assert.equal(await page.evaluate(()=>window.lastLocation),location);
  }
  assert.deepEqual(errors,[]);
  await context.close();
  return position;
 }finally{await browser.close();}
}
test('Android Chromium and iPhone WebKit show the same board coordinates and exact server step', {timeout:120000},async()=>{
 const [android,iphone]=await Promise.all([
  render(chromium,{width:412,height:915},'android-test'),
  render(webkit,{width:390,height:844},'iphone-test')
 ]);
 assert.equal(android.x,iphone.x);assert.equal(android.y,iphone.y);
});
