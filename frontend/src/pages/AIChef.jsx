// frontend/src/pages/AIChef.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ADSENSE_CLIENT, ADSENSE_ENABLED, DEFAULT_SLOTS } from '../config/adsense';
import { 
  Search, 
  Camera, 
  Mic, 
  X, 
  Sparkles, 
  Clock, 
  ChefHat,
  Star,
  Zap,
  Shield,
  Image,
  Trash2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  UtensilsCrossed,
  Flame,
  Gauge,
  Coffee
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
// STATISTIKE KARTICA
// ============================================================
const StatsCard = ({ icon: Icon, label, value, color, subtitle }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className={`bg-gradient-to-br ${color} rounded-2xl p-4 shadow-lg border border-white/20 backdrop-blur-sm`}
  >
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/20 rounded-xl">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-white/80 text-xs font-medium">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
        {subtitle && <p className="text-white/60 text-xs">{subtitle}</p>}
      </div>
    </div>
  </motion.div>
);

// ============================================================
// GLAVNA KOMPONENTA
// ============================================================
const AIChef = () => {
  const { t, i18n } = useTranslation();
  const [tekst, setTekst] = useState('');
  const [slika, setSlika] = useState(null);
  const [slikaPreview, setSlikaPreview] = useState(null);
  const [rezultati, setRezultati] = useState([]);
  const [filteredRezultati, setFilteredRezultati] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [poruka, setPoruka] = useState('');
  const [porukaType, setPorukaType] = useState('info');
  const [cestePretrage, setCestePretrage] = useState([]);
  const [filteri, setFilteri] = useState({
    vrsta: '',
    vrijeme: '',
    tezina: ''
  });
  const [progress, setProgress] = useState(0);
  const [vrijemeCekanja, setVrijemeCekanja] = useState(0);
  const [status, setStatus] = useState('');
  const [searchMode, setSearchMode] = useState('text');

  // 🔥 DAILY LIMIT
  const [dailyLimit, setDailyLimit] = useState({ 
    broj_pretraga: 0,
    max_pretraga: 3,
    preostalo: 0,
    moze: false
  });
  const [loadingLimit, setLoadingLimit] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoAdCount, setVideoAdCount] = useState(0);
  const [maxVideoAds, setMaxVideoAds] = useState(3);
  const [voiceActive, setVoiceActive] = useState(false);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const debouncedTekst = useDebounce(tekst, 400);

  // ============================================================
  // 🔥 UČITAVANJE ADSENSE SKRIPTE
  // ============================================================
  useEffect(() => {
    if (ADSENSE_ENABLED && !document.querySelector('script[src*="adsbygoogle"]')) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      console.log('📢 AdSense scripta učitana!');
    }

    return () => {
      const container = document.getElementById('video-ad-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  // ============================================================
  // 🔥 RESETIRANJE BROJA VIDEO REKLAMA I SLIKANJA SVAKI DAN
  // ============================================================
  useEffect(() => {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('videoAdResetDate');
    const maxPretraga = user?.premium ? 15 : 3;
    
    if (lastReset !== today) {
      localStorage.setItem('videoAdResetDate', today);
      setVideoAdCount(0);
      setDailyLimit(prev => ({ 
        ...prev, 
        preostalo: 0,
        broj_pretraga: 0,
        max_pretraga: maxPretraga,
        moze: false 
      }));
      console.log('🔄 Resetiran broj video reklama i slikanja za novi dan');
    }
  }, [user]);

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
      setStatus(t('aichef.status.processing'));
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
      setVoiceActive(false);
    }
    return () => clearInterval(interval);
  }, [loading, t]);

  // ============================================================
  // DOHVATI KORISNIKA, PROFIL I RESTRIKCIJE
  // ============================================================
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const userData = JSON.parse(localStorage.getItem('user'));
      const email = localStorage.getItem('userEmail');
      
      let finalUserData = userData;
      if (userData && !userData.email && email) {
        finalUserData = { ...userData, email: email };
        localStorage.setItem('user', JSON.stringify(finalUserData));
      }
      
      setUser(finalUserData);

      if (email) {
        try {
          const response = await fetch(`${API_URL}/api/profil/${encodeURIComponent(email)}`);
          const data = await response.json();
          if (data.success && data.data) {
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
  // 🔥 DOHVATI DAILY LIMIT
  // ============================================================
  const fetchDailyLimit = useCallback(async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) return;
    
    try {
      const res = await fetch(`${API_URL}/api/ai-chef/limit/${email}`);
      const data = await res.json();
      
      setDailyLimit({
        broj_pretraga: data.broj_pretraga || 0,
        max_pretraga: data.max_pretraga || 3,
        preostalo: data.preostalo || 0,
        moze: data.moze || false
      });
      
      if (data.videoAdCount !== undefined) {
        setVideoAdCount(data.videoAdCount);
      }
      
    } catch (error) {
      console.error('❌ Greška pri dohvatanju limita:', error);
      setDailyLimit({
        broj_pretraga: 0,
        max_pretraga: 3,
        preostalo: 0,
        moze: false
      });
    }
  }, [user]);

  // ============================================================
  // 🔥 DOHVATI BROJ VIDEO REKLAMA
  // ============================================================
  const fetchVideoAdCount = useCallback(async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) return;
    
    try {
      const res = await fetch(`${API_URL}/api/ai-chef/video-ads/${email}`);
      const data = await res.json();
      setVideoAdCount(data.broj_video_reklama || 0);
    } catch (error) {
      console.error('❌ Greška pri dohvatu broja video reklama:', error);
    }
  }, [user]);

  // ============================================================
  // 🔥 INICIJALNO DOHVATI LIMIT I VIDEO BROJ
  // ============================================================
  useEffect(() => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (email) {
      fetchDailyLimit();
      fetchVideoAdCount();
    }
  }, [user, fetchDailyLimit, fetchVideoAdCount]);

  // ============================================================
  // 🔥 PRIKAŽI VIDEO REKLAMU
  // ============================================================
  const showVideoAd = useCallback(() => {
    return new Promise((resolve) => {
      if (!ADSENSE_ENABLED) {
        let seconds = 0;
        setPoruka('🎬 Simulirana video reklama...');
        setPorukaType('info');
        const interval = setInterval(() => {
          seconds++;
          setPoruka(`🎬 Simulirana reklama... ${seconds}/3 sekundi`);
          if (seconds >= 3) {
            clearInterval(interval);
            setPoruka('✅ Simulirana reklama završena!');
            setPorukaType('success');
            setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 1000);
            resolve(true);
          }
        }, 1000);
        return;
      }

      setPoruka('🎬 Učitavam video reklamu... Molimo sačekajte.');
      setPorukaType('info');
      
      const adContainer = document.getElementById('video-ad-container');
      if (!adContainer) {
        setPoruka('❌ Greška: kontejner za reklamu nije pronađen');
        setPorukaType('error');
        setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
        resolve(false);
        return;
      }

      adContainer.innerHTML = '';
      adContainer.classList.remove('hidden');
      
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.height = 'auto';
      ins.style.minHeight = '250px';
      ins.style.backgroundColor = '#f8fafc';
      ins.style.borderRadius = '12px';
      ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
      ins.setAttribute('data-ad-slot', DEFAULT_SLOTS.video);
      ins.setAttribute('data-ad-format', 'video');
      ins.setAttribute('data-full-width-responsive', 'true');
      adContainer.appendChild(ins);
      
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        console.log('📢 Video AdSense reklama pokrenuta!');
      } catch (e) {
        console.error('❌ AdSense greška:', e);
        setPoruka('❌ Greška pri učitavanju reklame. Pokušajte ponovo.');
        setPorukaType('error');
        setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
        resolve(false);
        return;
      }
      
      let seconds = 0;
      let resolved = false;
      
      const timer = setInterval(() => {
        seconds++;
        if (seconds <= 5 && !resolved) {
          setPoruka(`🎬 Gledajte reklamu... ${seconds}/5 sekundi`);
        }
        if (seconds >= 5 && !resolved) {
          clearInterval(timer);
          setPoruka('✅ Video reklama završena!');
          setPorukaType('success');
          setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 1000);
          adContainer.classList.add('hidden');
          resolved = true;
          resolve(true);
        }
      }, 1000);
      
      setTimeout(() => {
        if (!resolved) {
          clearInterval(timer);
          setPoruka('⏳ Reklama se učitava, nastavljamo...');
          setPorukaType('info');
          setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 1000);
          adContainer.classList.add('hidden');
          resolved = true;
          resolve(true);
        }
      }, 10000);
    });
  }, []);

  // ============================================================
  // 🔥 OTKLJUČAJ 1 SLIKANJE NAKON VIDEO REKLAME
  // ============================================================
  const handleUnlockWithVideo = async () => {
    if (user?.premium) {
      setPoruka('⭐ Premium korisnici imaju 15 slikanja dnevno!');
      setPorukaType('info');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    
    if (!email) {
      setPoruka(t('aichef.errors.login_required'));
      setPorukaType('error');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
      return;
    }

    if (videoAdCount >= maxVideoAds) {
      setPoruka(`⚠️ Dosegli ste dnevni limit od ${maxVideoAds} video reklama. Pokušajte sutra!`);
      setPorukaType('warning');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
      return;
    }

    if (dailyLimit.preostalo > 0) {
      setPoruka(`✅ Već imate ${dailyLimit.preostalo} preostalih slikanja! Iskoristite ih.`);
      setPorukaType('success');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
      return;
    }

    if (dailyLimit.broj_pretraga >= dailyLimit.max_pretraga) {
      setPoruka(`✅ Već ste iskoristili svih ${dailyLimit.max_pretraga} slikanja danas. Pokušajte sutra!`);
      setPorukaType('warning');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
      return;
    }

    setLoadingLimit(true);
    try {
      const videoCompleted = await showVideoAd();
      
      if (!videoCompleted) {
        setPoruka('❌ Video reklama nije završena. Pokušajte ponovo.');
        setPorukaType('error');
        setLoadingLimit(false);
        setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
        return;
      }

      const res = await fetch(`${API_URL}/api/ai-chef/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email,
          type: 'video_ad'
        })
      });
      const data = await res.json();
      
      setDailyLimit({
        broj_pretraga: data.broj_pretraga || 0,
        max_pretraga: data.max_pretraga || 3,
        preostalo: data.preostalo || 0,
        moze: data.moze || false
      });
      
      setVideoAdCount(prev => prev + 1);
      setVideoWatched(true);
      
      setTimeout(() => {
        setVideoWatched(false);
      }, 3000);
      
      const remaining = maxVideoAds - (videoAdCount + 1);
      setPoruka(`✅ +1 slikanje! Sada imate ${data.preostalo || 0} preostalih slikanja. Preostalo ${remaining} video reklama za danas.`);
      setPorukaType('success');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
    } catch (error) {
      console.error('❌ Greška:', error);
      setPoruka(t('aichef.errors.general'));
      setPorukaType('error');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
    } finally {
      setLoadingLimit(false);
    }
  };

  // ============================================================
  // 🔥 GLAVNA PRETRAGA
  // ============================================================
  const handlePretraga = useCallback(async () => {
    if (isVoiceSearch) return;
    if (loading) return;

    if (!tekst.trim() && !slika) {
      setPoruka(t('aichef.errors.no_input'));
      setPorukaType('warning');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    const currentLang = i18n.language || 'hr';

    if (slika && !user?.premium) {
      if (dailyLimit.preostalo <= 0) {
        setPoruka('📸 Nema slikanja! Pogledaj video za 1 slikanje.');
        setPorukaType('warning');
        setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
        return;
      }
    }

    if (slika && user?.premium && dailyLimit.preostalo <= 0) {
      setPoruka(`⚠️ Dostigli ste dnevni limit od ${dailyLimit.max_pretraga} fotografija. Pokušajte sutra!`);
      setPorukaType('warning');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
      return;
    }

    setLoading(true);
    setVoiceActive(false);
    setPoruka(t('aichef.status.searching'));
    setPorukaType('info');
    setProgress(10);
    setStatus(t('aichef.status.sending'));

    const startTime = Date.now();
    let statusInterval;

    try {
      const formData = new FormData();
      formData.append('tekst', tekst);
      if (slika) formData.append('slika', slika);
      if (email) formData.append('email', email);
      formData.append('jezik', currentLang);

      setProgress(30);
      setStatus('📡 Komuniciram sa serverom...');

      statusInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed < 3) {
          setStatus(`🔍 Pretražujem bazu recepata... (${elapsed}s)`);
        } else if (elapsed < 6) {
          setStatus(`🤖 Konsultiram AI kuhara... (${elapsed}s)`);
          setPoruka(`⏳ AI razmišlja... već ${elapsed} sekundi`);
        } else if (elapsed < 10) {
          setStatus(`🧠 AI generira recepte... (${elapsed}s)`);
          setPoruka(`🧠 AI još uvijek razmišlja (${elapsed}s), hvala na strpljenju!`);
        } else {
          setStatus(`⏳ AI još uvijek radi... (${elapsed}s)`);
          setPoruka(`⏳ Ovo traje malo duže (${elapsed}s), AI priprema savršene recepte!`);
        }
      }, 2000);

      setProgress(50);
      setStatus(t('aichef.status.analyzing'));

      const res = await fetch(`${API_URL}/api/ai-chef`, {
        method: 'POST',
        body: formData
      });

      clearInterval(statusInterval);

      setProgress(100);
      setStatus(t('aichef.status.done'));
      const data = await res.json();
      
      const processedData = data.map(recipe => {
        if (recipe.prevod && currentLang !== 'hr') {
          return {
            ...recipe,
            naziv: recipe.prevod.naziv || recipe.naziv,
            opis: recipe.prevod.opis || recipe.opis,
            sastojci: recipe.prevod.sastojci || recipe.sastojci,
            upute: recipe.prevod.upute || recipe.upute,
            nacin_pripreme: recipe.prevod.nacin_pripreme || recipe.nacin_pripreme
          };
        }
        return recipe;
      });
      
      setRezultati(processedData);
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      if (res.headers.get('X-Cache') === 'HIT') {
        setPoruka(`💾 Rezultati dohvaćeni iz keša (${elapsed}s)`);
        setPorukaType('info');
      } else if (res.headers.get('X-Source') === 'database') {
        setPoruka(`📚 Rezultati iz baze (${elapsed}s)`);
        setPorukaType('success');
      } else if (res.headers.get('X-Source') === 'ai_generated') {
        setPoruka(`🤖 Rezultati generirani od strane AI (${elapsed}s)`);
        setPorukaType('success');
      } else {
        setPoruka(t('aichef.results.found', { count: processedData.length }));
        setPorukaType('success');
      }

      setSlika(null);
      setSlikaPreview(null);
      
      if (slika && !user?.premium) {
        await fetchDailyLimit();
      }
      
      if (videoWatched) {
        setVideoWatched(false);
        await fetchDailyLimit();
      }

      if (tekst.trim() && processedData.length > 0) {
        const novaPretraga = {
          tekst: tekst.trim(),
          datum: new Date().toLocaleDateString('hr'),
          rezultati: processedData.length
        };
        const nove = [novaPretraga, ...cestePretrage.filter(p => p.tekst !== tekst.trim())].slice(0, 5);
        setCestePretrage(nove);
        localStorage.setItem('cestePretrage', JSON.stringify(nove));
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      clearInterval(statusInterval);
      setPoruka(t('aichef.errors.search_failed'));
      setPorukaType('error');
      setStatus(t('aichef.errors.error'));
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (!poruka.includes('✅') && !poruka.includes('❌') && !poruka.includes('⚠️')) {
          setPoruka('');
          setPorukaType('info');
        }
      }, 5000);
    }
  }, [tekst, slika, loading, user, dailyLimit, videoWatched, i18n.language, t, fetchDailyLimit, cestePretrage, isVoiceSearch]);

  // ============================================================
  // 🔥 DIREKTNA PRETRAGA (ZA GLASOVNU)
  // ============================================================
  const handlePretragaDirect = useCallback(async (directText) => {
    if (loading) return;

    const searchText = directText || tekst;
    if (!searchText.trim() && !slika) {
      setPoruka(t('aichef.errors.no_input'));
      setPorukaType('warning');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    const currentLang = i18n.language || 'hr';

    if (slika && !user?.premium) {
      if (dailyLimit.preostalo <= 0) {
        setPoruka('📸 Nema slikanja! Pogledaj video za 1 slikanje.');
        setPorukaType('warning');
        setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
        return;
      }
    }

    if (slika && user?.premium && dailyLimit.preostalo <= 0) {
      setPoruka(`⚠️ Dostigli ste dnevni limit od ${dailyLimit.max_pretraga} fotografija. Pokušajte sutra!`);
      setPorukaType('warning');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
      return;
    }

    setLoading(true);
    setVoiceActive(false);
    setIsVoiceSearch(false);
    setPoruka(t('aichef.status.searching'));
    setPorukaType('info');
    setProgress(10);
    setStatus(t('aichef.status.sending'));

    const startTime = Date.now();
    let statusInterval;

    try {
      const formData = new FormData();
      formData.append('tekst', searchText);
      if (slika) formData.append('slika', slika);
      if (email) formData.append('email', email);
      formData.append('jezik', currentLang);

      setProgress(30);
      setStatus('📡 Komuniciram sa serverom...');

      statusInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed < 3) {
          setStatus(`🔍 Pretražujem bazu recepata... (${elapsed}s)`);
        } else if (elapsed < 6) {
          setStatus(`🤖 Konsultiram AI kuhara... (${elapsed}s)`);
          setPoruka(`⏳ AI razmišlja... već ${elapsed} sekundi`);
        } else if (elapsed < 10) {
          setStatus(`🧠 AI generira recepte... (${elapsed}s)`);
          setPoruka(`🧠 AI još uvijek razmišlja (${elapsed}s), hvala na strpljenju!`);
        } else {
          setStatus(`⏳ AI još uvijek radi... (${elapsed}s)`);
          setPoruka(`⏳ Ovo traje malo duže (${elapsed}s), AI priprema savršene recepte!`);
        }
      }, 2000);

      setProgress(50);
      setStatus(t('aichef.status.analyzing'));

      const res = await fetch(`${API_URL}/api/ai-chef`, {
        method: 'POST',
        body: formData
      });

      clearInterval(statusInterval);

      setProgress(100);
      setStatus(t('aichef.status.done'));
      const data = await res.json();
      
      const processedData = data.map(recipe => {
        if (recipe.prevod && currentLang !== 'hr') {
          return {
            ...recipe,
            naziv: recipe.prevod.naziv || recipe.naziv,
            opis: recipe.prevod.opis || recipe.opis,
            sastojci: recipe.prevod.sastojci || recipe.sastojci,
            upute: recipe.prevod.upute || recipe.upute,
            nacin_pripreme: recipe.prevod.nacin_pripreme || recipe.nacin_pripreme
          };
        }
        return recipe;
      });
      
      setRezultati(processedData);
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      if (res.headers.get('X-Cache') === 'HIT') {
        setPoruka(`💾 Rezultati dohvaćeni iz keša (${elapsed}s)`);
        setPorukaType('info');
      } else if (res.headers.get('X-Source') === 'database') {
        setPoruka(`📚 Rezultati iz baze (${elapsed}s)`);
        setPorukaType('success');
      } else if (res.headers.get('X-Source') === 'ai_generated') {
        setPoruka(`🤖 Rezultati generirani od strane AI (${elapsed}s)`);
        setPorukaType('success');
      } else {
        setPoruka(t('aichef.results.found', { count: processedData.length }));
        setPorukaType('success');
      }

      setSlika(null);
      setSlikaPreview(null);
      
      if (slika && !user?.premium) {
        await fetchDailyLimit();
      }
      
      if (videoWatched) {
        setVideoWatched(false);
        await fetchDailyLimit();
      }

      if (searchText.trim() && processedData.length > 0) {
        const novaPretraga = {
          tekst: searchText.trim(),
          datum: new Date().toLocaleDateString('hr'),
          rezultati: processedData.length
        };
        const nove = [novaPretraga, ...cestePretrage.filter(p => p.tekst !== searchText.trim())].slice(0, 5);
        setCestePretrage(nove);
        localStorage.setItem('cestePretrage', JSON.stringify(nove));
      }
    } catch (error) {
      console.error('❌ Greška:', error);
      clearInterval(statusInterval);
      setPoruka(t('aichef.errors.search_failed'));
      setPorukaType('error');
      setStatus(t('aichef.errors.error'));
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
    } finally {
      setLoading(false);
      setIsVoiceSearch(false);
      setTimeout(() => {
        if (!poruka.includes('✅') && !poruka.includes('❌') && !poruka.includes('⚠️')) {
          setPoruka('');
          setPorukaType('info');
        }
      }, 5000);
    }
  }, [slika, user, dailyLimit, videoWatched, i18n.language, t, fetchDailyLimit, cestePretrage, loading, tekst]);

  // ============================================================
  // 🔥 DEBOUNCE - SAMO ZA TIPKANJE
  // ============================================================
  useEffect(() => {
    if (isVoiceSearch) return;
    
    if (debouncedTekst.trim() && !loading) {
      handlePretraga();
    }
  }, [debouncedTekst, loading, handlePretraga, isVoiceSearch]);

  // ============================================================
  // FILTRIRAJ REZULTATE SA RESTRIKCIJAMA - POPRAVLJENO!
  // ============================================================
  useEffect(() => {
    let filtered = rezultati;
    
    if (filteri.vrsta) {
      filtered = filtered.filter(r => r.vrsta === filteri.vrsta);
    }
    if (filteri.vrijeme) {
      filtered = filtered.filter(r => r.vrijeme === filteri.vrijeme);
    }
    if (filteri.tezina) {
      filtered = filtered.filter(r => r.tezina === filteri.tezina);
    }
    
    if (profil?.izbjegava && profil.izbjegava.length > 0) {
      const restrikcije = profil.izbjegava.filter(r => 
        r !== 'Bez restrikcija' && r !== 'No restrictions' && r !== 'Keine Einschränkungen'
      );
      if (restrikcije.length > 0) {
        filtered = filtered.filter(recipe => {
          const izbjegava = recipe.izbjegava || [];
          return restrikcije.every(r => izbjegava.includes(r));
        });
      }
    }
    
    setFilteredRezultati(filtered);
  }, [filteri, rezultati, profil]);

  // ============================================================
  // 🔥 GLASOVNA PRETRAGA
  // ============================================================
  const handleVoiceSearch = () => {
    if (!user?.premium) {
      setPoruka(t('aichef.errors.voice_premium'));
      setPorukaType('warning');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
      return;
    }

    setIsVoiceSearch(true);

    try {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      if (!recognition) {
        setPoruka(t('aichef.errors.voice_not_supported'));
        setPorukaType('error');
        setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
        setIsVoiceSearch(false);
        return;
      }
      
      recognitionRef.current = recognition;
      
      recognition.lang = 'hr';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      
      setVoiceActive(true);
      setPoruka('🎤 Slušam... Govorite svoj upit');
      setPorukaType('info');
      setLoading(true);
      setStatus('🎤 Glasovna pretraga...');
      setProgress(10);
      
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setTekst(transcript);
        
        if (e.results[0].isFinal) {
          setPoruka(`✅ Prepoznato: "${transcript}"`);
          setPorukaType('success');
          setStatus('📝 Prepoznat tekst, pokrećem pretragu...');
          setProgress(30);
          setVoiceActive(false);
          
          if (transcript.trim()) {
            setTimeout(() => {
              handlePretragaDirect(transcript);
            }, 100);
          } else {
            setPoruka('❌ Nisam prepoznao tekst. Pokušajte ponovo.');
            setPorukaType('error');
            setLoading(false);
            setProgress(0);
            setIsVoiceSearch(false);
            setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
          }
        } else {
          setPoruka(`🎤 Slušam: "${transcript}"`);
          setPorukaType('info');
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Glasovna pretraga završila');
        setVoiceActive(false);
        
        if (!tekst.trim() && loading) {
          setPoruka('❌ Nisam prepoznao tekst. Pokušajte ponovo.');
          setPorukaType('error');
          setLoading(false);
          setProgress(0);
          setIsVoiceSearch(false);
          setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        setVoiceActive(false);
        setLoading(false);
        setProgress(0);
        setIsVoiceSearch(false);
        
        if (event.error === 'not-allowed') {
          setPoruka('❌ Dozvolite pristup mikrofonu za glasovnu pretragu.');
        } else if (event.error === 'no-speech') {
          setPoruka('❌ Nisam čuo govor. Pokušajte ponovo.');
        } else if (event.error === 'audio-capture') {
          setPoruka('❌ Nema pristupa mikrofonu. Provjerite postavke.');
        } else {
          setPoruka('❌ Greška pri glasovnoj pretrazi. Pokušajte ponovo.');
        }
        setPorukaType('error');
        setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
      };
      
      recognition.start();
      
      setTimeout(() => {
        try {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        } catch (e) {}
        setIsVoiceSearch(false);
      }, 10000);
      
    } catch (error) {
      console.error('❌ Greška:', error);
      setVoiceActive(false);
      setLoading(false);
      setProgress(0);
      setIsVoiceSearch(false);
      setPoruka('❌ Greška pri glasovnoj pretrazi. Pokušajte ponovo.');
      setPorukaType('error');
      setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 3000);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* HERO SEKCIJA */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 rounded-full px-4 py-1.5 mb-4 border border-purple-200/30 dark:border-purple-700/30">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {user?.premium ? '⭐ PREMIUM' : '🔓 FREE'}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
            {t('aichef.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto">
            {t('aichef.subtitle')}
          </p>
        </motion.div>

        {/* PORUKA */}
        <AnimatePresence>
          {poruka && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`mb-6 p-4 rounded-2xl backdrop-blur-sm border ${
                porukaType === 'success' 
                  ? 'bg-green-50/80 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                  : porukaType === 'error' 
                  ? 'bg-red-50/80 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                  : porukaType === 'warning'
                  ? 'bg-yellow-50/80 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300'
                  : 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {porukaType === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                {porukaType === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                {porukaType === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                {porukaType === 'info' && <Sparkles className="w-5 h-5 flex-shrink-0" />}
                <p className="text-sm flex-1">{poruka}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GLAVNI KONTEJNER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 md:p-8"
        >
          {/* STATISTIKE - SAMO AKO JE KORISNIK PRIJAVLJEN */}
          {user && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatsCard
                icon={Camera}
                label="Preostala slikanja"
                value={dailyLimit.preostalo}
                color="from-blue-500 to-blue-600"
                subtitle={`/${dailyLimit.max_pretraga}`}
              />
              <StatsCard
                icon={Video}
                label="Video reklame"
                value={maxVideoAds - videoAdCount}
                color="from-purple-500 to-purple-600"
                subtitle={`/${maxVideoAds}`}
              />
              <StatsCard
                icon={Star}
                label="Status"
                value={user?.premium ? 'Premium' : 'Free'}
                color="from-amber-500 to-amber-600"
              />
              <StatsCard
                icon={Clock}
                label="Današnje pretrage"
                value={dailyLimit.broj_pretraga}
                color="from-emerald-500 to-emerald-600"
                subtitle={`od ${dailyLimit.max_pretraga}`}
              />
            </div>
          )}

          {/* SEARCH MODE - DUGMAD */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSearchMode('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                searchMode === 'text'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Search className="w-4 h-4" />
              Tekst
            </button>
            <button
              onClick={() => {
                setSearchMode('image');
                if (dailyLimit.preostalo > 0 || user?.premium) {
                  fileInputRef.current?.click();
                } else {
                  setPoruka('📸 Nema slikanja! Pogledaj video za 1 slikanje.');
                  setPorukaType('warning');
                  setTimeout(() => { setPoruka(''); setPorukaType('info'); }, 4000);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                searchMode === 'image'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Camera className="w-4 h-4" />
              Slika
              {!user?.premium && dailyLimit.preostalo > 0 && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                  {dailyLimit.preostalo}
                </span>
              )}
            </button>
            <button
              onClick={handleVoiceSearch}
              disabled={!user?.premium || loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                user?.premium && !loading
                  ? voiceActive
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 animate-pulse'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Mic className="w-4 h-4" />
              {voiceActive ? 'Slušam...' : 'Glas'}
              {!user?.premium && ' ⭐'}
            </button>
          </div>

          {/* INPUT KONTEJNER */}
          <div className="relative">
            <div className="relative">
              <textarea
                id="tekstInput"
                value={tekst}
                onChange={(e) => setTekst(e.target.value)}
                placeholder={t('aichef.placeholder')}
                className="w-full border-0 bg-gray-50/80 dark:bg-gray-700/50 rounded-2xl px-5 py-4 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500 transition-all text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              {tekst && (
                <button
                  onClick={() => setTekst('')}
                  className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* SLIKA PREVIEW */}
            {slikaPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 relative inline-block"
              >
                <img 
                  src={slikaPreview} 
                  alt="Upload" 
                  className="h-32 w-32 object-cover rounded-2xl border-2 border-purple-200 dark:border-purple-700"
                />
                <button
                  onClick={() => {
                    setSlika(null);
                    setSlikaPreview(null);
                    setSearchMode('text');
                  }}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setSlika(e.target.files[0]);
                  setSlikaPreview(URL.createObjectURL(e.target.files[0]));
                  setSearchMode('image');
                }
              }}
            />
          </div>

          {/* DUGME ZA PRETRAGU */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePretraga}
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('aichef.buttons.searching')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t('aichef.buttons.search')}
              </>
            )}
          </motion.button>

          {/* LOADING PROGRESS */}
          {loading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  {status?.includes('AI') && '🤖'}
                  {status?.includes('bazu') && '🔍'}
                  {status?.includes('generira') && '🧠'}
                  {status?.includes('Glasovna') && '🎤'}
                  {status}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="animate-pulse">⏳</span>
                  {vrijemeCekanja > 0 && `${vrijemeCekanja}s`}
                </span>
                <span>
                  {poruka && poruka.includes('AI') && '🧠 AI generira recepte...'}
                  {poruka && poruka.includes('bazu') && '📚 Pretraga baze...'}
                  {poruka && poruka.includes('keša') && '💾 Dohvat iz keša...'}
                  {poruka && poruka.includes('Slušam') && '🎤 Slušam...'}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* PREMIUM HINT */}
        {!user?.premium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-center"
          >
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('aichef.premium_hint')}
            </p>
            <Link to="/premium" className="text-sm text-purple-600 dark:text-purple-400 font-semibold hover:underline inline-flex items-center gap-1">
              {t('aichef.premium_link')} <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>
        )}

        {/* REZULTATI */}
        <AnimatePresence>
          {rezultati.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {t('aichef.results.title')}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredRezultati.length} {t('aichef.results.recipes')}
                </span>
              </div>

              {/* FILTERI */}
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  className="border-0 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-purple-400"
                  value={filteri.vrsta}
                  onChange={(e) => setFilteri({ ...filteri, vrsta: e.target.value })}
                >
                  <option value="">🍽️ {t('aichef.filters.all_types')}</option>
                  {opcije.vrsta.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <select
                  className="border-0 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-purple-400"
                  value={filteri.vrijeme}
                  onChange={(e) => setFilteri({ ...filteri, vrijeme: e.target.value })}
                >
                  <option value="">⏱️ {t('aichef.filters.all_time')}</option>
                  {opcije.vrijeme.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <select
                  className="border-0 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-purple-400"
                  value={filteri.tezina}
                  onChange={(e) => setFilteri({ ...filteri, tezina: e.target.value })}
                >
                  <option value="">🏋️ {t('aichef.filters.all_difficulty')}</option>
                  {opcije.tezina.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <button
                  onClick={() => setFilteri({ vrsta: '', vrijeme: '', tezina: '' })}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition"
                >
                  🔄 {t('aichef.filters.reset')}
                </button>
              </div>

              {/* RECEPTI GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRezultati.map((recipe, index) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    <Link
                      to={`/recipes/${recipe.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-100 dark:border-gray-700 group"
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={recipe.slika || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
                          alt={recipe.naziv}
                          className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
                        />
                        {recipe._ai_generated && (
                          <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-1 line-clamp-1">
                          {recipe.naziv}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {recipe.vrijeme || '30 min'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {recipe.kalorije || 0} kcal
                          </span>
                          {recipe.tezina && (
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3 h-3" />
                              {recipe.tezina}
                            </span>
                          )}
                        </div>
                        {recipe.izbjegava && recipe.izbjegava.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {recipe.izbjegava.slice(0, 2).map((item, i) => (
                              <span key={i} className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                🚫 {item}
                              </span>
                            ))}
                            {recipe.izbjegava.length > 2 && (
                              <span className="text-[10px] text-gray-400">+{recipe.izbjegava.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* ČESTE PRETRAGE */}
              {cestePretrage.filter(p => p.rezultati > 0).length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t('aichef.common_searches')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cestePretrage.filter(p => p.rezultati > 0).map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setTekst(p.tekst)}
                        className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm px-3 py-1.5 rounded-full shadow-sm transition border border-gray-200 dark:border-gray-600"
                      >
                        {p.tekst} ({p.rezultati})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* NO RESULTS */}
        {!loading && rezultati.length === 0 && tekst && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700"
          >
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-gray-500 dark:text-gray-400">{t('aichef.no_results')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('aichef.try_again')}</p>
          </motion.div>
        )}

        {/* BACK HOME */}
        <Link to="/" className="inline-flex items-center gap-2 mt-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
          <ArrowRight className="w-4 h-4 rotate-180" />
          {t('aichef.back_home')}
        </Link>
      </div>
    </div>
  );
};

export default AIChef;