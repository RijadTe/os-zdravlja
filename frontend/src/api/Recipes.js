// frontend/src/api/recipes.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

/**
 * Dohvati recepte sa filterima (vrsta, vrijeme, tezina, restrikcije, preferencije)
 * @param {Object} filters - Filteri za pretragu
 * @param {number} page - Broj stranice (za paginaciju)
 * @param {number} limit - Broj recepata po stranici
 * @returns {Promise} - Lista recepata
 */
export const fetchRecipes = async (filters = {}, page = 1, limit = 12) => {
  const params = new URLSearchParams({
    ...filters,
    page,
    limit,
  });
  const res = await axios.get(`${API_URL}/recepti?${params}`);
  return res.data;
};

/**
 * Dohvati jedan recept po ID-u (sa preračunatim sastojcima)
 * @param {string} id - UUID recepta
 * @param {number} osobe - Broj osoba za preračun
 * @returns {Promise} - Podaci o receptu
 */
export const fetchRecipeById = async (id, osobe = 4) => {
  // ✅ ISPRAVLJENO: /recepti/ umjesto /recipes/
  const res = await axios.get(`${API_URL}/recepti/${id}?osobe=${osobe}`);
  return res.data;
};

/**
 * Dohvati sve HealthyChef kategorije
 * @returns {Promise} - Lista kategorija
 */
export const fetchHealthyChefCategories = async () => {
  const res = await axios.get(`${API_URL}/healthy-chef/kategorije`);
  return res.data;
};

/**
 * Dohvati faze za odabranu kategoriju
 * @param {string} kategorijaId - ID kategorije
 * @returns {Promise} - Lista faza
 */
export const fetchHealthyChefFaze = async (kategorijaId) => {
  const res = await axios.get(`${API_URL}/healthy-chef/faze/${kategorijaId}`);
  return res.data;
};

/**
 * Dohvati recepte za odabranu fazu (sa filterima)
 * @param {string} fazaId - ID faze
 * @param {string} email - Email korisnika (za preferencije)
 * @param {Object} filters - Dodatni filteri (vrsta, vrijeme, tezina)
 * @returns {Promise} - Lista recepata
 */
export const fetchHealthyChefRecepti = async (fazaId, email, filters = {}) => {
  const params = new URLSearchParams({
    fazaId,
    email,
    ...filters
  });
  const res = await axios.get(`${API_URL}/healthy-chef/recepti?${params}`);
  return res.data;
};

/**
 * Dohvati današnji tajni recept
 * @returns {Promise} - Podaci o tajnom receptu
 */
export const fetchTajniRecept = async () => {
  const res = await axios.get(`${API_URL}/tajni-recept`);
  return res.data;
};