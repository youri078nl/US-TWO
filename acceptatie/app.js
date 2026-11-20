const CONFIG = Object.freeze({
  version: '0.17.89-bergbos-startfix-rc',
  url: 'https://vuigivzwkxelsisbjjlk.supabase.co',
  publishableKey: 'sb_publishable_BVJP4ggWOXgt8SXVTXof8Q_yGcoqmX7',
  refreshMs: 20000,
});
const $ = (id) => document.getElementById(id);
const state = { session: null, dashboard: null, mode: 'login', tab: 'home', working: false, dateRequestId: null, dateChangeRequestId: null, pairCode: '', profileName: '', online: true, dateEditId: null, memories: [], memoriesError: false, calendarMonth: null, calendarSelected: null, questCalendar: [], lastSyncAt: null, syncError: false };
// Keep preview and production credentials separate on the same GitHub Pages origin.
const STORAGE_KEY = 'us-two-web-session-v2:' + new URL('./',location.href).pathname;
const safe = (text) => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUuid = v => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(String(v));
const timeFmt = new Intl.DateTimeFormat('nl-NL',{dateStyle:'medium',timeStyle:'short'});
const DATE_IDEAS = Object.freeze([["Mini-dorp bouwen",45,0,"thuis","Bouw met spullen uit huis samen een piepklein dorp."],["Keukenlab voor twee",90,15,"thuis","Verzin een gerecht met ingrediënten die jullie kennen."],["Samen een filmtrailer maken",30,0,"thuis","Bedenk een titel en speel jullie eigen filmtrailer."],["Wandeling met drie vragen",60,0,"buiten","Kies een veilige route en stel elkaar drie gekke vragen."],["Onzinreclame maken",30,0,"thuis","Maak een reclamespot voor een nutteloos voorwerp."],["Tien gratis mini-avonturen",30,0,"beide","Bedenk ieder vijf kleine avonturen die niets kosten."],["Fotomissie: filmposter",60,0,"beide","Maak samen een foto alsof jullie in een film spelen."],["Picknick met een thema",90,15,"buiten","Neem iets lekkers mee naar een fijne plek."],["Muzikale herinneringen",45,0,"thuis","Vertel welk nummer bij een mooie herinnering hoort."],["Kaartspel met nieuwe regels",60,0,"thuis","Bedenk samen verrassende regels voor een bestaand spel."],["Speurtocht door huis",45,0,"thuis","Verstop aanwijzingen voor een kleine speurtocht."],["Samen sterren kijken",60,0,"buiten","Zoek bij geschikt weer een plek om naar de lucht te kijken."]]);
let ideaOffset=0;
let refreshPending = null; let pollBusy = false; let authGeneration = 0; let toastTimer = 0; let waitingWorker = null;

