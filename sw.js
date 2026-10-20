const V = 'nq-shell-v4';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => c.addAll([
        './',
        './training.html',
        './manifest.json',
        './icon-192.png',
        './icon-512.png'
      ]).catch(() => {}))
      .then(() => self.skipWaiting())
  );
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
  const n = fetch(r).then(x => keep(r, x));
  return caches.match(r).then(m =>
    m
      ? Promise.race([n, new Promise(ok => setTimeout(() => ok(m), 4000))]).catch(() => m)
      : n.catch(() => caches.match('./training.html'))
  );
};

self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);

  // بيانات الدرجات والطلاب لا تُخزَّن أبدًا هنا
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co')) return;

  if (r.mode === 'navigate' || u.origin === location.origin) {
    e.respondWith(nav(r));
  } else if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.g(oogleapis|static)\.com/.test(u.hostname)) {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(x => keep(r, x)))
    );
  }
});
