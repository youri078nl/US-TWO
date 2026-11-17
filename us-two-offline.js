/* US TWO offline browser pilot; generated from private branch feature/masterplan-release-hardening-20261115; no credentials */
(function(root){'use strict';
var modules={
"./outbox.cjs":function(require,module,exports){
'use strict';

/**
 * US TWO offline-outbox core.
 * Transport-agnostic, no tokens persisted. UI clients must supply a durable
 * adapter implementing load() and save(snapshot), scoped to one authenticated user.
 * No automatic conflict resolution: server revision conflicts require fresh data.
 */
const TYPES = new Set(['quest_action', 'super_action', 'schedule_action','question_action']);
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validate(item) {
  if (!item || !TYPES.has(item.type) || !ID_RE.test(item.requestId || '')) throw Error('invalid_outbox_item');
  if (!Number.isSafeInteger(item.expectedRevision) || item.expectedRevision < 0) throw Error('invalid_revision');
  if (typeof item.payload !== 'object' || !item.payload || Array.isArray(item.payload)) throw Error('invalid_payload');
  const payload = JSON.stringify(item.payload);
  if (payload.length > 16384) throw Error('payload_too_large');
  return { type:item.type, requestId:item.requestId, expectedRevision:item.expectedRevision,
    payload:JSON.parse(payload) };
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }
class Outbox {
  constructor(store, identity) {
    if (!store || typeof store.load !== 'function' || typeof store.save !== 'function') throw Error('durable_store_required');
    if (!identity || typeof identity.userId !== 'string' || typeof identity.coupleId !== 'string' ||
      !identity.userId || !identity.coupleId) throw Error('identity_required');
    this.store = store;
    this.identity = { userId:identity.userId, coupleId:identity.coupleId };
    this.items = [];
    this.blocked = null;
    this._busy = false;
  }
  async init() {
    const data = await this.store.load();
    if (!data) return this;
    if (data.userId !== this.identity.userId || data.coupleId !== this.identity.coupleId)
      throw Error('outbox_identity_mismatch');
    if (!Array.isArray(data.items)) throw Error('invalid_saved_outbox');
    const seen = new Set();
    this.items = data.items.map(validate);
    for (const item of this.items) {
      if (seen.has(item.requestId)) throw Error('duplicate_saved_request_id');
      seen.add(item.requestId);
    }
    this.blocked = data.blocked || null;
    return this;
  }
  async persist() {
    await this.store.save(clone({ ...this.identity, items:this.items, blocked:this.blocked }));
  }
  async enqueue(raw) {
    if (this._busy) throw Error('outbox_busy');
    const item = validate(raw);
    const duplicate = this.items.find(x => x.requestId === item.requestId);
    if (duplicate) {
      if (JSON.stringify(duplicate) !== JSON.stringify(item)) throw Error('request_id_reused_for_different_action');
      return false;
    }
    const previous = this.items;
    this.items = [...previous, item];
    try { await this.persist(); } catch (e) { this.items = previous; throw e; }
    return true;
  }
  async flush(send) {
    if (this._busy) return {status:'busy'};
    if (this.blocked) return {status:'blocked', reason:this.blocked};
    if (typeof send !== 'function') throw Error('send_required');
    this._busy = true;
    let acknowledged = 0;
    try {
      while (this.items.length) {
        const item = this.items[0];
        let response;
        try { response = await send(clone(item)); }
        catch (e) { return {status:'retry_later',acknowledged,error:String(e?.message || e)}; }
        if (!response || response.ok !== true) {
          if (response?.kind === 'revision_conflict' || response?.kind === 'authorization_failure') {
            const previous = this.blocked;
            this.blocked = response.kind;
            try { await this.persist(); } catch (e) { this.blocked=previous; throw e; }
            return {status:'blocked',reason:this.blocked,acknowledged};
          }
          return {status:'retry_later',acknowledged};
        }
        // Durable acknowledgement BEFORE moving to the next request.
        const previous = this.items;
        this.items = previous.slice(1);
        try { await this.persist(); } catch (e) { this.items = previous; throw e; }
        acknowledged++;
      }
      return {status:'done',acknowledged};
    } finally { this._busy = false; }
  }
  async discardAfterReconciliation(confirm) {
    if (confirm !== true || this._busy) throw Error('explicit_reconciliation_required');
    const oldItems = this.items, oldBlock = this.blocked;
    this.items=[]; this.blocked=null;
    try { await this.persist(); } catch(e) { this.items=oldItems; this.blocked=oldBlock; throw e; }
  }
}
module.exports = {Outbox,validate};

},
"./indexeddb-store.cjs":function(require,module,exports){
'use strict';

// Durable browser storage for US TWO's offline outbox. Never store Supabase tokens,
// passwords, private preparations or secrets here.
const DB_NAME='us-two-offline-outbox-v1';
const STORE_NAME='outboxes';

function openDatabase(factory, name) {
  return new Promise((resolve,reject)=>{
    let req;
    try { req=factory.open(name,1); } catch(e){reject(e);return;}
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('indexeddb_open_failed'));
    req.onblocked=()=>reject(Error('indexeddb_upgrade_blocked'));
  });
}
function createIndexedDbStore({indexedDBFactory, userId, coupleId, dbName=DB_NAME}={}) {
  if(!indexedDBFactory || typeof indexedDBFactory.open!=='function')
    throw Error('indexeddb_unavailable');
  if(typeof userId!=='string'||!userId||typeof coupleId!=='string'||!coupleId)
    throw Error('identity_required');
  if(typeof dbName!=='string'||!dbName) throw Error('db_name_required');
  // JSON.stringify avoids ambiguous separator collisions.
  const key=JSON.stringify([userId,coupleId]);
  let dbPromise=null;
  function getDB() {
    if(!dbPromise) dbPromise=openDatabase(indexedDBFactory,dbName).catch(e=>{dbPromise=null;throw e;});
    return dbPromise;
  }
  async function transact(mode, operation) {
    const db=await getDB();
    return new Promise((resolve,reject)=>{
      let tx,req,value,settled=false;
      const fail=(err)=>{
        if(settled) return;
        settled=true;
        reject(err||Error('indexeddb_transaction_failed'));
      };
      try {
        tx=db.transaction(STORE_NAME,mode);
        req=operation(tx.objectStore(STORE_NAME));
        req.onsuccess=()=>{value=req.result;};
        req.onerror=()=>fail(req.error||Error('indexeddb_request_failed'));
        // A successful request is not yet a durable commit: resolve only oncomplete.
        tx.oncomplete=()=>{if(!settled){settled=true;resolve(value===undefined?null:value);}};
        tx.onabort=()=>fail(tx.error||Error('indexeddb_transaction_aborted'));
        tx.onerror=()=>fail(tx.error||Error('indexeddb_transaction_failed'));
      } catch(e){fail(e);}
    });
  }
  return {
    async load() {
      const value=await transact('readonly',store=>store.get(key));
      return value==null?null:JSON.parse(JSON.stringify(value));
    },
    async save(snapshot) {
      if(!snapshot || snapshot.userId!==userId || snapshot.coupleId!==coupleId)
        throw Error('outbox_identity_mismatch');
      // Fail before database mutation if payload is not serializable.
      const safe=JSON.parse(JSON.stringify(snapshot));
      await transact('readwrite',store=>store.put(safe,key));
    },
    async close() {
      if(!dbPromise) return;
      const db=await dbPromise;db.close();dbPromise=null;
    }
  };
}
module.exports={createIndexedDbStore};

},
"./rpc-transport.cjs":function(require,module,exports){
'use strict';
// Browser/Node compatible Supabase RPC adapter for the offline outbox.
// No session tokens or credentials are stored here. The Supabase client handles auth.
const SPECS = Object.freeze({
  quest_action: {name:'us_quest_action',keys:['action','dateId','mode'],
    params:{action:'p_action',dateId:'p_date_id',mode:'p_mode'}},
  super_action: {name:'us_quest_super_action',keys:['cell','action'],
    params:{cell:'p_cell',action:'p_action'}},
  schedule_action: {name:'us_quest_schedule_action',keys:['action','time'],
    params:{action:'p_action',time:'p_time'}},
  question_action: {name:'us_quest_question_action',keys:['action','category','answer'],
    params:{action:'p_action',category:'p_category',answer:'p_answer'}}
});
function makeRpcSender(supabase) {
  if (!supabase || typeof supabase.rpc!=='function') throw Error('supabase_client_required');
  return async function send(item) {
    const spec=SPECS[item?.type];
    if (!spec) throw Error('unknown_rpc_type');
    const {validate}=require('./outbox.cjs');
    const request=validate(item);
    for(const k of Object.keys(request.payload))
      if(!spec.keys.includes(k)) throw Error('unexpected_rpc_field_'+k);
    if(typeof request.payload.action!=='string') throw Error('rpc_action_required');
    if(request.type==='super_action' &&
       (!Number.isSafeInteger(request.payload.cell) || request.payload.cell<=0 || request.payload.cell%20!==0))
      throw Error('invalid_milestone_cell');
    const params={p_expected_revision:request.expectedRevision,p_request_id:request.requestId};
    for(const [key,param] of Object.entries(spec.params))
      if(Object.prototype.hasOwnProperty.call(request.payload,key)) params[param]=request.payload[key];
    // The RPC returns the committed state; uncertain network errors retain the same UUID.
    const response=await supabase.rpc(spec.name,params);
    if(response.error) {
      const code=String(response.error.code||'');
      const message=String(response.error.message||'');
      if(code==='40001'||message.includes('stale_revision'))
        return {ok:false,kind:'revision_conflict'};
      if(['28000','42501','PGRST301','401','403'].includes(code) ||
         /login_required|permission denied|jwt expired|not authenticated/i.test(message))
        return {ok:false,kind:'authorization_failure'};
      return {ok:false,kind:'retry_later'};
    }
    return {ok:true,data:response.data};
  };
}
module.exports={makeRpcSender};

},
"./coordinator.cjs":function(require,module,exports){
'use strict';
// Coordinates ALL mutations of the same durable outbox across same-origin tabs.
// Never fall back to an unsafe unlocked write: Web Locks require HTTPS/localhost.
const {Outbox}=require('./outbox.cjs');

function createCoordinatedOutbox({store,identity,locks,scope=''}={}) {
  if(!locks || typeof locks.request !== 'function') throw Error('web_locks_required');
  if(!store || typeof store.load!=='function' || typeof store.save!=='function')
    throw Error('durable_store_required');
  if(!identity || typeof identity.userId!=='string'||!identity.userId ||
      typeof identity.coupleId!=='string'||!identity.coupleId)
    throw Error('identity_required');
  // JSON array produces stable, collision-free namespace within the origin.
  const lockName='us-two-outbox:'+JSON.stringify(scope?[scope,identity.userId,identity.coupleId]:[identity.userId,identity.coupleId]);
  async function exclusive(work) {
    // Reload INSIDE the lock to prevent lost updates from stale tab snapshots.
    return locks.request(lockName,{mode:'exclusive'},async()=>{
      const q=await new Outbox(store,identity).init();
      return work(q);
    });
  }
  return Object.freeze({
    async enqueue(action) { return exclusive(q=>q.enqueue(action)); },
    async flush(send) { return exclusive(q=>q.flush(send)); },
    async snapshot() { return exclusive(q=>({items:JSON.parse(JSON.stringify(q.items)),blocked:q.blocked})); },
    async discardAfterReconciliation(confirm) {
      return exclusive(q=>q.discardAfterReconciliation(confirm));
    }
  });
}
module.exports={createCoordinatedOutbox};

},
"./browser-api.cjs":function(require,module,exports){
'use strict';
const {createCoordinatedOutbox}=require('./coordinator.cjs');
const {createIndexedDbStore}=require('./indexeddb-store.cjs');
const {makeRpcSender}=require('./rpc-transport.cjs');
/**
 * Integration facade for a browser hosting US TWO.
 * Requires HTTPS/Web Locks + IndexedDB and a verified Supabase client session.
 * No timers, background work or automatic retries are started.
 */
function createBrowserQueue({supabase,userId,coupleId,locks,indexedDBFactory,scope=''}={}) {
  if(!supabase || typeof supabase.rpc!=='function') throw Error('supabase_client_required');
  if(typeof scope!=='string'||scope.length>256)throw Error('invalid_app_scope');
  // A path-scoped database prevents a staging tab replaying production outbox actions.
  const dbName=scope?'us-two-offline-outbox-v1::'+scope:undefined;
  const store=createIndexedDbStore({indexedDBFactory,userId,coupleId,dbName});
  const queue=createCoordinatedOutbox({store,identity:{userId,coupleId},locks,scope});
  const send=makeRpcSender(supabase);
  return Object.freeze({
    enqueue:action=>queue.enqueue(action),
    sync:()=>queue.flush(send),
    state:()=>queue.snapshot(),
    // Reconciliation must be explicitly confirmed after inspecting server state.
    discardAfterReconciliation:confirm=>queue.discardAfterReconciliation(confirm),
    close:()=>store.close()
  });
}
module.exports={createBrowserQueue};

}
};
var loaded={};function load(id){if(!Object.prototype.hasOwnProperty.call(modules,id))throw Error('module_not_found_'+id);if(loaded[id])return loaded[id].exports;var m={exports:{}};loaded[id]=m;modules[id](load,m,m.exports);return m.exports;}
root.USTwoOffline=load('./browser-api.cjs');
})(globalThis);
