const CACHE='park-photo-planner-shell-v5';
const FILES=['./','./index.html','./style.css','./app.mjs','./core.mjs','./icon.svg','./art/harbor-night.svg','./art/castle-night.svg','./art/stars.svg','./manifest.webmanifest','./vendor/leaflet.js','./vendor/leaflet.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('park-photo-planner-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request).then(r=>r||new Response('Offline',{status:503}))));});
