/* Original lightweight US TWO interface tones. Web Audio starts only after user gesture. */
(()=>{'use strict';
let context=null,enabled=localStorage.getItem('ustwo-sound')!=='off';
function tone(kind){
 if(!enabled||!window.AudioContext)return;
 try{
  context=context||new AudioContext();
  if(context.state==='suspended')void context.resume();
  const notes=kind==='accept'?[[523,.00],[659,.11],[784,.22]]:
    kind==='invite'?[[392,.00],[523,.14],[659,.28]]:
    kind==='choose'?[[440,.00],[554,.10]]:
    kind==='plan'?[[587,.00],[740,.14],[880,.27]]:[[490,.00]];
  const start=context.currentTime+.015;
  notes.forEach(([freq,offset])=>{
   const osc=context.createOscillator(),gain=context.createGain(),t=start+offset;
   osc.type='sine';osc.frequency.setValueAtTime(freq,t);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(.045,t+.018);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.24);
   osc.connect(gain);gain.connect(context.destination);osc.start(t);osc.stop(t+.26);
  });
 }catch(_error){/* No audio permissions: never block gameplay. */}
}
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button||button.disabled)return;
 if(button.id==='ustwo-sound-toggle'){
  enabled=!enabled;localStorage.setItem('ustwo-sound',enabled?'on':'off');
  button.textContent=enabled?'Geluid aan ♫':'Geluid uit';
  button.setAttribute('aria-pressed',String(enabled));if(enabled)tone('choose');return;
 }
 if(button.id==='quest-pilot-accept'||button.id==='quest-pilot-complete'||button.id==='quest-card-reveal-continue')tone('accept');
 else if(button.id==='quest-pilot-schedule-propose'||button.id==='quest-pilot-schedule-accept')tone('plan');
 else if(button.id==='quest-pilot-load-catalog'||button.id.startsWith('quest-pilot-option-'))tone('choose');
 else if(button.id==='incoming-invite-open'||button.id==='quest-card-reveal-close')tone('invite');
});
document.addEventListener('DOMContentLoaded',()=>{
 const b=document.getElementById('ustwo-sound-toggle');if(b){b.textContent=enabled?'Geluid aan ♫':'Geluid uit';b.setAttribute('aria-pressed',String(enabled));}
});
})();