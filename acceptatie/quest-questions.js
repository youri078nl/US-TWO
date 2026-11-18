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
 const SCENE_BY_CATEGORY={'Liefde':'kiss','Intimiteit':'hug','Elkaar kennen':'calm',
  'Humor':'play','Avontuur':'walk','Diepgang':'stars','Durven':'five',
  'Verrassing':'dance','Vertrouwen':'hug'};
 const DEFAULT_ART='./assets/us-two-user-pawn.png';
 let artKey='',artUrl='',artRevision=0;
 let poseTimer=null,poseUrls=[],posePlaying=false;
 function stopQuestionPose(){
  if(poseTimer!==null){clearTimeout(poseTimer);poseTimer=null;}
  posePlaying=false;poseUrls.forEach(url=>URL.revokeObjectURL(url));poseUrls=[];
  const button=$('quest-question-play-pose');if(button)button.textContent='Speel passende 2D-pose af';
  const img=$('quest-question-art');if(img&&artUrl)img.src=artUrl;
 }
 async function playQuestionPose(){
  if(posePlaying){stopQuestionPose();return;}
  const scene=SCENE_BY_CATEGORY[question?.category];
  if(!scene||!identityKey||!$('quest-question-art')||document.hidden||$('game-panel')?.classList.contains('hidden'))return;
  const n=artRevision,who=identityKey;
  const frames=await window.USTwoPoseFrames?.approvedSequence?.(scene);
  if(!frames||n!==artRevision||who!==identityKey||posePlaying||document.hidden||$('game-panel')?.classList.contains('hidden'))return;
  try{poseUrls=frames.map(frame=>URL.createObjectURL(frame));}catch(_error){stopQuestionPose();return;}
  posePlaying=true;
  const button=$('quest-question-play-pose');if(button)button.textContent='Stop 2D-pose';
  let index=0;
  const tick=()=>{
   if(!posePlaying||n!==artRevision||document.hidden||$('game-panel')?.classList.contains('hidden')){stopQuestionPose();return;}
   $('quest-question-art').src=poseUrls[index++];
   if(index<poseUrls.length)poseTimer=setTimeout(tick,200);
   else poseTimer=setTimeout(stopQuestionPose,350);
  };
  tick();
 }

 function resetArt(){
  stopQuestionPose();++artRevision;artKey='';if(artUrl){URL.revokeObjectURL(artUrl);artUrl='';}
  const img=$('quest-question-art');if(img){img.src=DEFAULT_ART;img.alt='Goedgekeurde 2D-tekening van Youri en Kim';}
  if($('quest-question-play-pose'))$('quest-question-play-pose').hidden=true;
 }
 async function updateArt(){
  const img=$('quest-question-art');if(!img)return;
  const scene=SCENE_BY_CATEGORY[question?.category]||'';
  const key=identityKey+'|'+scene+'|'+String(question?.prompt||'');
  if(key===artKey)return;
  resetArt();artKey=key;
  if(!identityKey||!scene)return;
  const n=artRevision,who=identityKey;
  const frame=await window.USTwoPoseFrames?.approvedStill?.(scene);
  if(n!==artRevision||who!==identityKey||!frame)return;
  artUrl=URL.createObjectURL(frame);img.src=artUrl;
  img.alt='Goedgekeurde 2D-pose bij de vraagcategorie '+question.category;
  const sequence=await window.USTwoPoseFrames?.approvedSequence?.(scene);
  if(n!==artRevision||who!==identityKey)return;
  if($('quest-question-play-pose'))$('quest-question-play-pose').hidden=!(Array.isArray(sequence)&&sequence.length>1);
 }

 const show=s=>{const e=$('quest-question-status');if(e)e.textContent=s;};
 const identity=()=>window.USTwoQuestPilotBridge?.identity?.();
 const allButtons=['quest-question-start','quest-question-submit','quest-question-approve',
   'quest-question-reject','quest-question-skip','quest-question-cancel'];
 function render(){
  const panel=$('quest-question-panel');
  if(!panel)return;
  const paired=Boolean(identityKey&&source?.paired&&source?.initialized);
  panel.hidden=!paired;
  if(!paired){if(artKey)resetArt();for(const id of allButtons)$(id).disabled=true;return;}
  const ok=question?.paired&&question.initialized&&question.revision===source.revision;
  const phase=ok?question.phase:'unavailable';
  const myTurn=Boolean(question?.your_turn);
  const turnIndicator=$('quest-question-turn-indicator');
  if(turnIndicator){
   turnIndicator.hidden=!ok;
   turnIndicator.textContent=!ok?'':phase==='idle'
    ? source.phase==='choose'?(myTurn?'Jij kiest de volgende vraag':'Je partner kiest de volgende vraag'):'Eerst de lopende opdracht afronden'
    :phase==='question'?(myTurn?'Jij beantwoordt de vraag':'Je partner beantwoordt de vraag')
    :phase==='question_review'?(question.can_review?'Jij beoordeelt het antwoord':'Je partner beoordeelt jouw antwoord')
    :'Wachten op de gezamenlijke spelstand';
  }
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
  if($('quest-question-card'))$('quest-question-card').hidden=!(phase==='question'||phase==='question_review');
  text('quest-question-card-category',String(question?.category||$('quest-question-category')?.value||'Vraag'));
  if(phase==='question'||phase==='question_review')void updateArt();
  else if(artKey)resetArt();
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
  resetArt();
  if($('quest-question-answer'))$('quest-question-answer').value='';
  if($('quest-question-received'))$('quest-question-received').textContent='';
  if($('quest-question-prompt'))$('quest-question-prompt').textContent='';
  if($('quest-question-panel'))$('quest-question-panel').hidden=true;
  if($('quest-question-turn-indicator'))$('quest-question-turn-indicator').hidden=true;
  render();
 }
 async function update(state,who,local){
  const key=who?.paired&&who?.userId&&who?.coupleId?
   who.userId+':'+who.coupleId:'';
  if(!key||!state?.initialized){clear();return;}
  if(key!==identityKey){
   resetArt();question=null;if($('quest-question-answer'))$('quest-question-answer').value='';
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
  $('quest-question-play-pose')?.addEventListener('click',playQuestionPose);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopQuestionPose();});
  window.addEventListener('us-two-tab-changed',event=>{if(event.detail?.tab!=='game')stopQuestionPose();});
  window.addEventListener('us-two-session-cleared',clear);
  window.addEventListener('us-two-poses-changed',()=>{resetArt();render();});
  clear();
 }
 window.USTwoQuestQuestions=Object.freeze({update,clear});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
