// frontend/src/pages/AIChef.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================================
// CUSTOM HOOK - DEBOUNCE
// ============================================================
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ============================================================
// GLAVNA KOMPONENTA
// ============================================================
const AIChef = () => {
  const [tekst, setTekst] = useState('');
  const [slika, setSlika] = useState(null);
  const [rezultati, setRezultati] = useState([]);
  const [filteredRezultati, setFilteredRezultati] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [poruka, setPoruka] = useState('');
  const [cestePretrage, setCestePretrage] = useState([]);
  const [filteri, setFilteri] = useState({
    vrsta: '',
    vrijeme: '',
    tezina: ''
  });
  const [progress, setProgress] = useState(0);
  const [vrijemeCekanja, setVrijemeCekanja] = useState(0);
  const [status, setStatus] = useState('');

  // Daily limit state
  const [dailyLimit, setDailyLimit] = useState({ 
    broj_pretraga: 0, 
    max_pretraga: 3, 
    preostalo: 3, 
    moze: false 
  });
  const [loadingLimit, setLoadingLimit] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);

  const debouncedTekst = useDebounce(tekst, 400);

  // ============================================================
  // TIMER ZA VRIJEME ČEKANJA
  // ============================================================
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setVrijemeCekanja(prev => prev + 1);
      }, 1000);
    } else {
      setVrijemeCekanja(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // ============================================================
  // SIMULACIJA PROGRESS-A
  // ============================================================
  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      setStatus('⏳ AI obrađuje vaš zahtjev...');
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 90) {
            return prev + Math.random() * 10;
          }
          return prev;
        });
      }, 300);
    } else {
      setProgress(0);
      setStatus('');
    }
    return () => clearInterval(interval);
  }, [loading]);

  // ============================================================
  // DOHVATI KORISNIKA, PROFIL I RESTRIKCIJE
  // ============================================================
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const userData = JSON.parse(localStorage.getItem('user'));
      const email = localStorage.getItem('userEmail');
      
      console.log('👤 User data:', userData);
      console.log('📧 Email iz localStorage:', email);
      
      let finalUserData = userData;
      if (userData && !userData.email && email) {
        finalUserData = { ...userData, email: email };
        localStorage.setItem('user', JSON.stringify(finalUserData));
        console.log('✅ Dodan email u user:', finalUserData);
      }
      
      setUser(finalUserData);

      // 🔥 DOHVATI PROFIL I RESTRIKCIJE
      if (email) {
        try {
          const response = await fetch(`${API_URL}/profil/${encodeURIComponent(email)}`);
          const data = await response.json();
          if (data.success && data.data) {
            console.log('✅ Profil dohvaćen za AI Chef:', data.data);
            setProfil(data.data);
          }
        } catch (error) {
          console.error('❌ Greška pri dohvatu profila:', error);
        }
      }

      const saved = localStorage.getItem('cestePretrage');
      if (saved) {
        try {
          setCestePretrage(JSON.parse(saved));
        } catch (e) {
          setCestePretrage([]);
        }
      }
    };

    fetchUserAndProfile();
  }, []);

  // ============================================================
  // DOHVATI DAILY LIMIT
  // ============================================================
  const fetchDailyLimit = useCallback(async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) return;
    
    try {
      const res = await fetch(`${API_URL}/ai-chef/limit/${email}`);
      const data = await res.json();
      setDailyLimit({
        broj_pretraga: data.broj_pretraga || 0,
        max_pretraga: data.max_pretraga || 3,
        preostalo: data.preostalo || 3,
        moze: (data.preostalo || 0) > 0
      });
    } catch (error) {
      console.error('❌ Greška pri dohvatanju limita:', error);
      setDailyLimit(prev => ({ ...prev, moze: true }));
    }
  }, [user]);

  useEffect(() => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (email) {
      fetchDailyLimit();
    }
  }, [user, fetchDailyLimit]);

  // ============================================================
  // OTKLJUČAJ PRETRAGU NAKON VIDA
  // ============================================================
  const handleUnlockWithVideo = async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    
    console.log('👤 User u handleUnlock:', user);
    console.log('📧 Email:', email);

    if (!email) {
      setPoruka('⚠️ Morate biti prijavljeni.');
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    setLoadingLimit(true);
    try {
      console.log('📤 Šaljem zahtjev na /api/ai-chef/unlock');
      const res = await fetch(`${API_URL}/ai-chef/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      const data = await res.json();
      console.log('📥 Odgovor:', data);
      
      setDailyLimit({
        broj_pretraga: data.broj_pretraga || 0,
        max_pretraga: data.max_pretraga || 3,
        preostalo: data.preostalo || 1,
        moze: (data.preostalo || 0) > 0
      });
      setVideoWatched(true);
      setPoruka('🎉 Otključali ste 1 pretragu! Sada možete uslikati frižider.');
      setTimeout(() => setPoruka(''), 3000);
    } catch (error) {
      console.error('❌ Greška:', error);
      setPoruka('❌ Došlo je do greške. Pokušajte ponovo.');
      setTimeout(() => setPoruka(''), 3000);
    } finally {
      setLoadingLimit(false);
    }
  };

  // ============================================================
  // KADA SE DEBOUNCED TEKST PROMIJENI – POZOVI PRETRAGU
  // ============================================================
  useEffect(() => {
    if (debouncedTekst.trim() && !loading) {
      handlePretraga();
    }
  }, [debouncedTekst]);

  // ============================================================
  // FILTRIRAJ REZULTATE SA RESTRIKCIJAMA
  // ============================================================
  useEffect(() => {
    let filtered = rezultati;
    
    // 🔥 FILTER PO VRSTI
    if (filteri.vrsta) {
      filtered = filtered.filter(r => r.vrsta === filteri.vrsta);
    }
    if (filteri.vrijeme) {
      filtered = filtered.filter(r => r.vrijeme === filteri.vrijeme);
    }
    if (filteri.tezina) {
      filtered = filtered.filter(r => r.tezina === filteri.tezina);
    }
    
    // 🔥 FILTER PO RESTRIKCIJAMA IZ PROFILA
    if (profil?.izbjegava && profil.izbjegava.length > 0) {
      const restrikcije = profil.izbjegava.filter(r => r !== 'Bez restrikcija');
      if (restrikcije.length > 0) {
        filtered = filtered.filter(recipe => {
          const alergeni = recipe.alergeni || [];
          return !restrikcije.some(r => alergeni.includes(r));
        });
      }
    }
    
    setFilteredRezultati(filtered);
  }, [filteri, rezultati, profil]);

  // ============================================================
  // GLAVNA PRETRAGA
  // ============================================================
  const handlePretraga = async () => {
    if (loading) return;

    if (!tekst.trim() && !slika) {
      setPoruka('⚠️ Unesite sastojke ili uploadujte sliku.');
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');

    if (slika && !user?.premium && !(dailyLimit.moze && videoWatched)) {
      setPoruka('📸 Fotografija je dostupna samo za Premium korisnike ili nakon otključavanja.');
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    setLoading(true);
    setPoruka('🔍 Pretražujem recepte...');
    setProgress(10);
    setStatus('📤 Slanje zahtjeva...');

    try {
      const formData = new FormData();
      formData.append('tekst', tekst);
      if (slika) formData.append('slika', slika);
      if (email) formData.append('email', email);

      setProgress(30);
      setStatus('⏳ AI analizira sastojke...');

      const res = await fetch(`${API_URL}/ai-chef`, {
        method: 'POST',
        body: formData
      });

      setProgress(100);
      setStatus('✅ Gotovo!');
      const data = await res.json();
      setRezultati(data);
      setPoruka(`✅ Pronađeno ${data.length} recepata!`);

      setSlika(null);
      
      if (videoWatched) {
        setVideoWatched(false);
        await fetchDailyLimit();
      }

      if (tekst.trim() && data.length > 0) {
        const novaPretraga = {
          tekst: tekst.trim(),
          datum: new Date().toLocaleDateString('hr'),
          rezultati: data.length
        };
        const nove = [novaPretraga, ...cestePretrage.filter(p => p.tekst !== tekst.trim())].slice(0, 5);
        setCestePretrage(nove);
        localStorage.setItem('cestePretrage', JSON.stringify(nove));
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      setPoruka('❌ Greška pri pretrazi. Pokušajte ponovo.');
      setStatus('❌ Greška');
    } finally {
      setLoading(false);
      setTimeout(() => setPoruka(''), 3000);
    }
  };

  // ============================================================
  // GLASOVNA PRETRAGA
  // ============================================================
  const handleVoiceSearch = () => {
    if (!user?.premium) {
      setPoruka('🎤 Glasovna pretraga je dostupna samo za Premium korisnike.');
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    try {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      if (!recognition) {
        setPoruka('❌ Vaš pretraživač ne podržava glasovnu pretragu.');
        setTimeout(() => setPoruka(''), 3000);
        return;
      }
      recognition.lang = 'hr';
      recognition.onresult = (e) => setTekst(e.results[0][0].transcript);
      recognition.onerror = () => {
        setPoruka('❌ Došlo je do greške pri glasovnoj pretrazi. Pokušajte ponovo.');
        setTimeout(() => setPoruka(''), 3000);
      };
      recognition.start();
    } catch (error) {
      setPoruka('❌ Došlo je do greške pri glasovnoj pretrazi.');
      setTimeout(() => setPoruka(''), 3000);
    }
  };

  // ============================================================
  // OPCIJE ZA FILTERE
  // ============================================================
  const opcije = {
    vrsta: ['Slano', 'Deserti', 'Dijetalni recepti', 'Napitki'],
    vrijeme: ['Kratko (15-30 min)', 'Srednje (30-45 min)', 'Duže (45-60+ min)'],
    tezina: ['Početnik', 'Srednji', 'Profesionalac']
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 dark:text-white mb-2 text-center">
        🤖 AI Chef – Šta imate u frižideru?
      </h1>
      <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
        Otkucajte sastojke koje imate kod kuće ili koristite Premium za napredne opcije.
      </p>

      {poruka && (
        <div className={`text-center p-3 mb-4 rounded-xl ${
          poruka.includes('✅') ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : 
          poruka.includes('❌') || poruka.includes('⚠️') ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : 
          'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
        }`}>
          {poruka}
        </div>
      )}

      {/* GLAVNI KONTEJNER */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-6">
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          {/* FOTOGRAFIJA */}
          <div className="flex flex-col gap-2">
            <button
              className={`px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-3 ${
                user?.premium
                  ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white'
                  : dailyLimit.moze && videoWatched
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              onClick={() => (user?.premium || (dailyLimit.moze && videoWatched)) && document.getElementById('fileInput').click()}
              disabled={!user?.premium && !(dailyLimit.moze && videoWatched)}
            >
              <span className="text-3xl">📸</span> 
              {user?.premium ? 'Fotkaš ⭐' : `Fotkaš (${dailyLimit.preostalo}/${dailyLimit.max_pretraga})`}
            </button>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setSlika(e.target.files[0]);
                }
              }}
            />

            {!user?.premium && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl border border-yellow-200 dark:border-yellow-600">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  🎥 Pogledaj video i otključaj 1 pretragu po fotografiji
                </p>
                <button
                  onClick={handleUnlockWithVideo}
                  disabled={loadingLimit || dailyLimit.preostalo <= 0}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50 text-sm"
                >
                  {loadingLimit ? '⏳ Učitavanje...' : dailyLimit.preostalo > 0 ? '▶️ Pogledaj video' : '🔒 Maksimum za danas'}
                </button>
                {dailyLimit.preostalo <= 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ⏳ Došli ste do maksimuma za danas. Vratite se sutra!
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-3"
            onClick={() => document.getElementById('tekstInput').focus()}
          >
            <span className="text-3xl">✏️</span> Otkucaj
          </button>

          <button
            className={`px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-3 ${
              user?.premium
                ? 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            onClick={handleVoiceSearch}
            disabled={!user?.premium}
          >
            <span className="text-3xl">🎤</span> Glasovna {!user?.premium && '⭐ PREMIUM'}
          </button>
        </div>

        {loading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
              <span>{status}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              ⏱️ Čekanje: {vrijemeCekanja} sekundi
            </p>
          </div>
        )}

        {slika && (
          <div className="text-center mb-4">
            <img src={URL.createObjectURL(slika)} alt="Upload" className="max-h-48 mx-auto rounded-lg" />
            <button
              onClick={() => setSlika(null)}
              className="text-red-500 dark:text-red-400 text-sm mt-1 hover:underline"
            >
              Ukloni sliku
            </button>
          </div>
        )}

        <textarea
          id="tekstInput"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Unesite sastojke (npr. piletina, luk, šargarepa)..."
          className="w-full border rounded-xl px-4 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />

        <button
          onClick={handlePretraga}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white py-3 rounded-xl text-lg font-semibold transition mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Pretražujem...
            </>
          ) : (
            '🔍 Pretraži recepte'
          )}
        </button>

        {!user?.premium && (
          <div className="text-center mt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              ⭐ Postanite Premium za neograničene pretrage i napredne opcije.
            </p>
            <Link to="/premium" className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">
              Postani Premium →
            </Link>
          </div>
        )}
      </div>

      {/* REZULTATI */}
      {rezultati.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">📋 Rezultati pretrage</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            <select
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={filteri.vrsta}
              onChange={(e) => setFilteri({ ...filteri, vrsta: e.target.value })}
            >
              <option value="">🍽️ Sve vrste</option>
              {opcije.vrsta.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={filteri.vrijeme}
              onChange={(e) => setFilteri({ ...filteri, vrijeme: e.target.value })}
            >
              <option value="">⏱️ Svo vrijeme</option>
              {opcije.vrijeme.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={filteri.tezina}
              onChange={(e) => setFilteri({ ...filteri, tezina: e.target.value })}
            >
              <option value="">🏋️ Sva težina</option>
              {opcije.tezina.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <button
              onClick={() => setFilteri({ vrsta: '', vrijeme: '', tezina: '' })}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
            >
              🔄 Resetuj
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRezultati.map(recipe => (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition overflow-hidden border border-gray-100 dark:border-gray-700 hover:scale-105 duration-200"
              >
                <img
                  src={recipe.slika || 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Recept'}
                  alt={recipe.naziv}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-bold text-base dark:text-white">{recipe.naziv}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{recipe.vrijeme} · {recipe.kalorije}</p>
                </div>
              </Link>
            ))}
          </div>

          {cestePretrage.filter(p => p.rezultati > 0).length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">📌 Česte pretrage</h3>
              <div className="flex flex-wrap gap-2">
                {cestePretrage.filter(p => p.rezultati > 0).map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setTekst(p.tekst)}
                    className="bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-700 transition"
                  >
                    {p.tekst} ({p.rezultati})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && rezultati.length === 0 && tekst && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">Nema recepata za unesene sastojke.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Pokušajte sa drugim sastojcima.</p>
        </div>
      )}

      <Link to="/" className="inline-block mt-6 text-blue-500 dark:text-blue-400 hover:underline">
        ⬅️ Nazad na početnu
      </Link>
    </div>
  );
};

export default AIChef;