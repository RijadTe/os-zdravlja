// frontend/src/services/healthService.js
// 🔥 UNIVERZALNI HEALTH SERVICE - BEZ INSTALACIJE!

import { 
  connectGoogleFit, 
  syncGoogleFitData, 
  isGoogleFitConnected,
  disconnectGoogleFit,
  getTokenFromUrl
} from './googleFitWeb';

import { 
  connectAppleHealth, 
  syncAppleHealthData, 
  isAppleHealthConnected,
  disconnectAppleHealth,
  isAppleHealthAvailable
} from './appleHealthWeb';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// 1. PLATFORMA DETEKCIJA
// ============================================================
export const getPlatform = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
};

export const isMobile = () => {
  return /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
};

// ============================================================
// 2. RUČNI UNOS (FALLBACK)
// ============================================================
export const manualInput = () => {
  return new Promise((resolve) => {
    console.log('📝 Ručni unos podataka...');
    
    const steps = prompt('📱 Unesite broj koraka (ili 0 za preskakanje):');
    const sleep = prompt('😴 Unesite sate sna (ili 0):');
    const heartRate = prompt('❤️ Unesite otkucaje srca (ili 0):');
    const water = prompt('💧 Unesite količinu vode u ml (ili 0):');

    resolve({
      steps: parseInt(steps) || 0,
      sleep: parseFloat(sleep) || 0,
      heartRate: parseInt(heartRate) || 0,
      water: parseInt(water) || 0,
      calories: 0,
      source: 'manual'
    });
  });
};

// ============================================================
// 3. GLAVNA FUNKCIJA ZA SINHRONIZACIJU
// ============================================================
export const syncHealthData = async (email) => {
  if (!email) {
    throw new Error('Email je obavezan za sinhronizaciju.');
  }

  console.log('🔄 Pokrećem sinhronizaciju zdravstvenih podataka...');
  
  const platform = getPlatform();
  console.log(`📱 Platforma: ${platform}`);

  let healthData = null;

  try {
    // Pokušaj sinhronizaciju sa odgovarajućom platformom
    if (platform === 'android') {
      // Google Fit
      try {
        console.log('🤖 Pokušavam Google Fit...');
        const token = getTokenFromUrl();
        if (token) {
          healthData = await syncGoogleFitData();
          healthData.source = 'google_fit';
          console.log('✅ Google Fit sinhronizovan!');
        } else if (isGoogleFitConnected()) {
          healthData = await syncGoogleFitData();
          healthData.source = 'google_fit';
          console.log('✅ Google Fit sinhronizovan (iz tokena)!');
        } else {
          // Ako nema tokena, pokreni OAuth
          console.log('🔗 Nema Google Fit tokena, pokrećem OAuth...');
          connectGoogleFit();
          return { success: false, redirect: true, message: 'Preusmjeravam na Google Fit...' };
        }
      } catch (error) {
        console.error('❌ Google Fit greška:', error);
        // Fallback na ručni unos
        healthData = await manualInput();
      }
    } 
    else if (platform === 'ios') {
      // Apple Health
      try {
        console.log('🍎 Pokušavam Apple Health...');
        if (isAppleHealthAvailable()) {
          if (!isAppleHealthConnected()) {
            await connectAppleHealth();
          }
          healthData = await syncAppleHealthData();
          healthData.source = 'apple_health';
          console.log('✅ Apple Health sinhronizovan!');
        } else {
          console.log('⚠️ Apple Health nije dostupan, koristim ručni unos...');
          healthData = await manualInput();
        }
      } catch (error) {
        console.error('❌ Apple Health greška:', error);
        healthData = await manualInput();
      }
    } 
    else {
      // Web - ručni unos
      console.log('🌐 Web platforma, koristim ručni unos...');
      healthData = await manualInput();
    }

    // Ako nema podataka, koristi ručni unos
    if (!healthData) {
      healthData = await manualInput();
    }

    // Normaliziraj podatke
    healthData = {
      steps: Math.round(healthData.steps || 0),
      sleep: Math.round((healthData.sleep || 0) * 10) / 10,
      heartRate: Math.round(healthData.heartRate || 0),
      water: Math.round(healthData.water || 0),
      calories: Math.round(healthData.calories || 0),
      source: healthData.source || platform,
      date: new Date().toISOString().split('T')[0]
    };

    console.log('📊 Normalizirani podaci:', healthData);

    // 4. Pošalji na backend
    const response = await fetch(`${API_URL}/api/health/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        ...healthData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Greška pri sinhronizaciji');
    }

    const result = await response.json();
    console.log('✅ Sinhronizacija uspješna:', result);
    return { success: true, data: healthData, result };

  } catch (error) {
    console.error('❌ Greška pri sinhronizaciji:', error);
    throw error;
  }
};

// ============================================================
// 4. DOHVATI PODATKE IZ BAZE
// ============================================================
export const getHealthData = async (email, days = 7) => {
  try {
    const response = await fetch(`${API_URL}/api/health/data/${email}?days=${days}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Greška pri dohvatu podataka:', error);
    throw error;
  }
};

// ============================================================
// 5. DOHVATI NAPREDNU ANALITIKU (PREMIUM)
// ============================================================
export const getHealthAnalytics = async (email) => {
  try {
    const response = await fetch(`${API_URL}/api/health/analytics/${email}`);
    const data = await response.json();
    
    if (!data.success && data.premium_required) {
      throw new Error('PREMIUM_REQUIRED');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Greška pri dohvatu analitike:', error);
    throw error;
  }
};

// ============================================================
// 6. ODJAVA
// ============================================================
export const disconnectHealth = () => {
  disconnectGoogleFit();
  disconnectAppleHealth();
  console.log('🔌 Health servis odjavljen');
};

// ============================================================
// 7. PROVJERA POVEZANOSTI
// ============================================================
export const isHealthConnected = () => {
  return isGoogleFitConnected() || isAppleHealthConnected();
};