/* US TWO: scene choreography on exact, locally approved artwork.
 * Visual effects only; no RPC, progress changes or fake 3D meshes.
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const NAMES={pepsi:'Balspel met Pepsi',kiss:'Zoenen',hug:'Knuffelen',dance:'Dansen',walk:'Wandelen',stars:'Sterren kijken',five:'Samen vieren',play:'Spel en plezier',calm:'Rustig samen'};
 const RULES=[
  [/pepsi|hond|apport|balspel|\bbal\b/i,'pepsi'],
  [/zoen|kuss|\bkus\b|kiss/i,'kiss'],
  [/knuffel|omhel|hug/i,'hug'],
  [/dans|disco|muziek|ritme|festival|feest|playlist|dance/i,'dance'],
  [/high.?five|samenwerk|\bteam\b|overwinn|viering/i,'five'],
  [/wandel|bos|park|strand|route|hike|lopen|buiten/i,'walk'],
  [/sterren?|hemel|maan|nacht|zonsondergang|astronom/i,'stars'],
  [/spel|quiz|raad|vragen?|puzzel|grap|creatie|teken|schilder|speur|bouw/i,'play']
 ];
 let account='',task='',scene='',running=false,timer=null;
 function sceneFor(card){
  if(!card||typeof card!=='object')return 'calm';
  const s=['title','brief','category','togetherText','remoteText'].map(k=>typeof card[k]==='string'?card[k].slice(0,400):'').join(' ');
  for(const [p,id] of RULES)if(p.test(s))return id;
  return 'calm';
 }
 const hasArt=()=>{const e=$('quest-world-pawn-art');return Boolean(e&&!e.hidden&&e.getAttribute('src'));};
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 const visible=()=>document.visibilityState!=='hidden'&&!$('game-panel')?.classList.contains('hidden');
 const show=s=>{if($('quest-cinematic-status'))$('quest-cinematic-status').textContent=s;};
 function controls(){
  const button=$('quest-cinematic-play');if(!button)return;
  const active=Boolean(account&&task&&scene&&visible());
  button.disabled=!active||!hasArt()||reduced()||running;
  if(!active)show('Geen opdrachtanimatie beschikbaar.');
  else if(reduced())show('Animaties staan uit via de toegankelijkheidsinstellingen.');
  else if(!hasArt())show('Laad de goedgekeurde pion op dit toestel. Er verschijnen geen andere personages.');
  else if(running)show('Beweging: '+NAMES[scene]+'. De spelstand verandert niet.');
  else show('Bijpassende beweging: '+NAMES[scene]+'.');
 }
 function stop(){
  if(timer!==null){clearTimeout(timer);timer=null;}
  running=false;$('quest-world-pawn')?.removeAttribute('data-scene');
  for(const id of ['quest-world-scene-ball','quest-world-scene-spark'])if($(id))$(id).hidden=true;
  if($('quest-cinematic-stop'))$('quest-cinematic-stop').disabled=true;
  controls();
 }
 function play(){
  if(running||!account||!task||!scene||!visible()||reduced()||!hasArt())return false;
  const pawn=$('quest-world-pawn');if(!pawn)return false;
  running=true;pawn.dataset.scene=scene;
  if($('quest-world-scene-spark')){
   $('quest-world-scene-spark').hidden=!['hug','kiss','five'].includes(scene);
   $('quest-world-scene-spark').textContent=scene==='five'?'✦':'♥';
  }
  if($('quest-world-scene-ball'))$('quest-world-scene-ball').hidden=scene!=='pepsi';
  if($('quest-cinematic-stop'))$('quest-cinematic-stop').disabled=false;
  controls();timer=setTimeout(stop,3600);return true;
 }
 function clear(){stop();account='';task='';scene='';controls();show('Animatie verborgen. Log in om jullie opdracht te bekijken.');}
 function update(state,identity){
  const who=identity?.paired&&identity.userId&&identity.coupleId?identity.userId+':'+identity.coupleId:'';
  const card=state?.date;
  if(!who||!state?.paired||!state?.initialized||!['approval','active'].includes(state.phase)||!card||!card.title){
   if(account)clear();else controls();return;
  }
  const key=String(card.id||card.title).slice(0,240)+':'+state.phase+':'+state.position;
  if(who!==account||key!==task){stop();account=who;task=key;scene=sceneFor(card);}
  controls();
 }
 function bind(){
  if(!$('quest-cinematic-play'))return;
  $('quest-cinematic-play').addEventListener('click',play);
  $('quest-cinematic-stop').addEventListener('click',stop);
  window.addEventListener('us-two-session-cleared',clear);
  window.addEventListener('us-two-pawn-art-changed',controls);
  window.addEventListener('us-two-tab-changed',e=>{if(e.detail?.tab!=='game')stop();else controls();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else controls();});
  $('quest-world-actor')?.addEventListener('animationend',e=>{if(e.target===$('quest-world-actor'))stop();});
  controls();
 }
 window.USTwoCinematics=Object.freeze({update,clear,play,stop,sceneFor});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
