// frontend/src/pages/FitCallback.jsx
import { useEffect, useState } from 'react';
import { getTokenFromUrl } from '../services/googleFitWeb';

export default function FitCallback() {
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('🔍 FitCallback: Komponenta učitana');
    console.log('🔍 URL:', window.location.href);
    console.log('🔍 Hash:', window.location.hash);
    console.log('🔍 Search:', window.location.search);

    // 🔥 POSTAVI MAKSIMALAN BROJ POKUŠAJA
    const MAX_RETRIES = 3;
    let isMounted = true;
    let timeoutId = null;

    const processToken = () => {
      try {
        // 🔥 PRVO PROVJERI DA LI POSTOJI TOKEN U URL-U DIREKTNO
        const hash = window.location.hash;
        const search = window.location.search;
        
        let token = null;
        
        // Pokušaj iz hash-a
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          token = params.get('access_token');
        }
        
        // Ako nema u hash-u, pokušaj iz search-a
        if (!token && search) {
          const params = new URLSearchParams(search.substring(1));
          token = params.get('access_token');
        }
        
        // Ako i dalje nema, pokušaj preko getTokenFromUrl
        if (!token) {
          token = getTokenFromUrl();
        }
        
        console.log('🔍 Token:', token ? '✅ Dobijen' : '❌ Nema');
        
        if (!isMounted) return;

        if (token) {
          // 🔥 TOKEN JE PRONAĐEN - USPJEH!
          console.log('✅ Token pronađen, preusmjeravam...');
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/profile?fitConnected=true';
          }, 1500);
        } else {
          // 🔥 NEMA TOKENA - POKUŠAJ PONOVO ILI PREUSMJERI
          if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Pokušaj ${retryCount + 1}/${MAX_RETRIES} - ponovno čitanje tokena...`);
            setRetryCount(prev => prev + 1);
            timeoutId = setTimeout(processToken, 1000);
          } else {
            // 🔥 PREVIŠE POKUŠAJA - PREUSMJERI NA PROFIL SA GREŠKOM
            console.log('❌ Previše pokušaja, preusmjeravam na profil...');
            setStatus('error');
            setErrorMessage('Nema Google Fit tokena. Pokušajte ponovo.');
            setTimeout(() => {
              window.location.href = '/profile?fitError=true';
            }, 2000);
          }
        }
      } catch (err) {
        console.error('❌ FitCallback greška:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Nepoznata greška');
          setTimeout(() => {
            window.location.href = '/profile?fitError=true';
          }, 2000);
        }
      }
    };

    // 🔥 ZAPOČNI PROCES NAKON KRATKE PAUZE
    const startTimer = setTimeout(processToken, 500);

    // 🔥 SIGURNOSNI TIMEOUT - AKO SE NIŠTA NE DOGODI NAKON 10 SEKUNDI
    const safetyTimer = setTimeout(() => {
      if (isMounted && status === 'loading') {
        console.log('⏰ SIGURNOSNI TIMEOUT: Preusmjeravam na profil...');
        setStatus('error');
        setErrorMessage('Vrijeme je isteklo. Pokušajte ponovo.');
        setTimeout(() => {
          window.location.href = '/profile?fitError=true';
        }, 1000);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(startTimer);
      clearTimeout(timeoutId);
      clearTimeout(safetyTimer);
    };
  }, [retryCount, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md mx-auto p-6">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg font-medium">
              🔄 Povezivanje sa Google Fit-om...
            </p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              Molimo sačekajte nekoliko sekundi
            </p>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Pokušaj {retryCount + 1}/3
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-600 dark:text-green-400 text-lg font-medium">
              Google Fit uspješno povezan!
            </p>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              Preusmjeravam na profil...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-600 dark:text-red-400 text-lg font-medium">
              Greška pri povezivanju
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {errorMessage}
            </p>
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              Preusmjeravam na profil...
            </p>
          </>
        )}
      </div>
    </div>
  );
}