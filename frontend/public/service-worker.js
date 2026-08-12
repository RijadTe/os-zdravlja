// public/service-worker.js
const CACHE_NAME = 'os-zdravlja-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

// Statički fajlovi – uvijek dostupni (uvijek se keširaju)
const staticAssets = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/offline.html'  // ← DODAJ offline.html
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
      .then(() => self.skipWaiting()) // Aktiviraj odmah
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
    .then(() => self.clients.claim()) // Preuzmi kontrolu odmah
  );
});

// ============================================================
// 📡 FETCH – prvo iz keša, pa sa interneta
// ============================================================
self.addEventListener('fetch', event => {
  const request = event.request;

  // Preskoči API pozive (ne keširamo ih)
  if (request.url.includes('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Preskoči Cloudinary slike (ne keširamo)
  if (request.url.includes('cloudinary.com') || request.url.includes('res.cloudinary.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // Preskoči Supabase (ne keširamo)
  if (request.url.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Ako postoji u kešu – vrati odmah
        if (cachedResponse) {
          console.log(`✅ Keš: ${request.url}`);
          return cachedResponse;
        }

        // Ako nema u kešu – dohvati sa interneta
        return fetch(request)
          .then(networkResponse => {
            // Spremi u dinamički keš (samo HTML, CSS, JS, slike)
            if (
              request.url.endsWith('.html') ||
              request.url.endsWith('.css') ||
              request.url.endsWith('.js') ||
              request.url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)
            ) {
              return caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, networkResponse.clone());
                console.log(`💾 Dinamički keš: ${request.url}`);
                return networkResponse;
              });
            }

            return networkResponse;
          })
          .catch(() => {
            // Ako nema interneta i nema keša – prikaži offline stranicu
            console.log(`📡 Offline: ${request.url}`);
            
            // Ako je zahtjev za HTML stranicu, vrati offline.html
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
            
            // Za sve ostale zahtjeve vrati offline.html
            return caches.match('/offline.html');
          });
      })
  );
});

// ============================================================
// 🔔 PUSH NOTIFIKACIJE (ako želiš kasnije)
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