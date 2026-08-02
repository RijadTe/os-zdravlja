// frontend/src/pages/TermsOfService.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">⚖️ Uvjeti korištenja</h1>
      <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 p-4 rounded-xl">
          <p className="font-bold text-red-600 dark:text-red-400">⚠️ ZDRAVSTVENI DISCLAIMER</p>
          <p className="mt-2">
            OS Zdravlja pruža informativne i edukativne sadržaje o ishrani i zdravlju.
            <strong> NIJE ZAMJENA ZA MEDICINSKI SAVJET.</strong>
          </p>
        </div>
        <p>
          Prije bilo kakvih promjena u ishrani ili načinu života,
          <strong> posavjetujte se sa svojim ljekarom ili nutricionistom.</strong>
        </p>
        <p className="text-sm text-gray-500 mt-6">Zadnje ažurirano: 31.07.2026.</p>
        <Link to="/" className="inline-block mt-4 text-blue-500 hover:underline">⬅️ Nazad na početnu</Link>
      </div>
    </div>
  );
};

export default TermsOfService;