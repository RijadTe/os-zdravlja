// frontend/src/utils/csrf.js

/**
 * Dohvata CSRF token iz cookie-ja
 * Server postavlja cookie '_csrf' kada se aplikacija učita
 */
export const getCsrfToken = () => {
  try {
    const cookies = document.cookie.split('; ');
    const csrfCookie = cookies.find(row => row.startsWith('_csrf='));
    if (csrfCookie) {
      return csrfCookie.split('=')[1];
    }
    return '';
  } catch (error) {
    console.warn('⚠️ Greška pri dohvatu CSRF tokena:', error);
    return '';
  }
};

/**
 * Vraća CSRF token za header (za fetch zahtjeve)
 */
export const getCsrfHeaders = () => {
  const token = getCsrfToken();
  return {
    'x-csrf-token': token
  };
};