// frontend/src/components/TajniRecept.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const TajniRecept = () => {
  const { t } = useTranslation();
  const [recept, setRecept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    const fetchTajniRecept = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tajni-recept`);
        setRecept(res.data);
      } catch (err) {
        console.error('Greška:', err);
        setError(t('tajni_recept.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchTajniRecept();
  }, [t]);

  // 🆕 DIJELJENJE TAJNOG RECEPTA
  const shareRecipe = async () => {
    if (!recept) return;

    const shareData = {
      title: `🕵️ ${t('tajni_recept.secret_recipe')}: ${recept.naziv}`,
      text: `🕵️ ${t('tajni_recept.recipe_of_the_day')}: ${recept.naziv}\n⏱️ ${recept.vrijeme} min · 🔥 ${recept.kalorije} kcal\n\n👨‍🍳 ${t('recipe.instructions')}: ${recept.upute?.join('. ')}\n\n⏳ ${t('tajni_recept.disappears')}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage(t('tajni_recept.shared_success'));
        setTimeout(() => setShareMessage(''), 3000);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        setShareMessage(t('tajni_recept.copied'));
        setTimeout(() => setShareMessage(''), 3000);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Greška pri dijeljenju:', error);
        setShareMessage(t('tajni_recept.share_error'));
        setTimeout(() => setShareMessage(''), 3000);
      }
    }
  };

  // 🆕 POŠALJI PRIJATELJU (preko WhatsApp-a)
  const sendToFriend = () => {
    if (!recept) return;
    
    const message = `🕵️ ${t('tajni_recept.whatsapp_message')} ${recept.naziv}! ⏳ ${t('tajni_recept.disappears')} 🔥 ${recept.kalorije} kcal\n\n👨‍🍳 ${recept.upute?.join('. ')}\n\n🌐 ${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 border-2 border-yellow-400 dark:border-yellow-600 text-center">
        <div className="animate-pulse">
          <span className="text-3xl">🕵️</span>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !recept) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 border-2 border-yellow-400 dark:border-yellow-600 text-center">
        <span className="text-3xl">🕵️</span>
        <p className="text-gray-500 dark:text-gray-400 mt-2">{error || t('tajni_recept.no_recipe')}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-2xl p-4 md:p-6 border-2 border-yellow-400 dark:border-yellow-600 hover:shadow-lg transition">
      {/* Poruka o dijeljenju */}
      {shareMessage && (
        <div className={`text-center p-2 mb-3 rounded-lg text-sm ${
          shareMessage.includes('✅') 
            ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' 
            : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
        }`}>
          {shareMessage}
        </div>
      )}

      <Link
        to={`/recipes/${recept.id}`}
        className="block group"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl">🕵️</span>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-lg md:text-xl">
                🤫 {t('tajni_recept.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('tajni_recept.disappears')} ⏳
              </p>
            </div>
          </div>
          <span className="text-2xl group-hover:translate-x-1 transition">➡️</span>
        </div>

        <div className="mt-3 flex items-center gap-4">
          {recept.slika && (
            <img
              src={recept.slika}
              alt={recept.naziv}
              className="w-16 h-16 object-cover rounded-lg"
            />
          )}
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white">
              {recept.naziv}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ⏱️ {recept.vrijeme} min · 🔥 {recept.kalorije} kcal
            </p>
          </div>
        </div>

        <div className="mt-3 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <span>🌟</span>
          <span>{t('tajni_recept.click_hint')}</span>
        </div>
      </Link>

      {/* 🆕 DUGMAD ZA DIJELJENJE */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-yellow-200 dark:border-yellow-600 pt-4">
        <button
          onClick={shareRecipe}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          📤 {t('tajni_recept.share_button')}
        </button>
        <button
          onClick={sendToFriend}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          💬 {t('tajni_recept.send_to_friend')}
        </button>
      </div>
    </div>
  );
};

export default TajniRecept;