const CACHE_NAME = 'contract-calc-v7';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Install v6');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Сразу активировать новую версию
  );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
  console.log('[SW] Activate v6');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Взять контроль над всеми вкладками
  );
});

// Стратегия: СЕТЬ ПЕРВАЯ для HTML, кэш для остального
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Для HTML файлов — сначала сеть, потом кэш (Network First)
  if (event.request.mode === 'navigate' || 
      url.pathname.endsWith('.html') || 
      url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Сохраняем свежую версию в кэш
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Если сеть недоступна — берём из кэша
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Для остальных ресурсов — кэш первый (Cache First)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
  );
});
