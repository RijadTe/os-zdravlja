// frontend/src/components/HealthConnect.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  connectGoogleFit, 
  isGoogleFitConnected, 
  disconnectGoogleFit 
} from '../services/googleFitWeb';
import { 
  connectAppleHealth, 
  isAppleHealthConnected, 
  disconnectAppleHealth 
} from '../services/appleHealthWeb';
import { getPlatform, syncHealthData } from '../services/healthService';

const HealthConnect = ({ email }) => {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const platformType = getPlatform();
    setPlatform(platformType);
    
    if (platformType === 'android') {
      setIsConnected(isGoogleFitConnected());
    } else if (platformType === 'ios') {
      setIsConnected(isAppleHealthConnected());
    }
  }, []);

  const handleConnect = () => {
    if (platform === 'android') {
      connectGoogleFit();
    } else if (platform === 'ios') {
      connectAppleHealth();
    } else {
      alert(t('health.connect.only_mobile'));
    }
  };

  const handleDisconnect = () => {
    if (window.confirm(t('health.disconnect.confirm'))) {
      if (platform === 'android') {
        disconnectGoogleFit();
      } else if (platform === 'ios') {
        disconnectAppleHealth();
      }
      setIsConnected(false);
      setLastSync(null);
    }
  };

  const handleSync = async () => {
    if (!email) {
      alert(t('health.sync.login_required'));
      return;
    }

    setSyncLoading(true);
    try {
      const result = await syncHealthData(email);
      if (result.success) {
        setLastSync(new Date().toLocaleString());
        alert(t('health.sync.success'));
      } else if (result.redirect) {
        console.log('Preusmjeravanje na Google Fit...');
      } else {
        alert(t('health.sync.error') + (result.message || ''));
      }
    } catch (error) {
      console.error('❌ Greška pri sinhronizaciji:', error);
      alert(t('health.sync.error') + error.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const isSupported = platform === 'android' || platform === 'ios';
  const isWeb = platform === 'web';

  // Odaberi ikonu i boju prema platformi
  const getPlatformInfo = () => {
    if (platform === 'android') {
      return {
        icon: '📱',
        color: 'from-green-500 to-emerald-600',
        shadow: 'shadow-green-500/25',
        hover: 'hover:from-green-600 hover:to-emerald-700',
        name: 'Google Fit'
      };
    } else if (platform === 'ios') {
      return {
        icon: '⌚',
        color: 'from-red-500 to-rose-600',
        shadow: 'shadow-red-500/25',
        hover: 'hover:from-red-600 hover:to-rose-700',
        name: 'Apple Health'
      };
    } else {
      return {
        icon: '💻',
        color: 'from-gray-400 to-gray-500',
        shadow: 'shadow-gray-500/25',
        hover: '',
        name: 'Web'
      };
    }
  };

  const platformInfo = getPlatformInfo();

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-all hover:shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center text-2xl
            bg-gradient-to-br ${platformInfo.color} 
            shadow-lg ${platformInfo.shadow}
          `}>
            {platformInfo.icon}
          </div>
          {isConnected && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
          )}
        </div>
        
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {t('health.title')}
            {isConnected && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2.5 py-1 rounded-full">
                {t('health.connected')}
              </span>
            )}
          </h2>
          {isConnected && platformInfo.name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('health.connected_to')} {platformInfo.name}
            </p>
          )}
        </div>
      </div>

      {/* Status / Description */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
        <p className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <span>
            {isSupported ? (
              platform === 'android' 
                ? t('health.connect.google_fit_desc')
                : t('health.connect.apple_health_desc')
            ) : (
              t('health.connect.web_desc')
            )}
          </span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={!isSupported}
            className={`
              w-full py-3.5 rounded-xl font-semibold transition-all duration-200 
              flex items-center justify-center gap-3
              ${isSupported 
                ? `bg-gradient-to-r ${platformInfo.color} text-white shadow-lg ${platformInfo.shadow} ${platformInfo.hover} hover:scale-[1.02] active:scale-[0.98]`
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <span className="text-xl">🔗</span>
            {isSupported ? (
              platform === 'android' 
                ? t('health.connect.google_fit_btn')
                : t('health.connect.apple_health_btn')
            ) : (
              t('health.connect.web_btn')
            )}
          </button>
        ) : (
          <>
            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className={`
                w-full py-3.5 rounded-xl font-semibold transition-all duration-200
                flex items-center justify-center gap-3
                bg-gradient-to-r from-blue-600 to-indigo-600 
                text-white shadow-lg shadow-blue-500/25
                hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98]
                ${syncLoading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {syncLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('health.syncing')}
                </>
              ) : (
                <>
                  <span className="text-xl">🔄</span>
                  {t('health.sync_btn')}
                </>
              )}
            </button>

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
                hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/30
                flex items-center justify-center gap-2"
            >
              <span>🔌</span>
              {t('health.disconnect_btn')}
            </button>

            {/* Last Sync Info */}
            {lastSync && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>🕐</span>
                <span>{t('health.last_sync')}: {lastSync}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sync Info - only when connected */}
      {isConnected && (
        <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-2">
            <span>📊</span>
            {t('health.sync_info.title')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span>🚶</span>
              <span>{t('health.sync_info.steps')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span>😴</span>
              <span>{t('health.sync_info.sleep')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span>❤️</span>
              <span>{t('health.sync_info.heart_rate')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span>💧</span>
              <span>{t('health.sync_info.water')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span>🔥</span>
              <span>{t('health.sync_info.calories')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span>📅</span>
              <span>{t('health.sync_info.daily')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Platform specific info */}
      {!isConnected && isSupported && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            🔒 {t('health.connect.security')}
          </p>
        </div>
      )}
    </div>
  );
};

export default HealthConnect;