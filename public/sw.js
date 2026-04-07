const CACHE_NAME = 'chatbot-v4';
const STATIC_ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    event.respondWith(Promise.resolve(fetch(request).catch(() => new Response('', { status: 404 }))));
    return;
  }

  if (!url.protocol.startsWith('http')) {
    event.respondWith(Promise.resolve(fetch(request).catch(() => new Response('', { status: 404 }))));
    return;
  }

  if (url.protocol === 'chrome-extension:') {
    event.respondWith(Promise.resolve(fetch(request).catch(() => new Response('', { status: 404 }))));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      Promise.resolve(
        fetch(request).catch(() => {
          return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      )
    );
    return;
  }

  if (request.method !== 'GET') return;

  event.respondWith(
    caches
      .match(request)
      .then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && request.url.startsWith('http')) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone))
                .catch(() => {});
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
      .catch(() => fetch(request))
  );
});
