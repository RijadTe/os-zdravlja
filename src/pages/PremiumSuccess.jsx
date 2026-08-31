// frontend/src/pages/PremiumSuccess.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PremiumSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        console.log('🔍 Provjeravam plaćanje, session_id:', sessionId);
        
        if (!sessionId) {
          setError(t('premiumsuccess.errors.no_session'));
          setLoading(false);
          return;
        }

        // 🔥 1. DOHVATI KORISNIKA
        const user = JSON.parse(localStorage.getItem('user'));
        const email = user?.email || localStorage.getItem('userEmail');
        
        if (!email) {
          setError('Nema emaila za ažuriranje premiuma.');
          setLoading(false);
          return;
        }

        // 🔥 2. VERIFIKUJ PLAĆANJE PREKO BACKEND-A
        const response = await fetch(`${API_URL}/api/verify-payment?session_id=${sessionId}`);
        const data = await response.json();

        if (data.success && data.premium) {
          console.log('✅ Plaćanje potvrđeno za:', email);

          // 🔥 3. PROVJERI TRENUTNI PREMIUM STATUS
          const { data: profil, error: profilError } = await supabase
            .from('profili')
            .select('premium')
            .eq('email', email)
            .maybeSingle();

          if (profilError) {
            console.error('❌ Greška pri dohvatu profila:', profilError);
          }

          // 🔥 4. AŽURIRAJ SUPABASE (ako već nije premium)
          if (!profil?.premium) {
            const { error: updateError } = await supabase
              .from('profili')
              .update({ premium: true })
              .eq('email', email);

            if (updateError) {
              console.error('❌ Greška pri ažuriranju premiuma:', updateError);
              setError('Došlo je do greške pri aktivaciji premiuma.');
              setLoading(false);
              return;
            }
            console.log('✅ Premium aktiviran u Supabase za:', email);
          } else {
            console.log('ℹ️ Premium je već aktiviran za:', email);
          }

          // 🔥 5. OSVJEŽI LOCALSTORAGE
          const updatedUser = { ...user, premium: true };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // 🔥 6. OSVJEŽI SESSION U SUPABASE (ako postoji)
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              // Ažuriraj session metadata
              const { error: updateSessionError } = await supabase.auth.updateUser({
                data: { premium: true }
              });
              if (updateSessionError) {
                console.warn('⚠️ Greška pri ažuriranju session-a:', updateSessionError);
              }
            }
          } catch (sessionError) {
            console.warn('⚠️ Greška pri ažuriranju session-a:', sessionError);
          }

          setSuccess(true);
        } else {
          setError('Plaćanje nije potvrđeno. Pokušajte ponovo.');
        }
      } catch (error) {
        console.error('❌ Greška:', error);
        setError(t('premiumsuccess.errors.verification'));
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, t]);

  // ============================================================
  // RENDER - LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('premiumsuccess.loading')}</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER - ERROR
  // ============================================================
  if (error) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8">
          <span className="text-5xl block mb-4">😢</span>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-300 mb-2">
            {t('premiumsuccess.error.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('premiumsuccess.error.message')}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/premium"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              {t('premiumsuccess.error.retry_button')}
            </Link>
            <Link
              to="/"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('premiumsuccess.error.home_button')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER - SUCCESS
  // ============================================================
  if (success) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8">
          <span className="text-5xl block mb-4">🎉</span>
          <h2 className="text-2xl font-bold text-green-600 dark:text-green-300 mb-2">
            {t('premiumsuccess.success.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {t('premiumsuccess.success.subtitle')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('premiumsuccess.success.message')}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              {t('premiumsuccess.success.home_button')}
            </Link>
            <Link
              to="/profile"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('premiumsuccess.success.profile_button')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PremiumSuccess;