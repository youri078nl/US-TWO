/* US TWO canonical quiz turns. ONE shared us_quest_games position.
 * The separate historical us_question_games position is NEVER read or mutated.
 * All writes pass through the same durable, revision-checked outbox.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const CATEGORIES=['Liefde','Intimiteit','Elkaar kennen','Humor','Avontuur',
   'Diepgang','Durven','Verrassing','Vertrouwen'];
 let identityKey='',source=null,question=null,pending=false,loading=false,serial=0;
 const show=s=>{const e=$('quest-question-status');if(e)e.textContent=s;};
 const identity=()=>window.USTwoQuestPilotBridge?.identity?.();
 const allButtons=['quest-question-start','quest-question-submit','quest-question-approve',
   'quest-question-reject','quest-question-skip','quest-question-cancel'];
 function render(){
  const panel=$('quest-question-panel');
  if(!panel)return;
  const paired=Boolean(identityKey&&source?.paired&&source?.initialized);
  panel.hidden=!paired;
  if(!paired){for(const id of allButtons)$(id).disabled=true;return;}
  const ok=question?.paired&&question.initialized&&question.revision===source.revision;
  const phase=ok?question.phase:'unavailable';
  const myTurn=Boolean(question?.your_turn);
  const available=!loading&&!pending&&ok;
  $('quest-question-start').disabled=!(available&&phase==='idle'&&source.phase==='choose'&&myTurn);
  $('quest-question-category').disabled=!(available&&phase==='idle');
  $('quest-question-submit').disabled=!(available&&phase==='question'&&myTurn);
  $('quest-question-skip').disabled=!(available&&phase==='question'&&myTurn);
  $('quest-question-cancel').disabled=!(available&&phase==='question'&&myTurn);
  $('quest-question-answer').disabled=!(available&&phase==='question'&&myTurn);
  for(const id of ['quest-question-approve','quest-question-reject'])
   $(id).disabled=!(available&&phase==='question_review'&&question.can_review);
  const text=(id,s)=>{if($(id))$(id).textContent=s};
  text('quest-question-prompt',phase==='question'||phase==='question_review'
   ? String(question.prompt||'') : 'Kies een categorie wanneer jij aan de beurt bent.');
  text('quest-question-received',phase==='question_review'
   ? 'Antwoord van je partner: '+String(question.answer||''):'' );
  $('quest-question-received').hidden=phase!=='question_review';
  $('quest-question-answer').hidden=phase!=='question';
  $('quest-question-start').hidden=phase!=='idle';
  $('quest-question-category').hidden=phase!=='idle';
  for(const id of ['quest-question-submit','quest-question-skip','quest-question-cancel'])
   $(id).hidden=phase!=='question';
  for(const id of ['quest-question-approve','quest-question-reject'])
   $(id).hidden=phase!=='question_review';
  if(!ok)show('Vragenstand ophalen. Geen acties mogelijk zonder bevestigde serverrevisie.');
  else if(phase==='idle')show(source.phase==='choose'
    ? myTurn?'Jij bent aan de beurt. Kies een vraagcategorie.':'Je partner is aan de beurt.'
    :'Wacht tot de gewone opdracht is afgerond.');
  else if(phase==='question')show(myTurn?'Beantwoord de vraag; je partner beoordeelt daarna je antwoord.':
    'Je partner beantwoordt de vraag. Er worden nog geen stappen toegekend.');
  else if(phase==='question_review')show(question.can_review?
    'Beoordeel het antwoord. Alleen goedkeuren levert stappen op.':
    'Je antwoord wacht op je partner. Er worden nog geen stappen toegekend.');
 }
 function clear(){
  ++serial;identityKey='';source=null;question=null;pending=false;loading=false;
  if($('quest-question-answer'))$('quest-question-answer').value='';
  if($('quest-question-received'))$('quest-question-received').textContent='';
  if($('quest-question-prompt'))$('quest-question-prompt').textContent='';
  if($('quest-question-panel'))$('quest-question-panel').hidden=true;
  render();
 }
 async function update(state,who,local){
  const key=who?.paired&&who?.userId&&who?.coupleId?
   who.userId+':'+who.coupleId:'';
  if(!key||!state?.initialized){clear();return;}
  if(key!==identityKey){
   question=null;if($('quest-question-answer'))$('quest-question-answer').value='';
   if($('quest-question-received'))$('quest-question-received').textContent='';
  }
  identityKey=key;source=state;
  pending=Boolean(local?.items?.length||local?.blocked);
  const n=++serial;render();
  const call=window.USTwoQuestPilotBridge?.call;
  if(typeof call!=='function')return;
  try{
   const result=await call('us_quest_question_state',{});
   if(n!==serial||key!==identityKey)return;
   if(result.error||!result.data?.paired)throw Error('Vragenserver niet beschikbaar.');
   question=result.data;render();
  }catch(_e){
   if(n===serial){question=null;render();show('Vragen kunnen nu niet veilig worden geladen. Probeer verversen.');}
  }
 }
 async function act(action){
  if(loading||!source||!identityKey||pending)return;
  const allowed={
   category:!$('quest-question-start').disabled,
   submit:!$('quest-question-submit').disabled,
   approve:!$('quest-question-approve').disabled,
   reject:!$('quest-question-reject').disabled,
   skip:!$('quest-question-skip').disabled,
   cancel:!$('quest-question-cancel').disabled
  };
  if(!allowed[action])return;
  const category=$('quest-question-category').value;
  const answer=$('quest-question-answer').value.trim();
  if(action==='submit'&&(answer.length<1||answer.length>1500)){show('Schrijf een antwoord van maximaal 1500 tekens.');return;}
  const confirms={
    category:'Een vraag uit '+category+' starten? Dit is jullie huidige beurt.',
    submit:'Dit antwoord aan je partner voorleggen?',
    approve:'Dit antwoord goedkeuren en samen '+(question?.hard?'5':'3')+' vakjes verdienen?',
    reject:'Antwoord niet goedkeuren? Je partner mag het opnieuw beantwoorden.',
    skip:'Deze vraag zonder punten overslaan en de beurt wisselen?',
    cancel:'Deze vraag annuleren zonder stappen of beurtwisseling?'
  };
  if(!window.confirm(confirms[action]))return;
  loading=true;render();
  try{
   if(typeof window.USTwoQuestionActions?.send!=='function')throw Error('Offline-verbinding niet geladen.');
   await window.USTwoQuestionActions.send({action,...(action==='category'?{category}:{}),
     ...(action==='submit'?{answer}:{})});
   if(action==='submit')$('quest-question-answer').value='';
   // The shared outbox bridge already refreshed the canonical server state.
  }catch(e){show('Actie niet voltooid: '+String(e?.message||e).slice(0,180));}
  finally{loading=false;render();}
 }
 function bind(){
  const panel=$('quest-question-panel');
  if(!panel)return;
  const select=$('quest-question-category');
  select.replaceChildren();
  for(const name of CATEGORIES){const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.append(opt);}
  const bindings={start:'category',submit:'submit',approve:'approve',reject:'reject',skip:'skip',cancel:'cancel'};
  for(const [name,action]of Object.entries(bindings))
   $('quest-question-'+name).addEventListener('click',()=>act(action));
  window.addEventListener('us-two-session-cleared',clear);
  clear();
 }
 window.USTwoQuestQuestions=Object.freeze({update,clear});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
