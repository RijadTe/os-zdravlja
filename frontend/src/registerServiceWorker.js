// frontend/src/registerServiceWorker.js

// 🔥 REGISTRACIJA SERVICE WORKER-A
export const registerServiceWorker = () => {
  // Provjeri da li browser podržava Service Worker
  if ('serviceWorker' in navigator) {
    // Registriraj samo u produkciji (ne u development modu)
    if (import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('✅ Service Worker registriran:', registration);

            // 🔥 PROVJERA ZA UPDATE
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              console.log('🔄 Novi Service Worker pronađen:', newWorker);

              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 Nova verzija dostupna!');
                  
                  // 🔥 OBAVIJESTI KORISNIKA
                  const shouldUpdate = window.confirm(
                    '📱 Nova verzija aplikacije je dostupna!\n\n' +
                    'Kliknite "OK" za osvježavanje i ažuriranje.'
                  );
                  
                  if (shouldUpdate) {
                    window.location.reload();
                  }
                }
              });
            });
          })
          .catch((error) => {
            console.error('❌ Service Worker registracija neuspjela:', error);
          });
      });
    } else {
      console.log('ℹ️ Service Worker nije registriran u development modu');
    }
  } else {
    console.log('ℹ️ Browser ne podržava Service Worker');
  }
};

// 🔥 OTVORI OFFLINE STRANICU AKO NEMA INTERNETA
export const checkOnlineStatus = () => {
  const isOnline = navigator.onLine;
  
  if (!isOnline) {
    console.log('📡 Offline - prikazujem keširane podatke');
    
    // Dodaj CSS klasu za offline indikator
    document.body.classList.add('offline-mode');
    
    // Prikaži obavijest korisniku
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
      <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
        📡 Offline - pregledavate keširane podatke
      </div>
    `;
    document.body.appendChild(notification);
    
    // Automatski ukloni nakon 5 sekundi
    setTimeout(() => {
      notification.remove();
    }, 5000);
  } else {
    document.body.classList.remove('offline-mode');
  }
};

// 🔥 PRATI PROMJENE ONLINE STATUSA
export const watchOnlineStatus = () => {
  window.addEventListener('online', () => {
    console.log('📶 Internet se vratio!');
    
    // Ukloni offline notifikaciju
    const notification = document.querySelector('.offline-notification');
    if (notification) notification.remove();
    
    // Osvježi stranicu da dobiješ svježe podatke
    if (window.confirm('📶 Internet se vratio! Želite li osvježiti stranicu?')) {
      window.location.reload();
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('📡 Internet nestao - prelazim na offline mod');
    checkOnlineStatus();
  });
};