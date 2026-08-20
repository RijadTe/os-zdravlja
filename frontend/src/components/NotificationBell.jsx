// frontend/src/components/NotificationBell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const NotificationBell = () => {
  const { t } = useTranslation();
  const [notifikacije, setNotifikacije] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // 🔥 SAMO EMAIL - NIKAD ID!
    const email = localStorage.getItem('userEmail');
    
    if (email) {
      setUser({ email: email });
      fetchNotifikacije(email);
      generatePreporuke(email);
    } else {
      // Ako nema emaila, pokušaj iz user objekta
      const userData = JSON.parse(localStorage.getItem('user'));
      const userEmail = userData?.email;
      if (userEmail) {
        setUser({ email: userEmail });
        fetchNotifikacije(userEmail);
        generatePreporuke(userEmail);
      }
    }
  }, []);

  // 🔥 ZATVORI DROPDOWN KAD SE KLIKNE VAN
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================
  // 🔥 DOHVATI NOTIFIKACIJE - SAMO SA EMAILOM!
  // ============================================================
  const fetchNotifikacije = async (email) => {
    if (!email) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/notifikacije/${encodeURIComponent(email)}`);
      
      if (res.status === 404) {
        console.warn('⚠️ Notifikacije nisu dostupne (404) - koristim prazan niz');
        setNotifikacije([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      if (res.status === 429) {
        console.warn('⚠️ Rate limit (429) - koristim prazne notifikacije');
        setNotifikacije([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      if (res.status >= 500) {
        console.warn('⚠️ Server greška (500) - koristim prazne notifikacije');
        setNotifikacije([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      
      if (data && Array.isArray(data)) {
        setNotifikacije(data);
        setUnreadCount(data.filter(n => !n.procitano).length);
      } else if (data && Array.isArray(data.data)) {
        setNotifikacije(data.data);
        setUnreadCount(data.data.filter(n => !n.procitano).length);
      } else {
        console.warn('⚠️ Notifikacije nisu array, postavljam prazan niz');
        setNotifikacije([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Greška pri dohvatanju notifikacija:', error);
      setNotifikacije([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔥 GENERIŠI AUTOMATSKE PREPORUKE - SAMO SA EMAILOM!
  // ============================================================
  const generatePreporuke = async (email) => {
    if (!email) return;
    
    try {
      const res = await fetch(`${API_URL}/api/notifikacije/preporuke/${encodeURIComponent(email)}`);
      
      if (res.status === 404) {
        console.warn('⚠️ Preporuke nisu dostupne (404) - preskačem');
        return;
      }
      
      if (res.status === 429) {
        console.warn('⚠️ Rate limit (429) - preskačem preporuke');
        return;
      }
      
      if (res.status === 200) {
        setTimeout(() => fetchNotifikacije(email), 1000);
      }
    } catch (error) {
      console.error('Greška pri generisanju preporuka:', error);
    }
  };

  // ============================================================
  // OZNAČI KAO PROČITANO
  // ============================================================
  const markAsRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/notifikacije/${id}/read`, {
        method: 'PUT'
      });
      
      if (res.status === 404) {
        console.warn('⚠️ Notifikacija nije pronađena (404)');
        return;
      }
      
      setNotifikacije(prev => 
        prev.map(n => n.id === id ? { ...n, procitano: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Greška pri označavanju:', error);
    }
  };

  // ============================================================
  // OZNAČI SVE KAO PROČITANO
  // ============================================================
  const markAllAsRead = async () => {
    const unread = notifikacije.filter(n => !n.procitano);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  // ============================================================
  // IZBRIŠI NOTIFIKACIJU
  // ============================================================
  const deleteNotification = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/notifikacije/${id}`, {
        method: 'DELETE'
      });
      
      if (res.status === 404) {
        console.warn('⚠️ Notifikacija nije pronađena (404)');
        return;
      }
      
      setNotifikacije(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Greška pri brisanju:', error);
    }
  };

  // ============================================================
  // FORMATIRANJE DATUMA
  // ============================================================
  const formatDate = (date) => {
    const d = new Date(date);
    const danas = new Date();
    const razlika = Math.floor((danas - d) / (1000 * 60));
    
    if (razlika < 1) return t('notification.just_now');
    if (razlika < 60) return `${razlika} ${t('notification.min')}`;
    if (razlika < 1440) return `${Math.floor(razlika / 60)}${t('notification.h')}`;
    return d.toLocaleDateString('hr', { day: '2-digit', month: '2-digit' });
  };

  // ============================================================
  // IKONE ZA TIPOVE NOTIFIKACIJA
  // ============================================================
  const getIcon = (tip) => {
    switch (tip) {
      case 'kupovina': return '🛒';
      case 'plan_obroka': return '📅';
      case 'tajni_recept': return '🕵️';
      case 'coach': return '🧘';
      case 'san': return '😴';
      case 'energija': return '⚡';
      case 'motivacija': return '🌟';
      case 'rucak': return '🍽️';
      case 'podsjetnik': return '⏰';
      default: return '🔔';
    }
  };

  // ============================================================
  // BOJE ZA TIPOVE NOTIFIKACIJA
  // ============================================================
  const getColor = (tip) => {
    switch (tip) {
      case 'kupovina': return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
      case 'san': return 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30';
      case 'coach': return 'border-purple-400 bg-purple-50 dark:bg-purple-900/30';
      case 'motivacija': return 'border-green-400 bg-green-50 dark:bg-green-900/30';
      case 'energija': return 'border-orange-400 bg-orange-50 dark:bg-orange-900/30';
      case 'tajni_recept': return 'border-red-400 bg-red-50 dark:bg-red-900/30';
      default: return 'border-blue-400 bg-blue-50 dark:bg-blue-900/30';
    }
  };

  if (!user) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xl sm:text-2xl md:text-3xl text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
        aria-label={t('notification.notifications')}
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* 📱 OVERLAY ZA MOBILNI - KLIK VAN ZATVARA */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 📦 DROPDOWN KONTEJNER */}
          <div className={`
            fixed lg:absolute 
            left-4 right-4 top-1/2 -translate-y-1/2 
            lg:left-auto lg:right-0 lg:top-full lg:translate-y-0 lg:mt-2
            w-auto lg:w-80 
            max-h-[80vh] lg:max-h-96 
            bg-white dark:bg-gray-800 
            rounded-2xl shadow-2xl 
            border border-gray-200 dark:border-gray-700 
            z-50 
            overflow-hidden
            animate-fadeIn
          `}>
            {/* HEADER */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                🔔 {t('notification.title')}
                {unreadCount > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('notification.mark_all')}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* LISTA NOTIFIKACIJA */}
            <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(80vh-120px)] lg:max-h-72">
              {loading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-1 text-sm">{t('common.loading')}</p>
                </div>
              ) : notifikacije.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <span className="text-4xl block mb-2">🎉</span>
                  <p>{t('notification.no_notifications')}</p>
                  <p className="text-xs">{t('notification.come_back_later')}</p>
                </div>
              ) : (
                notifikacije.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border-l-4 transition ${
                      notif.procitano
                        ? 'bg-white dark:bg-gray-800 opacity-60 border-gray-300'
                        : `bg-blue-50 dark:bg-blue-900/30 border-blue-400 ${getColor(notif.tip)}`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{getIcon(notif.tip)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notif.procitano ? 'text-gray-600 dark:text-gray-400' : 'text-gray-800 dark:text-white font-medium'}`}>
                          {notif.poruka}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(notif.created_at)}
                          </span>
                          {notif.link && (
                            <a
                              href={notif.link}
                              onClick={() => {
                                if (!notif.procitano) markAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="text-xs text-blue-500 hover:text-blue-600 hover:underline font-medium"
                            >
                              {t('notification.open')} →
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="text-gray-400 hover:text-red-500 transition text-sm flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    {!notif.procitano && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="mt-1 text-xs text-green-500 hover:text-green-600 hover:underline"
                      >
                        ✅ {t('notification.mark_read')}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* FOOTER */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {notifikacije.length} {t('notification.notifications')}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;