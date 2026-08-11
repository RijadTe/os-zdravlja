// frontend/src/pages/AIChef.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ADSENSE_CLIENT, ADSENSE_ENABLED, DEFAULT_SLOTS } from '../config/adsense';

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
// GLAVNA KOMPONENTA
// ============================================================
const AIChef = () => {
  const { t, i18n } = useTranslation();
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

  // 🔥 DAILY LIMIT - POČINJE OD 0/3 ZA FREE!
  const [dailyLimit, setDailyLimit] = useState({ 
    broj_pretraga: 0,     // ukupno iskorišteno (0-3 za FREE, 0-15 za PREMIUM)
    max_pretraga: 3,      // max za FREE
    preostalo: 0,         // POČINJE OD 0! (zaključano dok ne pogleda video)
    moze: false           // false dok ne pogleda video
  });
  const [loadingLimit, setLoadingLimit] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoAdCount, setVideoAdCount] = useState(0);
  const [maxVideoAds, setMaxVideoAds] = useState(3);
  const [voiceActive, setVoiceActive] = useState(false);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const recognitionRef = useRef(null);

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
        preostalo: 0,           // POČINJE OD 0!
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
      
      const maxPretraga = user?.premium ? 15 : 3;
      const brojPretraga = data.broj_pretraga || 0;
      
      // 🔥 VAŽNO: preostalo = max - broj_pretraga
      // Ako je broj_pretraga 0, preostalo je 0 (zaključano)
      const preostalo = Math.max(maxPretraga - brojPretraga, 0);
      
      setDailyLimit({
        broj_pretraga: brojPretraga,
        max_pretraga: maxPretraga,
        preostalo: preostalo,
        moze: preostalo > 0
      });
    } catch (error) {
      console.error('❌ Greška pri dohvatanju limita:', error);
      const maxPretraga = user?.premium ? 15 : 3;
      setDailyLimit(prev => ({ 
        ...prev, 
        max_pretraga: maxPretraga,
        preostalo: 0,  // POČINJE OD 0!
        moze: false 
      }));
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
        const interval = setInterval(() => {
          seconds++;
          setPoruka(`🎬 Simulirana reklama... ${seconds}/3 sekundi`);
          if (seconds >= 3) {
            clearInterval(interval);
            setPoruka('✅ Simulirana reklama završena!');
            setTimeout(() => setPoruka(''), 1000);
            resolve(true);
          }
        }, 1000);
        return;
      }

      setPoruka('🎬 Učitavam video reklamu... Molimo sačekajte.');
      
      const adContainer = document.getElementById('video-ad-container');
      if (!adContainer) {
        setPoruka('❌ Greška: kontejner za reklamu nije pronađen');
        setTimeout(() => setPoruka(''), 3000);
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
        setTimeout(() => setPoruka(''), 3000);
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
          setTimeout(() => setPoruka(''), 1000);
          adContainer.classList.add('hidden');
          resolved = true;
          resolve(true);
        }
      }, 1000);
      
      setTimeout(() => {
        if (!resolved) {
          clearInterval(timer);
          setPoruka('⏳ Reklama se učitava, nastavljamo...');
          setTimeout(() => setPoruka(''), 1000);
          adContainer.classList.add('hidden');
          resolved = true;
          resolve(true);
        }
      }, 10000);
    });
  }, []);

  // ============================================================
  // 🔥 OTKLJUČAJ 1 SLIKANJE NAKON VIDEO REKLAME - SAMO FREE!
  // ============================================================
  const handleUnlockWithVideo = async () => {
    // ⭐ Premium korisnici ne trebaju video
    if (user?.premium) {
      setPoruka('⭐ Premium korisnici imaju 15 slikanja dnevno!');
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    
    if (!email) {
      setPoruka(t('aichef.errors.login_required'));
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    // Provjera limita video reklama
    if (videoAdCount >= maxVideoAds) {
      setPoruka(`⚠️ Dosegli ste dnevni limit od ${maxVideoAds} video reklama. Pokušajte sutra!`);
      setTimeout(() => setPoruka(''), 4000);
      return;
    }

    // 🔥 VAŽNO: Ako već ima preostalih slikanja, ne treba mu video
    if (dailyLimit.preostalo > 0) {
      setPoruka(`✅ Već imate ${dailyLimit.preostalo} preostalih slikanja! Iskoristite ih.`);
      setTimeout(() => setPoruka(''), 4000);
      return;
    }

    // 🔥 VAŽNO: Ako je već dostigao max (3/3), ne može više
    if (dailyLimit.broj_pretraga >= dailyLimit.max_pretraga) {
      setPoruka(`✅ Već ste iskoristili svih ${dailyLimit.max_pretraga} slikanja danas. Pokušajte sutra!`);
      setTimeout(() => setPoruka(''), 4000);
      return;
    }

    setLoadingLimit(true);
    try {
      // Prikaži video reklamu
      const videoCompleted = await showVideoAd();
      
      if (!videoCompleted) {
        setPoruka('❌ Video reklama nije završena. Pokušajte ponovo.');
        setLoadingLimit(false);
        setTimeout(() => setPoruka(''), 3000);
        return;
      }

      // 🔥 API poziv za DODAVANJE 1 SLIKANJA
      const res = await fetch(`${API_URL}/api/ai-chef/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email,
          type: 'video_ad'
        })
      });
      const data = await res.json();
      
      // 🔥 NOVA LOGIKA: 
      // - broj_pretraga ostaje isti (npr. 0)
      // - preostalo postaje 1 (dobio je 1 slikanje)
      const maxPretraga = user?.premium ? 15 : 3;
      const brojPretraga = data.broj_pretraga || 0;
      
      // 🔥 OVDJE SE DODAJE 1 NA preostalo
      const novoPreostalo = Math.max(maxPretraga - brojPretraga, 0);
      
      setDailyLimit({
        broj_pretraga: brojPretraga,
        max_pretraga: maxPretraga,
        preostalo: novoPreostalo,  // SADA IMA 1 SLIKANJE!
        moze: novoPreostalo > 0
      });
      
      setVideoAdCount(prev => prev + 1);
      setVideoWatched(true);
      
      setTimeout(() => {
        setVideoWatched(false);
      }, 3000);
      
      const remaining = maxVideoAds - (videoAdCount + 1);
      setPoruka(`✅ +1 slikanje! Sada imate ${novoPreostalo} preostalih slikanja. Preostalo ${remaining} video reklama za danas.`);
      setTimeout(() => setPoruka(''), 4000);
    } catch (error) {
      console.error('❌ Greška:', error);
      setPoruka(t('aichef.errors.general'));
      setTimeout(() => setPoruka(''), 3000);
    } finally {
      setLoadingLimit(false);
    }
  };

  // ============================================================
  // 🔥 GLAVNA PRETRAGA - ZA TIPKANJE (SA DEBOUNCE-OM)
  // ============================================================
  const handlePretraga = useCallback(async () => {
    if (isVoiceSearch) return;
    if (loading) return;

    if (!tekst.trim() && !slika) {
      setPoruka(t('aichef.errors.no_input'));
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    const currentLang = i18n.language || 'hr';

    // 🔥 FREE KORISNIK - MORA IMATI PREOSTALIH SLIKANJA!
    if (slika && !user?.premium) {
      if (dailyLimit.preostalo <= 0) {
        setPoruka('📸 Nema slikanja! Pogledaj video za 1 slikanje.');
        setTimeout(() => setPoruka(''), 4000);
        return;
      }
    }

    // 🔥 PREMIUM - 15 SLIKANJA DNEVNO
    if (slika && user?.premium && dailyLimit.preostalo <= 0) {
      setPoruka(`⚠️ Dostigli ste dnevni limit od ${dailyLimit.max_pretraga} fotografija. Pokušajte sutra!`);
      setTimeout(() => setPoruka(''), 4000);
      return;
    }

    setLoading(true);
    setVoiceActive(false);
    setPoruka(t('aichef.status.searching'));
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
      } else if (res.headers.get('X-Source') === 'database') {
        setPoruka(`📚 Rezultati iz baze (${elapsed}s)`);
      } else if (res.headers.get('X-Source') === 'ai_generated') {
        setPoruka(`🤖 Rezultati generirani od strane AI (${elapsed}s)`);
      } else {
        setPoruka(t('aichef.results.found', { count: processedData.length }));
      }

      setSlika(null);
      
      // 🔥 NAKON USPJEŠNE PRETRAGE, SMANJI BROJ PREOSTALIH (SAMO ZA FREE)
      if (slika && !user?.premium) {
        const novoPreostalo = Math.max(dailyLimit.preostalo - 1, 0);
        const noviBrojPretraga = (dailyLimit.broj_pretraga || 0) + 1;
        
        setDailyLimit(prev => ({
          ...prev,
          preostalo: novoPreostalo,
          broj_pretraga: noviBrojPretraga,
          moze: novoPreostalo > 0
        }));
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
      setStatus(t('aichef.errors.error'));
      setTimeout(() => setPoruka(''), 4000);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (!poruka.includes('✅') && !poruka.includes('❌') && !poruka.includes('⚠️')) {
          setPoruka('');
        }
      }, 5000);
    }
  }, [tekst, slika, loading, user, dailyLimit, videoWatched, i18n.language, t, fetchDailyLimit, cestePretrage, isVoiceSearch]);

  // ============================================================
  // 🔥 DIREKTNA PRETRAGA (ZA GLASOVNU) - BEZ DEBOUNCE
  // ============================================================
  const handlePretragaDirect = useCallback(async (directText) => {
    if (loading) return;

    const searchText = directText || tekst;
    if (!searchText.trim() && !slika) {
      setPoruka(t('aichef.errors.no_input'));
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    const currentLang = i18n.language || 'hr';

    // 🔥 FREE KORISNIK - MORA IMATI PREOSTALIH SLIKANJA!
    if (slika && !user?.premium) {
      if (dailyLimit.preostalo <= 0) {
        setPoruka('📸 Nema slikanja! Pogledaj video za 1 slikanje.');
        setTimeout(() => setPoruka(''), 4000);
        return;
      }
    }

    // 🔥 PREMIUM - 15 SLIKANJA DNEVNO
    if (slika && user?.premium && dailyLimit.preostalo <= 0) {
      setPoruka(`⚠️ Dostigli ste dnevni limit od ${dailyLimit.max_pretraga} fotografija. Pokušajte sutra!`);
      setTimeout(() => setPoruka(''), 4000);
      return;
    }

    setLoading(true);
    setVoiceActive(false);
    setIsVoiceSearch(false);
    setPoruka(t('aichef.status.searching'));
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
      } else if (res.headers.get('X-Source') === 'database') {
        setPoruka(`📚 Rezultati iz baze (${elapsed}s)`);
      } else if (res.headers.get('X-Source') === 'ai_generated') {
        setPoruka(`🤖 Rezultati generirani od strane AI (${elapsed}s)`);
      } else {
        setPoruka(t('aichef.results.found', { count: processedData.length }));
      }

      setSlika(null);
      
      // 🔥 NAKON USPJEŠNE PRETRAGE, SMANJI BROJ PREOSTALIH (SAMO ZA FREE)
      if (slika && !user?.premium) {
        const novoPreostalo = Math.max(dailyLimit.preostalo - 1, 0);
        const noviBrojPretraga = (dailyLimit.broj_pretraga || 0) + 1;
        
        setDailyLimit(prev => ({
          ...prev,
          preostalo: novoPreostalo,
          broj_pretraga: noviBrojPretraga,
          moze: novoPreostalo > 0
        }));
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
      setStatus(t('aichef.errors.error'));
      setTimeout(() => setPoruka(''), 4000);
    } finally {
      setLoading(false);
      setIsVoiceSearch(false);
      setTimeout(() => {
        if (!poruka.includes('✅') && !poruka.includes('❌') && !poruka.includes('⚠️')) {
          setPoruka('');
        }
      }, 5000);
    }
  }, [slika, user, dailyLimit, videoWatched, i18n.language, t, fetchDailyLimit, cestePretrage, loading, tekst]);

  // ============================================================
  // 🔥 DEBOUNCE - SAMO ZA TIPKANJE (NE ZA GLASOVNU)
  // ============================================================
  useEffect(() => {
    if (isVoiceSearch) return;
    
    if (debouncedTekst.trim() && !loading) {
      handlePretraga();
    }
  }, [debouncedTekst, loading, handlePretraga, isVoiceSearch]);

  // ============================================================
  // FILTRIRAJ REZULTATE SA RESTRIKCIJAMA
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
  // 🔥 GLASOVNA PRETRAGA
  // ============================================================
  const handleVoiceSearch = () => {
    if (!user?.premium) {
      setPoruka(t('aichef.errors.voice_premium'));
      setTimeout(() => setPoruka(''), 3000);
      return;
    }

    setIsVoiceSearch(true);

    try {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      if (!recognition) {
        setPoruka(t('aichef.errors.voice_not_supported'));
        setTimeout(() => setPoruka(''), 3000);
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
      setLoading(true);
      setStatus('🎤 Glasovna pretraga...');
      setProgress(10);
      
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setTekst(transcript);
        
        if (e.results[0].isFinal) {
          setPoruka(`✅ Prepoznato: "${transcript}"`);
          setStatus('📝 Prepoznat tekst, pokrećem pretragu...');
          setProgress(30);
          setVoiceActive(false);
          
          if (transcript.trim()) {
            setTimeout(() => {
              handlePretragaDirect(transcript);
            }, 100);
          } else {
            setPoruka('❌ Nisam prepoznao tekst. Pokušajte ponovo.');
            setLoading(false);
            setProgress(0);
            setIsVoiceSearch(false);
            setTimeout(() => setPoruka(''), 3000);
          }
        } else {
          setPoruka(`🎤 Slušam: "${transcript}"`);
        }
      };
      
      recognition.onend = () => {
        console.log('🎤 Glasovna pretraga završila');
        setVoiceActive(false);
        
        if (!tekst.trim() && loading) {
          setPoruka('❌ Nisam prepoznao tekst. Pokušajte ponovo.');
          setLoading(false);
          setProgress(0);
          setIsVoiceSearch(false);
          setTimeout(() => setPoruka(''), 3000);
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
        setTimeout(() => setPoruka(''), 4000);
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
        {t('aichef.title')}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
        {t('aichef.subtitle')}
      </p>

      {poruka && (
        <div className={`text-center p-3 mb-4 rounded-xl ${
          poruka.includes('✅') ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200' : 
          poruka.includes('❌') || poruka.includes('⚠️') ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' : 
          poruka.includes('💾') ? 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200' :
          poruka.includes('🎤') ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200' :
          'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
        }`}>
          {poruka}
        </div>
      )}

      {/* GLAVNI KONTEJNER */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-6">
        
        {/* ============================================================
            🔥 FREE KORISNIK - VIDEO → SLIKANJE (POČINJE OD 0/3!)
            ============================================================ */}
        {!user?.premium && (
          <div className="mb-4 space-y-3">
            {/* 🔥 STATUS - prikazuje iskorišteno (0/3 na početku) */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  📸 <span className={`font-semibold ${dailyLimit.broj_pretraga >= dailyLimit.max_pretraga ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {dailyLimit.broj_pretraga}
                  </span>/{dailyLimit.max_pretraga} slikanja
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  📺 <span className={`font-semibold ${videoAdCount >= maxVideoAds ? 'text-red-500' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {maxVideoAds - videoAdCount}
                  </span>/{maxVideoAds} video
                </span>
              </div>
              
              {/* 🔥 POKAŽI KOLIKO JE PREOSTALO */}
              {dailyLimit.preostalo > 0 ? (
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  ✅ {dailyLimit.preostalo} preostalo
                </span>
              ) : dailyLimit.broj_pretraga >= dailyLimit.max_pretraga ? (
                <span className="text-xs font-semibold text-red-500">
                  🚫 Limit iskorišten
                </span>
              ) : (
                <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 animate-pulse">
                  🎬 Pogledaj video za slikanje!
                </span>
              )}
            </div>

            {/* 📸 DUGME ZA SLIKANJE - ZAKLJUČANO AKO JE preostalo <= 0 */}
            <div className="flex flex-col gap-2">
              <button
                className={`px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-3 w-full justify-center ${
                  dailyLimit.preostalo > 0
                    ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (dailyLimit.preostalo > 0) {
                    document.getElementById('fileInput').click();
                  }
                }}
                disabled={dailyLimit.preostalo <= 0}
              >
                <span className="text-3xl">📸</span> 
                {dailyLimit.preostalo > 0 
                  ? `Slikaj (${dailyLimit.preostalo} preostalo)` 
                  : dailyLimit.broj_pretraga >= dailyLimit.max_pretraga
                    ? '🚫 Limit iskorišten - sutra!'
                    : '🔒 Pogledaj video za 1 slikanje'
                }
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
            </div>

            {/* 🎬 VIDEO OTKLJUČAVANJE - SAMO AKO JE preostalo === 0 I broj_pretraga < max */}
            {videoAdCount < maxVideoAds && dailyLimit.preostalo === 0 && dailyLimit.broj_pretraga < dailyLimit.max_pretraga && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400/50 dark:border-yellow-600/50 p-4 md:p-5 transition-all hover:border-yellow-500">
                <div className="absolute -right-6 -top-6 text-7xl opacity-10 select-none">🎬</div>
                
                <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-4 w-full sm:w-auto">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-2xl animate-pulse">
                      🎬
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white">
                        🎬 Pogledaj video za 1 slikanje!
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Trenutno: {dailyLimit.broj_pretraga}/{dailyLimit.max_pretraga} slikanja
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Preostalo video reklama: {maxVideoAds - videoAdCount}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleUnlockWithVideo}
                    disabled={loadingLimit || videoWatched || videoAdCount >= maxVideoAds}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 w-full sm:w-auto justify-center ${
                      loadingLimit || videoWatched || videoAdCount >= maxVideoAds
                        ? 'bg-gray-400 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:scale-105 hover:shadow-lg active:scale-95'
                    }`}
                  >
                    {loadingLimit ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Učitavanje...
                      </>
                    ) : videoWatched ? (
                      '✅ +1 slikanje!'
                    ) : videoAdCount >= maxVideoAds ? (
                      '🚫 Limit iskorišten'
                    ) : (
                      <>
                        <span>▶️</span> Pogledaj video → 1 slikanje
                      </>
                    )}
                  </button>
                </div>

                <div id="video-ad-container" className={`mt-4 min-h-[200px] bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden ${videoWatched ? '' : 'hidden'}`}></div>

                {videoWatched && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-700 animate-fadeIn">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <span className="text-xl">✅</span> 
                      <span className="font-semibold">+1 slikanje!</span> 
                      <span className="text-green-600 dark:text-green-400">
                        Sada imate <span className="font-bold">{dailyLimit.preostalo}</span>/{dailyLimit.max_pretraga} preostalih slikanja
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* KADA KORISNIK IMA PREOSTALIH SLIKANJA - pokaži mu da ih iskoristi */}
            {dailyLimit.preostalo > 0 && dailyLimit.broj_pretraga < dailyLimit.max_pretraga && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <span>Iskoristite svojih <strong>{dailyLimit.preostalo}</strong> preostalih slikanja!</span>
                </p>
              </div>
            )}

            {/* KADA JE POTROŠIO SVE SLIKE (3/3) */}
            {dailyLimit.broj_pretraga >= dailyLimit.max_pretraga && (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-center border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ✅ Iskoristili ste svih {dailyLimit.max_pretraga} slikanja danas!
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Pokušajte sutra za nove pretrage
                </p>
              </div>
            )}

            {/* Limit video iskorišten */}
            {videoAdCount >= maxVideoAds && dailyLimit.broj_pretraga < dailyLimit.max_pretraga && (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl text-center border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  📺 Dnevni limit video reklama iskorišten ({maxVideoAds}/{maxVideoAds})
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Pokušajte sutra za nove pretrage
                </p>
              </div>
            )}

            {/* PREMIUM PROMO */}
            <div className="text-center mt-2">
              <Link 
                to="/premium" 
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400 transition"
              >
                ⭐ Otključaj 15 slikanja dnevno uz Premium →
              </Link>
            </div>
          </div>
        )}

        {/* ============================================================
            ⭐ PREMIUM KORISNIK - 15 SLIKANJA, NEMA VIDEOREKLAMA!
            ============================================================ */}
        {user?.premium && (
          <div className="mb-4">
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  📸 <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {dailyLimit.broj_pretraga}
                  </span>/{dailyLimit.max_pretraga} slikanja
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  ⭐ Premium
                </span>
              </div>
              {dailyLimit.preostalo > 0 && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  ✅ {dailyLimit.preostalo} preostalo
                </span>
              )}
            </div>

            <button
              className={`px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-3 w-full justify-center ${
                dailyLimit.preostalo > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              onClick={() => dailyLimit.preostalo > 0 && document.getElementById('fileInputPremium').click()}
              disabled={dailyLimit.preostalo <= 0}
            >
              <span className="text-3xl">📸</span> 
              {dailyLimit.preostalo > 0 
                ? `Slikaj (${dailyLimit.preostalo} preostalo)` 
                : `🚫 ${dailyLimit.max_pretraga}/${dailyLimit.max_pretraga} iskorišteno - sutra!`
              }
            </button>
            
            <input
              id="fileInputPremium"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setSlika(e.target.files[0]);
                }
              }}
            />

            <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-1">
              ⭐ Premium korisnici imaju {dailyLimit.max_pretraga} slikanja dnevno (bez video reklama)
            </p>
          </div>
        )}

        {/* ============================================================
            ✏️ TEKST INPUT - ZAJEDNIČKI ZA SVE
            ============================================================ */}
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          <button
            className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-3"
            onClick={() => document.getElementById('tekstInput').focus()}
          >
            <span className="text-3xl">✏️</span> {t('aichef.buttons.type')}
          </button>

          <button
            className={`px-8 py-4 rounded-2xl text-lg font-semibold transition shadow-md hover:shadow-lg flex items-center gap-3 ${
              user?.premium
                ? `bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white ${voiceActive ? 'animate-pulse ring-2 ring-red-500' : ''}`
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            onClick={handleVoiceSearch}
            disabled={!user?.premium || loading}
          >
            <span className="text-3xl">{voiceActive ? '🔴' : '🎤'}</span> 
            {voiceActive ? 'Slušam...' : t('aichef.buttons.voice')} 
            {!user?.premium && '⭐ PREMIUM'}
          </button>
        </div>

        {/* 🔥 LOADING INDIKATOR */}
        {loading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
              <span className="flex items-center gap-2">
                {voiceActive && <span className="text-red-500 animate-pulse text-lg">●</span>}
                {status?.includes('AI') && '🤖'}
                {status?.includes('bazu') && '🔍'}
                {status?.includes('generira') && '🧠'}
                {status?.includes('Glasovna') && '🎤'}
                {status}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  status?.includes('AI') || status?.includes('generira') 
                    ? 'bg-purple-600' 
                    : status?.includes('bazu') 
                    ? 'bg-blue-600'
                    : status?.includes('Glasovna')
                    ? 'bg-yellow-500'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
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

        {slika && (
          <div className="text-center mb-4">
            <img src={URL.createObjectURL(slika)} alt="Upload" className="max-h-48 mx-auto rounded-lg" />
            <button
              onClick={() => setSlika(null)}
              className="text-red-500 dark:text-red-400 text-sm mt-1 hover:underline"
            >
              {t('aichef.buttons.remove_image')}
            </button>
          </div>
        )}

        <textarea
          id="tekstInput"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder={t('aichef.placeholder')}
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
              {t('aichef.buttons.searching')}
            </>
          ) : (
            t('aichef.buttons.search')
          )}
        </button>

        {!user?.premium && (
          <div className="text-center mt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t('aichef.premium_hint')}
            </p>
            <Link to="/premium" className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">
              {t('aichef.premium_link')}
            </Link>
          </div>
        )}
      </div>

      {/* REZULTATI */}
      {rezultati.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{t('aichef.results.title')}</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            <select
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={filteri.vrsta}
              onChange={(e) => setFilteri({ ...filteri, vrsta: e.target.value })}
            >
              <option value="">🍽️ {t('aichef.filters.all_types')}</option>
              {opcije.vrsta.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={filteri.vrijeme}
              onChange={(e) => setFilteri({ ...filteri, vrijeme: e.target.value })}
            >
              <option value="">⏱️ {t('aichef.filters.all_time')}</option>
              {opcije.vrijeme.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
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
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
            >
              🔄 {t('aichef.filters.reset')}
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
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2">{t('aichef.common_searches')}</h3>
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
          <p className="text-gray-500 dark:text-gray-400">{t('aichef.no_results')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('aichef.try_again')}</p>
        </div>
      )}

      <Link to="/" className="inline-block mt-6 text-blue-500 dark:text-blue-400 hover:underline">
        ⬅️ {t('aichef.back_home')}
      </Link>
    </div>
  );
};

export default AIChef;