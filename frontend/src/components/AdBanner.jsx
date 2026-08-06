// frontend/src/components/AdBanner.jsx
import React, { useEffect } from 'react';
import { ADSENSE_CLIENT, ADSENSE_ENABLED } from '../config/adsense';

const AdBanner = ({ slot, format = 'auto', className = '' }) => {
  useEffect(() => {
    if (!ADSENSE_ENABLED) return;
    
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.log('AdSense greška:', e);
    }
  }, []);

  // 🔥 AKO JE ADSENSE ISKLJUČEN, NE PRIKAZUJ NIŠTA
  if (!ADSENSE_ENABLED) {
    return null;
  }

  return (
    <div className={`ad-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}  // 🔥 KORISTI IZ KONFIGURACIJE
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdBanner;