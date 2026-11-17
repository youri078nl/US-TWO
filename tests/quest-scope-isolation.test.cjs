'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {IDBFactory}=require('fake-indexeddb');
const offline=require('../us-two-offline.js');
(async()=>{
 const dbFactory=new IDBFactory(),names=[];
 const locks={request:async(name,_opts,fn)=>{names.push(name);return fn();}};
 const client={rpc:async()=>{throw Error('scope test must never call Supabase')}};
 const who={userId:'test-user',coupleId:'test-couple'};
 const a=offline.createBrowserQueue({...who,supabase:client,locks,indexedDBFactory:dbFactory,scope:'/US-TWO/acceptatie/'});
 const b=offline.createBrowserQueue({...who,supabase:client,locks,indexedDBFactory:dbFactory,scope:'/US-TWO/test-2-telefoons/'});
 try{
  assert.equal((await a.state()).items.length,0);assert.equal((await b.state()).items.length,0);
  const databases=await dbFactory.databases();
  assert.equal(databases.length,2,'staging and production outboxes need distinct DBs');
  assert.equal(new Set(names).size,2,'staging and production Web Locks need distinct namespaces');
 }finally{await a.close();await b.close();}
 for(const path of ['/US-TWO/acceptatie/','/US-TWO/test-2-telefoons/']){
  const scope='https://youri078nl.github.io'+path;
  const prefix='us-two-web-scope-'+encodeURIComponent(path)+'-';
  const otherPrefix='us-two-web-scope-'+encodeURIComponent('/US-TWO/another-app/')+'-';
  const existing=[prefix+'old',otherPrefix+'old','us-two-web-v0.9.8-pilot'];
  const deleted=[];let activatePromise=null,fetchCallback=null;
  const caches={keys:async()=>existing,delete:async key=>{deleted.push(key);return true}};
  const self={registration:{scope},location:{origin:'https://youri078nl.github.io'},clients:{claim:async()=>{}},
   addEventListener:(name,fn)=>{if(name==='activate')self.activate=fn;if(name==='fetch')fetchCallback=fn}};
  vm.runInNewContext(fs.readFileSync('service-worker.js','utf8'),{self,caches,URL,Promise,encodeURIComponent});
  self.activate({waitUntil:p=>{activatePromise=p}});await activatePromise;
  assert.deepEqual(deleted,[prefix+'old'],'only obsolete caches under this exact scope are disposable');
  let responded=false;
  fetchCallback({request:{method:'GET',url:'https://youri078nl.github.io/US-TWO/another-app/index.html'},respondWith:()=>{responded=true}});
  assert.equal(responded,false,'one US TWO app must not hijack another scope');
 }
 const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('app.js','utf8');
 assert.match(html,/img-src 'self' data: blob:/,'local approved JPG and pose frames must pass CSP');
 assert.match(app,/STORAGE_KEY = 'us-two-web-session-v2:' \+ new URL\('\.\/',location\.href\)\.pathname/,'auth tokens scoped by app path');
 console.log('PASS separate app scopes isolate JWT sessions, IndexedDB outbox, Web Locks, SW caches and fetch interception');
})().catch(error=>{console.error(error);process.exitCode=1});
