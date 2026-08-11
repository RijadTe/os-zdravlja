// frontend/src/components/AdBanner.jsx
import React, { useEffect, useRef, useState } from 'react';
import { ADSENSE_CLIENT, ADSENSE_ENABLED } from '../config/adsense';

const AdBanner = ({ 
  slot, 
  format = 'auto', 
  className = '',
  style = {},
  layout = '',
  layoutKey = '',
  showLabel = true 
}) => {
  const adRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isVideo = format === 'video';

  // 🔥 1. ZAŠTITA OD DUPLOG UČITAVANJA
  useEffect(() => {
    // Ako je AdSense isključen - izlaz
    if (!ADSENSE_ENABLED) {
      console.log('📢 AdSense je onemogućen');
      return;
    }

    // Ako nema slota - izlaz
    if (!slot) {
      console.warn('⚠️ AdBanner: slot nije definiran');
      return;
    }

    // 🔥 2. TIMEOUT - AdSense treba vremena
    const timer = setTimeout(() => {
      try {
        // Provjeri da li je već učitano
        if (adRef.current) {
          const ins = adRef.current.querySelector('ins');
          
          // 🔥 3. SPRIJEČI DUPLO UČITAVANJE
          if (ins && !ins.getAttribute('data-ad-init')) {
            // Označi da je inicijalizirano
            ins.setAttribute('data-ad-init', 'true');
            
            // Pokreni AdSense
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            setIsLoaded(true);
            
            console.log(`✅ AdSense reklama učitana (slot: ${slot}, format: ${format})`);
          } else {
            console.log(`ℹ️ AdSense reklama je već učitana (slot: ${slot})`);
          }
        }
      } catch (error) {
        console.error('❌ AdSense greška:', error);
      }
    }, 200); // 🔥 200ms pauze

    // 🔥 4. CLEANUP - OČISTI TIMER
    return () => {
      clearTimeout(timer);
    };
  }, [slot, format]); // 🔥 5. POKRENI PONOVO AKO SE SLOT PROMIJENI

  // 🔥 6. AKO JE ADSENSE ISKLJUČEN - NE PRIKAZUJ
  if (!ADSENSE_ENABLED) {
    return (
      <div className={`ad-placeholder ${className}`} style={{ minHeight: '90px', ...style }}>
        <p className="text-gray-400 text-sm text-center">📢 AdSense je onemogućen</p>
      </div>
    );
  }

  // 🔥 7. AKO NEMA SLOTA - NE PRIKAZUJ
  if (!slot) {
    return null;
  }

  // 🔥 8. STILOVI ZA VIDEO REKLAME
  const containerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: isVideo ? '280px' : '90px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    ...style
  };

  // 🔥 9. STILOVI ZA INS ELEMENT
  const insStyle = {
    display: 'block',
    width: '100%',
    height: 'auto',
    minHeight: isVideo ? '250px' : '90px',
    backgroundColor: 'transparent'
  };

  return (
    <div 
      ref={adRef}
      className={`ad-container ${className}`} 
      style={containerStyle}
    >
      {/* 🔥 10. LABEL "REKLAMA" - PROFESIONALNO */}
      {showLabel && (
        <span className="absolute top-1 right-2 text-[10px] text-gray-400 bg-white/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-full z-10 shadow-sm">
          📢 Reklama
        </span>
      )}

      {/* 🔥 11. INDIKATOR UČITAVANJA */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          <div className="animate-pulse">⏳ Učitavanje reklame...</div>
        </div>
      )}

      {/* 🔥 12. GLAVNI ADSENSE ELEMENT */}
      <ins
        className="adsbygoogle"
        style={insStyle}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
      />
    </div>
  );
};

export default AdBanner;