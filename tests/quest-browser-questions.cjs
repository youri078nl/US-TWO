'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle',timeout:30000});
  await page.evaluate(()=>{
   const A='00000000-0000-4000-8000-000000000081';
   const B='00000000-0000-4000-8000-000000000082';
   const C='00000000-0000-4000-8000-000000000083';
   let actor=A;
   const game={paired:true,initialized:true,position:12,world_index:0,revision:8,
     phase:'choose',turn_user:A,history:[],milestones:[],date:null};
   let question={phase:'idle',category:null,prompt:null,hard:false,answer:null,askedBy:null,number:0};
   const calls=[],seen=new Set();
   const qState=()=>({paired:true,initialized:true,revision:game.revision,position:game.position,
     phase:question.phase,your_turn:game.turn_user===actor,can_review:question.phase==='question_review'&&actor!==question.askedBy,
     category:question.category,prompt:question.prompt,answer:question.phase==='question_review'?question.answer:null,
     hard:question.hard,question_number:question.number});
   window.__mockGame={game,question,calls,A,B,setActor:who=>{actor=who;window.dispatchEvent(new Event('us-two-quest-game-open'));}};
   window.USTwoQuestPilotBridge={
    identity:()=>({paired:true,userId:actor,coupleId:C}),
    read:async()=>({...game}),
    readSuper:async()=>[],
    catalog:async()=>[],
    call:async(name,args)=>{
     if(name==='us_quest_question_state')return{data:qState(),error:null};
     calls.push({name,args,actor});
     if(name!=='us_quest_question_action')return{data:{...game},error:null};
     if(seen.has(args.p_request_id))return{data:qState(),error:null};
     if(args.p_expected_revision!==game.revision)return{data:null,error:{code:'40001',message:'stale_revision'}};
     seen.add(args.p_request_id);
     const action=args.p_action;
     if(action==='category'&&game.phase==='choose'&&actor===game.turn_user){
      game.phase='question';question.phase='question';
      question.category=args.p_category;question.prompt='Wat maakt jullie samen gelukkig?';
      question.askedBy=actor;question.hard=false;
     }else if(action==='submit'&&game.phase==='question'&&actor===question.askedBy){
      question.answer=args.p_answer;question.phase='question_review';game.phase='question_review';
     }else if(action==='approve'&&game.phase==='question_review'&&actor!==question.askedBy){
      game.position+=3;game.turn_user=actor;game.phase='choose';
      question={...question,phase:'idle',category:null,prompt:null,answer:null,number:question.number+1};
     }else if(action==='reject'&&game.phase==='question_review'&&actor!==question.askedBy){
      game.phase='question';question.phase='question';question.answer=null;
     }else return{data:null,error:{code:'22023',message:'action_not_allowed'}};
     game.revision++;
     return{data:qState(),error:null};
    }
   };
   document.querySelector('#app-view').classList.remove('hidden');
   document.querySelector('#game-panel').classList.remove('hidden');
   window.dispatchEvent(new Event('us-two-quest-game-open'));
  });
  await page.locator('#quest-question-start:not([disabled])').waitFor({timeout:12000});
  assert.equal(await page.locator('#quest-question-panel').isVisible(),true);
  await page.locator('#quest-question-category').selectOption('Liefde');
  await page.locator('#quest-question-start').click();
  await page.locator('#quest-question-prompt').getByText('Wat maakt jullie samen gelukkig?').waitFor({timeout:15000});
  assert.equal(await page.locator('#quest-pilot-load-catalog').isDisabled(),true,
    'No ordinary quest proposal while a question turn is active');
  await page.locator('#quest-question-answer').fill('Samen wandelen met Pepsi.');
  await page.locator('#quest-question-submit').click();
  await page.locator('#quest-question-status').getByText(/antwoord wacht op je partner/).waitFor({timeout:15000});
  assert.equal(await page.locator('#quest-question-approve').isDisabled(),true);
  await page.evaluate(()=>window.__mockGame.setActor(window.__mockGame.B));
  await page.locator('#quest-question-approve:not([disabled])').waitFor({timeout:15000});
  assert.match(await page.locator('#quest-question-received').textContent(),/Samen wandelen met Pepsi/);
  await page.locator('#quest-question-approve').click();
  await page.getByText(/Nieuwe serverreis: vak 15/).waitFor({timeout:15000});
  const result=await page.evaluate(()=>({
   revision:window.__mockGame.game.revision,position:window.__mockGame.game.position,
   phase:window.__mockGame.game.phase,actions:window.__mockGame.calls.map(x=>x.args.p_action),
   requestIds:window.__mockGame.calls.map(x=>x.args.p_request_id),
   buttons:Array.from(document.querySelectorAll('#quest-question-panel button:not([disabled])')).map(e=>e.id)
  }));
  assert.deepEqual(result.actions,['category','submit','approve']);
  assert.equal(new Set(result.requestIds).size,3);
  assert.equal(result.position,15);
  assert.equal(result.phase,'choose');
  assert.deepEqual(errors,[]);
  console.log('PASS Chromium: category, question, answer, independent partner approval, 3 canonical steps and one durable outbox');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
