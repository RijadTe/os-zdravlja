// frontend/src/services/NotificationService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const sendTajniReceptNotification = async () => {
  try {
    const res = await axios.post(`${API_URL}/notifikacije/tajni-recept`);
    console.log(res.data.message);
    return res.data;
  } catch (error) {
    console.error('❌ Greška pri slanju notifikacija:', error);
    return null;
  }
};

// Proširenje – notifikacija za nove recepte
export const sendNewRecipesNotification = async () => {
  try {
    const res = await axios.post(`${API_URL}/notifikacije/novi-recepti`);
    console.log(res.data.message);
    return res.data;
  } catch (error) {
    console.error('❌ Greška pri slanju notifikacija:', error);
    return null;
  }
};