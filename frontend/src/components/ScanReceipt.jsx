// frontend/src/components/ScanReceipt.jsx
import React, { useState } from 'react';
import axios from 'axios';

// 🔥 POPRAVLJENO - koristi VITE_API_URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ScanReceipt = ({ onNamirniceDodane }) => {
  const [slika, setSlika] = useState(null);
  const [loading, setLoading] = useState(false);
  const [poruka, setPoruka] = useState('');
  const [prepoznate, setPrepoznate] = useState([]);

  const handleScan = async () => {
    if (!slika) {
      setPoruka('⚠️ Molimo odaberite sliku računa.');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      setPoruka('⚠️ Morate biti prijavljeni.');
      return;
    }

    setLoading(true);
    setPoruka('🔍 AI analizira račun...');

    try {
      const formData = new FormData();
      formData.append('slika', slika);
      formData.append('email', user.email);

      // 🔥 POPRAVLJENO - koristi API_URL umjesto localhost
      const res = await axios.post(`${API_URL}/api/scan-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      setPrepoznate(res.data.namirnice);
      setPoruka(res.data.poruka);

      // Dodaj u frižider (ako postoji callback)
      if (onNamirniceDodane) {
        onNamirniceDodane(res.data.namirnice);
      }

    } catch (error) {
      console.error('Greška:', error);
      setPoruka('❌ Greška pri skeniranju. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 shadow-md border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg md:text-xl font-bold mb-3 dark:text-white flex items-center gap-2">
        📸 Skeniraj račun
        <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ PREMIUM</span>
      </h3>
      
      {/* 🔥 FLEX KONTEJNER - RESPONSIVE ZA MOBIL */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSlika(e.target.files[0])}
          className="flex-1 border rounded-lg px-4 py-2 text-sm md:text-base dark:bg-gray-700 dark:text-white dark:border-gray-600 w-full"
        />
        <button
          onClick={handleScan}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 text-sm md:text-base w-full sm:w-auto"
        >
          {loading ? '⏳ Skeniram...' : '📸 Skeniraj'}
        </button>
      </div>

      {poruka && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${
          poruka.includes('✅') ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' :
          poruka.includes('❌') || poruka.includes('⚠️') ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' :
          'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
        }`}>
          {poruka}
        </div>
      )}

      {prepoznate.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold dark:text-white mb-2">🛒 Prepoznate namirnice:</h4>
          <div className="flex flex-wrap gap-2">
            {prepoznate.map((item, i) => (
              <span key={i} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm dark:text-white break-words max-w-[150px] md:max-w-none">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanReceipt;