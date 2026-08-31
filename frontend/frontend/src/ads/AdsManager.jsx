// frontend/src/ads/AdsManager.jsx
// ============================================================
// 🔥 NOVI ADS MANAGER SA PODRŠKOM ZA ADSENSE I ADMOB
// ============================================================

import { useEffect, useState } from 'react';
import { isNative } from '../utils/platform';
import { 
  getAdUnitId, 
  getAdSenseClientId, 
  getAdMobAppId,
  shouldShowAds, 
  canWatchRewardedAd,
  adLog 
} from '@/config/ads.config';

// ============================================================
// 📦 BANNER REKLAME - AUTOMATSKI ODABIR PLATFORME
// ============================================================

export const createBannerAd = (isPremium) => {
  // Premium korisnici - bez reklama!
  if (!shouldShowAds(isPremium)) {
    adLog('Premium user, skipping banner ad');
    return null;
  }

  if (isNative) {
    // 🔥 NATIVE - AdMob banner (preko Capacitor)
    adLog('Creating AdMob banner ad');
    return (
      <div id="admob-banner" style={{ 
        width: '100%', 
        minHeight: '50px',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '8px',
        margin: '10px 0'
      }}>
        <p style={{ fontSize: '12px', color: '#999' }}>
          📱 AdMob banner (native)
        </p>
      </div>
    );
  } else {
    // 🔥 PWA - AdSense banner
    adLog('Creating AdSense banner ad');
    
    const slotId = getAdUnitId('banner');
    const clientId = getAdSenseClientId();
    
    return (
      <div style={{ 
        width: '100%', 
        minHeight: '90px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        marginTop: '20px',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', maxWidth: '728px', minHeight: '90px' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }
};

// ============================================================
// 🎬 VIDEO REKLAME - ADMOB (NATIVE) ILI SIMULACIJA (WEB)
// ============================================================

export class RewardedAdManager {
  constructor() {
    this.isLoaded = false;
  }

  loadAd = async () => {
    try {
      if (isNative) {
        // 🔥 NATIVE - AdMob (dinamički import)
        const { AdMob } = await import('@capacitor-community/admob');
        
        await AdMob.prepareRewardVideoAd({
          adId: getAdUnitId('rewarded'),
          isTesting: process.env.NODE_ENV !== 'production'
        });
        
        adLog('AdMob rewarded ad loaded');
      } else {
        // 🔥 PWA - Simulacija (ili AdSense)
        adLog('AdSense rewarded ad (simulated)');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.isLoaded = true;
      return true;
    } catch (error) {
      adLog(`Failed to load ad: ${error.message}`, 'error');
      return false;
    }
  };

  showAd = (onReward, onError) => {
    return new Promise(async (resolve, reject) => {
      if (!this.isLoaded) {
        reject(new Error('Ad not loaded'));
        return;
      }

      try {
        if (isNative) {
          // 🔥 NATIVE - AdMob (dinamički import)
          const { AdMob } = await import('@capacitor-community/admob');
          
          let rewarded = false;
          let rewardedListener = null;
          let failedListener = null;
          
          rewardedListener = AdMob.addListener('onRewarded', () => {
            rewarded = true;
            adLog('AdMob rewarded ad completed');
            if (rewardedListener) rewardedListener.remove();
            if (failedListener) failedListener.remove();
            if (onReward) onReward();
            resolve(true);
          });
          
          failedListener = AdMob.addListener('onAdFailedToShow', () => {
            adLog('AdMob ad failed to show', 'error');
            if (rewardedListener) rewardedListener.remove();
            if (failedListener) failedListener.remove();
            if (onError) onError(new Error('Ad failed to show'));
            reject(new Error('Ad failed to show'));
          });
          
          await AdMob.showRewardVideoAd();
          
          // Timeout (15 sekundi)
          setTimeout(() => {
            if (rewardedListener) rewardedListener.remove();
            if (failedListener) failedListener.remove();
            if (!rewarded) {
              adLog('AdMob ad timeout', 'warn');
              resolve(false);
            }
          }, 15000);
          
        } else {
          // 🔥 PWA - Simulacija
          adLog('AdSense rewarded ad (simulated)');
          
          // Simuliramo gledanje videa
          let seconds = 0;
          const interval = setInterval(() => {
            seconds++;
            adLog(`⏳ Gledate reklamu: ${seconds}s`);
            if (seconds >= 5) {
              clearInterval(interval);
              adLog('🎉 AdSense rewarded ad completed');
              if (onReward) onReward();
              resolve(true);
            }
          }, 1000);
        }
        
      } catch (error) {
        adLog(`Ad show error: ${error.message}`, 'error');
        if (onError) onError(error);
        reject(error);
      }
    });
  };

  isAdLoaded = () => this.isLoaded;
  
  destroy = () => {
    this.isLoaded = false;
    adLog('Ad manager destroyed');
  };
}

// ============================================================
// 🚀 GLAVNI ADS MANAGER
// ============================================================

export class AdsManager {
  constructor() {
    this.rewardedManager = new RewardedAdManager();
    this.isInitialized = false;
  }

  initialize = async () => {
    try {
      adLog(`Initializing ads on ${isNative ? 'native' : 'web'} platform`);
      
      if (!isNative) {
        // 🔥 PWA - učitaj AdSense skriptu
        if (!document.querySelector('#adsense-script')) {
          const script = document.createElement('script');
          script.id = 'adsense-script';
          script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
          script.async = true;
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
          adLog('AdSense script loaded');
        }
      }
      
      await this.rewardedManager.loadAd();
      this.isInitialized = true;
      adLog('Ads manager initialized successfully');
    } catch (error) {
      adLog(`Initialization error: ${error.message}`, 'error');
    }
  };

  showRewardedAd = async (usedToday, onReward) => {
    if (!canWatchRewardedAd(usedToday)) {
      adLog('Daily limit reached', 'warn');
      throw new Error('Daily limit reached');
    }
    return await this.rewardedManager.showAd(onReward);
  };

  destroy = () => {
    this.rewardedManager.destroy();
    this.isInitialized = false;
    adLog('Ads manager destroyed');
  };
}

// ============================================================
// 📦 SINGLETON INSTANCA
// ============================================================

export const adsManager = new AdsManager();