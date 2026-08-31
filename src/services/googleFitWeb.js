// frontend/src/services/googleFitWeb.js 

// 🔥 Google Fit - direktno preko browsera (BEZ INSTALACIJE!)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Google OAuth Client ID - iz Google Cloud Console
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/fit-callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
];

// ============================================================
// 1. POVEZIVANJE - otvori Google OAuth
// ============================================================
export const connectGoogleFit = () => {
  if (!CLIENT_ID) {
    console.error('❌ Google Client ID nije postavljen!');
    alert('⚠️ Google Fit nije konfigurisan. Molimo kontaktirajte podršku.');
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=${SCOPES.join(' ')}&prompt=consent`;
  
  console.log('🔗 Otvaram Google OAuth...');
  window.location.href = authUrl;
};

// ============================================================
// 2. DOHVATI TOKEN IZ URL-a (POPRAVLJENO ZA MOBILNE)
// ============================================================
export const getTokenFromUrl = () => {
  console.log('🔍 getTokenFromUrl: Počinjem...');
  console.log('🔍 window.location.href:', window.location.href);
  console.log('🔍 window.location.hash:', window.location.hash);
  console.log('🔍 window.location.search:', window.location.search);
  
  // 🔥 1. Pokušaj iz hash-a (standardno)
  let hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const tokenType = params.get('token_type');
    
    if (token) {
      console.log('✅ Google Fit token dobijen iz hash-a!');
      localStorage.setItem('google_fit_token', token);
      localStorage.setItem('google_fit_token_type', tokenType || 'Bearer');
      localStorage.setItem('google_fit_token_expires', Date.now() + (parseInt(expiresIn) || 3600) * 1000);
      
      // Očisti URL od tokena
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }
  }
  
  // 🔥 2. Pokušaj iz search parametara (fallback za mobilne)
  const search = window.location.search;
  if (search) {
    const params = new URLSearchParams(search.substring(1));
    const token = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const tokenType = params.get('token_type');
    
    if (token) {
      console.log('✅ Google Fit token dobijen iz search parametara!');
      localStorage.setItem('google_fit_token', token);
      localStorage.setItem('google_fit_token_type', tokenType || 'Bearer');
      localStorage.setItem('google_fit_token_expires', Date.now() + (parseInt(expiresIn) || 3600) * 1000);
      
      // Očisti URL od tokena
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }
  }
  
  // 🔥 3. Pokušaj iz localStorage (ako je već povezan)
  const savedToken = localStorage.getItem('google_fit_token');
  const expires = parseInt(localStorage.getItem('google_fit_token_expires') || '0');
  
  if (savedToken && expires > Date.now()) {
    console.log('✅ Google Fit token dobijen iz localStorage!');
    return savedToken;
  }
  
  console.log('❌ Nema tokena ni u hash-u, ni u search-u, ni u localStorage');
  return null;
};

// ============================================================
// 3. DOHVATI PODATKE SA GOOGLE FIT-a
// ============================================================
export const syncGoogleFitData = async () => {
  const token = getTokenFromUrl();
  if (!token) {
    throw new Error('Niste povezani sa Google Fit-om. Povežite se prvo.');
  }

  console.log('🔄 Dohvatam podatke sa Google Fit...');

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.sleep.segment' },
          { dataTypeName: 'com.google.heart_rate.bpm' },
          { dataTypeName: 'com.google.hydration' },
          { dataTypeName: 'com.google.calories.expended' }
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startOfDay.getTime(),
        endTimeMillis: now.getTime()
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('google_fit_token');
        throw new Error('Token je istekao. Povežite se ponovo.');
      }
      throw new Error(`Google Fit greška: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 Google Fit podaci:', data);

    let result = { steps: 0, sleep: 0, heartRate: 0, water: 0, calories: 0 };
    
    if (data.bucket) {
      data.bucket.forEach(bucket => {
        bucket.dataset.forEach(dataset => {
          const point = dataset.point?.[0];
          if (point) {
            const value = point.value?.[0]?.fpVal || 0;
            const dataSource = dataset.dataSourceId || '';
            
            if (dataSource.includes('step_count')) {
              result.steps = Math.round(value);
            } else if (dataSource.includes('sleep')) {
              result.sleep = Math.round(value / 3600 * 10) / 10;
            } else if (dataSource.includes('heart_rate')) {
              result.heartRate = Math.round(value);
            } else if (dataSource.includes('hydration')) {
              result.water = Math.round(value);
            } else if (dataSource.includes('calories')) {
              result.calories = Math.round(value);
            }
          }
        });
      });
    }

    return result;

  } catch (error) {
    console.error('❌ Google Fit greška:', error);
    throw error;
  }
};

// ============================================================
// 4. PROVJERA DA LI JE KORISNIK POVEZAN
// ============================================================
export const isGoogleFitConnected = () => {
  const token = localStorage.getItem('google_fit_token');
  const expires = parseInt(localStorage.getItem('google_fit_token_expires') || '0');
  return token && expires > Date.now();
};

// ============================================================
// 5. ODJAVA SA GOOGLE FIT-a
// ============================================================
export const disconnectGoogleFit = () => {
  localStorage.removeItem('google_fit_token');
  localStorage.removeItem('google_fit_token_type');
  localStorage.removeItem('google_fit_token_expires');
  console.log('🔌 Google Fit odjavljen');
};

// ============================================================
// POMOĆNA FUNKCIJA ZA DEBUG
// ============================================================
export const debugGoogleFit = () => {
  console.log('🔍 DEBUG GOOGLE FIT:');
  console.log('  localStorage token:', localStorage.getItem('google_fit_token'));
  console.log('  localStorage expires:', localStorage.getItem('google_fit_token_expires'));
  console.log('  window.location.href:', window.location.href);
  console.log('  window.location.hash:', window.location.hash);
  console.log('  window.location.search:', window.location.search);
};