function toast(message, error=false) {
  const e=$('toast');e.textContent=message;e.classList.toggle('error',error);e.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('visible'),5000);
}
function connection(ok) {
  state.online=ok;
  const label=$('connection-status');
  const fresh=Number.isFinite(state.lastSyncAt)&&state.lastSyncAt>0;
  const time=fresh?new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date(state.lastSyncAt)):'';
  const age=fresh?Date.now()-state.lastSyncAt:Infinity;
  const current=ok&&!state.syncError&&fresh&&age<=60000;
  label.textContent=!navigator.onLine?'Geen internet'+(fresh?' · laatst '+time:''):state.syncError?'Synchronisatie mislukt'+(fresh?' · laatst '+time:''):current?'Bijgewerkt '+time:fresh?'Niet actueel · '+time:'Nog niet gesynchroniseerd';
  label.classList.toggle('online',current);
  label.title=fresh?'Laatste succesvolle synchronisatie: '+new Date(state.lastSyncAt).toLocaleString('nl-NL'):'Er is nog geen succesvolle synchronisatie bevestigd.';
}
function setBusy(v) { state.working=v; document.querySelectorAll('button[type=submit], button[data-action]').forEach(x=>x.disabled=v); }
function failText(error) {
  const msg=String(error?.message||error||'Er ging iets mis.');
  const known={ invalid_login_credentials:'E-mailadres of wachtwoord klopt niet.',email_not_confirmed:'Bevestig eerst je e-mailadres via de ontvangen e-mail.',user_already_exists:'Dit e-mailadres is al geregistreerd.',invalid_or_expired_pair_code:'De koppelcode is onjuist of verlopen. Laat een nieuwe maken.',profile_required:'Sla eerst je schermnaam op.',already_in_pair:'Je account is al gekoppeld.',pair_not_ready:'Koppel eerst jullie twee accounts.',pair_full:'Dit koppel heeft al twee leden.',round_already_active:'Er staat al een opdracht open.',preparation_time_remaining:'De voorbereidingstijd is nog niet voorbij.',both_players_must_be_ready:'Jullie moeten allebei klaar zijn.',revision_conflict:'De uitnodiging is gewijzigd. Ververs eerst de gegevens.',cannot_respond_to_own_date:'Je kunt je eigen uitnodiging niet beantwoorden.',invalid_change_request:'Controleer titel, datum en duur van het wijzigingsvoorstel.',change_already_pending:'Er wacht al een wijzigingsvoorstel op goedkeuring.',cannot_respond_to_own_change:'Je kunt je eigen voorstel niet accepteren.',date_not_changeable:'Deze afspraak kan niet meer worden gewijzigd.',change_already_handled:'Dit voorstel is al afgehandeld. Ververs de agenda.',no_change_detected:'Verander minstens één onderdeel van de afspraak.',proposed_date_expired:'De voorgestelde datum is inmiddels voorbij.',invalid_counteroffer:'Controleer de gegevens van je tegenvoorstel.',counteroffer_pending:'Er wacht al een tegenvoorstel. Behandel dit eerst.',cannot_counter_own_date:'Je kunt niet tegen jezelf bieden.',date_not_counterable:'Dit voorstel kan niet meer worden aangepast.',date_not_cancellable:'Deze afspraak kan niet meer worden geannuleerd.',cannot_cancel_partner_invitation:'Wijs de uitnodiging af in plaats van te annuleren.',invalid_cancellation:'Ongeldig annuleringverzoek.',invalid_memory:'Controleer titel, datum, tekst en deelinstelling.',memory_not_found:'Herinnering niet gevonden of niet van jou.',invalid_visibility:'Ongeldige zichtbaarheid.',invalid_memory_delete:'Ongeldig verwijderverzoek.',network_error:'Geen verbinding. Probeer opnieuw als je internet hebt.'};
  const entry=Object.entries(known).find(([k])=>msg.toLowerCase().includes(k));return entry?entry[1]:msg.slice(0,230);
}
async function request(url, opts={}) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),16000);
  try {
    const res=await fetch(CONFIG.url+url,{...opts,signal:controller.signal,cache:'no-store',headers:{apikey:CONFIG.publishableKey,Accept:'application/json',...(opts.body?{'Content-Type':'application/json'}:{}),...opts.headers}});
    const raw=await res.text();let value=null;try{value=raw?JSON.parse(raw):null}catch{value={message:'Ongeldig serverantwoord.'}}
    if(!res.ok){const e=new Error(value?.message||value?.msg||value?.error_description||value?.error||`HTTP ${res.status}`);e.status=res.status;throw e}
    connection(true);return value;
  } catch(e){if(e.name==='AbortError'||e instanceof TypeError){connection(false);throw new Error('network_error')}throw e}
  finally{clearTimeout(timer)}
}
function saveSession(obj) {
  if(!obj||typeof obj.access_token!=='string'||typeof obj.refresh_token!=='string')throw new Error('Ongeldig loginantwoord.');
  if(state.session?.user?.id&&obj.user?.id&&state.session.user.id!==obj.user.id){secretMissionRequestSeq++;const secretPanel=$('us-two-my-secret-missions');if(secretPanel)secretPanel.textContent='Geheime missies laden voor het nieuwe account.';authGeneration++;state.dashboard=null;state.questCalendar=[];state.lastSyncAt=null;state.syncError=false;}
  state.session={access_token:obj.access_token,refresh_token:obj.refresh_token,expires_at:Math.floor(Date.now()/1000)+(Number(obj.expires_in)||3600),user:obj.user||state.session?.user||null};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state.session));
  window.dispatchEvent(new Event('us-two-session-updated'));
}
function clearSession(){secretMissionRequestSeq++;const secretPanel=$('us-two-my-secret-missions');if(secretPanel)secretPanel.textContent='Log in om jouw geheime missies te bekijken.';authGeneration++;refreshPending=null;state.dateRequestId=null;state.dateChangeRequestId=null;state.session=null;state.dashboard=null;state.memories=[];state.memoriesError=false;state.calendarMonth=null;state.calendarSelected=null;state.questCalendar=[];state.lastSyncAt=null;state.syncError=false;state.pairCode='';state.dateEditId=null;localStorage.removeItem(STORAGE_KEY);window.dispatchEvent(new Event('us-two-session-cleared'))}
async function freshToken() {
  if(!state.session?.refresh_token)throw new Error('Log opnieuw in.');
  if(refreshPending?.generation===authGeneration)return refreshPending.promise;
  const generation=authGeneration;
  const refreshToken=state.session.refresh_token;
  const pending={generation,promise:null};
  refreshPending=pending;
  pending.promise=(async()=>{
    try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:refreshToken})});
      if(generation!==authGeneration||state.session?.refresh_token!==refreshToken)throw Error('Inlogsessie is gewijzigd.');
      saveSession(data);return data.access_token}
    catch(e){if((e.status===400||e.status===401)&&generation===authGeneration){clearSession();showAuth()}throw e}
    finally{if(refreshPending===pending)refreshPending=null}
  })();return pending.promise;
}
async function rpc(name,body={},retry=true) {
  if(!state.session)throw new Error('Log eerst in.');
  const generation=authGeneration;
  if(state.session.expires_at < Date.now()/1000+80)await freshToken();
  if(generation!==authGeneration||!state.session)throw Error('Inlogsessie is gewijzigd.');
  const token=state.session.access_token;
  try{
    const result=await request('/rest/v1/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
    if(generation!==authGeneration)throw Error('Inlogsessie is gewijzigd.');
    return result;
  }catch(e){
    if(retry&&e.status===401&&generation===authGeneration){
      if(state.session?.access_token===token)await freshToken();
      if(generation!==authGeneration||!state.session)throw Error('Inlogsessie is gewijzigd.');
      return rpc(name,body,false);
    }
    throw e;
  }
}
async function authorize(email,password,signUp){
  const url=signUp?'/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin+location.pathname):'/auth/v1/token?grant_type=password';
  const data=await request(url,{method:'POST',body:JSON.stringify({email,password})});
  if(!data?.access_token){$('auth-feedback').classList.remove('error');$('auth-feedback').textContent='Account aangemaakt. Controleer je e-mail voor de bevestigingslink en log daarna in.';return}
  saveSession(data);$('auth-password').value='';await showApp();
}
function showAuth() {
  $('auth-view').classList.remove('hidden');$('app-view').classList.add('hidden');$('bottom-nav').classList.add('hidden');$('refresh-btn').classList.add('hidden');
  $('auth-tabs').classList.remove('hidden');
  $('auth-form').classList.remove('hidden');
  $('forgot-password').classList.remove('hidden');
  $('auth-note').classList.remove('hidden');
  $('reset-request-form').classList.add('hidden');
  $('reset-change-form').classList.add('hidden');
}
function showRecovery(kind) {
  showAuth();
  $('auth-tabs').classList.add('hidden');
  $('auth-form').classList.add('hidden');
  $('forgot-password').classList.add('hidden');
  $('auth-note').classList.add('hidden');
  $(kind === 'change' ? 'reset-change-form' : 'reset-request-form').classList.remove('hidden');
  $('auth-feedback').textContent='';
  $('auth-feedback').classList.remove('error');
  if(kind==='request')$('reset-email').value=$('auth-email').value.trim();
}
async function showApp(){
  $('auth-view').classList.add('hidden');$('app-view').classList.remove('hidden');$('bottom-nav').classList.remove('hidden');$('refresh-btn').classList.remove('hidden');
  $('date-today').textContent=new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  // Begin with a safe shell while fetching identity. After successful dashboard
  // hydration, go directly to the actual game (or pairing for an unpaired user).
  // Do not misroute if Supabase is unavailable and the dashboard is unknown.
  setTab('home');
  await syncAll();
  if(state.session&&state.dashboard)setTab(paired()?'discover':'pair');
}
function showQuestAgenda(){
 const schedule=document.querySelector('[aria-labelledby="quest-schedule-heading"]');
 if(!schedule)return;
 setTab('game','tasks');
 schedule.scrollIntoView({behavior:'smooth',block:'start'});
 const field=$('quest-pilot-schedule-time');
 if(field&&!field.disabled)field.focus({preventScroll:true});
}
window.addEventListener('us-two-open-quest-agenda',showQuestAgenda);
let gameView='board';
function setTab(tab,view){
  if(!['home','pair','dates','discover','game','memories','more'].includes(tab))return;
  if(tab==='game')gameView=view==='tasks'?'tasks':'board';
  state.tab=tab;
  document.body.classList.toggle('us-two-board-only',tab==='game'&&gameView==='board');
  $('app-view')?.classList.toggle('us-two-home-view',tab==='home');
  document.querySelectorAll('.tab-panel').forEach(x=>x.classList.add('hidden'));
  $(tab+'-panel').classList.remove('hidden');
  $('game-panel')?.classList.toggle('quest-tasks-view',tab==='game'&&gameView==='tasks');
  const gameHeading=$('quest-game-view-heading');
  if(gameHeading)gameHeading.textContent=gameView==='tasks'?'Opdrachten en vragen':'Jullie speelbord';
  const note=$('quest-game-section-note');
  if(note)note.textContent=tab==='game'&&gameView==='tasks'?
    'Opdrachten en vragen: kies, beantwoord en keur goed. De gezamenlijke pion verdient hiermee stappen op het bord.':
    'Het bord en de opdrachten gebruiken dezelfde gezamenlijke spelstand.';
  document.querySelectorAll('[data-tab]').forEach(x=>{
    const active=x.dataset.tab===tab&&(tab!=='game'||(x.dataset.gameView||'board')===gameView);
    x.classList.toggle('active',active);x.setAttribute('aria-current',active?'page':'false');
  });
  // De volledige kaartencollectie blijft op aanvraag beschikbaar.
  // Automatisch uitklappen maakt het opdrachtenscherm onnodig lang.
  if(tab==='dates'&&state.session)window.dispatchEvent(new Event('us-two-quest-calendar-refresh'));
  if(tab==='game'&&state.session)window.dispatchEvent(new Event('us-two-quest-game-open'));
  window.dispatchEvent(new CustomEvent('us-two-tab-changed',{detail:{tab,gameView}}));
  window.scrollTo({top:0,behavior:'instant'});
}
// Read-only date discovery routes; only the existing date form submits invitations.
window.USTwoDateBridge=Object.freeze({
  open:()=>setTab('discover'),
  choose:({title,minutes,source}={})=>{
    if(!state.session){toast('Log eerst in.',true);return;}
    if(!paired()){setTab('pair');toast('Koppel eerst jullie accounts om een date te plannen.',true);return;}
    const picked=String(title||'').trim().slice(0,120);
    if(!picked)return;
    state.dateRequestId=null;
    $('date-title').value=picked;
    const duration=$('date-duration');
    const chosenMinutes=Math.max(15,Math.min(240,Math.round(Number(minutes)||60)));
    const exact=[...duration.options].find(option=>Number(option.value)===chosenMinutes);
    if(!exact){
      const option=document.createElement('option');option.value=String(chosenMinutes);
      option.textContent=chosenMinutes+' minuten (gekozen date)';duration.append(option);
    }
    duration.value=String(chosenMinutes);
    const dateField=$('date-when');
    const now=new Date(),today=amsterdamDay(now);
    const selected=state.calendarSelected&&state.calendarSelected>=today?state.calendarSelected:today;
    const nextHour=Math.floor(amsterdamClock(now)/60)+1;
    const hour=selected===today?Math.max(19,nextHour):19;
    if(!dateField.value||!Number.isFinite(new Date(dateField.value).getTime())||new Date(dateField.value)<=now){
      if(hour<24)dateField.value=selected+'T'+String(hour).padStart(2,'0')+':00';
      else{
        const tomorrow=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1,Number(today.slice(8,10))+1));
        dateField.value=tomorrow.toISOString().slice(0,10)+'T19:00';
      }
    }
    // Keep the calendar selection in step with the date that is actually in the form.
    const chosenDay=dateField.value.slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(chosenDay)){
      state.calendarSelected=chosenDay;
      state.calendarMonth=chosenDay.slice(0,7);
      renderCalendar();
    }
    updateDateConflictWarning();
    $('date-form-selected').textContent='Gekozen date: '+picked+'. Controleer datum en tijd; alleen Verzenden maakt een uitnodiging.';
    setTab('dates');
    $('date-form').scrollIntoView({behavior:'instant',block:'center'});
    $('date-when').focus({preventScroll:true});
  }
});
async function syncAll({quiet=false}={}) {
  if(!state.session||pollBusy)return false;
  const account=state.session.user?.id;
  const generation=authGeneration;
  pollBusy=true;
  try{
    const [d,memories]=await Promise.all([rpc('us_dashboard'),rpc('us_memory_list').catch(()=>null)]);
    // A response from the previous account must never repopulate the screen after logout.
    if(!account||generation!==authGeneration||state.session?.user?.id!==account)return false;
    state.dashboard=d;state.lastSyncAt=Date.now();state.syncError=false;
    if(Array.isArray(memories)){state.memories=memories;state.memoriesError=false}else{state.memories=[];state.memoriesError=true;}
    renderAll();connection(true);showIncomingInvite();return true;
  }catch(e){
    if(account&&generation===authGeneration&&state.session?.user?.id===account){state.syncError=true;connection(navigator.onLine);if(!quiet)toast(failText(e),true);}
    return false;
  }finally{pollBusy=false}
}
function updateDateConflictWarning(){
  const warning=$('date-conflict-warning');
  if(!warning)return;
  const raw=$('date-when').value;
  const start=new Date(raw).getTime(),minutes=Number($('date-duration').value);
  if(!raw||!Number.isFinite(start)||!Number.isSafeInteger(minutes)||minutes<15||minutes>1440){
    warning.hidden=true;warning.textContent='';return;
  }
  const end=start+minutes*60000;
  const overlaps=(candidate)=>{
    const otherStart=new Date(candidate?.start_at).getTime(),otherDuration=Number(candidate?.duration_minutes);
    return Number.isFinite(otherStart)&&Number.isFinite(otherDuration)&&otherDuration>0&&start<otherStart+otherDuration*60000&&end>otherStart;
  };
  const conflicts=(state.dashboard?.dates||[]).filter(d=>
    ['accepted','proposed'].includes(d.status)&&(overlaps(d)||d.pending_change&&overlaps(d.pending_change))
  );
  // Quest schedule entries expose a start time but no guaranteed duration.
  // Flag the exact start falling inside the new time window, without inventing an end.
  const questConflicts=(state.questCalendar||[]).filter(d=>{
    if(!['accepted','proposed'].includes(d.status))return false;
    const questStart=new Date(d.start_at).getTime();
    return Number.isFinite(questStart)&&questStart>=start&&questStart<end;
  });
  const count=conflicts.length+questConflicts.length;
  warning.hidden=!count;
  warning.textContent=count?'Let op: dit tijdstip overlapt met '+[
    conflicts.length?conflicts.length+' bestaande '+(conflicts.length===1?'afspraak of uitnodiging':'afspraken of uitnodigingen'):null,
    questConflicts.length?questConflicts.length+' spelreis'+(questConflicts.length===1?'date':'dates'):null
  ].filter(Boolean).join(' en ')+'. Je kunt het voorstel nog steeds versturen.':'';
}
function renderAll(){renderPair();renderDates();renderCalendar();renderMemories();renderHome();updateDateConflictWarning()}
function paired(){return Boolean(state.dashboard?.couple_id)&&(state.dashboard?.members||[]).length===2}
function dateNeedsMyResponse(d,me,now=Date.now()){
  if(!d||!['accepted','proposed'].includes(d.status))return false;
  const pending=d.pending_change;
  if(pending){
    return pending.proposer_id!==me&&
      Number.isFinite(new Date(pending.start_at).getTime())&&
      new Date(pending.start_at).getTime()>=now;
  }
  return d.status==='proposed'&&d.proposer_id!==me&&
    Number.isFinite(new Date(d.start_at).getTime())&&new Date(d.start_at).getTime()>=now;
}
const shownIncomingInvites=new Set();
let incomingInviteAccount=null;
function closeIncomingInvite(){
  $('incoming-invite-overlay')?.classList.add('hidden');
}
function showIncomingInvite(){
  const overlay=$('incoming-invite-overlay');
  const me=state.session?.user?.id;
  if(!overlay||!me||!paired()){closeIncomingInvite();return;}
  if(incomingInviteAccount!==me){
    incomingInviteAccount=me;shownIncomingInvites.clear();closeIncomingInvite();
  }
  if(!overlay.classList.contains('hidden'))return;
  const waiting=(state.dashboard?.dates||[]).filter(d=>dateNeedsMyResponse(d,me));
  const unseen=waiting.filter(d=>!shownIncomingInvites.has(d.id+':'+String(d.revision)+':'+String(d.pending_change?.id||'')));
  if(!unseen.length)return;
  unseen.forEach(d=>shownIncomingInvites.add(d.id+':'+String(d.revision)+':'+String(d.pending_change?.id||'')));
  const first=unseen[0],change=first.pending_change;
  $('incoming-invite-heading').textContent=unseen.length===1?
    (change?'Nieuw tegenvoorstel voor een date':'Je hebt een date-uitnodiging ontvangen'):
    'Je hebt '+unseen.length+' uitnodigingen ontvangen';
  $('incoming-invite-description').textContent=unseen.length===1?
    (change?.title||first.title)+' · '+timeFmt.format(new Date(change?.start_at||first.start_at))+
      '. Bekijk het voorstel en reageer in de agenda.':
    'Er wachten '+unseen.length+' voorstellen of wijzigingen van je partner. Bekijk ze in de gedeelde agenda.';
  overlay.classList.remove('hidden');
  $('incoming-invite-open')?.focus();
}
function renderHome(){
  const d=state.dashboard||{};const m=d.members||[];const list=d.dates||[];
  $('couple-banner').innerHTML=paired()?'<span class="dot"></span><span>Jullie zijn gekoppeld 💞</span>':`<span class="dot"></span><span>${m.length?'Wachten op jouw partner':'Koppel jullie accounts om te starten'}</span>`;
  $('welcome-note').textContent=paired()?'Een kleine verrassing kan een gewone dag bijzonder maken.':'Twee accounts, één avontuur. Nodig je partner uit om te beginnen.';
  const upcoming=[...list].filter(x=>['accepted','proposed'].includes(x.status)&&new Date(x.start_at).getTime()>=Date.now()).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
  const next=upcoming.find(x=>x.status==='accepted')||upcoming[0];
  const nextConfirmed=next?.status==='accepted';
  const me=state.session?.user?.id;
  const incoming=list.filter(x=>dateNeedsMyResponse(x,me));
  let cards='';
  if(!paired()){cards+=`<div class="card"><span class="eyebrow">EERSTE STAP</span><h3>Verbind jullie accounts</h3><p class="muted">Gebruik een koppelcode zodat jullie samen kunnen plannen en spelen.</p><button class="secondary-btn" data-action="open-pair">Naar koppelen</button></div>`}
  else {if(incoming.length)cards+=`<div class="card"><span class="eyebrow">JOUW ACTIE</span><h3>${incoming.length} ${incoming.length===1?'uitnodiging wacht':'uitnodigingen wachten'} op jou</h3><p class="muted">Bekijk de voorgestelde dates of wijzigingen en reageer vanuit de gedeelde agenda.</p><button class="primary-btn" data-action="open-pending-dates">Bekijk uitnodigingen</button></div>`;
    cards+=`<div class="card"><span class="eyebrow">${nextConfirmed?'VOLGENDE BEVESTIGDE DATE':next?'NOG NIET BEVESTIGD':'VOLGENDE DATE'}</span><h3>${next?safe(next.title):'Tijd voor een nieuwe afspraak?'}</h3><p class="muted">${next?timeFmt.format(new Date(next.start_at))+(nextConfirmed?' · Bevestigd':' · Wacht op akkoord'):'Plan iets leuks, ook als het maar een halfuurtje is.'}</p><button class="secondary-btn" data-action="open-dates">Bekijk agenda</button></div>`;
    cards+=`<div class="card"><span class="eyebrow">JULLIE SPELREIS</span><h3>Samen verder spelen</h3><p class="muted">Bekijk jullie gezamenlijke wereld, opdrachten en de actuele serverstand.</p><button class="secondary-btn" data-action="open-game">Open het spel</button></div>`}
  $('home-cards').innerHTML=cards;
}
function renderPair(){
  const d=state.dashboard||{}, members=d.members||[];
  if(members.length){const me=members.find(m=>m.user_id===state.session?.user?.id);state.profileName=me?.name||state.profileName}
  if(state.profileName&&!document.activeElement?.isSameNode($('profile-name')))$('profile-name').value=state.profileName;
  let content='';
  if(paired())content=`<h3>Jullie zijn gekoppeld <span aria-hidden="true">♡</span></h3><p class="muted">${members.map(m=>safe(m.name)).join(' &amp; ')}</p><span class="tag active">Klaar voor een date</span>`;
  else if(members.length){content=`<h3>Uitnodigen</h3><p class="muted">Laat je partner op een eigen account inloggen en de code invoeren.</p><button class="secondary-btn" data-action="create-code">Nieuwe koppelcode maken</button>`}
  else {content=`<h3>Word onderdeel van een duo</h3><p class="muted">Heb je al een code van je partner? Voer die hieronder in. Anders kun je zelf een duo starten.</p><form id="join-form"><label for="pair-code">Koppelcode van je partner</label><input id="pair-code" spellcheck="false" autocapitalize="characters" autocomplete="off" placeholder="32 tekens" minlength="32" maxlength="48" required><button class="primary-btn" type="submit">Koppel onze accounts</button></form><p class="muted center">of</p><button class="secondary-btn" data-action="create-code">Maak een nieuwe koppelcode</button>`}
  if(state.pairCode) content+=`<div class="task-box"><h4>Jouw eenmalige koppelcode</h4><div class="code-block" id="issued-code">${safe(state.pairCode)}</div><div class="buttons"><button class="secondary-btn" data-action="copy-code">Kopieer code</button></div><p class="muted">24 uur geldig. Deel deze alleen rechtstreeks met je partner.</p></div>`;
  $('pair-controls').innerHTML=content;
}
function renderDateIdeas(){
  const budget=$('idea-budget').value;
  const place=$('idea-place').value;
  const filtered=DATE_IDEAS.map((v,i)=>({v,i})).filter(({v})=>(budget==='all'||v[2]<=Number(budget))&&(place==='all'||v[3]==='beide'||v[3]===place));
  if(!filtered.length){$('idea-results').innerHTML='<p class="muted">Geen ideeën gevonden. Kies een ander filter.</p>';return}
  const count=Math.min(3,filtered.length);
  const chosen=Array.from({length:count},(_,i)=>filtered[(ideaOffset+i)%filtered.length]);
  const rows=chosen.map(({v,i})=>{
    const cost=v[2]===0?'Gratis':'Budgetindicatie tot €'+v[2];
    return '<article class="idea-card"><div><span class="eyebrow">'+safe(cost)+' · '+v[1]+' min</span><h4>'+safe(v[0])+'</h4><p class="muted">'+safe(v[4])+'</p></div><button class="secondary-btn" type="button" data-action="choose-idea" data-index="'+i+'">Kies idee</button></article>';
  }).join('');
  $('idea-results').innerHTML=rows+(filtered.length>3?'<button type="button" class="ghost-btn" data-action="more-ideas">Andere ideeën</button>':'');
}
function amsterdamClock(value){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
  timeZone:'Europe/Amsterdam',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(value).filter(x=>x.type==='hour'||x.type==='minute').map(x=>[x.type,x.value]));
 return Number(parts.hour)*60+Number(parts.minute);
}
function amsterdamDay(value){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function monthStep(delta){
 const [year,month]=(state.calendarMonth||amsterdamDay(new Date()).slice(0,7)).split('-').map(Number);
 const start=new Date(Date.UTC(year,month-1+delta,1));
 state.calendarMonth=start.toISOString().slice(0,7);
 state.calendarSelected=state.calendarMonth+'-01';
 renderCalendar();
}
// Read-only projection of the canonical new quest schedule into the legacy
// month view. Do not create or duplicate legacy date records.
function updateQuestCalendar(game,who){
 const authorized=Boolean(state.session?.user?.id&&
   state.session.user.id===who?.userId&&
   paired()&&state.dashboard?.couple_id===who?.coupleId);
 const next=[];
 if(authorized&&game?.paired&&game.initialized&&game.phase==='active'){
  const d=game.date,p=game.schedule;
  const title=typeof d?.title==='string'&&d.title.trim()?d.title.trim():'Spelreisdate';
  const id=typeof d?.id==='string'?d.id:'';
  const add=(kind,at,label)=>{
   const dt=typeof at==='string'?new Date(at):null;
   if(dt&&Number.isFinite(dt.getTime())){
    next.push({id:'quest:'+kind+':'+id,start_at:dt.toISOString(),title,kind,
      status:kind==='confirmed'?'accepted':'proposed',label});
   }
  };
  if(p?.status==='confirmed')add('confirmed',p.confirmed_at,'Bevestigde spelreisdate');
  if(p?.pending_at)add('pending',p.pending_at,
    p.pending_by===who.userId?'Eigen datumvoorstel · spelreis':'Voorstel partner · spelreis');
 }
 state.questCalendar=next;
 updateDateConflictWarning();
 if($('calendar-grid')&&state.tab==='dates')renderCalendar();
}
window.USTwoQuestCalendar=Object.freeze({update:updateQuestCalendar,clear:()=>{
 state.questCalendar=[];updateDateConflictWarning();if($('calendar-grid')&&state.tab==='dates')renderCalendar();
}});
function renderCalendar(){
 const today=amsterdamDay(new Date()),month=state.calendarMonth||today.slice(0,7);
 const plan=$('[data-action="calendar-plan-day"]');
 if(plan){
  const selected=state.calendarSelected||today;
  plan.disabled=!paired()||selected<today||selected===today&&amsterdamClock(new Date())>=23*60;
  plan.textContent=!paired()?'Koppel accounts om een date te plannen'
   :selected<today?'Kies een toekomstige dag om te plannen':'Plan een date op '+selected.split('-').reverse().join('-');
 }
 const [year,m]=month.split('-').map(Number);
 const start=new Date(Date.UTC(year,m-1,1));
 if(!Number.isFinite(start.getTime()))return;
 const monthLabel=new Intl.DateTimeFormat('nl-NL',{month:'long',year:'numeric',timeZone:'UTC'}).format(start);
 $('calendar-month-label').textContent=monthLabel;
 const first=(start.getUTCDay()+6)%7;
 const days=new Date(Date.UTC(year,m,0)).getUTCDate();
 const count=Math.ceil((first+days)/7)*7;
 let html=['ma','di','wo','do','vr','za','zo'].map(x=>'<span class="calendar-weekday">'+x+'</span>').join('');
 const scheduled=(state.dashboard?.dates||[]).filter(d=>d.status==='proposed'||d.status==='accepted');
 const confirmed=paired()?(state.dashboard?.dates||[]).filter(d=>d.status==='accepted')
   .concat(state.questCalendar.filter(d=>d.status==='accepted'&&d.kind==='confirmed')):[];
 const exportButton=$('quest-calendar-export');
 if(exportButton)exportButton.disabled=!confirmed.some(d=>typeof d.start_at==='string'&&Number.isFinite(new Date(d.start_at).getTime()));
 // Show pending reschedules on their proposed day without changing the
 // canonical original appointment or exporting an unaccepted proposal.
 const pendingCalendarEntries=scheduled.flatMap(d=>{
  const change=d.pending_change;
  const at=change?.start_at;
  if(!at||!Number.isFinite(new Date(at).getTime()))return [];
  return [{...d,start_at:at,title:change.title||d.title,
    status:'proposed',calendarLabel:d.status==='accepted'?'Wijziging voorgesteld':'Tegenvoorstel'}];
 });
 const byDay=new Map();
 (paired()?scheduled.concat(pendingCalendarEntries,state.questCalendar):scheduled.concat(pendingCalendarEntries)).forEach(d=>{
  const date=new Date(d.start_at);
  if(!Number.isFinite(date.getTime()))return;
  const key=amsterdamDay(date);
  if(!byDay.has(key))byDay.set(key,[]);
  byDay.get(key).push(d);
 });
 for(let i=0;i<count;i++){
  const day=i-first+1;
  if(day<1||day>days){html+='<span class="calendar-empty" aria-hidden="true"></span>';continue}
  const key=month+'-'+String(day).padStart(2,'0');
  const appointments=byDay.get(key)||[];
  const isToday=key===today,selected=key===(state.calendarSelected||today);
  html+=`<button type="button" class="calendar-day${isToday?' today':''}${selected?' selected':''}${appointments.length?' has-dates':''}" data-action="calendar-day" data-day="${key}" aria-pressed="${selected}" aria-label="${day} ${monthLabel}, ${appointments.length} afspraken"><span>${day}</span>${appointments.length?'<i class="calendar-dot" aria-hidden="true"></i>':''}</button>`;
 }
 $('calendar-grid').innerHTML=html;
 const key=state.calendarSelected||today;
 const events=(byDay.get(key)||[]).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
 const label=new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(key+'T12:00:00Z'));
 $('calendar-day-detail').innerHTML='<h4>'+safe(label)+'</h4>'+(events.length?
  events.map(d=>'<div class="calendar-event"><span class="tag '+(d.status==='accepted'?'active':'pending')+'">'+safe(d.calendarLabel|| (d.kind?d.label:(d.status==='accepted'?'Geaccepteerd':'Uitnodiging')))+'</span> '+safe(d.title)+' · '+timeFmt.format(new Date(d.start_at))+(d.kind?' <button type="button" class="ghost-btn" data-action="calendar-open-game">Open spelreis</button>':!validUuid(d.id)?'':' <button type="button" class="ghost-btn" data-action="calendar-open-date" data-id="'+safe(d.id)+'">Bekijk afspraak</button>')+'</div>').join(''):
  '<p class="muted">Geen geplande afspraken op deze dag.</p>');
}
function renderMemories(){
 const list=state.memories||[];
 $('memory-form').querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=!paired());
 if(!paired()){
  $('memories-list').innerHTML='<div class="card"><p class="muted">Koppel jullie accounts om herinneringen vast te leggen.</p></div>';return;
 }
 if(state.memoriesError){
  $('memories-list').innerHTML='<div class="card"><p class="muted">Herinneringen kunnen nu niet worden geladen. Vernieuw de gegevens.</p></div>';return;
 }
 if(!list.length){
  $('memories-list').innerHTML='<div class="card"><h3>Het herinneringenboek is nog leeg</h3><p class="muted">Begin met één klein moment. Jij kiest of je het privé houdt of samen deelt.</p></div>';return;
 }
 const me=state.session?.user?.id;
 $('memories-list').innerHTML=list.map(item=>{
  const own=item.author_id===me;
  const shared=item.visibility==='shared';
  const visibility=shared?'<span class="tag active">Samen gedeeld</span>':'<span class="tag pending">Alleen ik</span>';
  const note=item.note?'<p class="memory-note">'+safe(item.note)+'</p>':'';
  const actions=own?'<div class="buttons"><button type="button" class="secondary-btn" data-action="'+(shared?'mem-private':'mem-share')+'" data-id="'+safe(item.id)+'" data-revision="'+Number(item.revision)+'">'+(shared?'Weer privé maken':'Delen met partner')+'</button></div><details class="cancel-confirm"><summary>Herinnering verwijderen</summary><p class="muted">Dit verwijdert de tekst voor jullie allebei. Dit kun je niet ongedaan maken.</p><button type="button" class="ghost-btn" data-action="mem-delete" data-id="'+safe(item.id)+'" data-revision="'+Number(item.revision)+'">Ja, verwijderen</button></details>':'';
  return '<article class="card memory-card">'+visibility+'<h3>'+safe(item.title)+'</h3><p class="meta">'+safe(item.happened_on)+' · '+(own?'Van jou':'Van '+safe(item.author_name||'je partner'))+'</p>'+note+actions+'</article>';
 }).join('');
}
let secretMissionRequestSeq=0;
async function loadMySecretDateMissions(){
  const target=$('us-two-my-secret-missions');
  if(!target||!state.session?.user?.id)return;
  const uid=state.session.user.id, generation=authGeneration, seq=++secretMissionRequestSeq;
  try{
    if(state.session.expires_at<Date.now()/1000+80)await freshToken();
    if(seq!==secretMissionRequestSeq||generation!==authGeneration||state.session?.user?.id!==uid)return;
    const rows=await request('/rest/v1/us_date_secret_missions?select=id,date_id,mission_text,status&order=created_at.desc&limit=50',{
      headers:{Authorization:'Bearer '+state.session.access_token}
    });
    if(seq!==secretMissionRequestSeq||generation!==authGeneration||state.session?.user?.id!==uid)return;
    const dates=new Map((state.dashboard?.dates||[]).map(d=>[d.id,d]));
    const visible=(Array.isArray(rows)?rows:[]).filter(m=>dates.get(m.date_id)?.status==='accepted');
    target.innerHTML=visible.length?visible.map(m=>{
      const d=dates.get(m.date_id);
      return '<article class="card"><span class="tag active">Alleen voor jou</span><h3>'+safe(d.title)+'</h3><p class="meta">'+timeFmt.format(new Date(d.start_at))+'</p><p>'+safe(m.mission_text)+'</p>'+(m.status==='completed'?'<p class="tag active">Missie afgerond</p>':m.status==='assigned'?'<button type="button" class="secondary-btn" data-action="complete-secret-mission" data-id="'+safe(m.id)+'">Missie afgerond</button>':'')+'</article>';
    }).join(''):'<p class="muted">Nog geen geheime date-missie voor jou.</p>';
  }catch(e){if(seq===secretMissionRequestSeq&&generation===authGeneration&&state.session?.user?.id===uid)target.textContent='Geheime missies tijdelijk niet beschikbaar.';}
}
function renderDates(){
  const allDates=state.dashboard?.dates||[];
  if($('us-two-my-secret-missions'))void loadMySecretDateMissions();
  const dateFilter=$('date-list-filter')?.value||'upcoming';
  const currentTime=Date.now();
  const isUpcoming=d=>['accepted','proposed'].includes(d.status)&&(
    new Date(d.start_at).getTime()>=currentTime||
    d.pending_change&&new Date(d.pending_change.start_at).getTime()>=currentTime
  );
  const me=state.session?.user?.id;
  const needsMyResponse=d=>dateNeedsMyResponse(d,me,currentTime);
  const incomingCount=allDates.filter(needsMyResponse).length;
  const pendingCount=allDates.filter(d=>isUpcoming(d)&&(d.status==='proposed'||Boolean(d.pending_change))).length;
  const acceptedCount=allDates.filter(d=>isUpcoming(d)&&d.status==='accepted'&&!d.pending_change).length;
  const filter=$('date-list-filter');
  if(filter){
    const incomingOption=filter.querySelector('option[value="incoming"]');
    if(incomingOption)incomingOption.textContent='Jouw reacties ('+incomingCount+')';
    const pendingOption=filter.querySelector('option[value="pending"]');
    const acceptedOption=filter.querySelector('option[value="accepted"]');
    if(pendingOption)pendingOption.textContent='Wachten op antwoord ('+pendingCount+')';
    if(acceptedOption)acceptedOption.textContent='Bevestigde dates ('+acceptedCount+')';
  }
  const filteredDates=allDates.filter(d=>{
    if(dateFilter==='all')return true;
    if(dateFilter==='history')return !isUpcoming(d);
    if(dateFilter==='incoming')return needsMyResponse(d);
    if(dateFilter==='pending')return isUpcoming(d)&&(d.status==='proposed'||Boolean(d.pending_change));
    if(dateFilter==='accepted')return isUpcoming(d)&&d.status==='accepted'&&!d.pending_change;
    return isUpcoming(d);
  });
  const list=[...filteredDates].sort((a,b)=>{
    const activeTime=d=>{
      const original=new Date(d.start_at).getTime(),proposed=new Date(d.pending_change?.start_at).getTime();
      return d.pending_change&&Number.isFinite(proposed)&&proposed>=Date.now()?proposed:original;
    };
    const aTime=activeTime(a),bTime=activeTime(b);
    const now=Date.now();
    const aFuture=aTime>=now&&a.status!=='cancelled'&&a.status!=='declined';
    const bFuture=bTime>=now&&b.status!=='cancelled'&&b.status!=='declined';
    if(aFuture!==bFuture)return aFuture?-1:1;
    return aFuture?aTime-bTime:bTime-aTime;
  });
  $('date-form').querySelectorAll('input,select,button').forEach(x=>x.disabled=!paired());
  // Editing is tied to the canonical date, not the currently selected list filter.
  if(state.dateEditId&&!allDates.some(d=>d.id===state.dateEditId&&!d.pending_change&&new Date(d.start_at)>new Date()&&(d.status==='accepted'||(d.status==='proposed'&&d.proposer_id!==me)))){
    state.dateEditId=null;$('date-change-editor').classList.add('hidden');
  }
  if(!paired()){$('dates-list').innerHTML='<div class="card"><p class="muted">Koppel eerst jullie twee accounts om een date te plannen.</p></div>';return;}
  if(!list.length){$('dates-list').innerHTML='<div class="card"><h3>'+(allDates.length?'Geen afspraken in deze weergave':'De agenda is nog leeg')+'</h3><p class="muted">'+(allDates.length?'Kies Alle afspraken om de overige uitnodigingen en plannen te bekijken.':'Begin met een klein plan. De leukste afspraak hoeft niets te kosten.')+'</p></div>';return;}
  $('dates-list').innerHTML=list.map(d=>{
    const own=d.proposer_id===me;
    const upcoming=new Date(d.start_at)>new Date();
    const pending=d.pending_change;
    const pendingFuture=Boolean(pending&&new Date(pending.start_at)>new Date());
    const status=d.status==='accepted'?'<span class="tag active">Geaccepteerd</span>':
      d.status==='declined'?'<span class="tag declined">Afgewezen</span>':
      d.status==='cancelled'?'<span class="tag cancelled">Geannuleerd</span>':
      '<span class="tag pending">Uitnodiging</span>';
    let actions='';
    if((d.status==='proposed'||d.status==='accepted')&&pending){
      const isMine=pending.proposer_id===me;
      const isCounter=d.status==='proposed';
      actions+=`<div class="date-change-notice"><span class="eyebrow">${isCounter?'TEGENVOORSTEL':'VOORGESTELDE WIJZIGING'}</span><h4>${safe(pending.title)}</h4><p class="muted">Nieuw: ${timeFmt.format(new Date(pending.start_at))} · ${Number(pending.duration_minutes)} min</p><p class="muted">De oorspronkelijke afspraak blijft staan tot er akkoord is.</p>`;
      actions+=!pendingFuture?'<p class="muted">Dit wijzigingsvoorstel is verlopen. Maak een nieuw voorstel wanneer dat mogelijk is.</p>':isMine?'<p class="muted">Jouw voorstel wacht op de reactie van je partner.</p>':
        `<div class="buttons"><button class="primary-btn" data-action="change-accept" data-id="${safe(pending.id)}" data-revision="${Number(d.revision)}">${isCounter?'Tegenvoorstel accepteren':'Wijziging accepteren'}</button><button class="ghost-btn" data-action="change-decline" data-id="${safe(pending.id)}" data-revision="${Number(d.revision)}">Afwijzen</button></div>`;
      actions+='</div>';
    }else if(d.status==='proposed'&&!own&&upcoming){
      actions+=`<div class="buttons"><button class="primary-btn" data-action="respond-accept" data-id="${safe(d.id)}" data-revision="${Number(d.revision)}">Accepteren</button><button class="ghost-btn" data-action="respond-decline" data-id="${safe(d.id)}" data-revision="${Number(d.revision)}">Afwijzen</button></div>`;
      actions+=`<button class="secondary-btn date-change-open" data-action="edit-date" data-id="${safe(d.id)}">Ander tijdstip voorstellen</button>`;
    }else if(d.status==='proposed'&&own){
      actions+='<p class="muted">Wachten op reactie van je partner.</p>';
    }else if(d.status==='accepted'&&upcoming){
      actions+=`<button class="secondary-btn date-change-open" data-action="edit-date" data-id="${safe(d.id)}">Wijziging voorstellen</button>`;
    }
    if(upcoming&&(d.status==='accepted'||(d.status==='proposed'&&own))){
      actions+=`<details class="cancel-confirm"><summary>Afspraak annuleren</summary><p class="muted">Deze actie trekt de afspraak in voor jullie allebei. Dit kan niet ongedaan gemaakt worden.</p><button type="button" class="ghost-btn" data-action="date-cancel" data-id="${safe(d.id)}" data-revision="${Number(d.revision)}">Ja, afspraak annuleren</button></details>`;
    }
    const calendarAction=Number.isFinite(new Date(d.start_at).getTime())?`<button type="button" class="ghost-btn" data-action="date-show-calendar" data-id="${safe(d.id)}">Bekijk in kalender</button>`:"";
    return `<article class="card" id="agenda-date-${safe(d.id)}" tabindex="-1">${status}<h3>${safe(d.title)}</h3><p class="meta">${timeFmt.format(new Date(d.start_at))} · ${Number(d.duration_minutes)} min</p>${actions}${calendarAction}</article>`;
  }).join('');
}
function openDateChangeEditor(id){
  const d=(state.dashboard?.dates||[]).find(x=>x.id===id);
  const counter=d?.status==='proposed'&&d.proposer_id!==state.session?.user?.id;
  const reschedule=d?.status==='accepted';
  if(!d||(!counter&&!reschedule)||d.pending_change||new Date(d.start_at)<=new Date()){
    toast('Dit voorstel kan momenteel niet worden aangepast.',true);return;
  }
  state.dateEditId=id;
  state.dateChangeRequestId=null;
  $('date-change-heading').textContent=counter?'Doe een tegenvoorstel':'Wijziging voorstellen';
  $('date-change-title').value=d.title;
  const start=new Date(d.start_at);
  const local=new Date(start.getTime()-start.getTimezoneOffset()*60000).toISOString().slice(0,16);
  $('date-change-when').value=local;
  $('date-change-duration').value=String(d.duration_minutes);
  $('date-change-original').textContent='Bestaand voorstel: '+timeFmt.format(start)+' · '+Number(d.duration_minutes)+' min. Je partner beslist over jouw voorstel.';
  $('date-change-editor').classList.remove('hidden');
  $('date-change-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
async function runAction(action,extra={}){
  if(state.working)return;
  const id=extra.id;
  const operations={
    'mem-share':()=>rpc('us_memory_visibility',{p_memory_id:id,p_visibility:'shared',p_expected_revision:Number(extra.revision)}),
    'mem-private':()=>rpc('us_memory_visibility',{p_memory_id:id,p_visibility:'private',p_expected_revision:Number(extra.revision)}),
    'mem-delete':()=>rpc('us_memory_delete',{p_memory_id:id,p_expected_revision:Number(extra.revision)}),
    'date-cancel':()=>rpc('us_cancel_date',{p_date_id:id,p_expected_revision:Number(extra.revision),p_request_id:crypto.randomUUID()}),
    'change-accept':()=>rpc('us_respond_date_change',{p_change_id:id,p_action:'accept',p_expected_revision:Number(extra.revision),p_request_id:crypto.randomUUID()}),
    'change-decline':()=>rpc('us_respond_date_change',{p_change_id:id,p_action:'decline',p_expected_revision:Number(extra.revision),p_request_id:crypto.randomUUID()}),
    'respond-accept':()=>rpc('us_respond_date',{p_date_id:id,p_action:'accept',p_expected_revision:Number(extra.revision),p_request_id:crypto.randomUUID()}),
    'respond-decline':()=>rpc('us_respond_date',{p_date_id:id,p_action:'decline',p_expected_revision:Number(extra.revision),p_request_id:crypto.randomUUID()}),
    'create-code':async()=>{const v=await rpc('us_create_pair');state.pairCode=v.code;return v;},
  };
  if(!operations[action])return;
  if((action.startsWith('respond-')||action.startsWith('change-')||action==='date-cancel'||action.startsWith('mem-'))&&!validUuid(id))return;
  setBusy(true);
  try{await operations[action]();
    const refreshed=await syncAll({quiet:true});
    const result=action==='create-code'?'Koppelcode gemaakt.':action==='date-cancel'?'Afspraak geannuleerd.':'Wijziging opgeslagen op de server.';
    toast(refreshed?result:result+' Het overzicht wordt later vernieuwd.',!refreshed);
  }catch(e){toast(failText(e),true)}finally{setBusy(false)}
}
let deferredInstallPrompt=null;
function refreshInstallUi(){
  const button=$('pwa-install-button'),status=$('pwa-install-status');
  if(!button||!status)return;
  const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  button.classList.toggle('hidden',installed||!deferredInstallPrompt);
  status.textContent=installed?'US TWO draait al als geïnstalleerde webapp.':deferredInstallPrompt?'Installatie is beschikbaar op dit apparaat.':'Gebruik de installatie-instructies hieronder.';
}
function bind(){
  $('incoming-invite-open')?.addEventListener('click',()=>{
    closeIncomingInvite();setTab('dates');
    const filter=$('date-list-filter');if(filter)filter.value='incoming';
    renderDates();
  });
  $('incoming-invite-later')?.addEventListener('click',closeIncomingInvite);
  $('incoming-invite-overlay')?.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();closeIncomingInvite();return;}
    if(event.key==='Tab'){
      const open=$('incoming-invite-open'),later=$('incoming-invite-later');
      if(event.shiftKey&&document.activeElement===open){event.preventDefault();later.focus();}
      else if(!event.shiftKey&&document.activeElement===later){event.preventDefault();open.focus();}
    }
  });
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();deferredInstallPrompt=event;refreshInstallUi();
  });
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;refreshInstallUi();});
  $('pwa-share-link').addEventListener('click',async()=>{
    const url=new URL('./',location.href).href;
    const status=$('pwa-share-status');
    try{
      if(navigator.share){
        await navigator.share({title:'US TWO',text:'Open US TWO op je eigen telefoon en log in met je gekoppelde account.',url});
        status.textContent='Deelvenster geopend.';
      }else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(url);
        status.textContent='De app-link is gekopieerd. Stuur deze naar je partner.';
      }else{
        status.textContent='Kopieer deze link: '+url;
      }
    }catch(error){
      if(error?.name==='AbortError')return;
      status.textContent='Kopieer deze link: '+url;
    }
  });
  $('pwa-install-button').addEventListener('click',async()=>{
    if(!deferredInstallPrompt)return;
    const prompt=deferredInstallPrompt;deferredInstallPrompt=null;refreshInstallUi();
    try{await prompt.prompt();await prompt.userChoice;}catch(_error){toast('Installatie niet gestart. Gebruik het browsermenu.',true)}
    refreshInstallUi();
  });
  $('login-tab').addEventListener('click',()=>changeMode('login'));
  $('signup-tab').addEventListener('click',()=>changeMode('signup'));
  $('forgot-password').addEventListener('click',()=>showRecovery('request'));
  $('reset-request-cancel').addEventListener('click',()=>{showAuth();changeMode('login');});
  $('reset-request-form').addEventListener('submit',async e=>{
    e.preventDefault();if(state.working)return;
    const email=$('reset-email').value.trim();if(!email)return;
    setBusy(true);$('auth-feedback').textContent='';
    try{
      await request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',body:JSON.stringify({email})});
      $('auth-feedback').classList.remove('error');
      $('auth-feedback').textContent='Als dit e-mailadres bij een account hoort, ontvang je een herstellink. Controleer ook je spam.';
    }catch(err){
      $('auth-feedback').classList.add('error');
      $('auth-feedback').textContent=failText(err);
    }finally{setBusy(false);}
  });
  $('reset-change-form').addEventListener('submit',async e=>{
    e.preventDefault();if(state.working)return;
    const password=$('reset-new-password').value,repeat=$('reset-repeat-password').value;
    if(password.length<8||password!==repeat){
      $('auth-feedback').classList.add('error');
      $('auth-feedback').textContent='Gebruik minstens 8 tekens en vul tweemaal hetzelfde wachtwoord in.';
      return;
    }
    if(!state.session?.access_token){
      showAuth();toast('Herstellink verlopen. Vraag een nieuwe aan.',true);return;
    }
    setBusy(true);
    try{
      if(state.session.expires_at<Date.now()/1000+80)await freshToken();
      await request('/auth/v1/user',{method:'PUT',headers:{Authorization:'Bearer '+state.session.access_token},body:JSON.stringify({password})});
      $('reset-new-password').value='';$('reset-repeat-password').value='';
      try{await request('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+state.session.access_token}})}catch(_e){}
      clearSession();showAuth();changeMode('login');
      $('auth-feedback').classList.remove('error');
      $('auth-feedback').textContent='Wachtwoord gewijzigd. Log nu in met je nieuwe wachtwoord.';
    }catch(err){
      $('auth-feedback').classList.add('error');
      $('auth-feedback').textContent=failText(err);
    }finally{setBusy(false);}
  });
  $('auth-form').addEventListener('submit',async e=>{e.preventDefault();if(state.working)return;setBusy(true);$('auth-feedback').textContent='';try{await authorize($('auth-email').value.trim(),$('auth-password').value,state.mode==='signup')}catch(err){$('auth-feedback').classList.add('error');$('auth-feedback').textContent=failText(err)}finally{setBusy(false)}});
  $('name-form').addEventListener('submit',async e=>{e.preventDefault();const name=$('profile-name').value.trim();if(!name)return;setBusy(true);try{await rpc('us_save_profile',{p_name:name});state.profileName=name;await syncAll({quiet:true});toast('Naam opgeslagen.')}catch(err){toast(failText(err),true)}finally{setBusy(false)}});
  for(const eventName of ['input','change'])$('date-form').addEventListener(eventName,()=>{state.dateRequestId=null;});
  $('date-when').addEventListener('change',()=>{
    const day=$('date-when').value.slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return;
    const parsed=new Date(day+'T12:00:00');
    if(!Number.isFinite(parsed.getTime())||parsed.getFullYear()!==Number(day.slice(0,4))||parsed.getMonth()+1!==Number(day.slice(5,7))||parsed.getDate()!==Number(day.slice(8,10)))return;
    state.calendarSelected=day;state.calendarMonth=day.slice(0,7);renderCalendar();
  });
  $('date-when').addEventListener('input',updateDateConflictWarning);
  $('date-duration').addEventListener('change',updateDateConflictWarning);
  $('date-form').addEventListener('submit',async e=>{e.preventDefault();if(state.working)return;
    const title=$('date-title').value.trim(),raw=$('date-when').value;
    const when=new Date(raw),duration=Number($('date-duration').value);
    if(!title||!raw||!Number.isFinite(+when)||when<=new Date()||!Number.isSafeInteger(duration)||duration<15||duration>1440){toast('Kies een geldige datum in de toekomst en tijdsduur.',true);return;}
    const requestId=state.dateRequestId||(state.dateRequestId=crypto.randomUUID());
    setBusy(true);
    try{
      await rpc('us_propose_date',{p_title:title,p_start_at:when.toISOString(),p_duration_minutes:duration,p_request_id:requestId});
      state.dateRequestId=null;$('date-form').reset();$('date-form-selected').textContent='';updateDateConflictWarning();
      const refreshed=await syncAll({quiet:true});
      toast(refreshed?'Uitnodiging verzonden.':'Uitnodiging verzonden; het agendaoverzicht wordt later vernieuwd.',!refreshed);
    }catch(err){toast(failText(err),true)}finally{setBusy(false)}
  });
  document.addEventListener('submit',async e=>{if(e.target?.id!=='join-form')return;e.preventDefault();const code=$('pair-code').value.toUpperCase().replace(/[\s-]/g,'');if(!/^[A-F0-9]{32}$/.test(code)){toast('Een koppelcode bestaat uit 32 letters en cijfers.',true);return}setBusy(true);try{await rpc('us_join_pair',{p_code:code});await syncAll({quiet:true});toast('Jullie zijn gekoppeld!');setTab('home')}catch(err){toast(failText(err),true)}finally{setBusy(false)}});
  document.addEventListener('click',async e=>{const x=e.target.closest('[data-action]');if(!x)return;const a=x.dataset.action;if(a==='complete-secret-mission'){
    if(!validUuid(x.dataset.id)){toast('Ongeldige missie.',true);return;}
    if(state.working)return;
    setBusy(true);
    try{await rpc('us_complete_date_secret_mission',{p_mission_id:x.dataset.id});await loadMySecretDateMissions();toast('Geheime missie afgerond.');}
    catch(err){toast(failText(err),true)}finally{setBusy(false)}
    return;
  }if(a==='open-pair'){setTab('pair');return}if(a==='open-dates'){setTab('dates');return}if(a==='open-pending-dates'){$('date-list-filter').value='incoming';setTab('dates');renderDates();return}if(a==='open-discover'){setTab('discover');return}if(a==='open-game'){setTab('game');return}if(a==='calendar-open-game'){if(!paired()){toast('Koppel eerst jullie accounts.',true);return;}setTab('game');return;}if(a==='calendar-open-date'){
    const appointment=(state.dashboard?.dates||[]).find(d=>d.id===x.dataset.id);
    if(!appointment)return;
    $('date-list-filter').value='all';renderDates();
    const card=document.getElementById('agenda-date-'+appointment.id);
    if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.focus?.({preventScroll:true});}
    return;
  }if(a==='date-show-calendar'){
    const appointment=(state.dashboard?.dates||[]).find(d=>d.id===x.dataset.id);
    if(!appointment)return;
    const start=new Date(appointment.start_at);
    if(!Number.isFinite(start.getTime()))return;
    const day=amsterdamDay(start);
    state.calendarSelected=day;state.calendarMonth=day.slice(0,7);
    setTab('dates');renderCalendar();
    $('calendar-panel').scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }if(a==='edit-date'){if(validUuid(x.dataset.id))openDateChangeEditor(x.dataset.id);return}if(a==='calendar-prev'){monthStep(-1);return}if(a==='calendar-next'){monthStep(1);return}if(a==='calendar-today'){state.calendarMonth=amsterdamDay(new Date()).slice(0,7);state.calendarSelected=amsterdamDay(new Date());renderCalendar();return}if(a==='calendar-plan-day'){
    if(!paired()){toast('Koppel eerst jullie accounts om een date te plannen.',true);return;}
    const day=state.calendarSelected||amsterdamDay(new Date());
    const now=new Date();const today=amsterdamDay(now);
    if(day<today){toast('Kies een toekomstige dag.',true);return;}
    const field=$('date-when');
    state.dateRequestId=null;
    const minutes=amsterdamClock(now);
    const nextHour=Math.floor(minutes/60)+1;
    const hour=day===today?Math.max(19,nextHour):19;
    if(hour>=24){toast('Voor vandaag is geen toekomstige starttijd meer beschikbaar. Kies morgen.',true);return;}
    const time=String(hour).padStart(2,'0')+':00';
    field.value=day+'T'+time;
    state.calendarSelected=day;
    state.calendarMonth=day.slice(0,7);
    renderCalendar();updateDateConflictWarning();
    $('date-form').scrollIntoView({behavior:'smooth',block:'center'});
    field.focus({preventScroll:true});return;
   }if(a==='calendar-day'){if(/^\d{4}-\d{2}-\d{2}$/.test(x.dataset.day)){state.calendarSelected=x.dataset.day;renderCalendar();}return}if(a==='more-ideas'){ideaOffset+=3;renderDateIdeas();return}if(a==='choose-idea'){const item=DATE_IDEAS[Number(x.dataset.index)];if(!item)return;window.USTwoDateBridge.choose({title:item[0],minutes:item[1],source:'inspiratie'});return}if(a==='copy-code'){try{await navigator.clipboard.writeText(state.pairCode);toast('Koppelcode gekopieerd.')}catch{toast('Selecteer en kopieer de code handmatig.',true)}return}runAction(a,{id:x.dataset.id,revision:x.dataset.revision})});
  $('quest-calendar-export').addEventListener('click',()=>{
    if(!paired()||!state.session?.user?.id){toast('Log eerst in met een gekoppeld account.',true);return;}
    const confirmed=(state.dashboard?.dates||[]).filter(d=>d.status==='accepted')
      .concat(state.questCalendar.filter(d=>d.status==='accepted'&&d.kind==='confirmed'));
    if(!confirmed.length){toast('Er zijn nog geen bevestigde dates om te exporteren.',true);return;}
    if(!window.USTwoCalendarIcs?.calendar){toast('Agenda-export is niet geladen. Ververs de app.',true);return;}
    try{
      const ics=window.USTwoCalendarIcs.calendar(confirmed);
      const blob=new Blob([ics],{type:'text/calendar;charset=utf-8'});
      const href=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=href;link.download='US-TWO-bevestigde-dates.ics';
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(href),3000);
      toast('Agenda-export aangemaakt. Importeer het bestand in je telefoonagenda.');
    }catch(err){toast('Agenda-export mislukt: '+failText(err),true);}
  });
  $('date-change-cancel').addEventListener('click',()=>{state.dateEditId=null;$('date-change-editor').classList.add('hidden')});
  for(const eventName of ['input','change'])$('date-change-form').addEventListener(eventName,()=>{state.dateChangeRequestId=null;});
  $('date-change-form').addEventListener('submit',async e=>{
    e.preventDefault();
    if(state.working||!state.dateEditId)return;
    const d=(state.dashboard?.dates||[]).find(x=>x.id===state.dateEditId);
    if(!d||!(d.status==='accepted'||(d.status==='proposed'&&d.proposer_id!==state.session?.user?.id))||d.pending_change){toast('Ververs de agenda. Deze afspraak is gewijzigd.',true);return}
    const title=$('date-change-title').value.trim(),raw=$('date-change-when').value;
    const start=new Date(raw),duration=Number($('date-change-duration').value);
    if(!title||title.length>120||!raw||!Number.isFinite(start.getTime())||start<=new Date()
      ||!Number.isInteger(duration)||duration<15||duration>1440){
      toast('Kies een toekomstige datum, een titel en een duur tussen 15 en 1440 minuten.',true);return;
    }
    const requestId=state.dateChangeRequestId||(state.dateChangeRequestId=crypto.randomUUID());
    setBusy(true);
    try{
      await rpc(d.status==='proposed'?'us_counter_date':'us_suggest_date_change',{
        p_date_id:d.id,p_title:title,p_start_at:start.toISOString(),
        p_duration_minutes:duration,p_expected_revision:Number(d.revision),
        p_request_id:requestId
      });
      state.dateChangeRequestId=null;state.dateEditId=null;$('date-change-editor').classList.add('hidden');
      await syncAll({quiet:true});
      toast(d.status==='proposed'?'Tegenvoorstel verstuurd. Je partner kan het accepteren.':'Wijziging voorgesteld. De afspraak blijft staan totdat je partner accepteert.');
    }catch(err){toast(failText(err),true)}
    finally{setBusy(false)}
  });
  $('memory-form').addEventListener('submit',async e=>{
    e.preventDefault();
    if(state.working||!paired())return;
    const title=$('memory-title').value.trim(),note=$('memory-note').value;
    const occurred=$('memory-date').value,visibility=$('memory-visibility').value;
    if(!title||title.length>100||note.length>3000||!/^\d{4}-\d{2}-\d{2}$/.test(occurred)||
       occurred<'1900-01-01'||occurred>amsterdamDay(new Date())||!['private','shared'].includes(visibility)){
      toast('Controleer titel, datum en tekst. De datum mag niet in de toekomst liggen.',true);return;
    }
    setBusy(true);
    try{
      await rpc('us_memory_create',{p_title:title,p_note:note,p_happened_on:occurred,p_visibility:visibility,p_request_id:crypto.randomUUID()});
      $('memory-form').reset();
      $('memory-date').value=amsterdamDay(new Date());
      await syncAll({quiet:true});
      toast(visibility==='private'?'Privéherinnering bewaard.':'Herinnering gedeeld met je partner.');
    }catch(err){toast(failText(err),true)}finally{setBusy(false)}
  });
  $('idea-budget').addEventListener('change',()=>{ideaOffset=0;renderDateIdeas()});
  $('idea-place').addEventListener('change',()=>{ideaOffset=0;renderDateIdeas()});
  $('bottom-nav').addEventListener('click',e=>{const x=e.target.closest('[data-tab]');if(x)setTab(x.dataset.tab,x.dataset.gameView)});
  $('quest-open-card-import')?.addEventListener('click',()=>{
    const collection=$('full-deck-details');
    if(!collection)return;
    collection.open=true;
    collection.scrollIntoView({behavior:'smooth',block:'start'});
    const upload=$('full-deck-zip');
    if(upload&&!upload.disabled)upload.focus();
  });
  $('quest-tasks-shortcuts')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-quest-jump]');
    if(!button)return;
    const target=$(button.dataset.questJump);
    if(!target)return;
    if(target.tagName==='DETAILS')target.open=true;
    if(target.hidden){
      const status=$('quest-question-status')?.textContent||'';
      toast(status||'Dit onderdeel is beschikbaar zodra de spelstand het toestaat.');
      return;
    }
    target.scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('date-list-filter').addEventListener('change',renderDates);
  $('refresh-btn').addEventListener('click',()=>syncAll());
  $('logout-btn').addEventListener('click',async()=>{if(state.session){try{await request('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+state.session.access_token}})}catch{}}clearSession();showAuth();toast('Uitgelogd.')});
  $('update-check').addEventListener('click',async()=>{try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.getRegistration();await reg?.update();toast('Je hebt de nieuwste versie, of de update wordt klaargezet.')}else toast('Open de website opnieuw voor de nieuwste versie.')}catch{toast('Updatecontrole niet gelukt.',true)}});
  $('apply-update').addEventListener('click',()=>waitingWorker?.postMessage({type:'SKIP_WAITING'}));
  window.addEventListener('online',()=>{connection(true);syncAll({quiet:true})});window.addEventListener('offline',()=>connection(false));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.session)syncAll({quiet:true})});
  setInterval(()=>{if(state.session&&!document.hidden&&!state.working)syncAll({quiet:true})},CONFIG.refreshMs);
  setInterval(()=>{if(!document.hidden)connection(state.online)},30000);
}
function changeMode(mode){state.mode=mode;const signup=mode==='signup';$('login-tab').classList.toggle('selected',!signup);$('signup-tab').classList.toggle('selected',signup);$('auth-submit').textContent=signup?'Account aanmaken':'Inloggen';$('auth-password').autocomplete=signup?'new-password':'current-password';$('auth-feedback').textContent='';$('auth-feedback').classList.remove('error')}
async function boot(){
  bind();renderDateIdeas();$('memory-date').value=amsterdamDay(new Date());$('memory-date').max=amsterdamDay(new Date());$('app-version').textContent=CONFIG.version;connection(navigator.onLine);refreshInstallUi();
  try{
    const params=new URLSearchParams(location.hash.slice(1));
    const isCallback=params.has('access_token')||params.has('error')||params.has('error_code');
    if(isCallback){
      // Tokens never belong in browser history or copied links.
      history.replaceState(null,'',location.pathname+location.search);
      if(params.has('error')||params.has('error_code')){
        showAuth();$('auth-feedback').classList.add('error');
        $('auth-feedback').textContent='Bevestiging mislukt: '+(params.get('error_description')||params.get('error')||'onbekende fout');
      }else if(params.get('access_token')&&params.get('refresh_token')){
        saveSession({
          access_token:params.get('access_token'),
          refresh_token:params.get('refresh_token'),
          expires_in:Number(params.get('expires_in'))||3600,
        });
        try{
          const user=await request('/auth/v1/user',{headers:{Authorization:'Bearer '+state.session.access_token}});
          state.session.user=user;
          localStorage.setItem(STORAGE_KEY,JSON.stringify(state.session));
  window.dispatchEvent(new Event('us-two-session-updated'));
        }catch(_error){ /* Login session stays valid; normal sync will report errors. */ }
        if(params.get('type')==='recovery'){
          showRecovery('change');
          toast('Herstellink geopend. Kies een nieuw wachtwoord.');
        }else{
          await showApp();
          toast('E-mailadres bevestigd. Je bent ingelogd.');
        }
      }else{showAuth();}
    }else{
      const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(stored?.access_token&&stored?.refresh_token){
        state.session=stored;
        if(stored.expires_at<Date.now()/1000+80)await freshToken();
        await showApp();
      }else showAuth();
    }
  }catch(e){if(state.session){clearSession();showAuth()}toast(failText(e),true)}
  if('serviceWorker'in navigator&&location.protocol==='https:') {
    navigator.serviceWorker.register('./service-worker.js').then(reg=>{
      const update=worker=>{waitingWorker=worker;$('update-bar').classList.remove('hidden')};
      if(reg.waiting&&navigator.serviceWorker.controller)update(reg.waiting);
      reg.addEventListener('updatefound',()=>{const next=reg.installing;next?.addEventListener('statechange',()=>{if(next.state==='installed'&&navigator.serviceWorker.controller)update(next)})});
      let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload()}});
    }).catch(()=>{});
  }
}
/* Staging-only bridge: the pilot reuses the existing token-refreshing RPC client.
 * Never copy access tokens into offline storage or expose them to the pilot. */
