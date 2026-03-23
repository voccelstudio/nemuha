// Ñemuha — Service Worker
// Estrategia: Cache-first para assets, Network-first para datos

const CACHE_NAME = 'nemuha-v2';
const CACHE_STATIC = 'nemuha-static-v2';

// Assets críticos que deben estar disponibles offline
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js'
];

// ── INSTALL: cachear assets estáticos ──────────────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        // Cachear uno a uno para no fallar todo si uno falla
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(e => console.warn('[SW] No se pudo cachear:', url, e.message))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejos ────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Eliminando caché viejo:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia híbrida ───────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo interceptar GET
  if (request.method !== 'GET') return;

  // Fonts: cache-first (raramente cambian)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CDN libs (SheetJS, etc): cache-first
  if (url.hostname.includes('cdn.') || url.hostname.includes('cdnjs.')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Google Apps Script (licencia): network-only con fallback de caché
  if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request)
      )
    );
    return;
  }

  // App principal (index.html y assets locales): stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── ESTRATEGIAS ────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (e) {
    return new Response('Recurso no disponible offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(fresh => {
    if (fresh.ok) {
      caches.open(CACHE_STATIC).then(cache => cache.put(request, fresh.clone()));
    }
    return fresh;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// ── MENSAJE desde la app ────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => {
      event.source.postMessage('CACHE_CLEARED');
    });
  }
});
