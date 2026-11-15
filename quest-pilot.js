/* Staging-only read and start pilot for the new canonical quest server.
 * It deliberately does NOT replace the currently approved legacy board. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let queue=null, queueFor='', loading=false, latest=null;
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
  }
  async function refresh() {
    const q=await ensureQueue();
    const [server,local]=await Promise.all([window.USTwoQuestPilotBridge.read(),q.state()]);
    latest=server;
    status(server,local.items,local.blocked);
  }
  async function operation(fn) {
    if(loading)return;loading=true;
    for(const id of ['quest-pilot-refresh','quest-pilot-start','quest-pilot-sync'])$(id).disabled=true;
    try{await fn();await refresh();text('quest-pilot-message','Verbinding en lokale opslag gecontroleerd.');}
    catch(e){text('quest-pilot-message',String(e?.message||e));}
    finally{loading=false;$('quest-pilot-refresh').disabled=false;}
  }
  function handleSync(result) {
    if(result.status==='blocked')throw Error('De actie is geblokkeerd ('+result.reason+'). Ververs de serverstatus; verwijder geen gegevens zonder herstelcontrole.');
    if(result.status==='retry_later')throw Error('Geen betrouwbare serverbevestiging. De actie blijft veilig in de wachtrij staan.');
    if(result.status==='busy')throw Error('Synchronisatie is al bezig in een ander venster.');
  }
  function init() {
    if(!$('quest-pilot-refresh'))return;
    $('quest-pilot-refresh').addEventListener('click',()=>operation(refresh));
    $('quest-pilot-sync').addEventListener('click',()=>operation(async()=>{
      const q=await ensureQueue();handleSync(await q.sync());
    }));
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
