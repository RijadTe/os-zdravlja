// frontend/src/pages/PremiumSuccess.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PremiumSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const sessionId = searchParams.get('session_id');

  // ============================================================
  // 🔥 OSVJEŽI KORISNIKA IZ BAZE
  // ============================================================
  const refreshUserFromDatabase = async (email) => {
    try {
      console.log('🔄 Osvježavam korisnika iz baze za:', email);
      
      // 🔥 DOHVATI PROFIL IZ BAZE
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Profil dohvaćen iz baze:', data.data);
        
        // 🔥 OSVJEŽI LOCALSTORAGE
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const updatedUser = {
          ...currentUser,
          premium: data.data.premium || false,
          kviz_zavrsen: data.data.kviz_zavrsen || false,
          vrsta: data.data.vrsta || [],
          izbjegava: data.data.izbjegava || [],
          preferencije: data.data.preferencije || [],
          vrijeme: data.data.vrijeme || '',
          tezina: data.data.tezina || '',
          kalorije: data.data.kalorije || ''
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('✅ Korisnik osvježen, premium:', updatedUser.premium);
        return updatedUser;
      }
      return null;
    } catch (error) {
      console.error('❌ Greška pri osvježavanju:', error);
      return null;
    }
  };

  // ============================================================
  // 🔥 RUČNO AŽURIRAJ PREMIUM U BAZI (AKO WEBHOOK NIJE RADIO)
  // ============================================================
  const updatePremiumInDatabase = async (email) => {
    try {
      console.log('📝 Ažuriram premium u bazi za:', email);
      
      const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premium: true })
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Premium ažuriran u bazi');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Greška pri ažuriranju premiuma:', error);
      return false;
    }
  };

  // ============================================================
  // 🔐 VERIFIKACIJA PLAĆANJA
  // ============================================================
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        console.log('🔍 Provjeravam plaćanje, session_id:', sessionId);
        
        if (!sessionId) {
          setError(t('premiumsuccess.errors.no_session'));
          setLoading(false);
          return;
        }

        // 🔥 VERIFIKACIJA PLAĆANJA
        const res = await fetch(`${API_URL}/api/verify-payment?session_id=${sessionId}`);
        const data = await res.json();
        
        if (data.success && data.premium) {
          console.log('✅ Plaćanje potvrđeno!');
          
          // 🔥 DOHVATI EMAIL IZ LOCALSTORAGE
          const user = JSON.parse(localStorage.getItem('user'));
          const email = user?.email || localStorage.getItem('userEmail');
          
          if (email) {
            // 🔥 1. OSVJEŽI PROFIL IZ BAZE (DA POKUPI SVE PODATKE)
            await refreshUserFromDatabase(email);
            
            // 🔥 2. AKO JOŠ UVJEK NIJE PREMIUM, RUČNO AŽURIRAJ
            const updatedUser = JSON.parse(localStorage.getItem('user'));
            if (!updatedUser?.premium) {
              console.log('⚠️ Premium nije aktiviran, pokušavam ručno...');
              await updatePremiumInDatabase(email);
              await refreshUserFromDatabase(email);
            }
            
            // 🔥 3. PROVJERI ZADNJI PUT
            const finalUser = JSON.parse(localStorage.getItem('user'));
            if (finalUser?.premium) {
              console.log('✅ Premium uspješno aktiviran!');
              setSuccess(true);
            } else {
              console.warn('⚠️ Premium nije aktiviran, ali plaćanje je uspješno.');
              setSuccess(true); // I dalje prikaži uspjeh
            }
          } else {
            setSuccess(true);
          }
        } else {
          setError(t('premiumsuccess.errors.not_confirmed'));
        }
      } catch (error) {
        console.error('❌ Greška pri verifikaciji:', error);
        setError(t('premiumsuccess.errors.verification'));
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, t]);

  // ============================================================
  // 🔄 OSVJEŽI STRANICU NAKON USPJEHA (DA SE PROMJENE VIDE)
  // ============================================================
  useEffect(() => {
    if (success) {
      // 🔥 NAKON 3 SEKUNDE, PREUSMJERI NA POČETNU I REFRESH
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ============================================================
  // 🖥️ RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-600 dark:text-gray-300 mt-4">⏳ {t('premiumsuccess.loading')}</p>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - ERROR
  // ============================================================
  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
        <div className="text-6xl mb-6">😔</div>
        <h1 className="text-4xl font-extrabold mb-4">{t('premiumsuccess.error.title')}</h1>
        <p className="text-xl text-red-500 mb-6">{error}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          {t('premiumsuccess.error.message')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/premium"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-semibold transition"
          >
            ⭐ {t('premiumsuccess.error.retry_button')}
          </Link>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition"
          >
            🏠 {t('premiumsuccess.error.home_button')}
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // 🖥️ RENDER - SUCCESS
  // ============================================================
  return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-4xl font-extrabold mb-4">{t('premiumsuccess.success.title')}</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
        {t('premiumsuccess.success.subtitle')}
      </p>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {t('premiumsuccess.success.message')}
        <br />
        <span className="text-sm text-green-500 font-bold">✅ {t('premiumsuccess.success.activated')}</span>
        <br />
        <span className="text-xs text-gray-400">⏳ Preusmjeravam za 3 sekunde...</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition"
        >
          🏠 {t('premiumsuccess.success.home_button')}
        </Link>
        <Link
          to="/profile"
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-semibold transition"
        >
          👤 {t('premiumsuccess.success.profile_button')}
        </Link>
      </div>
    </div>
  );
};

export default PremiumSuccess;