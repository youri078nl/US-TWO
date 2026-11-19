/* Mutual 18+ consent. Never cache a positive consent decision. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const bridge=()=>window.USTwoQuestPilotBridge;
let key='',busy=false,seq=0,active=false;
function identity(){const v=bridge()?.identity?.();return v?.paired?v:null;}
function status(message){const e=$('adult-consent-status');if(e)e.textContent=message;}
function emit(){window.dispatchEvent(new CustomEvent('us-two-adult-consent',{detail:{active}}));}
async function refresh(){
 const who=identity(),newKey=who?who.userId+':'+who.coupleId:'';
 if(newKey!==key){key=newKey;active=false;const t=$('adult-consent-toggle');if(t)t.checked=false;emit();}
 const n=++seq,t=$('adult-consent-toggle');
 if(!who){if(t)t.disabled=true;status('Koppel eerst jullie accounts om toestemming te beheren.');return;}
 if(t)t.disabled=busy;
 const result=await bridge().call('us_adult_consent_state',{});
 if(n!==seq||key!==newKey)return;
 if(result.error){active=false;emit();status('Toestemming kon niet worden opgehaald. Probeer opnieuw.');return;}
 const data=result.data||{};
 active=data.active===true;
 if(t)t.checked=data.mine===true;
 status(active?'Erotiek staat aan: jullie hebben allebei toestemming gegeven.':
  data.mine?'Jouw toestemming staat aan. Wachten op je partner.':
  data.partner?'Je partner heeft toestemming gegeven. Jij nog niet.':
  'Erotiek staat uit. Jullie moeten allebei afzonderlijk toestemming geven.');
 emit();
}
async function change(){
 const t=$('adult-consent-toggle');if(!t||busy)return;
 const who=identity();if(!who){t.checked=false;return;}
 const enable=t.checked;
 if(enable&&!window.confirm('Bevestig dat je 18 jaar of ouder bent en vrijwillig erotische vragen wilt ontvangen. Je kunt dit altijd uitzetten.')){t.checked=false;return;}
 busy=true;t.disabled=true;status('Toestemming opslaan…');
 const result=await bridge().call('us_adult_consent_set',{p_enabled:enable,p_confirmed_adult:enable});
 busy=false;
 if(result.error){status('Opslaan mislukt: '+result.error.message);t.checked=!enable;}
 await refresh();
}
function init(){
 $('adult-consent-toggle')?.addEventListener('change',change);
 window.addEventListener('us-two-tab-changed',e=>{if(e.detail?.tab==='more'||e.detail?.tab==='game')void refresh();});
 window.addEventListener('us-two-session-cleared',()=>{key='';active=false;emit();void refresh();});
 window.addEventListener('us-two-quest-game-open',()=>void refresh());
 void refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();