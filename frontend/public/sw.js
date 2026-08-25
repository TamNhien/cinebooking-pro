const VERSION = "v52";
const SHELL_CACHE = `cinebooking-shell-${VERSION}`;
const RUNTIME_CACHE = `cinebooking-runtime-${VERSION}`;
const IMAGE_CACHE = `cinebooking-images-${VERSION}`;
const ALL_CACHES = [SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
const APP_SHELL = [
  "/",
  "/offline",
  "/offline-tickets",
  "/mobile",
  "/movies",
  "/cinemas",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png"
];
const PRIVATE_NAV_PREFIXES=["/admin","/staff","/profile","/security","/notifications","/payments","/bookings","/ticket/","/booking/","/support","/for-you","/favorites","/waitlist"];

function isPrivateNavigation(pathname){return PRIVATE_NAV_PREFIXES.some(prefix=>pathname===prefix||pathname.startsWith(prefix.endsWith("/")?prefix:`${prefix}/`));}
function isShellPath(pathname){return APP_SHELL.includes(pathname);}

async function trimCache(name,maxEntries){
  const cache=await caches.open(name);const keys=await cache.keys();
  if(keys.length<=maxEntries)return;
  await Promise.all(keys.slice(0,keys.length-maxEntries).map(key=>cache.delete(key)));
}

async function cachePageAndAssets(cache, path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return;
    await cache.put(path, response.clone());
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return;
    const html = await response.text();
    const matches = [...html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g)].map(m => m[1]);
    await Promise.all([...new Set(matches)].map(async asset => {
      try { const res = await fetch(asset, { cache: "no-store" }); if (res.ok) await cache.put(asset, res); } catch {}
    }));
  } catch {}
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(APP_SHELL.map(path => cachePageAndAssets(cache, path)));
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("cinebooking-") && !ALL_CACHES.includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "PURGE_PRIVATE_RUNTIME") {
    event.waitUntil((async()=>{
      const cache=await caches.open(RUNTIME_CACHE);const keys=await cache.keys();
      await Promise.all(keys.filter(req=>isPrivateNavigation(new URL(req.url).pathname)).map(req=>cache.delete(req)));
    })());
  }
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const safe=data.urls.filter(Boolean).filter(value=>{try{const u=new URL(value,self.location.origin);return u.origin===self.location.origin&&!isPrivateNavigation(u.pathname)&&!u.pathname.startsWith("/api/");}catch{return false;}});
      await Promise.all(safe.map(url => cachePageAndAssets(cache, url)));
      await trimCache(RUNTIME_CACHE,40);
    })());
  }
});

async function publicNavigation(request) {
  const url=new URL(request.url);const cache=await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && !isPrivateNavigation(url.pathname)) { cache.put(request, response.clone()).catch(() => {}); trimCache(RUNTIME_CACHE,40).catch(()=>{}); }
    return response;
  } catch {
    if(!isPrivateNavigation(url.pathname)){
      const cached = await cache.match(request) || await caches.match(url.pathname);
      if (cached) return cached;
    }
    return await caches.match("/offline");
  }
}

async function privateNavigation(request){
  try{return await fetch(request);}catch{return await caches.match("/offline");}
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) { const cache = await caches.open(RUNTIME_CACHE); cache.put(request, response.clone()).catch(() => {}); trimCache(RUNTIME_CACHE,60).catch(()=>{}); }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response.ok) { cache.put(request, response.clone()).catch(() => {}); trimCache(IMAGE_CACHE,80).catch(()=>{}); }
    return response;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authenticated/API responses are never cached. Offline QR snapshots are stored explicitly in IndexedDB.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(isPrivateNavigation(url.pathname)?privateNavigation(request):publicNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icon")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.destination === "image" || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("push",event=>{
  event.waitUntil((async()=>{
    let data={title:"CineBooking",body:"Bạn có thông báo mới.",url:"/notifications",id:"generic",createdAt:new Date().toISOString()};
    try{if(event.data)data={...data,...event.data.json()};}catch{try{data.body=event.data?.text()||data.body;}catch{}}
    const tag=`cinebooking-${data.id||"notification"}`;
    await self.registration.showNotification(data.title||"CineBooking",{
      body:data.body||"Bạn có thông báo mới.",icon:"/icon-192.png",badge:"/icon-192.png",tag,renotify:false,
      data:{url:data.url||"/notifications",notificationId:data.id,createdAt:data.createdAt},
      requireInteraction:data.priority==="HIGH"
    });
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clients)client.postMessage({type:"CINEBOOKING_PUSH_DELIVERED",notificationId:data.id,createdAt:data.createdAt});
  })());
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"/notifications",self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows){
      if("focus" in client){await client.focus();if("navigate" in client)await client.navigate(target);return;}
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
