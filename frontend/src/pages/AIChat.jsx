// frontend/src/pages/AIChat.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AIChat = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [chatDate, setChatDate] = useState('');

  const email = localStorage.getItem('userEmail');

  // 🔥 DOHVATI STATUS KORISNIKA
  useEffect(() => {
    const fetchUserStatus = async () => {
      if (!email) return;
      
      try {
        const response = await fetch(`${API_URL}/api/profil/${email}`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setIsPremium(data.data.premium || false);
          
          const today = new Date().toISOString().split('T')[0];
          if (data.data.ai_chat_date === today) {
            setChatCount(data.data.ai_chat_count || 0);
          } else {
            setChatCount(0);
          }
          setChatDate(today);
        }
      } catch (error) {
        console.error('❌ Greška:', error);
      }
    };

    fetchUserStatus();
  }, [email]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!email) {
      alert('❌ Niste prijavljeni!');
      return;
    }

    // Provjeri limit za FREE korisnike
    if (!isPremium && chatCount >= 5) {
      alert('⚠️ Dostigli ste limit od 5 poruka dnevno. Postanite Premium za neograničeno!');
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          email: email
        })
      });

      const data = await response.json();
      
      if (data.error) {
        alert('❌ ' + data.error);
        setLoading(false);
        return;
      }
      
      const aiMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, aiMessage]);
      setChatCount(prev => prev + 1);
      
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Došlo je do greške. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const remainingMessages = isPremium ? '∞' : Math.max(0, 5 - chatCount);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🤖 {t('ai_chat.title')}</h1>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isPremium ? 'text-yellow-500' : 'text-gray-500'}`}>
            {isPremium ? '⭐ Premium' : `🔓 ${remainingMessages} poruka`}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 h-[500px] flex flex-col">
        {/* Poruke */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
              <p className="text-4xl mb-2">🤖</p>
              <p>{t('ai_chat.welcome')}</p>
              {!isPremium && (
                <p className="text-xs mt-2 text-gray-400">
                  ⭐ Postanite Premium za neograničene poruke!
                </p>
              )}
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 ml-auto'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl max-w-[80%]">
              <span className="animate-pulse">⏳ {t('common.loading')}</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={t('ai_chat.placeholder')}
            className="flex-1 border rounded-xl px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || (!isPremium && chatCount >= 5)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl transition disabled:opacity-50"
          >
            📤
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;