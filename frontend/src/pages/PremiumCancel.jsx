// frontend/src/pages/PremiumCancel.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PremiumCancel = () => {
  return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center dark:bg-gray-900 dark:text-white">
      <div className="text-6xl mb-6">😔</div>
      <h1 className="text-4xl font-extrabold mb-4">Plaćanje otkazano</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
        Niste postali Premium korisnik.
      </p>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte.
      </p>
      <Link
        to="/premium"
        className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-semibold transition"
      >
        ⭐ Pokušaj ponovo
      </Link>
    </div>
  );
};

export default PremiumCancel;