// frontend/src/components/LazyImage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// 🔥 DETEKTIRAJ DA LI PRETRAŽIVAČ PODRŽAVA WebP
const supportsWebP = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, 1, 1);
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 0;
};

const LazyImage = React.memo(({ 
  src, 
  alt, 
  className = '', 
  placeholder = true,
  fallbackSrc = 'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Slika',
  threshold = 0.01,
  rootMargin = '100px',
  webpSrc = null // Opcija: WebP verzija slike
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // 🔥 ODABERI NAJBOLJI FORMAT SLIKE
  const getBestSrc = useCallback(() => {
    if (hasError) return fallbackSrc;
    if (webpSrc && supportsWebP()) return webpSrc;
    return src;
  }, [src, webpSrc, fallbackSrc, hasError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setCurrentSrc(fallbackSrc);
    // Pokušaj ponovo nakon 3 sekunde
    setTimeout(() => {
      setHasError(false);
      setCurrentSrc(src);
    }, 3000);
  }, [src, fallbackSrc]);

  // 🔥 POSTAVI OBSERVER
  useEffect(() => {
    // Provjeri cache
    if ('src' in new Image()) {
      const img = new Image();
      img.src = src;
      if (img.complete) {
        setCurrentSrc(getBestSrc());
        setIsVisible(true);
        return;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setCurrentSrc(getBestSrc());
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin, threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, rootMargin, threshold, getBestSrc]);

  // 🔥 RESET NA PROMJENU SRCA
  useEffect(() => {
    setCurrentSrc(null);
    setIsVisible(false);
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const displaySrc = currentSrc || getBestSrc();

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          <svg 
            className="w-12 h-12 text-gray-400 dark:text-gray-500 animate-spin" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {isVisible && (
        <img
          src={displaySrc}
          alt={alt || 'Recept slika'}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;