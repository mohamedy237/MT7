const V = 'mt7-shell-v8';
const CORE = [
  './training.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    // Do not include './': this project has no index.html, so that URL can 404
    // and make Cache.addAll fail atomically, leaving the app shell uncached.
    await c.addAll(CORE);
    // Supabase's client library is essential for the app to start offline.
    // Cache it opportunistically; a CDN outage must not prevent SW installation.
    try {
      const req = new Request(SUPABASE_JS, { mode: 'no-cors' });
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') await c.put(req, res);
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const keep = (r, x) => {
  if (x.ok || x.type === 'opaque') {
    const c = x.clone();
    caches.open(V).then(k => k.put(r, c)).catch(() => {});
  }
  return x;
};

const nav = r => {
  const n = fetch(r, { cache: 'no-cache' }).then(x => keep(r, x));
  return caches.match(r).then(m =>
    m
      ? Promise.race([n, new Promise(ok => setTimeout(() => ok(m), 4000))]).catch(() => m)
      : n.catch(() => caches.match('./training.html'))
  );
};

self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);

  // Student and grade data are never cached by the Service Worker.
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;

  if (r.mode === 'navigate' || u.origin === location.origin) {
    e.respondWith(nav(r));
  } else if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.g(oogleapis|static)\.com/.test(u.hostname)) {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(x => keep(r, x)))
    );
  }
});
