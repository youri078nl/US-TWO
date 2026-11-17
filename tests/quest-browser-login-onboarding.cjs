'use strict';
/* Real Chromium authentication shell test. Mock credentials only;
 * never touches real player accounts or production data.
 * Confirms paired logins resume straight into the game, survives refresh,
 * and single accounts open pairing rather than a dead-end landing page.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ORIGIN='https://vuigivzwkxelsisbjjlk.supabase.co';
const user='00000000-0000-4000-8000-000000000001';
const partner='00000000-0000-4000-8000-000000000002';
const couple='00000000-0000-4000-8000-000000000003';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const isPaired of [true,false]){
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   let loginCalls=0,dashboardCalls=0;
   await page.route(ORIGIN+'/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    const headers={'content-type':'application/json',
      'access-control-allow-origin':'*',
      'access-control-allow-headers':'*',
      'access-control-allow-methods':'GET,POST,OPTIONS'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
    const path=url.pathname;let data;
    if(path==='/auth/v1/token'){
     loginCalls++;
     data={access_token:'mock-public-test-session',refresh_token:'mock-only',
       expires_in:3600,token_type:'bearer',user:{id:user,email:'test@example.invalid'}};
    }else if(path==='/rest/v1/rpc/us_dashboard'){
     dashboardCalls++;
     data={couple_id:isPaired?couple:null,
       members:isPaired?[{user_id:user,name:'Youri'},{user_id:partner,name:'Kim'}]:[{user_id:user,name:'Youri'}],
       dates:[],invitations:[]};
    }else if(path==='/rest/v1/rpc/us_memory_list')data=[];
    else if(path==='/rest/v1/rpc/us_quest_state')data={
     paired:isPaired,initialized:isPaired,revision:2,position:2,world_index:0,
     phase:'choose',turn_user:user,history:[]};
    else if(path==='/rest/v1/rpc/us_quest_question_state')data={
     paired:isPaired,initialized:isPaired,revision:2,position:2,
     phase:'idle',your_turn:true,can_review:false};
    else if(path==='/rest/v1/rpc/us_quest_super_state')data=[];
    else data=[];
    return route.fulfill({status:200,headers,body:JSON.stringify(data)});
   });
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   await page.locator('#auth-email').fill('test@example.invalid');
   await page.locator('#auth-password').fill('mock-password');
   await page.locator('#auth-submit').click();
   const target=isPaired?'game':'pair';
   await page.locator('#'+target+'-panel:not(.hidden)').waitFor({timeout:12000});
   assert.equal(await page.locator('#home-panel').isVisible(),false,'do not strand the user on landing page');
   if(isPaired){
    await page.getByText(/Nieuwe serverreis: vak 2/).waitFor({timeout:12000});
    await page.locator('#quest-pilot-load-catalog:not([disabled])').waitFor({timeout:12000});
    assert.equal(await page.locator('#quest-world-pawn').count(),1);
    assert.equal(await page.locator('#quest-question-panel').isVisible(),true);
   }
   assert.equal(loginCalls,1,'password login should make one auth request');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#'+target+'-panel:not(.hidden)').waitFor({timeout:12000});
   assert.equal(loginCalls,1,'browser restart must re-use persisted safe session, not re-login');
   assert.ok(dashboardCalls>=2,'dashboard should rehydrate after a reload');
   assert.deepEqual(errors,[],'no uncaught Javascript failures');
   await page.close();
  }
  console.log('PASS Chromium: login, automatic game/pair routing, canonical task and persistent session after reload');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
