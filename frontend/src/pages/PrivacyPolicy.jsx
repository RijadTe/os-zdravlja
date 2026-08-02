// frontend/src/pages/PrivacyPolicy.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">🔒 Pravila privatnosti</h1>
      <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p><strong>OS Zdravlja</strong> ozbiljno shvaća vašu privatnost.</p>
        <p>Prikupljamo samo podatke koje nam dobrovoljno date:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>📧 Email adresa</li>
          <li>👤 Ime</li>
          <li>🍽️ Preferencije u ishrani</li>
          <li>📊 Podaci o ishrani (unos obroka)</li>
        </ul>
        <p><strong>Vaši podaci NIKADA se ne dijele s trećim stranama.</strong></p>
        <p>U svakom trenutku možete zatražiti brisanje svih podataka putem profila.</p>
        <p className="text-sm text-gray-500 mt-6">Zadnje ažurirano: 31.07.2026.</p>
        <Link to="/" className="inline-block mt-4 text-blue-500 hover:underline">⬅️ Nazad na početnu</Link>
      </div>
    </div>
  );
};

export default PrivacyPolicy;