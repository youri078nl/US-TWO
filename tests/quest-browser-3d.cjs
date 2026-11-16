'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:30000});
  const checks=await page.evaluate(()=>{
   const api=window.USTwoQuest3D;
   const who={paired:true,userId:'00000000-0000-4000-8000-000000000011',coupleId:'00000000-0000-4000-8000-000000000012'};
   const game={paired:true,initialized:true,position:31,phase:'active',date:{id:'test',title:'Samen dansen'}};
   const initial=document.querySelector('#quest-3d-model').disabled;
   api.update(game,who);
   const enabled=!document.querySelector('#quest-3d-model').disabled;
   const stillNoModel=api.availableClips().length===0&&
     document.querySelector('#quest-3d-status').textContent.includes('3D-model');
   api.clear();
   const cleared=document.querySelector('#quest-3d-model').disabled&&api.availableClips().length===0;
   api.update({...game,paired:false},who);
   const rejected=document.querySelector('#quest-3d-model').disabled;
   const canvas=document.querySelector('#quest-3d-canvas');
   return {initial,enabled,stillNoModel,cleared,rejected,canvas:Boolean(canvas)};
  });
  assert.deepEqual(checks,{initial:true,enabled:true,stillNoModel:true,cleared:true,rejected:true,canvas:true});
  await page.locator('#app-view').evaluate(x=>x.classList.remove('hidden'));
  await page.locator('#game-panel').evaluate(x=>x.classList.remove('hidden'));
  await page.locator('#quest-3d-details summary').click();
  const gl=await page.evaluate(()=>Boolean(document.getElementById('quest-3d-canvas').getContext('webgl2')));
  assert.equal(gl,true,'headless Chromium supports WebGL2 for this preview');
  assert.deepEqual(errors,[]);
  console.log('PASS WebGL2 PWA: private original GLB import requires paired account, clears on logout; no fake asset or server movement');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
