// frontend/src/utils/hash.js

/**
 * Generiše SHA-256 hash za tekst (asinhrono)
 * @param {string} text - Tekst koji se hashira
 * @returns {Promise<string>} - SHA-256 hash u hex formatu
 */
export const hashText = async (text) => {
  if (!text) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generiše SHA-256 hash za sliku (asinhrono)
 * @param {File|Blob} file - Slika koja se hashira
 * @returns {Promise<string>} - SHA-256 hash u hex formatu
 */
export const hashImage = async (file) => {
  if (!file) return '';
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generiše JEDNOSTAVAN hash za tekst (sinhrono, brzo)
 * @param {string} text - Tekst koji se hashira
 * @returns {string} - Jednostavan hash (txt_12345)
 */
export const hashTextSimple = (text) => {
  if (!text) return '';
  let hash = 0;
  const str = text.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `txt_${Math.abs(hash)}`;
};

/**
 * Generiše JEDNOSTAVAN hash za sliku (sinhrono, brzo)
 * @param {File|Blob} file - Slika koja se hashira
 * @returns {Promise<string>} - Jednostavan hash (img_12345)
 */
export const hashImageSimple = async (file) => {
  if (!file) return '';
  // Uzmi samo prvih 500 bajtova za brži hash
  const buffer = await file.arrayBuffer();
  const view = new Uint8Array(buffer);
  const str = Array.from(view.slice(0, 500)).join('');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `img_${Math.abs(hash)}`;
};

/**
 * Generiše hash za tekst (asinhrono, preporučeno)
 * @param {string} text - Tekst koji se hashira
 * @returns {Promise<string>} - SHA-256 hash
 */
export const generateTextHash = async (text) => {
  return await hashText(text);
};

/**
 * Generiše hash za sliku (asinhrono, preporučeno)
 * @param {File} file - Slika koja se hashira
 * @returns {Promise<string>} - SHA-256 hash
 */
export const generateImageHash = async (file) => {
  return await hashImage(file);
};

// Default export za lakši import
export default {
  hashText,
  hashImage,
  hashTextSimple,
  hashImageSimple,
  generateTextHash,
  generateImageHash
};