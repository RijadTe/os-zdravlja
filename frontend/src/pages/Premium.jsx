// frontend/src/pages/Premium.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Premium = () => {
  const [loading, setLoading] = useState(false);

  const handlePremium = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        alert('Molimo prijavite se prvo.');
        setLoading(false);
        return;
      }

      console.log('💳 Pokrećem Stripe checkout za:', user.email);
      
      const res = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Greška pri kreiranju sesije');
      }

      const data = await res.json();
      console.log('✅ Stripe session kreiran:', data.url);
      
      // Preusmjeri na Stripe checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('❌ Greška:', error);
      alert(`❌ Greška pri pokretanju plaćanja: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Premium funkcionalnosti
  const premiumFeatures = [
    {
      icon: '📸',
      title: 'Prepoznavanje sastojaka',
      description: 'Uslikajte sastojke i sistem prepoznaje šta imate u frižideru. Bez kucanja!'
    },
    {
      icon: '🎤',
      title: 'Glasovna pretraga',
      description: 'Umjesto kucanja, samo izgovorite sastojke koje imate kod kuće.'
    },
    {
      icon: '🌿',
      title: 'HealthyChef (3 nivoa)',
      description: '6 kategorija, 29 podkategorija – recepti za hormonski ciklus, tiroidu, anemiju, menopauzu, PCOS i kosti.'
    },
    {
      icon: '📊',
      title: 'Dnevnik ishrane + Analitika',
      description: 'Unosite obroke, pratite kalorije, proteine, ugljikohidrate i masti kroz sedmicu sa grafikonom.'
    },
    {
      icon: '📅',
      title: 'Personalizovani plan obroka',
      description: 'Generišite sedmični plan obroka na osnovu vašeg raspoloženja i preferencija.'
    },
    {
      icon: '🧊',
      title: 'Virtuelni frižider',
      description: 'Dodajte namirnice koje imate, a sistem vam preporučuje recepte na osnovu njih.'
    },
    {
      icon: '🧘',
      title: 'Lifestyle Coach',
      description: 'Odgovorite na pitanja o snu, energiji i stresu – dobijate personalizovane preporuke za ishranu.'
    },
    {
      icon: '🍷',
      title: 'Somelijer – savršene kombinacije',
      description: 'Za svaki recept dobijete preporuku za začine, piće, prilog i idealno vrijeme za jelo.'
    },
    {
      icon: '📸',
      title: 'Scan Receipt',
      description: 'Uslikajte račun iz prodavnice – sistem prepoznaje namirnice i dodaje ih u frižider.'
    },
    {
      icon: '🎤',
      title: 'Glasovno kuhanje',
      description: 'Slušajte upute korak po korak dok kuhate – ruke su vam slobodne!'
    },
    {
      icon: '📝',
      title: 'Community – Objave',
      description: 'Podijelite svoje recepte, lajkajte tuđe i budite dio zajednice.'
    },
    {
      icon: '🏆',
      title: 'Bedževi i izazovi',
      description: 'Osvojite bedževe za dostignuća (prvi recept, 10 recepata...) i pratite napredak.'
    },
    {
      icon: '🛒',
      title: 'Lista za kupovinu',
      description: 'Generišite listu namirnica na osnovu plana obroka i pošaljite je na email ili PDF.'
    },
    {
      icon: '📄',
      title: 'PDF izvještaj',
      description: 'Generišite sedmični ili mjesečni izvještaj o svojoj ishrani sa svim detaljima.'
    },
    {
      icon: '⌚',
      title: 'Smartwatch integracija',
      description: 'Povežite sa Apple Health ili Google Fit i pratite napredak u realnom vremenu.'
    },
    {
      icon: '🔒',
      title: 'Bez reklama',
      description: 'Uživajte u čistom iskustvu bez ikakvih reklama koje ometaju.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 dark:bg-gray-900 dark:text-white">
      <h1 className="text-4xl font-extrabold text-center mb-2">⭐ Premium</h1>
      <p className="text-center text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
        Otključajte sve funkcionalnosti i unaprijedite svoje kulinarsko iskustvo!
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Free plan */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-center">🆓 Free</h2>
          <p className="text-3xl font-bold text-center my-4">€0</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">✅ Pretraga recepata (tekst)</li>
            <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">✅ Osnovni recepti (100.000+)</li>
            <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">✅ Kategorije (6)</li>
            <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">✅ Kviz (personalizacija)</li>
            <li className="flex items-center gap-2 text-gray-400 dark:text-gray-500">❌ Prepoznavanje sastojaka</li>
            <li className="flex items-center gap-2 text-gray-400 dark:text-gray-500">❌ HealthyChef</li>
            <li className="flex items-center gap-2 text-gray-400 dark:text-gray-500">❌ Dnevnik ishrane</li>
            <li className="flex items-center gap-2 text-gray-400 dark:text-gray-500">❌ Glasovno kuhanje</li>
            <li className="flex items-center gap-2 text-gray-400 dark:text-gray-500">❌ Scan Receipt</li>
            <li className="flex items-center gap-2 text-gray-400 dark:text-gray-500">❌ Community</li>
          </ul>
        </div>

        {/* Premium plan */}
        <div className="bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/30 dark:to-gray-800 rounded-2xl p-6 shadow-lg border-2 border-yellow-400 dark:border-yellow-600">
          <h2 className="text-2xl font-bold text-center text-yellow-600 dark:text-yellow-400">⭐ Premium</h2>
          <p className="text-3xl font-bold text-center my-4">€4.99 <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/ mjesečno</span></p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Sve Free funkcionalnosti</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Prepoznavanje sastojaka (fotografija)</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Glasovna pretraga</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ HealthyChef (3 nivoa, 29 podkategorija)</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Dnevnik ishrane + Analitika + Grafikoni</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Personalizovani plan obroka (7 dana)</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Virtuelni frižider</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Lifestyle Coach</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Somelijer – savršene kombinacije</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Scan Receipt</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Glasovno kuhanje (korak po korak)</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Community (objave, lajkovi)</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Bedževi i izazovi</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Lista za kupovinu + PDF</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Smartwatch integracija</li>
            <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">✅ Bez reklama</li>
            <li className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold">⭐ 16+ Premium funkcionalnosti!</li>
          </ul>
          <button
            onClick={handlePremium}
            disabled={loading}
            className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-bold transition shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {loading ? '⏳ Obrada...' : '💳 Postani Premium'}
          </button>
        </div>
      </div>

      {/* ===== DETALJAN OPIS PREMIUM FUNKCIONALNOSTI ===== */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-center mb-2 dark:text-white">
          🎁 Šta dobijate uz Premium?
        </h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          Otključajte 16+ naprednih funkcionalnosti koje će vam olakšati svakodnevno kuhanje!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== CTA NA KRAJU ===== */}
      <div className="mt-12 text-center bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-2xl p-8 border-2 border-yellow-200 dark:border-yellow-700">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          🌟 Spremni za Premium iskustvo?
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Pridružite se hiljadama zadovoljnih korisnika koji uživaju u svim Premium funkcionalnostima!
        </p>
        <button
          onClick={handlePremium}
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-10 py-4 rounded-full font-bold transition shadow-lg hover:shadow-xl disabled:opacity-50 text-lg"
        >
          {loading ? '⏳ Obrada...' : '⭐ Postani Premium danas!'}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          🔒 Sigurno plaćanje kroz Stripe. Otkažite bilo kada.
        </p>
      </div>
    </div>
  );
};

export default Premium;