window.USTwoQuestPilotBridge = Object.freeze({
  identity: () => ({
    userId: state.session?.user?.id || '',
    coupleId: state.dashboard?.couple_id || '',
    paired: paired()
  }),
  read: () => rpc('us_quest_state'),
  readSuper: () => rpc('us_quest_super_state'),
  catalog: async (world, mode) => {
    if(!Number.isInteger(world)||world<0||world>5||!['afstand','samen'].includes(mode))
      throw Error('Ongeldige catalogusselectie.');
    if(!paired())throw Error('Koppel eerst jullie accounts.');
    if(!state.session)throw Error('Log eerst in.');
    const generation=authGeneration;
    const userId=state.session.user?.id;
    const coupleId=state.dashboard?.couple_id;
    const current=()=>generation===authGeneration&&state.session?.user?.id===userId&&
      state.dashboard?.couple_id===coupleId&&paired();
    if(state.session.expires_at<Date.now()/1000+80)await freshToken();
    if(!current())throw Error('Inlogsessie of koppeling is gewijzigd.');
    const type=mode==='afstand'?'remote':'together';
    const query='/rest/v1/us_quest_catalog?select=id,title,category,minutes,reward_steps,brief,remote,together,world,estimated_cost_eur&world=eq.'+world+'&category=neq.Flirt&'+type+'=eq.true&order=id.asc&limit=50';
    let lastCatalogToken='';
    const call=async()=>{
      if(!current())throw Error('Inlogsessie of koppeling is gewijzigd.');
      const token=state.session.access_token;
      lastCatalogToken=token;
      try{
        const data=await request(query,{headers:{Authorization:'Bearer '+token}});
        if(!current())throw Error('Inlogsessie of koppeling is gewijzigd.');
        return data;
      }catch(error){
        if(!current())throw Error('Inlogsessie of koppeling is gewijzigd.');
        throw error;
      }
    };
    try{return await call();}
    catch(e){
      if(e.status!==401||!current())throw e;
      if(state.session.access_token===lastCatalogToken)await freshToken();
      return call();
    }
  },
  call: async (name, args) => {
    try { return {data:await rpc(name,args),error:null}; }
    catch(e) { return {data:null,error:{code:String(e?.code??e?.status??''),message:String(e?.message||e)}}; }
  }
});
boot();
