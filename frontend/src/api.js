// frontend/src/api.js

import { API_URL, isNative } from './config';

// ============================================================
// 🔥 GLAVNA FUNKCIJA ZA SVE API POZIVE
// ============================================================
export const apiFetch = async (endpoint, options = {}) => {
  // 1. Očisti endpoint (ukloni viškove /)
  let cleanEndpoint = endpoint.replace(/^\/+/, '').replace(/\/+$/, '');
  
  // 2. Spriječi duplo /api/ (ako se negdje potkralo)
  if (cleanEndpoint.startsWith('api/')) {
    cleanEndpoint = cleanEndpoint.substring(4);
  }
  
  // 3. 🔥🔥🔥 DODAJ /api/ PREFIKS (backend očekuje /api/...)
  const url = `${API_URL}/api/${cleanEndpoint}`;
  
  // 4. Log za provjeru (vidjet ćeš u konzoli)
  console.log(`📡 [${isNative() ? '📱 NATIVE' : '🌐 PWA'}] ${options.method || 'GET'} ${url}`);
  
  // 5. Pošalji zahtjev
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

// ============================================================
// 🔥 SVE API METODE (OVO SU TVOJI ENDPOINTI)
// ============================================================
export const api = {
  // --- AUTH ---
  login: (data) => apiFetch('auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  register: (data) => apiFetch('auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  logout: () => apiFetch('auth/logout', { method: 'POST' }),
  forgotPassword: (email) => apiFetch('auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  resetPassword: (data) => apiFetch('auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  me: (token) => apiFetch('auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  }),

  // --- PROFIL ---
  getProfile: (email) => apiFetch(`profil/${encodeURIComponent(email)}`),
  updateProfile: (email, data) => apiFetch(`profil/${encodeURIComponent(email)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteProfile: (email) => apiFetch(`profil/${email}/delete`, {
    method: 'DELETE',
  }),
  createProfile: (data) => apiFetch('profil', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // --- RECEPTI ---
  getRecipes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`recepti${query ? `?${query}` : ''}`);
  },
  getRecipe: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`recepti/${id}${query ? `?${query}` : ''}`);
  },
  getRecipesByUser: (email) => apiFetch(`recepti/korisnik/${encodeURIComponent(email)}`),

  // --- QUIZ ---
  saveQuiz: (data) => apiFetch('quiz', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // --- AI CHEF ---
  aiChef: (data) => apiFetch('ai-chef', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  aiChefLimit: (email) => apiFetch(`ai-chef/limit/${encodeURIComponent(email)}`),
  aiChefUnlock: (data) => apiFetch('ai-chef/unlock', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  aiChefVideoAds: (email) => apiFetch(`ai-chef/video-ads/${encodeURIComponent(email)}`),
  aiChefCacheClean: () => apiFetch('ai-chef/cache/clean', {
    method: 'DELETE',
  }),

  // --- WEEKLY PLAN ---
  weeklyPlan: (data) => apiFetch('weekly-plan', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  aiWeeklyPlan: (data) => apiFetch('ai-weekly-plan', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // --- COMMUNITY ---
  getPosts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`community/objave${query ? `?${query}` : ''}`);
  },
  getPost: (id) => apiFetch(`community/objave/${id}`),
  // 🔥🔥🔥 POPRAVI I OVO! 🔥🔥🔥
  createPost: (formData) => {
    // Za slike, šaljemo direktno (bez JSON)
    return fetch(`${API_URL}/api/community/objave`, {  // ← DODAJ /api/!
      method: 'POST',
      body: formData,
    });
  },
  likePost: (id, email) => apiFetch(`community/objave/${id}/like`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  deletePost: (id) => apiFetch(`community/objave/${id}`, {
    method: 'DELETE',
  }),

  // --- AI SOMMELIER ---
  aiSommelier: (data) => apiFetch('ai-sommelier', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  aiSommelierCacheClean: () => apiFetch('ai-sommelier/cache/clean', {
    method: 'DELETE',
  }),

  // --- VODA ---
  getWater: (email) => apiFetch(`water/${encodeURIComponent(email)}`),
  getWaterToday: (email) => apiFetch(`water/today/${encodeURIComponent(email)}`),
  addWater: (data) => apiFetch('water', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  resetWater: (data) => apiFetch('water/reset', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getWaterGoal: (email) => apiFetch(`water/goal/${encodeURIComponent(email)}`),
  updateWaterGoal: (email, data) => apiFetch(`water/goal/${encodeURIComponent(email)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // --- HEALTH ---
  syncHealth: (data) => apiFetch('health/sync', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getHealthData: (email, days = 7) => apiFetch(`health/data/${encodeURIComponent(email)}?days=${days}`),
  getHealthAnalytics: (email) => apiFetch(`health/analytics/${encodeURIComponent(email)}`),

  // --- NOTIFIKACIJE ---
  getNotifications: (email) => apiFetch(`notifikacije/${encodeURIComponent(email)}`),
  getRecommendations: (email) => apiFetch(`notifikacije/preporuke/${encodeURIComponent(email)}`),
  markNotificationRead: (id) => apiFetch(`notifikacije/${id}/read`, {
    method: 'PUT',
  }),
  markAllRead: (email) => apiFetch(`notifikacije/${email}/read-all`, {
    method: 'PUT',
  }),
  deleteNotification: (id) => apiFetch(`notifikacije/${id}`, {
    method: 'DELETE',
  }),
  subscribePush: (data) => apiFetch('notifikacije/subscribe', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // --- STRIPE ---
  createCheckout: (email) => apiFetch('create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  verifyPayment: (sessionId) => apiFetch(`verify-payment?session_id=${sessionId}`),

  // --- BADGES ---
  getBadges: (email) => apiFetch(`badges/${encodeURIComponent(email)}`),
  getAllBadges: (email = '') => apiFetch(`badges/all${email ? `/${encodeURIComponent(email)}` : ''}`),
  checkBadges: (data) => apiFetch('badges/check', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  awardBadge: (data) => apiFetch('badges/award', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // --- MICRO NUTRIENTS ---
  getMicroNutrients: (email) => apiFetch(`micro-nutrients/${encodeURIComponent(email)}`),
  getMicroNutrientsToday: (email) => apiFetch(`micro-nutrients/today/${encodeURIComponent(email)}`),
  saveMicroNutrients: (data) => apiFetch('micro-nutrients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // --- AI CHAT ---
  aiChat: (data) => apiFetch('ai-chat', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // --- OBROCI ---
  getMeals: (email, date) => apiFetch(`obroci/${encodeURIComponent(email)}${date ? `?datum=${date}` : ''}`),
  addMeal: (data) => apiFetch('obroci', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteMeal: (id) => apiFetch(`obroci/${id}`, {
    method: 'DELETE',
  }),

  // --- OSTALO ---
  getGeoIP: () => apiFetch('geoip'),
  generate2FA: (email) => apiFetch('auth/2fa/generate', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  verify2FA: (data) => apiFetch('auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  translateRecipe: (data) => apiFetch('recepti/translate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  translateAll: (data) => apiFetch('recepti/translate-all', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  translationStatus: (lang) => apiFetch(`recepti/translate/status${lang ? `?jezik=${lang}` : ''}`),
  generatePDF: (email, date) => apiFetch(`pdf/izvjestaj/${encodeURIComponent(email)}${date ? `?datum=${date}` : ''}`),
  saveGoals: (data) => apiFetch('goals', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getHealthDataAdvanced: (email) => apiFetch(`zdravstveni-podaci/${encodeURIComponent(email)}`),
  saveHealthData: (data) => apiFetch('zdravstveni-podaci', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  test: () => apiFetch('test'),
};

export default api;