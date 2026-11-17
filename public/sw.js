// v3: index.html ahora trae la portada ya dibujada; sin conexión se usa
// app.html, la cáscara de la app. Cambiar el nombre descarta la copia vieja.
const CACHE = 'miclubpro-v3';
const PRECACHE = ['/app.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Never cache Supabase API calls or Edge Functions
  if (url.includes('supabase.co') || url.includes('functions/v1')) return;
  // Network first — fallback to cache for navigation
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/app.html'))
    );
    return;
  }
  // Cache first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
