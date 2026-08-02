// frontend/src/pages/PremiumSuccess.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const PremiumSuccess = () => {
  useEffect(() => {
    // Osvježi korisničke podatke (ako je potrebno)
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      // Ovdje možeš dohvatiti ažurirane podatke sa servera
      // ili samo ažurirati premium status u localStorage
      localStorage.setItem('user', JSON.stringify({ ...user, premium: true }));
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-4xl font-extrabold mb-4">Čestitamo!</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
        Postali ste Premium korisnik!
      </p>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Sada imate pristup svim Premium funkcionalnostima.
      </p>
      <Link
        to="/"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition"
      >
        🏠 Vrati se na početnu
      </Link>
    </div>
  );
};

export default PremiumSuccess;