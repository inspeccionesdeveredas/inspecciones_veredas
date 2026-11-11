// Inspecciones de Veredas: guarda la app en el dispositivo para usarla sin internet.
const APP='iv-app-v5', TILES='iv-mapa-v1', MAX_TILES=3000;
const SHELL=['./','./index.html','./config.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./dashboard.html','./manifest-admin.webmanifest','./icon-admin-192.png','./icon-admin-512.png','./fachadas.html','./subsecretaria.html','./manifest-fachadas.webmanifest','./manifest-sub.webmanifest'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(APP).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==APP&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET') return;
  if(u.hostname.endsWith('google.com')||u.hostname.endsWith('googleusercontent.com')) return;   // la planilla: siempre en vivo
  // fondo del mapa: se guardan las zonas que ya se miraron con internet
  if(/arcgisonline\.com/.test(u.hostname)){
    e.respondWith(caches.open(TILES).then(async c=>{ const hit=await c.match(e.request); if(hit) return hit;
      try{ const r=await fetch(e.request); if(r.ok||r.type==='opaque'){ c.put(e.request,r.clone()); c.keys().then(k=>{ if(k.length>MAX_TILES) c.delete(k[0]); }); } return r; }
      catch(err){ return new Response('',{status:504}); } }));
    return;
  }
  const esApp = u.origin===location.origin && (e.request.mode==='navigate' || /\/(index\.html|dashboard\.html|fachadas\.html|subsecretaria\.html|config\.js|manifest(-admin|-fachadas|-sub)?\.webmanifest|icon-(admin-)?\d+\.png)?$/.test(u.pathname));
  if(esApp){
    // la app: se abre al instante desde el dispositivo y se actualiza en segundo plano
    e.respondWith(caches.open(APP).then(async c=>{ const hit=await c.match(e.request,{ignoreSearch:true});
      const net=fetch(e.request).then(r=>{ if(r.ok) c.put(e.request,r.clone()); return r; }).catch(()=>null);
      return hit || (await net) || c.match('./index.html'); }));
  }
});

// aviso de tarea nueva: al tocarlo se abre la app en "Tareas"
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./?tareas';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
    for(const c of l){ if('focus' in c){ c.postMessage({iv:'tareas'}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
