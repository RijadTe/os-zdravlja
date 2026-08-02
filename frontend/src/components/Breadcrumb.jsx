// frontend/src/components/Breadcrumb.jsx
import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const Breadcrumb = ({ customLabels = {} }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  if (pathnames.length === 0) return null;

  // Mapa za zamjenu UUID-a sa nazivima
  const labelMap = {
    'healthy-chef': '🌿 HealthyChef',
    'hormonski': 'Hormonski ciklus',
    'tiroida': 'Tiroida & Hashimoto',
    'anemija': 'Slabokrvnost',
    'kosti': 'Kosti i zglobovi',
    'menopauza': 'Menopauza',
    'pcos': 'PCOS',
    ...customLabels
  };

  return (
    <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex flex-wrap items-center gap-1">
      <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
        🏠 Početna
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        
        // Zamijeni UUID sa nazivom ako postoji u mapi
        const displayName = labelMap[name] || name;
        
        return (
          <span key={name} className="flex items-center gap-1">
            <span className="text-gray-400">›</span>
            {isLast ? (
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {displayName}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-blue-600 dark:hover:text-blue-400 transition">
                {displayName}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;