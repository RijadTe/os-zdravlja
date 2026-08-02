// frontend/src/pages/FoodPlanner.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import axios from 'axios';
import { supabase } from '../supabaseClient';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const FoodPlanner = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [user, setUser] = useState(null);
  const [obroci, setObroci] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingObroci, setLoadingObroci] = useState(true);
  const [noviObrok, setNoviObrok] = useState({
    naziv: '',
    kalorije: '',
    proteini: '',
    ugljikohidrati: '',
    masti: '',
    tip: 'Ručak'
  });

  // --- EMOJI UNOS RASPOLOŽENJA ---
  const [moodBefore, setMoodBefore] = useState('');
  const [moodAfter, setMoodAfter] = useState('');
  const [moodNote, setMoodNote] = useState('');

  const moodOptions = [
    { emoji: '😊', label: 'Sretan' },
    { emoji: '😐', label: 'Neutralan' },
    { emoji: '😞', label: 'Tužan' },
    { emoji: '😡', label: 'Ljut' },
    { emoji: '😴', label: 'Umoran' },
    { emoji: '🤩', label: 'Uzbuđen' },
    { emoji: '😌', label: 'Opušten' },
    { emoji: '🤔', label: 'Zamišljen' },
  ];

  // --- AI KUHARSKA VIKENDICA ---
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [fridgeItems, setFridgeItems] = useState([]);

  // ============================================================
  // DOHVATI KORISNIKA
  // ============================================================
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    const email = localStorage.getItem('userEmail');
    if (userData) {
      setUser(userData);
    } else if (email) {
      setUser({ email: email });
    }

    // Dohvati namirnice iz frižidera
    const saved = localStorage.getItem('fridgeItems');
    if (saved) {
      try {
        setFridgeItems(JSON.parse(saved));
      } catch (e) {
        setFridgeItems([]);
      }
    }
  }, []);

  // ============================================================
  // DOHVATI OBROKE IZ BAZE
  // ============================================================
  const fetchObroci = useCallback(async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
      setLoadingObroci(false);
      return;
    }

    try {
      setLoadingObroci(true);
      const danas = new Date().toISOString().split('T')[0];
      const res = await axios.get(`http://localhost:5000/api/obroci/${email}?datum=${danas}`);
      setObroci(res.data || []);
    } catch (error) {
      console.error('❌ Greška pri dohvatu obroka:', error);
      setObroci([]);
    } finally {
      setLoadingObroci(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.email || localStorage.getItem('userEmail')) {
      fetchObroci();
    }
  }, [user, fetchObroci]);

  // ============================================================
  // DODAJ OBROK (U BAZU)
  // ============================================================
  const handleDodajObrok = useCallback(async (e) => {
    e.preventDefault();
    
    if (!noviObrok.naziv || !noviObrok.kalorije) {
      alert('⚠️ Molimo unesite naziv i kalorije.');
      return;
    }

    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
      alert('⚠️ Morate biti prijavljeni.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/obroci', {
        email: email,
        naziv: noviObrok.naziv,
        kalorije: parseFloat(noviObrok.kalorije) || 0,
        proteini: parseFloat(noviObrok.proteini) || 0,
        ugljikohidrati: parseFloat(noviObrok.ugljikohidrati) || 0,
        masti: parseFloat(noviObrok.masti) || 0,
        tip: noviObrok.tip || 'Ručak',
        mood_before: moodBefore || '😐',
        mood_after: moodAfter || '😐',
        mood_note: moodNote || ''
      });

      setObroci(prev => [res.data, ...prev]);
      setNoviObrok({ naziv: '', kalorije: '', proteini: '', ugljikohidrati: '', masti: '', tip: 'Ručak' });
      setMoodBefore('');
      setMoodAfter('');
      setMoodNote('');
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri dodavanju obroka. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  }, [noviObrok, moodBefore, moodAfter, moodNote, user]);

  // ============================================================
  // IZBRIŠI OBROK (IZ BAZE)
  // ============================================================
  const handleDeleteObrok = useCallback(async (id) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovaj obrok?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/obroci/${id}`);
      setObroci(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri brisanju obroka.');
    }
  }, []);

  // ============================================================
  // IZRAČUNAJ UKUPNO
  // ============================================================
  const ukupno = useMemo(() => {
    return obroci.reduce((acc, obrok) => ({
      kalorije: acc.kalorije + (obrok.kalorije || 0),
      proteini: acc.proteini + (obrok.proteini || 0),
      ugljikohidrati: acc.ugljikohidrati + (obrok.ugljikohidrati || 0),
      masti: acc.masti + (obrok.masti || 0)
    }), { kalorije: 0, proteini: 0, ugljikohidrati: 0, masti: 0 });
  }, [obroci]);

  // ============================================================
  // DNEVNI CILJ (2200 kcal)
  // ============================================================
  const dailyGoal = 2200;
  const progress = Math.min((ukupno.kalorije / dailyGoal) * 100, 100);

  // ============================================================
  // AI PLAN
  // ============================================================
  const generateWeeklyPlan = async () => {
    setLoadingPlan(true);
    try {
      const email = user?.email || localStorage.getItem('userEmail');
      const res = await axios.post('http://localhost:5000/api/ai-weekly-plan', {
        email: email,
        sastojci: fridgeItems
      });
      setWeeklyPlan(res.data);
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri generisanju plana. Pokušajte ponovo.');
      setWeeklyPlan({
        dani: [
          { naziv: 'Pon', dorucak: 'Ovsena kaša', rucak: 'Pileća prsa', vecera: 'Losos' },
          { naziv: 'Uto', dorucak: 'Jaja', rucak: 'Salata', vecera: 'Tofu' },
          { naziv: 'Sri', dorucak: 'Smoothie', rucak: 'Riba', vecera: 'Krompir' },
          { naziv: 'Čet', dorucak: 'Palenta', rucak: 'Piletina', vecera: 'Povrće' },
          { naziv: 'Pet', dorucak: 'Musli', rucak: 'Burger', vecera: 'Pizza' },
          { naziv: 'Sub', dorucak: 'Palačinke', rucak: 'Ćevapi', vecera: 'Riba' },
          { naziv: 'Ned', dorucak: 'Kajgana', rucak: 'Pečenje', vecera: 'Salata' },
        ]
      });
    } finally {
      setLoadingPlan(false);
    }
  };

  // ============================================================
  // GRAFIKONI
  // ============================================================
  const lineData = useMemo(() => ({
    labels: ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'],
    datasets: [
      {
        label: 'Kalorije',
        data: [1800, 2000, 1900, 2200, 2100, 1950, 1850],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Cilj (2200 kcal)',
        data: [2200, 2200, 2200, 2200, 2200, 2200, 2200],
        borderColor: 'rgb(239, 68, 68)',
        borderDash: [5, 5],
        pointRadius: 0,
      },
    ],
  }), []);

  const doughnutData = useMemo(() => ({
    labels: ['Proteini', 'Ugljikohidrati', 'Masti'],
    datasets: [{
      data: [
        Math.round((ukupno.proteini / (ukupno.proteini + ukupno.ugljikohidrati + ukupno.masti || 1)) * 100),
        Math.round((ukupno.ugljikohidrati / (ukupno.proteini + ukupno.ugljikohidrati + ukupno.masti || 1)) * 100),
        Math.round((ukupno.masti / (ukupno.proteini + ukupno.ugljikohidrati + ukupno.masti || 1)) * 100)
      ],
      backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b'],
      borderWidth: 0,
    }],
  }), [ukupno]);

  // ============================================================
  // PDF IZVJEŠTAJ - POPRAVLJEN SA API POZIVOM
  // ============================================================
  const generatePDF = async () => {
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
      alert('⚠️ Morate biti prijavljeni.');
      return;
    }

    if (obroci.length === 0) {
      alert('⚠️ Nema obroka za izvještaj. Dodajte nekoliko obroka prvo.');
      return;
    }

    try {
      setLoading(true);
      const danas = new Date().toISOString().split('T')[0];
      // Otvori PDF u novom tabu
      window.open(`http://localhost:5000/api/pdf/izvjestaj/${encodeURIComponent(email)}?datum=${danas}`, '_blank');
    } catch (error) {
      console.error('❌ Greška:', error);
      alert('❌ Greška pri generisanju PDF-a.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER - NIJE PREMIUM
  // ============================================================
  if (!user?.premium) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center dark:bg-gray-900 dark:text-white">
        <h1 className="text-3xl font-bold mb-4">📊 Dnevnik ishrane</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Ova sekcija je dostupna samo za Premium korisnike.
        </p>
        <Link to="/premium" className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-full font-semibold transition inline-block">
          ⭐ Postani Premium
        </Link>
      </div>
    );
  }

  // ============================================================
  // RENDER - GLAVNI UI
  // ============================================================
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">📊 Dnevnik ishrane</h1>

      {/* TABOVI */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {['📝 Dnevnik', '📈 Analitika', '📅 Plan obroka'].map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 font-semibold transition whitespace-nowrap ${
              activeTab === index
                ? 'border-b-2 border-blue-500 text-blue-500 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: DNEVNIK */}
      {/* ============================================================ */}
      {activeTab === 0 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">📅 Danas, {new Date().toLocaleDateString('hr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
            
            {/* PROGRESS BAR */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold dark:text-white">🎯 Dnevni cilj: {dailyGoal} kcal</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Uneseno: {Math.round(ukupno.kalorije)} kcal
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    progress > 100 ? 'bg-red-500' : 'bg-blue-600'
                  }`} 
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>🥩 Proteini: {Math.round(ukupno.proteini)}g</span>
                <span>🍞 Uglj.: {Math.round(ukupno.ugljikohidrati)}g</span>
                <span>🧈 Masti: {Math.round(ukupno.masti)}g</span>
              </div>
            </div>
          </div>

          {/* FORMA ZA UNOS */}
          <form onSubmit={handleDodajObrok} className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
            <h3 className="font-bold dark:text-white mb-2">➕ Dodaj obrok</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder="Naziv jela..."
                value={noviObrok.naziv}
                onChange={(e) => setNoviObrok({...noviObrok, naziv: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                required
              />
              <select
                value={noviObrok.tip}
                onChange={(e) => setNoviObrok({...noviObrok, tip: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="Doručak">🌅 Doručak</option>
                <option value="Ručak">☀️ Ručak</option>
                <option value="Večera">🌙 Večera</option>
                <option value="Užina">🍿 Užina</option>
              </select>
            </div>

            {/* EMOJI UNOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">😊 Raspoloženje PRIJE obroka</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {moodOptions.map(m => (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => setMoodBefore(m.emoji)}
                      className={`p-1.5 rounded-lg text-lg transition ${
                        moodBefore === m.emoji ? 'bg-blue-500 text-white scale-110' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">😊 Raspoloženje POSLIJE obroka</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {moodOptions.map(m => (
                    <button
                      key={m.emoji}
                      type="button"
                      onClick={() => setMoodAfter(m.emoji)}
                      className={`p-1.5 rounded-lg text-lg transition ${
                        moodAfter === m.emoji ? 'bg-green-500 text-white scale-110' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              type="text"
              placeholder="📝 Bilješka (npr. 'Bila sam gladna', 'Dosada')"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 mb-2"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                type="number"
                placeholder="Kalorije"
                value={noviObrok.kalorije}
                onChange={(e) => setNoviObrok({...noviObrok, kalorije: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                required
              />
              <input
                type="number"
                placeholder="Proteini (g)"
                value={noviObrok.proteini}
                onChange={(e) => setNoviObrok({...noviObrok, proteini: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <input
                type="number"
                placeholder="Uglj. (g)"
                value={noviObrok.ugljikohidrati}
                onChange={(e) => setNoviObrok({...noviObrok, ugljikohidrati: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <input
                type="number"
                placeholder="Masti (g)"
                value={noviObrok.masti}
                onChange={(e) => setNoviObrok({...noviObrok, masti: e.target.value})}
                className="border rounded-lg px-4 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
            
            <button type="submit" disabled={loading} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50">
              {loading ? '⏳ Slanje...' : '➕ Dodaj obrok'}
            </button>
          </form>

          {/* LISTA OBROKA */}
          {loadingObroci ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">⏳ Učitavanje obroka...</p>
            </div>
          ) : obroci.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-2">🍽️</p>
              <p>Još nema unesenih obroka za danas.</p>
              <p className="text-sm">Dodajte svoj prvi obrok!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {obroci.map(obrok => (
                <div key={obrok.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold dark:text-white">{obrok.naziv}</h4>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                          {obrok.tip}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{obrok.vrijeme}</span>
                        <span className="text-lg">{obrok.mood_before || '😐'} → {obrok.mood_after || '😐'}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        🥩 {obrok.proteini || 0}g · 🍞 {obrok.ugljikohidrati || 0}g · 🧈 {obrok.masti || 0}g
                        {obrok.mood_note && <span className="ml-2 text-xs text-gray-400">📝 {obrok.mood_note}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700 dark:text-white">{obrok.kalorije} kcal</span>
                      <button
                        onClick={() => handleDeleteObrok(obrok.id)}
                        className="text-red-400 hover:text-red-600 transition"
                        title="Obriši obrok"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ANALITIKA */}
      {/* ============================================================ */}
      {activeTab === 1 && (
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white">📈 Analitika</h2>
          
          {obroci.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-4xl mb-2">📊</p>
              <p>Nema dovoljno podataka za analitiku.</p>
              <p className="text-sm">Unesite nekoliko obroka da vidite statistiku.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h3 className="font-semibold text-center dark:text-white mb-2">📊 Sedmični unos kalorija</h3>
                <Line 
                  data={lineData} 
                  options={{ 
                    responsive: true, 
                    plugins: { 
                      legend: { 
                        labels: { color: document.documentElement.classList.contains('dark') ? '#fff' : '#000' } 
                      } 
                    } 
                  }} 
                />
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                <h3 className="font-semibold text-center dark:text-white mb-2">🥧 Makronutrijenti</h3>
                <Doughnut 
                  data={doughnutData} 
                  options={{ 
                    responsive: true, 
                    plugins: { 
                      legend: { 
                        labels: { color: document.documentElement.classList.contains('dark') ? '#fff' : '#000' } 
                      } 
                    } 
                  }} 
                />
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <span className="text-blue-500">🥩 Proteini</span>
                  <span className="text-green-500">🍞 Ugljikohidrati</span>
                  <span className="text-yellow-500">🧈 Masti</span>
                </div>
              </div>
            </div>
          )}
          
          <button 
            onClick={generatePDF}
            disabled={loading}
            className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
          >
            {loading ? '⏳ Generišem...' : '📄 Generiši PDF izvještaj'}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PLAN OBROKA */}
      {/* ============================================================ */}
      {activeTab === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-4 dark:text-white">📅 Plan obroka</h2>
          
          <button
            onClick={generateWeeklyPlan}
            disabled={loadingPlan}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition mb-4 flex items-center gap-2 disabled:opacity-50"
          >
            {loadingPlan ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generišem...
              </>
            ) : (
              '🤖 Generiši sedmični plan'
            )}
          </button>

          {weeklyPlan ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {weeklyPlan.dani?.map((dan, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-sm dark:text-white">{dan.naziv}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">🌅 {dan.dorucak}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">☀️ {dan.rucak}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">🌙 {dan.vecera}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map((dan, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-sm dark:text-white">{dan}</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">🌅 ---</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">☀️ ---</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">🌙 ---</p>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
            💡 Plan se generiše na osnovu vaših namirnica u frižideru
          </p>
        </div>
      )}
    </div>
  );
};

export default FoodPlanner;