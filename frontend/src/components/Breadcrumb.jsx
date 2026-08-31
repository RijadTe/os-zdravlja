// frontend/src/components/Breadcrumb.jsx
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Breadcrumb = ({ customLabels = {} }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  if (pathnames.length === 0) return null;

  // 🔥 MAPIRANJE SA i18n KOMBINACIJOM
  const labelMap = {
    'healthy-chef': `🌿 ${t('healthychef.title')}`,
    'hormonski': t('home.healthychef.hormonal', { defaultValue: 'Hormonski' }),
    'tiroida': t('home.healthychef.thyroid', { defaultValue: 'Tiroida' }),
    'anemija': t('home.healthychef.anemia', { defaultValue: 'Anemija' }),
    'kosti': t('home.healthychef.bones', { defaultValue: 'Kosti' }),
    'menopauza': t('home.healthychef.menopause', { defaultValue: 'Menopauza' }),
    'pcos': t('home.healthychef.pcos', { defaultValue: 'PCOS' }),
    'profile': t('nav.profile', { defaultValue: 'Profil' }),
    'community': t('nav.community', { defaultValue: 'Zajednica' }),
    'recipes': t('nav.recipes', { defaultValue: 'Recepti' }),
    'quiz': t('nav.quiz', { defaultValue: 'Kviz' }),
    'ai-chef': t('nav.ai_chef', { defaultValue: 'AI Chef' }),
    'food-planner': t('nav.food_planner', { defaultValue: 'Food Planner' }),
    'login': t('nav.login', { defaultValue: 'Prijava' }),
    'register': t('nav.register', { defaultValue: 'Registracija' }),
    'premium': t('nav.premium', { defaultValue: 'Premium' }),
    ...customLabels
  };

  // 🔥 FUNKCIJA ZA PRIKAZ NAZIVA
  const getDisplayName = (name) => {
    // Ako je UUID (36 karaktera sa crticama), pokušaj mapirati
    if (name.length === 36 && name.includes('-')) {
      return labelMap[name] || name;
    }
    return labelMap[name] || name;
  };

  return (
    <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex flex-wrap items-center gap-1">
      <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
        🏠 {t('nav.home', { defaultValue: 'Početna' })}
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        
        // 🔥 PRIKAZ NAZIVA SA PREVODOM
        const displayName = getDisplayName(name);
        
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