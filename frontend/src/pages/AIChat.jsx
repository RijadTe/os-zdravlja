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

  const MAX_DAILY_MESSAGES = 10;
  const email = localStorage.getItem('userEmail');

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

    if (!isPremium) {
      alert('⭐ Ova funkcionalnost je dostupna samo Premium korisnicima!');
      return;
    }

    if (chatCount >= MAX_DAILY_MESSAGES) {
      alert(`⚠️ Dostigli ste limit od ${MAX_DAILY_MESSAGES} poruka dnevno.`);
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
        body: JSON.stringify({ message: input, email: email })
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

  const remainingMessages = Math.max(0, MAX_DAILY_MESSAGES - chatCount);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🤖 {t('ai_chat.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isPremium ? '⭐ Premium korisnik' : '🔒 Premium funkcionalnost'}
          </p>
        </div>
        {isPremium && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-700">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              📨 Preostalo: {remainingMessages}/{MAX_DAILY_MESSAGES}
            </span>
          </div>
        )}
      </div>

      {/* Chat Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-[450px] sm:h-[500px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                  {t('ai_chat.welcome')}
                </h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-md">
                  Postavite pitanje o ishrani, receptima ili zdravlju
                </p>
                {!isPremium ? (
                  <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl max-w-sm">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      ⭐ Ova funkcionalnost je dostupna samo Premium korisnicima
                    </p>
                    <a href="/premium" className="inline-block mt-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400 hover:underline">
                      Postanite Premium →
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                    💡 Preostalo vam je {remainingMessages} od {MAX_DAILY_MESSAGES} poruka danas
                  </p>
                )}
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-none'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-none max-w-[85%] sm:max-w-[75%]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {isPremium ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={t('ai_chat.placeholder')}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm sm:text-base bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    disabled={loading || remainingMessages === 0}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim() || remainingMessages === 0}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-2.5 rounded-xl transition disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    <span>📤</span>
                    <span className="hidden sm:inline">Pošalji</span>
                  </button>
                </div>
                {remainingMessages === 0 && messages.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-center">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      ⏳ Dostigli ste dnevni limit od {MAX_DAILY_MESSAGES} poruka. Pokušajte ponovo sutra!
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  🔒 Ova funkcionalnost je dostupna samo Premium korisnicima
                </p>
                <a href="/premium" className="inline-block mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  ⭐ Postanite Premium
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;