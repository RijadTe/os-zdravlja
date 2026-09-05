// frontend/src/components/BottomNav.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '🏠', label: t('nav.home') },
    { path: '/ai-chat', icon: '🤖', label: 'AI Chat' },
    { path: '/goals', icon: '🎯', label: t('nav.goals') },
    { path: '/water', icon: '💧', label: t('nav.water') },
    { path: '/micro-nutrients', icon: '📊', label: 'Mikro' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-black/5 dark:shadow-black/40 rounded-3xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center px-3 py-1 rounded-2xl transition-all duration-300 ${
                isActive(item.path)
                  ? 'text-emerald-600 dark:text-emerald-400 scale-105'
                  : 'text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-300 hover:scale-105'
              }`}
            >
              {/* Aktivni indikator - prilagođen dark/light */}
              {isActive(item.path) && (
                <>
                  <div className="absolute -top-0.5 w-8 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-300 dark:to-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 dark:shadow-emerald-400/20" />
                  <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-2xl -z-10" />
                </>
              )}
              
              <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium mt-0.5 transition-all duration-300 ${
                isActive(item.path) 
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;