// frontend/src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© 2026 OS Zdravlja – Operativni sistem za tvoje zdravlje</p>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
            🔒 Pravila privatnosti
          </Link>
          <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
            ⚖️ Uvjeti korištenja
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;