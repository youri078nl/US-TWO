const CONFIG = Object.freeze({
  version: '0.4.0',
  url: 'https://vuigivzwkxelsisbjjlk.supabase.co',
  publishableKey: 'sb_publishable_BVJP4ggWOXgt8SXVTXof8Q_yGcoqmX7',
  refreshMs: 20000,
});
const $ = (id) => document.getElementById(id);
const state = { session: null, dashboard: null, board: null, mode: 'login', tab: 'home', working: false, pairCode: '', profileName: '', online: true };
const STORAGE_KEY = 'us-two-web-session-v1';
const safe = (text) => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUuid = v => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(String(v));
const timeFmt = new Intl.DateTimeFormat('nl-NL',{dateStyle:'medium',timeStyle:'short'});
let refreshPending = null; let pollBusy = false; let toastTimer = 0; let waitingWorker = null;

function toast(message, error=false) {
  const e=$('toast');e.textContent=message;e.classList.toggle('error',error);e.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('visible'),5000);
}
function connection(ok) {
  state.online=ok;$('connection-status').textContent=ok?'Online':'Geen verbinding';$('connection-status').classList.toggle('online',ok);
}
function setBusy(v) { state.working=v; document.querySelectorAll('button[type=submit], button[data-action]').forEach(x=>x.disabled=v); }
function failText(error) {
  const msg=String(error?.message||error||'Er ging iets mis.');
  const known={ invalid_login_credentials:'E-mailadres of wachtwoord klopt niet.',email_not_confirmed:'Bevestig eerst je e-mailadres via de ontvangen e-mail.',user_already_exists:'Dit e-mailadres is al geregistreerd.',invalid_or_expired_pair_code:'De koppelcode is onjuist of verlopen. Laat een nieuwe maken.',profile_required:'Sla eerst je schermnaam op.',already_in_pair:'Je account is al gekoppeld.',pair_not_ready:'Koppel eerst jullie twee accounts.',pair_full:'Dit koppel heeft al twee leden.',round_already_active:'Er staat al een opdracht open.',preparation_time_remaining:'De voorbereidingstijd is nog niet voorbij.',both_players_must_be_ready:'Jullie moeten allebei klaar zijn.',revision_conflict:'De uitnodiging is gewijzigd. Ververs eerst de gegevens.',cannot_respond_to_own_date:'Je kunt je eigen uitnodiging niet beantwoorden.',network_error:'Geen verbinding. Probeer opnieuw als je internet hebt.'};
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
  state.session={access_token:obj.access_token,refresh_token:obj.refresh_token,expires_at:Math.floor(Date.now()/1000)+(Number(obj.expires_in)||3600),user:obj.user||state.session?.user||null};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state.session));
}
function clearSession(){state.session=null;state.dashboard=null;state.board=null;state.pairCode='';localStorage.removeItem(STORAGE_KEY)}
async function freshToken() {
  if(!state.session?.refresh_token)throw new Error('Log opnieuw in.');
  if(refreshPending)return refreshPending;
  refreshPending=(async()=>{
    try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:state.session.refresh_token})});saveSession(data);return data.access_token}
    catch(e){if(e.status===400||e.status===401){clearSession();showAuth()}throw e}
    finally{refreshPending=null}
  })();return refreshPending;
}
async function rpc(name,body={},retry=true) {
  if(!state.session)throw new Error('Log eerst in.');
  if(state.session.expires_at < Date.now()/1000+80)await freshToken();
  try{return await request('/rest/v1/rpc/'+name,{method:'POST',headers:{Authorization:'Bearer '+state.session.access_token},body:JSON.stringify(body)})}
  catch(e){if(retry&&e.status===401){await freshToken();return rpc(name,body,false)}throw e}
}
async function authorize(email,password,signUp){
  const url=signUp?'/auth/v1/signup':'/auth/v1/token?grant_type=password';
  const data=await request(url,{method:'POST',body:JSON.stringify({email,password})});
  if(!data?.access_token){$('auth-feedback').classList.remove('error');$('auth-feedback').textContent='Account aangemaakt. Controleer je e-mail voor de bevestigingslink en log daarna in.';return}
  saveSession(data);$('auth-password').value='';await showApp();
}
function showAuth() {
  $('auth-view').classList.remove('hidden');$('app-view').classList.add('hidden');$('bottom-nav').classList.add('hidden');$('refresh-btn').classList.add('hidden');
}
async function showApp(){
  $('auth-view').classList.add('hidden');$('app-view').classList.remove('hidden');$('bottom-nav').classList.remove('hidden');$('refresh-btn').classList.remove('hidden');
  $('date-today').textContent=new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  setTab('home');await syncAll();
}
function setTab(tab){
  if(!['home','pair','dates','game','more'].includes(tab))return;
  state.tab=tab;document.querySelectorAll('.tab-panel').forEach(x=>x.classList.add('hidden'));
  $(tab+'-panel').classList.remove('hidden');document.querySelectorAll('[data-tab]').forEach(x=>{x.classList.toggle('active',x.dataset.tab===tab);x.setAttribute('aria-current',x.dataset.tab===tab?'page':'false')});
  window.scrollTo({top:0,behavior:'instant'});
}
async function syncAll({quiet=false}={}) {
  if(!state.session||pollBusy)return;pollBusy=true;
  try{
    const [d,b]=await Promise.all([rpc('us_dashboard'),rpc('us_board_state')]);
    state.dashboard=d;state.board=b;
    renderAll();if(!quiet)connection(true);
  }catch(e){if(!quiet)toast(failText(e),true)}finally{pollBusy=false}
}
function renderAll(){renderPair();renderDates();renderBoard();renderHome()}
function paired(){return Boolean(state.dashboard?.couple_id)&&(state.dashboard?.members||[]).length===2}
function renderHome(){
  const d=state.dashboard||{};const m=d.members||[];const list=d.dates||[];const b=state.board||{};
  $('couple-banner').innerHTML=paired()?'<span class="dot"></span><span>Jullie zijn gekoppeld 💞</span>':`<span class="dot"></span><span>${m.length?'Wachten op jouw partner':'Koppel jullie accounts om te starten'}</span>`;
  $('welcome-note').textContent=paired()?'Een kleine verrassing kan een gewone dag bijzonder maken.':'Twee accounts, één avontuur. Nodig je partner uit om te beginnen.';
  const next=[...list].filter(x=>x.status!=='declined'&&new Date(x.start_at).getTime()>=Date.now()).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at))[0];
  let cards='';
  if(!paired()){cards+=`<div class="card"><span class="eyebrow">EERSTE STAP</span><h3>Verbind jullie accounts</h3><p class="muted">Gebruik een koppelcode zodat jullie samen kunnen plannen en spelen.</p><button class="secondary-btn" data-action="open-pair">Naar koppelen</button></div>`}
  else {cards+=`<div class="card"><span class="eyebrow">VOLGENDE DATE</span><h3>${next?safe(next.title):'Tijd voor een nieuwe afspraak?'}</h3><p class="muted">${next?timeFmt.format(new Date(next.start_at)):'Plan iets leuks, ook als het maar een halfuurtje is.'}</p><button class="secondary-btn" data-action="open-dates">Bekijk agenda</button></div>`;
    cards+=`<div class="card"><span class="eyebrow">HET SPEELBORD</span><h3>Vakje ${Number(b.position)||1}</h3><p class="muted">${b.round?'Jullie hebben een opdracht openstaan.':'Jullie volgende avontuur ligt klaar.'}</p><button class="secondary-btn" data-action="open-game">Open het spel</button></div>`}
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
function renderDates(){
  const list=state.dashboard?.dates||[];
  $('date-form').querySelectorAll('input,select,button').forEach(x=>x.disabled=!paired());
  if(!paired()){$('dates-list').innerHTML='<div class="card"><p class="muted">Koppel eerst jullie twee accounts om een date te plannen.</p></div>';return}
  if(!list.length){$('dates-list').innerHTML='<div class="card"><h3>De agenda is nog leeg</h3><p class="muted">Begin met een klein plan. De leukste afspraak hoeft niets te kosten.</p></div>';return}
  $('dates-list').innerHTML=list.map(d=>{
    const own=d.proposer_id===state.session?.user?.id;
    const status=d.status==='accepted'?'<span class="tag active">Geaccepteerd</span>':d.status==='declined'?'<span class="tag declined">Afgewezen</span>':'<span class="tag pending">Voorstel</span>';
    const actions=d.status==='proposed'&&!own?`<div class="buttons"><button class="primary-btn" data-action="respond-accept" data-id="${safe(d.id)}" data-revision="${Number(d.revision)}">Accepteren</button><button class="ghost-btn" data-action="respond-decline" data-id="${safe(d.id)}" data-revision="${Number(d.revision)}">Afwijzen</button></div>`:d.status==='proposed'?'<p class="muted">Wacht op de reactie van je partner.</p>':'';
    return `<article class="card">${status}<h3>${safe(d.title)}</h3><p class="meta">${timeFmt.format(new Date(d.start_at))} · ${Number(d.duration_minutes)} min</p>${actions}</article>`
  }).join('');
}
function renderBoard(){
  const b=state.board||{};const n=Number(b.position)||1;const round=b.round;
  $('board-position').textContent=String(n);$('board-chapter').textContent='HOOFDSTUK '+(Number(b.chapter)||1);
  const range=Array.from({length:9},(_,i)=>Math.max(1,n-3)+i);$('board-trail').innerHTML=range.map(v=>`<span class="trail-tile ${v===n?'current':''} ${v%20===0?'super':''}" title="Vakje ${v}${v%20===0?' · superopdracht':''}">${v%20===0?'✦':v}</span>`).join('');
  $('board-next-note').textContent='Elke 20e stap wacht een speciale gezamenlijke uitdaging. Volgende: vakje '+(b.next_super_cell||20);
  if(!paired()){$('round-detail').innerHTML='<h3>Nog even wachten</h3><p class="muted">Het speelbord start zodra jullie twee accounts gekoppeld zijn.</p>';return}
  if(!round){$('round-detail').innerHTML='<h3>Klaar voor een nieuwe opdracht?</h3><p class="muted">Iedereen krijgt een eigen geheime voorbereiding. De gezamenlijke finale komt pas later tevoorschijn.</p><label for="prep-days">Voorbereidingstijd</label><select id="prep-days"><option value="1">1 dag</option><option value="2">2 dagen</option><option value="3" selected>3 dagen</option><option value="4">4 dagen</option><option value="5">5 dagen</option><option value="7">7 dagen</option></select><p class="muted">Bij superopdrachten is minimaal 3 dagen voorbereiding vereist.</p><button class="primary-btn" data-action="board-begin">Begin de volgende opdracht</button>';return}
  const isPrep=round.status==='preparing',isActive=round.status==='active';let html=`<span class="tag ${round.is_super?'pending':'active'}">${round.is_super?'✦ Superopdracht':'Vakje '+Number(round.cell)}</span><h3>${safe(round.title)}</h3>`;
  if(isPrep){html+=`<p class="muted">Geheime voorbereiding tot <strong class="countdown">${timeFmt.format(new Date(round.prep_until))}</strong>.</p><div class="task-box"><span class="eyebrow">ALLEEN VOOR JOU</span><p>${safe(round.my_assignment)}</p></div><p class="muted">${round.partner_ready?'Je partner is klaar.':'Je partner is nog aan het voorbereiden.'}</p>`;
    html+=`<div class="buttons">${!round.my_ready?'<button class="primary-btn" data-action="board-ready">Ik ben voorbereid</button>':'<span class="tag active">Jij bent klaar ✓</span>'}${round.can_confirm_start&&!round.my_start_confirmed?'<button class="primary-btn" data-action="board-confirm">Ik wil starten</button>':''}</div>`;
    if(round.my_start_confirmed)html+='<p class="muted">Je hebt starten bevestigd. Wachten op je partner.</p>';
  } else if(isActive){html+=`<div class="task-box"><span class="eyebrow">DE GEZAMENLIJKE FINALE</span><p>${safe(round.shared_challenge)}</p></div>`;
    if(round.my_completed)html+='<span class="tag active">Jij hebt de opdracht afgerond ✓</span>';
    else html+='<button class="primary-btn" data-action="board-complete">Ik heb hem afgerond</button>';
    if(round.partner_completed)html+='<p class="muted">Je partner heeft bevestigd dat de opdracht klaar is.</p>';
  }
  if((isPrep||isActive)&&!round.my_skip_requested)html+='<button class="ghost-btn" data-action="board-skip">Samen overslaan (verzoek)</button>';
  else if(round.my_skip_requested)html+='<p class="muted">Jij hebt overslaan gevraagd. Je partner moet dit ook bevestigen.</p>';
  $('round-detail').innerHTML=html;
}
async function runAction(action,extra={}){
  if(state.working)return;
  const b=state.board?.round;
  const id=extra.id;const uid=state.session?.user?.id;
  const operations={
    'board-begin':()=>rpc('us_board_begin',{p_prep_days:Number($('prep-days')?.value)||3,p_request_id:crypto.randomUUID()}),
    'board-ready':()=>rpc('us_board_ready',{p_round_id:b.id}),
    'board-confirm':()=>rpc('us_board_confirm_start',{p_round_id:b.id}),
    'board-complete':()=>rpc('us_board_complete',{p_round_id:b.id}),
    'board-skip':()=>rpc('us_board_skip',{p_round_id:b.id}),
    'respond-accept':()=>rpc('us_respond_date',{p_date_id:id,p_action:'accept',p_expected_revision:Number(extra.revision),p_request_id:crypto.randomUUID()}),
    'respond-decline':()=>rpc('us_respond_date',{p_date_id:id,p_action:'decline',p_expected_revision:Number(extra.revision),p_request_id:crypto.randomUUID()}),
    'create-code':async()=>{const v=await rpc('us_create_pair');state.pairCode=v.code;return v;},
  };
  if(!operations[action])return;
  if((action.startsWith('board-')&&!b&&action!=='board-begin')||(action.startsWith('respond-')&&!validUuid(id)))return;
  setBusy(true);
  try{await operations[action]();await syncAll({quiet:true});toast(action==='create-code'?'Koppelcode gemaakt.':'Opgeslagen en gesynchroniseerd.');}
  catch(e){toast(failText(e),true)}finally{setBusy(false)}
}
function bind(){
  $('login-tab').addEventListener('click',()=>changeMode('login'));
  $('signup-tab').addEventListener('click',()=>changeMode('signup'));
  $('auth-form').addEventListener('submit',async e=>{e.preventDefault();if(state.working)return;setBusy(true);$('auth-feedback').textContent='';try{await authorize($('auth-email').value.trim(),$('auth-password').value,state.mode==='signup')}catch(err){$('auth-feedback').classList.add('error');$('auth-feedback').textContent=failText(err)}finally{setBusy(false)}});
  $('name-form').addEventListener('submit',async e=>{e.preventDefault();const name=$('profile-name').value.trim();if(!name)return;setBusy(true);try{await rpc('us_save_profile',{p_name:name});state.profileName=name;await syncAll({quiet:true});toast('Naam opgeslagen.')}catch(err){toast(failText(err),true)}finally{setBusy(false)}});
  $('date-form').addEventListener('submit',async e=>{e.preventDefault();const title=$('date-title').value.trim(),raw=$('date-when').value;const when=new Date(raw);if(!title||!raw||!Number.isFinite(+when)||when<=new Date()){toast('Kies een datum in de toekomst.',true);return}setBusy(true);try{await rpc('us_propose_date',{p_title:title,p_start_at:when.toISOString(),p_duration_minutes:Number($('date-duration').value),p_request_id:crypto.randomUUID()});$('date-form').reset();await syncAll({quiet:true});toast('Uitnodiging verzonden.')}catch(err){toast(failText(err),true)}finally{setBusy(false)}});
  document.addEventListener('submit',async e=>{if(e.target?.id!=='join-form')return;e.preventDefault();const code=$('pair-code').value.toUpperCase().replace(/[\s-]/g,'');if(!/^[A-F0-9]{32}$/.test(code)){toast('Een koppelcode bestaat uit 32 letters en cijfers.',true);return}setBusy(true);try{await rpc('us_join_pair',{p_code:code});await syncAll({quiet:true});toast('Jullie zijn gekoppeld!');setTab('home')}catch(err){toast(failText(err),true)}finally{setBusy(false)}});
  document.addEventListener('click',async e=>{const x=e.target.closest('[data-action]');if(!x)return;const a=x.dataset.action;if(a==='open-pair'){setTab('pair');return}if(a==='open-dates'){setTab('dates');return}if(a==='open-game'){setTab('game');return}if(a==='copy-code'){try{await navigator.clipboard.writeText(state.pairCode);toast('Koppelcode gekopieerd.')}catch{toast('Selecteer en kopieer de code handmatig.',true)}return}runAction(a,{id:x.dataset.id,revision:x.dataset.revision})});
  $('bottom-nav').addEventListener('click',e=>{const x=e.target.closest('[data-tab]');if(x)setTab(x.dataset.tab)});
  $('refresh-btn').addEventListener('click',()=>syncAll());
  $('logout-btn').addEventListener('click',async()=>{if(state.session){try{await request('/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+state.session.access_token}})}catch{}}clearSession();showAuth();toast('Uitgelogd.')});
  $('update-check').addEventListener('click',async()=>{try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.getRegistration();await reg?.update();toast('Je hebt de nieuwste versie, of de update wordt klaargezet.')}else toast('Open de website opnieuw voor de nieuwste versie.')}catch{toast('Updatecontrole niet gelukt.',true)}});
  $('apply-update').addEventListener('click',()=>waitingWorker?.postMessage({type:'SKIP_WAITING'}));
  window.addEventListener('online',()=>{connection(true);syncAll({quiet:true})});window.addEventListener('offline',()=>connection(false));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.session)syncAll({quiet:true})});
  setInterval(()=>{if(state.session&&!document.hidden&&!state.working)syncAll({quiet:true})},CONFIG.refreshMs);
}
function changeMode(mode){state.mode=mode;const signup=mode==='signup';$('login-tab').classList.toggle('selected',!signup);$('signup-tab').classList.toggle('selected',signup);$('auth-submit').textContent=signup?'Account aanmaken':'Inloggen';$('auth-password').autocomplete=signup?'new-password':'current-password';$('auth-feedback').textContent='';$('auth-feedback').classList.remove('error')}
async function boot(){
  bind();$('app-version').textContent=CONFIG.version;connection(navigator.onLine);
  try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(stored?.access_token&&stored?.refresh_token){state.session=stored;if(stored.expires_at<Date.now()/1000+80)await freshToken();await showApp()}else showAuth()}
  catch(e){if(state.session){clearSession();showAuth()}toast(failText(e),true)}
  if('serviceWorker'in navigator&&location.protocol==='https:') {
    navigator.serviceWorker.register('./service-worker.js').then(reg=>{
      const update=worker=>{waitingWorker=worker;$('update-bar').classList.remove('hidden')};
      if(reg.waiting&&navigator.serviceWorker.controller)update(reg.waiting);
      reg.addEventListener('updatefound',()=>{const next=reg.installing;next?.addEventListener('statechange',()=>{if(next.state==='installed'&&navigator.serviceWorker.controller)update(next)})});
      let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload()}});
    }).catch(()=>{});
  }
}
boot();
