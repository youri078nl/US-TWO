/* Staging-only read and start pilot for the new canonical quest server.
 * It deliberately does NOT replace the currently approved legacy board. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let queue=null, queueFor='', loading=false, latest=null;
  const TASK_ACTIONS=['accept','reject','cancel','complete','skip'];
  const SUPER_ACTIONS=['ready','reveal','done','skip'];
  let currentSuper=null;
  let catalogChoices=[];let catalogWorld=null;let catalogMode=null;let catalogBudget=null;
  const text=(id,value)=>{const el=$(id);if(el)el.textContent=String(value);};
  function identity() {
    const b=window.USTwoQuestPilotBridge;
    if(!b)throw Error('De bestaande app is nog niet geladen.');
    const v=b.identity();
    if(!v?.paired||!v.userId||!v.coupleId)throw Error('Log in met een gekoppeld account.');
    return v;
  }
  async function ensureQueue() {
    const who=identity(), key=JSON.stringify([who.userId,who.coupleId]);
    if(queue && queueFor===key)return queue;
    // Prevent previously loaded private preparation from appearing under another account.
    currentSuper=null;
    text('quest-pilot-super-prep','Alleen jouw voorbereiding wordt hier weergegeven.');
    text('quest-pilot-super-finale','De finale is nog niet opgehaald.');
    if(queue){await queue.close();queue=null;queueFor='';}
    if(!window.USTwoOffline)throw Error('Offline-module niet geladen.');
    queue=window.USTwoOffline.createBrowserQueue({
      supabase:{rpc:(name,args)=>window.USTwoQuestPilotBridge.call(name,args)},
      userId:who.userId,coupleId:who.coupleId,
      locks:navigator.locks,indexedDBFactory:indexedDB
    });
    queueFor=key;
    return queue;
  }
  function status(state, items, blocked) {
    if(!state?.paired){text('quest-pilot-status','Nog niet gekoppeld.');return;}
    const phase=state.initialized?(state.phase||'onbekend'):'nog niet gestart';
    const tile=Number.isSafeInteger(Number(state.position))?state.position:'?';
    text('quest-pilot-status',`Nieuwe serverreis: vak ${tile}; status: ${phase}; revisie: ${state.revision??0}.`);
    text('quest-pilot-pending',`Wachtende acties: ${items.length}${blocked?' · geblokkeerd: '+blocked:''}`);
    $('quest-pilot-start').disabled=Boolean(state.initialized)||items.length>0||Boolean(blocked);
    $('quest-pilot-sync').disabled=items.length===0||Boolean(blocked);
    const conflict=blocked==='revision_conflict';
    text('quest-pilot-conflict', conflict
      ? 'Serverstand gewijzigd terwijl jouw actie onderweg was. Controleer de nieuwe spelstand voordat je een vastgelopen actie annuleert.'
      : blocked ? 'Synchronisatie is geblokkeerd: '+blocked+'. Annuleren is niet toegestaan zonder veilige controle.'
        : 'Geen synchronisatieconflict vastgesteld.');
    $('quest-pilot-resolve').disabled=!conflict||items.length!==1||items[0]?.type!=='quest_action';
    const canChoose=state.initialized&&state.phase==='choose'&&state.turn_user===window.USTwoQuestPilotBridge?.identity()?.userId&&!items.length&&!blocked;
    $('quest-pilot-load-catalog').disabled=!canChoose;
    for(let i=0;i<3;i++)$('quest-pilot-option-'+i).disabled=!canChoose||!catalogChoices[i]||state.world_index!==catalogWorld||$('quest-pilot-mode').value!==catalogMode||$('quest-pilot-budget').value!==catalogBudget;
    const who=window.USTwoQuestPilotBridge?.identity();
    const active=Boolean(state.initialized)&&items.length===0&&!blocked;
    const partnerProposal=active&&state.phase==='approval'&&state.proposer_id!==who?.userId;
    const ownProposal=active&&state.phase==='approval'&&state.proposer_id===who?.userId;
    const activeTask=active&&state.phase==='active';
    $('quest-pilot-accept').disabled=!partnerProposal;
    $('quest-pilot-reject').disabled=!partnerProposal;
    $('quest-pilot-cancel').disabled=!ownProposal;
    $('quest-pilot-complete').disabled=!activeTask||Boolean(state.my_done)||Boolean(state.my_skip)||Boolean(state.partner_skip);
    $('quest-pilot-skip').disabled=!activeTask||Boolean(state.my_skip);
    const d=state.date;
    text('quest-pilot-task',d&&typeof d.title==='string'
      ? 'Opdracht: '+d.title+' · '+(state.mode==='afstand'?'op afstand':'samen')
        +' · '+Number(d.steps||0)+' stappen · '+(state.phase||'')
      : 'Geen actieve opdracht in de nieuwe serverreis.');
    const instructions=d?(state.mode==='afstand'?d.remoteText:d.togetherText):null;
    text('quest-pilot-instructions',d
      ? String(typeof instructions==='string'&&instructions.trim()?instructions:
          typeof d.brief==='string'&&d.brief.trim()?d.brief:
          'Voor deze opdracht zijn nog geen inhoudelijke instructies uitgewerkt.')
      : 'Kies een opdracht om de uitleg te zien.');
  }
  function showSuper(all, pending, blocked) {
    const items=Array.isArray(all)?all:[];
    currentSuper=items.find(x=>x&&(x.status==='preparing'||x.status==='revealed'))||items[0]||null;
    const v=currentSuper;
    for(const a of SUPER_ACTIONS)$('quest-pilot-super-'+a).disabled=true;
    if(!v) {
      text('quest-pilot-super-status','Nog geen superdate ontgrendeld.');
      text('quest-pilot-super-prep','Alleen jouw voorbereiding wordt hier weergegeven.');
      text('quest-pilot-super-finale','De finale blijft verborgen totdat beide spelers akkoord geven.');
      text('quest-pilot-super-consent','Nog geen superdate om toestemming voor te geven.');
      text('quest-pilot-super-timing','De voorbereidingstijd verschijnt zodra een superdate is ontgrendeld.');
      return;
    }
    text('quest-pilot-super-status','Vak '+v.cell+' · '+String(v.title||'Superdate')+
      ' · status '+String(v.status)+' · revisie '+v.revision+
      ' · voorbereiding tot '+String(v.prep_until||'onbekend')+
      ' · jij klaar: '+(v.my_ready?'ja':'nee')+' · partner klaar: '+(v.partner_ready?'ja':'nee'));
    const consentCount=Number(Boolean(v.my_reveal))+Number(Boolean(v.partner_reveal));
    const readyCount=Number(Boolean(v.my_ready))+Number(Boolean(v.partner_ready));
    const doneCount=Number(Boolean(v.my_done))+Number(Boolean(v.partner_done));
    text('quest-pilot-super-consent',
      'Voorbereiding: '+readyCount+'/2 klaar · toestemming finale: '+consentCount+
      '/2 · voltooiing: '+doneCount+'/2'+
      (v.my_reveal&&v.status==='preparing'?' · jouw toestemming is opgeslagen, wacht op je partner':''));
    const deadline=typeof v.prep_until==='string'?Date.parse(v.prep_until):NaN;
    const remaining=Number.isFinite(deadline)?deadline-Date.now():NaN;
    text('quest-pilot-super-timing',
      v.status==='preparing'
      ? !Number.isFinite(remaining)
        ? 'Voorbereidingstijd niet bevestigd: finale blijft gesloten.'
        : remaining>0
          ? 'Voorbereiding nog '+Math.ceil(remaining/3600000)+' uur. Daarna zijn twee afzonderlijke toestemmingen nodig.'
          : 'De voorbereidingstijd is verstreken. Beide spelers moeten klaar zijn en afzonderlijk toestemming geven.'
      : v.status==='revealed'?'De finale is door beide spelers ontgrendeld.'
      : v.status==='completed'?'Deze superdate is afgerond.'
      : 'Deze superdate is gesloten.');
    // NEVER display prep_a or prep_b. RPC only exposes the authenticated user's my_prep.
    text('quest-pilot-super-prep','Jouw voorbereiding: '+String(v.my_prep||'nog niet beschikbaar'));
    const revealed=v.status==='revealed'||v.status==='completed';
    text('quest-pilot-super-finale',revealed
      ? 'Finale samen: '+String(v.finale_together||'')+' · op afstand: '+String(v.finale_remote||'')
      : 'Finale verborgen tot twee afzonderlijke onthullingsakkoorden.');
    const readyToAct=!pending&&!blocked&&Number.isSafeInteger(v.revision)&&Number.isSafeInteger(v.cell);
    const open=v.status==='preparing'||v.status==='revealed';
    $('quest-pilot-super-ready').disabled=!readyToAct||v.status!=='preparing'||!!v.my_ready||!!v.my_skip||!!v.partner_skip;
    $('quest-pilot-super-reveal').disabled=!readyToAct||!v.can_reveal||!!v.my_reveal||!!v.my_skip||!!v.partner_skip;
    $('quest-pilot-super-done').disabled=!readyToAct||v.status!=='revealed'||!!v.my_done||!!v.my_skip||!!v.partner_skip;
    $('quest-pilot-super-skip').disabled=!readyToAct||!open||!!v.my_skip;
  }
  async function refresh() {
    const q=await ensureQueue();
    const [server,local]=await Promise.all([
      window.USTwoQuestPilotBridge.read(),q.state()
    ]);
    latest=server;
    if(server.world_index!==catalogWorld||server.phase!=='choose') {catalogChoices=[];catalogWorld=null;}
    status(server,local.items,local.blocked);
    try {
      const superdates=await window.USTwoQuestPilotBridge.readSuper();
      showSuper(superdates,local.items.length>0,local.blocked);
    } catch(_error) {
      showSuper([],true,'superdate_read_failed');
      text('quest-pilot-super-status','Superdategegevens tijdelijk niet beschikbaar. Probeer opnieuw.');
    }
  }
  async function operation(fn) {
    if(loading)return;loading=true;
    for(const id of ['quest-pilot-refresh','quest-pilot-start','quest-pilot-sync','quest-pilot-load-catalog',...Array.from({length:3},(_,i)=>'quest-pilot-option-'+i),...TASK_ACTIONS.map(x=>'quest-pilot-'+x),...SUPER_ACTIONS.map(x=>'quest-pilot-super-'+x)])$(id).disabled=true;
    try{await fn();await refresh();text('quest-pilot-message','Verbinding en lokale opslag gecontroleerd.');}
    catch(e){
      showSuper([],true,'read_failed');
      // The server may be offline: show durable local queue state without another network call.
      try{
        const local=await (await ensureQueue()).state();
        text('quest-pilot-pending',`Wachtende acties: ${local.items.length}${local.blocked?' · geblokkeerd: '+local.blocked:''}`);
        $('quest-pilot-sync').disabled=local.items.length===0||Boolean(local.blocked);
        $('quest-pilot-start').disabled=true;
        for(const a of TASK_ACTIONS)$('quest-pilot-'+a).disabled=true;
        for(const a of SUPER_ACTIONS)$('quest-pilot-super-'+a).disabled=true;
      }catch(_storageError){}
      try{
        const state=await (await ensureQueue()).state();
        const conflict=state.blocked==='revision_conflict';
        text('quest-pilot-conflict', conflict
          ? 'Serverstand is veranderd. Haal eerst de actuele stand op om veilig te herstellen.'
          : state.blocked ? 'Blokkade: '+state.blocked+'. Neem geen automatische herstelactie.' : 'Geen synchronisatieconflict vastgesteld.');
        $('quest-pilot-resolve').disabled=!conflict||state.items.length!==1||state.items[0]?.type!=='quest_action';
      }catch(_readError){}
      text('quest-pilot-message',String(e?.message||e));
    }
    finally{loading=false;$('quest-pilot-refresh').disabled=false;}
  }
  function handleSync(result) {
    if(result.status==='blocked')throw Error('De actie is geblokkeerd ('+result.reason+'). Ververs de serverstatus; verwijder geen gegevens zonder herstelcontrole.');
    if(result.status==='retry_later')throw Error('Geen betrouwbare serverbevestiging. De actie blijft veilig in de wachtrij staan.');
    if(result.status==='busy')throw Error('Synchronisatie is al bezig in een ander venster.');
  }
  function clearPrivateScreen() {
    latest=null;currentSuper=null;catalogChoices=[];catalogWorld=null;catalogMode=null;catalogBudget=null;
    text('quest-pilot-status','Log opnieuw in om je gezamenlijke spelstand te bekijken.');
    text('quest-pilot-pending','Wachtende acties worden bewaard per account.');
    text('quest-pilot-task','Geen opdrachtgegevens geladen.');
    text('quest-pilot-instructions','Opdrachtinstructies verborgen.');
    text('quest-pilot-super-status','Geen superdategegevens geladen.');
    text('quest-pilot-super-consent','Toestemmingsstatus verborgen.');
    text('quest-pilot-super-timing','Voorbereidingstijd verborgen.');
    text('quest-pilot-conflict','Geen synchronisatieconflict vastgesteld.');
    text('quest-pilot-super-prep','Geheime voorbereiding verborgen.');
    text('quest-pilot-super-finale','Geheime finale verborgen.');
    for(const id of ['quest-pilot-start','quest-pilot-sync','quest-pilot-resolve','quest-pilot-load-catalog',
      ...Array.from({length:3},(_,i)=>'quest-pilot-option-'+i),
      ...TASK_ACTIONS.map(x=>'quest-pilot-'+x),
      ...SUPER_ACTIONS.map(x=>'quest-pilot-super-'+x)])$(id).disabled=true;
    const old=queue;queue=null;queueFor='';
    if(old)old.close().catch(()=>{});
  }
  function showNetworkStatus() {
    // navigator.onLine is advisory; a successful server response is the real proof.
    const connected=typeof navigator==='undefined'||navigator.onLine!==false;
    text('quest-pilot-network',connected
      ? 'Netwerk beschikbaar volgens toestel. Bij wachtende acties: tik op opnieuw versturen.'
      : 'Offline: acties blijven lokaal bewaard. Herstel internet en tik op opnieuw versturen.');
  }
  function init() {
    if(!$('quest-pilot-refresh'))return;
    showNetworkStatus();
    window.addEventListener?.('online',showNetworkStatus);
    window.addEventListener?.('offline',showNetworkStatus);
    window.addEventListener?.('us-two-session-cleared',clearPrivateScreen);
    $('quest-pilot-budget').addEventListener('change',()=>{
      catalogChoices=[];catalogWorld=null;catalogMode=null;catalogBudget=null;
      for(let i=0;i<3;i++){$('quest-pilot-option-'+i).disabled=true;text('quest-pilot-option-'+i,'Voorstel '+(i+1));}
      if(latest?.initialized&&latest.phase==='choose'&&latest.turn_user===window.USTwoQuestPilotBridge?.identity()?.userId)
        $('quest-pilot-load-catalog').disabled=false;
    });
    $('quest-pilot-mode').addEventListener('change',()=>{
      catalogChoices=[];catalogWorld=null;catalogMode=null;catalogBudget=null;
      for(let i=0;i<3;i++){$('quest-pilot-option-'+i).disabled=true;text('quest-pilot-option-'+i,'Voorstel '+(i+1));}
      if(latest&&latest.initialized&&latest.phase==='choose'&&latest.turn_user===window.USTwoQuestPilotBridge?.identity()?.userId)
        $('quest-pilot-load-catalog').disabled=false;
    });
    $('quest-pilot-load-catalog').addEventListener('click',()=>operation(async()=>{
      identity();
      const fresh=await window.USTwoQuestPilotBridge.read();
      const local=await (await ensureQueue()).state();
      if(!fresh.initialized||fresh.phase!=='choose'||fresh.turn_user!==identity().userId||local.items.length||local.blocked)
        throw Error('Je bent niet aan de beurt of er staat nog een actie open.');
      if(!Number.isInteger(fresh.world_index)||fresh.world_index<0||fresh.world_index>5)throw Error('Ongeldige wereld.');
      const mode=$('quest-pilot-mode').value;
      if(!['samen','afstand'].includes(mode))throw Error('Ongeldige speelvorm.');
      const candidates=await window.USTwoQuestPilotBridge.catalog(fresh.world_index,mode);
      if(!Array.isArray(candidates))throw Error('De opdrachtencatalogus gaf geen lijst terug.');
      if(!window.USTwoQuestCatalog?.chooseOptions)throw Error('Opdrachtfilter niet beschikbaar.');
      const budgetRaw=$('quest-pilot-budget').value;
      const budget=budgetRaw==='max'?'max':Number(budgetRaw);
      catalogChoices=window.USTwoQuestCatalog.chooseOptions(candidates,{
        world:fresh.world_index,mode,position:fresh.position,
        history:fresh.history,limit:3,budget
      });
      catalogWorld=fresh.world_index;catalogMode=mode;catalogBudget=budgetRaw;
      for(let i=0;i<3;i++){
        const c=catalogChoices[i];
        text('quest-pilot-option-'+i,c?c.title+' · '+(c.estimated_cost_eur===0?'gratis':('circa €'+c.estimated_cost_eur))+' · '+Number(c.reward_steps||0)+' stappen · '+Number(c.minutes||0)+' minuten':'Geen voorstel');
        $('quest-pilot-option-'+i).disabled=!c;
      }
      text('quest-pilot-message',catalogChoices.length? 'Kies één van de serveropdrachten. Je partner moet goedkeuren.':'Geen beschikbare opdrachten voor deze speelvorm.');
    }));
    for(let i=0;i<3;i++){
      $('quest-pilot-option-'+i).addEventListener('click',()=>operation(async()=>{
        const c=catalogChoices[i];const mode=$('quest-pilot-mode').value;
        const state=await window.USTwoQuestPilotBridge.read();const q=await ensureQueue();const pending=await q.state();
        if(!c||!state.initialized||state.phase!=='choose'||state.turn_user!==identity().userId||
           state.world_index!==catalogWorld||catalogMode!==mode||catalogBudget!==$('quest-pilot-budget').value||pending.items.length||pending.blocked||
           !Number.isSafeInteger(state.revision))throw Error('Voorstel is verouderd. Laad opnieuw.');
        if(!window.confirm('Opdracht: '+c.title+'\\n'+String(c.brief||'')+'\\n\\nStel deze opdracht voor aan je partner?'))return;
        await q.enqueue({type:'quest_action',requestId:crypto.randomUUID(),expectedRevision:state.revision,
          payload:{action:'propose',dateId:c.id,mode}});
        handleSync(await q.sync());
      }));
    }
    $('quest-pilot-refresh').addEventListener('click',()=>operation(refresh));
    $('quest-pilot-sync').addEventListener('click',()=>operation(async()=>{
      const q=await ensureQueue();handleSync(await q.sync());
    }));
    $('quest-pilot-resolve').addEventListener('click',()=>operation(async()=>{
      const who=identity();
      const q=await ensureQueue();
      const local=await q.state();
      if(local.blocked!=='revision_conflict'||local.items.length!==1||
         local.items[0].type!=='quest_action')
        throw Error('Alleen één geblokkeerde spelactie kan hier veilig geannuleerd worden.');
      const action=local.items[0];
      const server=await window.USTwoQuestPilotBridge.read();
      if(!server?.paired||!server.initialized||!Number.isSafeInteger(server.revision)||
         server.revision<=action.expectedRevision||!who.paired)
        throw Error('De actuele serverstand is niet betrouwbaar gecontroleerd. De actie blijft bewaard.');
      if(!window.confirm('Er staat een geblokkeerde actie ('+String(action.payload.action)+') met revisie '+
        action.expectedRevision+'. De server staat inmiddels op revisie '+server.revision+
        '. Annuleren verwijdert ALLEEN deze lokale actie en maakt geen stappen ongedaan. Eerst controleren op beide telefoons. Verdergaan?'))return;
      const updated=await window.USTwoQuestPilotBridge.read();
      const still=await q.state();
      if(updated.revision!==server.revision||still.blocked!=='revision_conflict'||
        still.items.length!==1||still.items[0].requestId!==action.requestId)
        throw Error('De stand is opnieuw gewijzigd. Annuleren geweigerd; ververs de spelstand.');
      if(!window.confirm('Definitief deze éne lokale actie annuleren? De actie wordt NIET opnieuw verzonden.'))return;
      await q.discardAfterReconciliation(true);
      text('quest-pilot-message','De vastgelopen lokale actie is geannuleerd. De serverstand blijft behouden.');
    }));
    for(const action of TASK_ACTIONS) {
      $('quest-pilot-'+action).addEventListener('click',()=>operation(async()=>{
        const state=await window.USTwoQuestPilotBridge.read();
        const who=identity();
        const q=await ensureQueue();
        const pending=await q.state();
        if(pending.blocked||pending.items.length)throw Error('Los eerst de bewaarde wachtrij op.');
        if(!state.initialized||!Number.isSafeInteger(state.revision))throw Error('Geen geldige serverrevisie.');
        const proposal=state.phase==='approval';
        const active=state.phase==='active';
        const proposer=state.proposer_id===who.userId;
        const valid=(action==='accept'||action==='reject')?proposal&&!proposer
          :action==='cancel'?proposal&&proposer
          :action==='complete'?active&&!state.my_done&&!state.my_skip&&!state.partner_skip
          :action==='skip'?active&&!state.my_skip:false;
        if(!valid)throw Error('Deze actie is niet toegestaan in de huidige spelstatus.');
        const messages={
          accept:'Het voorstel accepteren voor jullie gezamenlijke spel?',
          reject:'Het voorstel afwijzen?',
          cancel:'Je eigen voorstel intrekken?',
          complete:'Bevestig dat jij deze opdracht hebt afgerond. Stappen worden pas toegekend na beide bevestigingen.',
          skip:'Wil je deze opdracht overslaan? Dit levert geen stappen op en vereist ook de bevestiging van je partner.'
        };
        if(!window.confirm(messages[action]))return;
        await q.enqueue({
          type:'quest_action',requestId:crypto.randomUUID(),
          expectedRevision:state.revision,payload:{action}
        });
        handleSync(await q.sync());
      }));
    }
    for(const action of SUPER_ACTIONS) {
      $('quest-pilot-super-'+action).addEventListener('click',()=>operation(async()=>{
        identity();
        const q=await ensureQueue();
        const pending=await q.state();
        if(pending.blocked||pending.items.length)throw Error('Los eerst de bewaarde wachtrij op.');
        // Always re-read canonical server values rather than trust the rendered button.
        const all=await window.USTwoQuestPilotBridge.readSuper();
        const v=Array.isArray(all)?all.find(x=>x&&x.cell===currentSuper?.cell):null;
        if(!v||!Number.isSafeInteger(v.cell)||v.cell<=0||v.cell%20!==0||
           !Number.isSafeInteger(v.revision))throw Error('Ongeldige of verouderde superdate.');
        const open=v.status==='preparing'||v.status==='revealed';
        const allowed=action==='ready'?v.status==='preparing'&&!v.my_ready&&!v.my_skip&&!v.partner_skip
          :action==='reveal'?v.status==='preparing'&&!!v.can_reveal&&!v.my_reveal&&!v.my_skip&&!v.partner_skip
          :action==='done'?v.status==='revealed'&&!v.my_done&&!v.my_skip&&!v.partner_skip
          :action==='skip'?open&&!v.my_skip:false;
        if(!allowed)throw Error('Deze superdateactie is nog niet toegestaan.');
        const message={
          ready:'Bevestig dat jouw eigen voorbereiding klaar is. Die blijft verborgen voor je partner.',
          reveal:'Geef toestemming voor het openen van de gezamenlijke finale? Beide spelers moeten akkoord geven.',
          done:'Bevestig jouw voltooiing van deze superdate. Bonusstappen volgen pas na twee bevestigingen.',
          skip:'Deze superdate samen overslaan? Er worden geen bonusstappen toegekend.'
        };
        if(!window.confirm(message[action]))return;
        await q.enqueue({type:'super_action',requestId:crypto.randomUUID(),
          expectedRevision:v.revision,payload:{cell:v.cell,action}});
        handleSync(await q.sync());
      }));
    }
    $('quest-pilot-start').addEventListener('click',()=>operation(async()=>{
      const q=await ensureQueue();
      const state=await window.USTwoQuestPilotBridge.read();
      if(!state?.paired||state.initialized)throw Error('De nieuwe spelreis is al gestart of jullie zijn nog niet gekoppeld.');
      const local=await q.state();
      if(local.blocked||local.items.length)throw Error('Los eerst de bestaande wachtrij op.');
      if(!window.confirm('Start de nieuwe SERVER-spelreis op vak 0? Dit beïnvloedt de gedeelde nieuwe spelstand.'))return;
      const action={type:'quest_action',requestId:crypto.randomUUID(),expectedRevision:0,payload:{action:'start'}};
      await q.enqueue(action);handleSync(await q.sync());
    }));
    text('quest-pilot-message','Proefintegratie. Tik op Serverstatus ophalen wanneer je bent ingelogd.');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
