// frontend/src/components/ScanReceipt.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ScanReceipt = ({ onNamirniceDodane }) => {
  const { t, ready } = useTranslation(); // ← DODAJ ready!
  const [slika, setSlika] = useState(null);
  const [loading, setLoading] = useState(false);
  const [poruka, setPoruka] = useState('');
  const [prepoznate, setPrepoznate] = useState([]);
  const fileInputRef = useRef(null);

  // 🔥 AKO PREVODI NISU SPREMNI - NE RENDERIRAJ (ili prikaži loading)
  if (!ready) {
    return (
      <div className="w-full text-center py-2">
        <span className="text-gray-400">⏳ Učitavanje...</span>
      </div>
    );
  }

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

      const res = await axios.post(`${API_URL}/api/scan-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });

      setPrepoznate(res.data.namirnice || []);
      setPoruka(res.data.poruka || '✅ Račun uspješno skeniran!');

      if (onNamirniceDodane && res.data.namirnice) {
        onNamirniceDodane(res.data.namirnice);
      }

    } catch (error) {
      console.error('Greška:', error);
      setPoruka('❌ Greška pri skeniranju. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RESPOZIVNI RENDER - SA FALLBACK TEKSTOVIMA (bez t() ako nisu spremni)
  // ============================================================
  return (
    <div className="w-full">
      {/* RESPOZIVNI DIO - radi na svim uređajima */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        
        {/* File input - responzivan */}
        <div className="w-full sm:flex-1">
          <label 
            className="flex flex-row items-center justify-center w-full px-3 py-2 sm:py-3 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors gap-2"
          >
            <span className="text-xl sm:text-2xl">📷</span>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center truncate max-w-[150px] sm:max-w-full">
              {slika ? slika.name : '📎 Odaberi sliku računa'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setSlika(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {/* Scan dugme - responzivno */}
        <button
          onClick={handleScan}
          disabled={!slika || loading}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition text-sm sm:text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              ⏳ Skeniram...
            </>
          ) : (
            '📸 Skeniraj'
          )}
        </button>
      </div>

      {/* Poruka */}
      {poruka && (
        <div className={`mt-3 p-3 rounded-xl text-xs sm:text-sm ${
          poruka.includes('✅') ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' :
          poruka.includes('❌') || poruka.includes('⚠️') ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' :
          'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
        }`}>
          {poruka}
        </div>
      )}

      {/* Prepoznate namirnice */}
      {prepoznate.length > 0 && (
        <div className="mt-3">
          <h4 className="font-semibold dark:text-white text-sm mb-2">🛒 Prepoznate namirnice:</h4>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {prepoznate.map((item, i) => (
              <span key={i} className="bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm dark:text-white">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Info tekst */}
      <p className="mt-2 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 text-center">
        📸 Uslikajte račun iz trgovine i automatski ćemo dodati namirnice u frižider.
      </p>
    </div>
  );
};

export default ScanReceipt;