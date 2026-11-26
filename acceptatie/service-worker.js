// US TWO 1.0 release candidate. Only same-scope static assets; never cache API or private responses.
const CACHE_PREFIX='us-two-web-scope-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=CACHE_PREFIX+'v1.0.0-rc.1';
const SHELL=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./catalog/quest-full-258.json","./assets/us-two-user-board.png","./assets/us-two-user-pawn.png","./assets/approved-youri-kim.webp","./assets/approved-pepsi.webp","./styles.css?v=100rc1","./quest-board.css?v=100rc1","./us-two-offline.js?v=100rc1","./app.js?v=100rc1","./quest-catalog.js?v=100rc1","./quest-board.js?v=100rc1","./quest-board-interactions.js?v=100rc1","./quest-pose-archive.js?v=100rc1","./quest-poses.js?v=100rc1","./quest-cinematics.js?v=100rc1","./quest-calendar-ics.js?v=100rc1","./quest-card-data.js?v=100rc1","./quest-card-archive.js?v=100rc1","./quest-card-gallery.js?v=100rc1","./quest-full-deck.js?v=100rc1","./quest-sounds.js?v=100rc1","./quest-pilot.js?v=100rc1","./quest-adult-consent.js?v=100rc1","./quest-questions.js?v=100rc1","./quest-date-browser.js?v=100rc1","./quest-world-images.js?v=100rc1"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(new URL(url,self.registration.scope),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // A versioned script must match the installed shell. Navigations still check for updates.
  const versioned=url.searchParams.get('v')==='100rc1'&&/\.(js|css)$/.test(url.pathname);
  if(versioned){const cached=await cache.match(event.request);if(cached)return cached;}
  try{
   const response=await fetch(event.request,{cache:'no-cache'});
   if(response.ok&&response.type==='basic')await cache.put(event.request,response.clone()).catch(()=>{});
   return response;
  }catch{
   return await cache.match(event.request)||(event.request.mode==='navigate'?await cache.match('./index.html'):Response.error());
  }
 })());
});
