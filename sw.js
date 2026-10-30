const CACHE_NAME = 'khao-thi-toan-shell-v16';
const PDF_CACHE_NAME = 'khao-thi-pdfs-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/pdf_storage.js',
  './js/grading.js',
  './js/exam_data.js',
  './js/seed_data.js',
  './js/app.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== PDF_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const urlObj = new URL(req.url);
  const isSupabaseImmutablePdf =
    urlObj.pathname.includes('/storage/v1/object/public/khao-thi-pdfs/') &&
    urlObj.pathname.toLowerCase().endsWith('.pdf');

  // Cache-First siêu tốc cho file PDF bất biến (gắn timestamp) trên Supabase Storage
  if (isSupabaseImmutablePdf) {
    event.respondWith(
      caches.open(PDF_CACHE_NAME).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res && res.status === 200) {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      })
    );
    return;
  }

  if (!req.url.startsWith(self.location.origin)) return;

  // Stale-While-Revalidate cho các file PDF tĩnh nội bộ (/pdfs/)
  if (urlObj.pathname.includes('/pdfs/')) {
    event.respondWith(
      caches.open(PDF_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const netPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || netPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((cached) => cached || caches.match('./index.html')))
  );
});
