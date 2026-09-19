// public/service-worker.js
const CACHE_NAME = 'os-zdravlja-v4';
const STATIC_CACHE = 'static-v4';
const DYNAMIC_CACHE = 'dynamic-v4';

// Statički fajlovi – uvijek dostupni (uvijek se keširaju)
const staticAssets = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// ============================================================
// 📥 INSTALACIJA – keširaj statičke fajlove
// ============================================================
self.addEventListener('install', event => {
  console.log('✅ Service Worker instaliran');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('✅ Statički fajlovi keširani');
        return cache.addAll(staticAssets);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// 🔄 AKTIVACIJA – očisti stare keševe
// ============================================================
self.addEventListener('activate', event => {
  console.log('✅ Service Worker aktiviran');

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log(`🗑️ Brišem stari keš: ${key}`);
            return caches.delete(key);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

// ============================================================
// 📡 FETCH – keširaj SAMO statičke fajlove
// ============================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // 🔥 1. PUSTI SVE API POZIVE — SW ne dira (bitno za PDF!)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 🔥 2. PUSTI EXTERNE DOMENE (Cloudinary, Supabase, Render)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 🔥 3. PUSTI PDF DOWNLOAD
  if (
    url.pathname.endsWith('.pdf') ||
    request.headers.get('accept')?.includes('application/pdf')
  ) {
    return;
  }

  // 🔥 4. PUSTI NON-GET (POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 🔥 5. Za statičke fajlove — cache-first
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          console.log(`✅ Keš: ${request.url}`);
          return cachedResponse;
        }

        return fetch(request)
          .then(networkResponse => {
            // Keširaj samo uspešne response statičkih fajlova
            if (
              networkResponse.ok &&
              (
                request.url.endsWith('.html') ||
                request.url.endsWith('.css') ||
                request.url.endsWith('.js') ||
                request.url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)
              )
            ) {
              const clone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, clone);
                console.log(`💾 Dinamički keš: ${request.url}`);
              });
            }

            return networkResponse;
          })
          .catch(() => {
            // Offline fallback
            console.log(`📡 Offline: ${request.url}`);

            // Samo za HTML stranice vrati offline.html
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }

            // Za sve ostalo vrati prazan 503
            return new Response('', {
              status: 503,
              statusText: 'Offline'
            });
          });
      })
  );
});

// ============================================================
// 🔔 PUSH NOTIFIKACIJE
// ============================================================
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body || 'Nova notifikacija!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'OS Zdravlja', options)
  );
});

// Klik na notifikaciju
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});