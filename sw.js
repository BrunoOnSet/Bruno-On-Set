const CACHE='bos-bruno-onset-v11';
const CAMERA_DB_URL='https://raw.githubusercontent.com/BrunoOnSet/BOS-CAMERA-DB/main/cameras.json';
const LIGHT_DB_URL='https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json';
const SHARED_DB_URLS=new Set([CAMERA_DB_URL,LIGHT_DB_URL]);
const ASSETS=['./','index.html','style.css','app.js','manifest.webmanifest','data/cameras.json','data/lights.json','icons/icon-192.png','icons/icon-512.png'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;

  if(SHARED_DB_URLS.has(e.request.url)){
    e.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(e.request,{cache:'no-store'});
        if(fresh && fresh.ok) await cache.put(e.request,fresh.clone());
        return fresh;
      }catch(err){
        const cached=await cache.match(e.request);
        if(cached) return cached;
        throw err;
      }
    })());
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return resp;
    }).catch(()=>caches.match('index.html')))
  );
});
