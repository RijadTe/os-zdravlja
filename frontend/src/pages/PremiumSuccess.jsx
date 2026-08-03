// frontend/src/pages/PremiumSuccess.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PremiumSuccess = () => {
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
          setError('❌ Nema ID-a sesije. Molimo kontaktirajte podršku.');
          setLoading(false);
          return;
        }

        // 🔥 PROVJERI PLAĆANJE NA BACKENDU
        const res = await fetch(`${API_URL}/verify-payment?session_id=${sessionId}`);
        const data = await res.json();
        
        if (data.success && data.premium) {
          // 🔥 AŽURIRAJ LOCAL STORAGE
          const user = JSON.parse(localStorage.getItem('user'));
          if (user) {
            const updatedUser = { ...user, premium: true };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('userEmail', user.email);
            console.log('✅ Premium aktiviran za:', user.email);
          }
          setSuccess(true);
        } else {
          setError('❌ Plaćanje nije potvrđeno. Pokušajte ponovo.');
        }
      } catch (error) {
        console.error('❌ Greška pri verifikaciji:', error);
        setError('❌ Došlo je do greške pri verifikaciji. Pokušajte ponovo.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  // Ako se učitava
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-600 dark:text-gray-300 mt-4">⏳ Provjeravam vaše plaćanje...</p>
      </div>
    );
  }

  // Ako je došlo do greške
  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
        <div className="text-6xl mb-6">😔</div>
        <h1 className="text-4xl font-extrabold mb-4">Došlo je do greške</h1>
        <p className="text-xl text-red-500 mb-6">{error}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Ako ste izvršili plaćanje, molimo kontaktirajte podršku.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/premium"
            className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-semibold transition"
          >
            ⭐ Pokušaj ponovo
          </Link>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition"
          >
            🏠 Vrati se na početnu
          </Link>
        </div>
      </div>
    );
  }

  // Ako je sve uspjelo
  return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-4xl font-extrabold mb-4">Čestitamo!</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
        Postali ste Premium korisnik!
      </p>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Sada imate pristup svim Premium funkcionalnostima.
        <br />
        <span className="text-sm text-green-500">✅ Premium status je aktiviran</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition"
        >
          🏠 Vrati se na početnu
        </Link>
        <Link
          to="/profile"
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-semibold transition"
        >
          👤 Idi na profil
        </Link>
      </div>
    </div>
  );
};

export default PremiumSuccess;