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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-300'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className={`text-[10px] font-medium ${
                isActive(item.path) ? 'text-emerald-600 dark:text-emerald-400' : ''
              }`}>
                {item.label}
              </span>
              {isActive(item.path) && (
                <div className="absolute -top-0.5 w-6 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;