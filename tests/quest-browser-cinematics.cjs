'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:30000});
  const r=await page.evaluate(()=>{
    const a=window.USTwoCinematics;
    const who={paired:true,userId:'00000000-0000-4000-8000-000000000081',coupleId:'00000000-0000-4000-8000-000000000082'};
    const names=['Pepsi haalt de bal','Een kus','Knuffel elkaar','Samen dansen','Wandeling in het bos','Sterren kijken','Geef een high five','Spelvragen','Kijk elkaar aan'];
    const mapped=names.map(title=>a.sceneFor({title}));
    document.getElementById('game-panel').classList.remove('hidden');
    const state={paired:true,initialized:true,phase:'active',position:4,date:{id:'demo-a',title:'Samen dansen'}};
    a.update(state,who);
    const before=document.getElementById('quest-cinematic-play').disabled;
    const avatar=document.getElementById('quest-world-pawn-art');
    avatar.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
    avatar.hidden=false;
    window.dispatchEvent(new Event('us-two-pawn-art-changed'));
    const enabled=!document.getElementById('quest-cinematic-play').disabled;
    const played=a.play(),pose=document.getElementById('quest-world-pawn').dataset.scene;
    a.update({...state,position:5},who);
    const cancelled=!document.getElementById('quest-world-pawn').hasAttribute('data-scene');
    a.update({...state,date:{id:'demo-b',title:'Een kus'}},who);
    a.play();const changed=document.getElementById('quest-world-pawn').dataset.scene;
    window.dispatchEvent(new CustomEvent('us-two-tab-changed',{detail:{tab:'dates'}}));
    const stopped=!document.getElementById('quest-world-pawn').hasAttribute('data-scene');
    window.dispatchEvent(new Event('us-two-session-cleared'));
    const logout=document.getElementById('quest-cinematic-play').disabled &&
      document.getElementById('quest-cinematic-status').textContent.includes('Log in');
    return {mapped,before,enabled,played,pose,cancelled,changed,stopped,logout};
  });
  assert.deepEqual(r.mapped,['pepsi','kiss','hug','dance','walk','stars','five','play','calm']);
  assert.equal(r.before,true);assert.equal(r.enabled,true);assert.equal(r.played,true);
  assert.equal(r.pose,'dance');assert.equal(r.cancelled,true);assert.equal(r.changed,'kiss');
  assert.equal(r.stopped,true);assert.equal(r.logout,true);assert.deepEqual(errors,[]);
  console.log('PASS animations: contextual matching, approved-art gate, cancellation, account isolation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
