// frontend/src/services/appleHealthWeb.js
// 🔥 Apple Health - direktno preko Safari-ja (BEZ INSTALACIJE!)

// ============================================================
// 1. PROVJERA DOSTUPNOSTI
// ============================================================
export const isAppleHealthAvailable = () => {
  // Apple Health je dostupan samo u Safari-ju na iOS-u
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return isIOS && window.HealthKit !== undefined;
};

// ============================================================
// 2. POVEZIVANJE SA APPLE HEALTH
// ============================================================
export const connectAppleHealth = () => {
  return new Promise((resolve, reject) => {
    if (!isAppleHealthAvailable()) {
      reject(new Error('Apple Health nije dostupan na ovom uređaju. Potreban je iOS i Safari.'));
      return;
    }

    console.log('🍎 Povezivanje sa Apple Health...');

    window.HealthKit.requestAuthorization({
      types: ['steps', 'sleepAnalysis', 'heartRate', 'water', 'calories']
    }, (err, result) => {
      if (err) {
        console.error('❌ Apple Health greška:', err);
        reject(err);
      } else {
        console.log('✅ Apple Health povezan!');
        localStorage.setItem('apple_health_connected', 'true');
        resolve(result);
      }
    });
  });
};

// ============================================================
// 3. DOHVATI PODATKE SA APPLE HEALTH
// ============================================================
export const syncAppleHealthData = () => {
  return new Promise((resolve, reject) => {
    if (!isAppleHealthAvailable()) {
      reject(new Error('Apple Health nije dostupan'));
      return;
    }

    console.log('🔄 Dohvatam podatke sa Apple Health...');

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Dohvati korake
    window.HealthKit.getSamples({
      type: 'steps',
      startDate: startOfDay,
      endDate: now,
      limit: 1000
    }, (err, stepsData) => {
      if (err) {
        console.error('❌ Greška pri dohvatu koraka:', err);
        reject(err);
        return;
      }

      // Dohvati san
      window.HealthKit.getSamples({
        type: 'sleepAnalysis',
        startDate: startOfDay,
        endDate: now,
        limit: 1000
      }, (err, sleepData) => {
        if (err) {
          console.error('❌ Greška pri dohvatu sna:', err);
          // Nastavi sa ostalim podacima
        }

        // Dohvati otkucaje srca
        window.HealthKit.getSamples({
          type: 'heartRate',
          startDate: startOfDay,
          endDate: now,
          limit: 1000
        }, (err, heartData) => {
          if (err) {
            console.error('❌ Greška pri dohvatu srca:', err);
          }

          // Dohvati vodu
          window.HealthKit.getSamples({
            type: 'water',
            startDate: startOfDay,
            endDate: now,
            limit: 1000
          }, (err, waterData) => {
            if (err) {
              console.error('❌ Greška pri dohvatu vode:', err);
            }

            const totalSteps = stepsData?.reduce((sum, item) => sum + (item.value || 0), 0) || 0;
            const totalSleep = sleepData?.reduce((sum, item) => sum + (item.value || 0), 0) / 3600 || 0;
            const avgHeartRate = heartData?.length > 0 
              ? heartData.reduce((sum, item) => sum + (item.value || 0), 0) / heartData.length 
              : 0;
            const totalWater = waterData?.reduce((sum, item) => sum + (item.value || 0), 0) || 0;

            const result = {
              steps: Math.round(totalSteps),
              sleep: Math.round(totalSleep * 10) / 10,
              heartRate: Math.round(avgHeartRate),
              water: Math.round(totalWater),
              calories: 0,
              source: 'apple_health'
            };

            console.log('📊 Apple Health podaci:', result);
            resolve(result);
          });
        });
      });
    });
  });
};

// ============================================================
// 4. PROVJERA DA LI JE KORISNIK POVEZAN
// ============================================================
export const isAppleHealthConnected = () => {
  return localStorage.getItem('apple_health_connected') === 'true';
};

// ============================================================
// 5. ODJAVA SA APPLE HEALTH
// ============================================================
export const disconnectAppleHealth = () => {
  localStorage.removeItem('apple_health_connected');
  console.log('🔌 Apple Health odjavljen');
};