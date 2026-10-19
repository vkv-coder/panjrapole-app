const CACHE_NAME = 'panjrapole-v1';
const SHELL_FILES = [
  '/index.html',
  '/signup.html',
  '/css/style.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/entry.js',
  '/js/receipt-print.js',
  '/js/live.js',
  '/js/receipts.js',
  '/js/heads.js',
  '/js/clerks.js',
  '/js/reports.js',
  '/js/settings.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    let cleanPath = url.pathname.replace(/\.html$/, '');
    if (cleanPath === '/index' || cleanPath === '') cleanPath = '/';
    event.respondWith(
      fetch(cleanPath + url.search, { redirect: 'follow' }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
