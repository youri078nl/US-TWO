// Updates: bump CACHE when changing assets. Network first keeps updates fresh.
// A SW under /acceptatie/ must never delete caches from /test-2-telefoons/.
const CACHE_PREFIX = 'us-two-web-scope-' + encodeURIComponent(new URL(self.registration.scope).pathname) + '-';
const CACHE = CACHE_PREFIX + 'v0.17.85-gallery-names-rc';
const SHELL = ['./','./index.html','./styles.css','./app.js','./us-two-offline.js','./quest-catalog.js','./quest-board.js','./quest-board-interactions.js','./quest-world-images.js','./quest-date-browser.js','./quest-pose-archive.js','./quest-poses.js','./quest-card-data.js','./quest-card-archive.js','./quest-card-gallery.js','./quest-full-deck.js','./quest-sounds.js','./quest-calendar-ics.js','./catalog/quest-full-258.json','./quest-cinematics.js','./quest-board.css','./assets/ustwo-world-original.webp','./assets/us-two-user-board.png','./assets/us-two-user-pawn.png','./quest-pilot.js','./quest-adult-consent.js','./quest-questions.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const requestUrl=new URL(event.request.url);
  if(requestUrl.origin!==self.location.origin||!requestUrl.href.startsWith(self.registration.scope))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&response.type==='basic'){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone)).catch(()=>{})}
    return response;
  }).catch(async()=>await caches.match(event.request)||(event.request.mode==='navigate'?await caches.match('./index.html'):Response.error())));
});
