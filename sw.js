const APP_VERSION='V74';
const CACHE='bos-bruno-onset-v74';
const CAMERA_DB_URL='https://raw.githubusercontent.com/BrunoOnSet/BOS-CAMERA-DB/main/cameras.json';
const LIGHT_DB_URL='https://raw.githubusercontent.com/BrunoOnSet/BOS-PROJECTEURS-DB/main/lights.json';
const SHARED_DB_URLS=new Set([CAMERA_DB_URL,LIGHT_DB_URL]);
const CORE_ASSETS=[
  './',
  'index.html',
  'style.css?v=74',
  'app.js?v=74',
  'manifest.webmanifest?v=74',
  'version.json',
  'README.txt',
  'assets/logo-bos-header.jpg',
  'assets/logo-bruno-onset.jpg',
  'assets/mannequin-preview.png',
  'data/cameras.json',
  'data/lights.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'modules/dof/app.js?v=5.44-bos67',
  'modules/dof/assets/logo-bos-header.jpg',
  'modules/dof/index.html',
  'modules/dof/logo-bruno-guillard.png',
  'modules/dof/style.css?v=5.44-bos74',
  'modules/light/app.js?v=0.62-bos71',
  'modules/light/assets/gels/lee017-spectrum.png',
  'modules/light/assets/gels/lee017-swatch-flat.png',
  'modules/light/assets/gels/lee017-swatch.png',
  'modules/light/assets/gels/lee117-swatch-flat.png',
  'modules/light/assets/gels/lee201-swatch-flat.png',
  'modules/light/assets/gels/lee202-swatch-flat.png',
  'modules/light/assets/gels/lee203-swatch-flat.png',
  'modules/light/assets/gels/lee204-swatch-flat.png',
  'modules/light/assets/gels/lee205-swatch-flat.png',
  'modules/light/assets/gels/lee206-swatch-flat.png',
  'modules/light/assets/gels/lee213-swatch-flat.png',
  'modules/light/assets/gels/lee245-swatch-flat.png',
  'modules/light/assets/gels/lee246-swatch-flat.png',
  'modules/light/assets/gels/lee248-swatch-flat.png',
  'modules/light/assets/gels/lee249-swatch-flat.png',
  'modules/light/assets/gels/lee506-swatch-flat.png',
  'modules/light/assets/gels/lee603-swatch-flat.png',
  'modules/light/assets/gels/lee728-swatch-flat.png',
  'modules/light/assets/logo-bos-header.jpg',
  'modules/light/bos-projecteurs-db.js',
  'modules/light/index.html',
  'modules/light/styles.css?v=0.62-bos74',
  'modules/media/app.js?v=2.15-bos69',
  'modules/media/assets/logo-bos-header.jpg',
  'modules/media/index.html',
  'modules/media/logo-bruno-guillard.png',
  'modules/media/style.css?v=2.15-bos69',
];

async function freshResponse(url){
  return fetch(url,{cache:'reload'});
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const asset of CORE_ASSETS){
      try{
        const response=await freshResponse(asset);
        if(response.ok) await cache.put(asset,response.clone());
      }catch{}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE && /^bos-bruno-onset-/i.test(k)).map(k=>caches.delete(k)));
    await self.clients.claim();
    // Ne force plus la navigation des fenêtres ouvertes : l'app décide elle-même
    // d'un unique reload uniquement lorsqu'une version réellement plus récente est détectée.
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);

  // Shared databases: always try the network first so DB updates appear immediately.
  if(SHARED_DB_URLS.has(event.request.url)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        if(fresh?.ok) await cache.put(event.request,fresh.clone());
        return fresh;
      }catch(err){
        const cached=await cache.match(event.request);
        if(cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // version.json must never be served stale.
  if(url.origin===self.location.origin && /\/version\.json$/.test(url.pathname)){
    event.respondWith((async()=>{
      try{return await fetch(event.request,{cache:'no-store'});}catch{return (await caches.open(CACHE)).match('version.json');}
    })());
    return;
  }

  // HTML/navigation: network first, avec fallback propre à chaque route interne BOS.
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const isDofRoute=/\/modules\/dof(?:\/|$)/i.test(url.pathname);
      const isMediaRoute=/\/modules\/media(?:\/|$)/i.test(url.pathname);
      const isLightRoute=/\/modules\/light(?:\/|$)/i.test(url.pathname);
      const fallbackKey=isDofRoute ? 'modules/dof/index.html' : (isMediaRoute ? 'modules/media/index.html' : (isLightRoute ? 'modules/light/index.html' : 'index.html'));
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        if(fresh?.ok) await cache.put(fallbackKey,fresh.clone());
        return fresh;
      }catch{
        return (await cache.match(fallbackKey)) || (await cache.match('index.html')) || (await cache.match('./'));
      }
    })());
    return;
  }

  // JS/CSS/manifest: network first, cached fallback.
  if(url.origin===self.location.origin && /\.(?:js|css|webmanifest)$/.test(url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        if(fresh?.ok) await cache.put(event.request,fresh.clone());
        return fresh;
      }catch{
        return (await cache.match(event.request)) || Response.error();
      }
    })());
    return;
  }

  // Images/local data can remain cache-first for fast/offline use.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request);
    if(cached) return cached;
    try{
      const fresh=await fetch(event.request);
      if(fresh?.ok && url.origin===self.location.origin) await cache.put(event.request,fresh.clone());
      return fresh;
    }catch{
      return Response.error();
    }
  })());
});
