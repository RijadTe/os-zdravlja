// frontend/src/hooks/useInfiniteScroll.js
import { useEffect, useRef, useCallback } from 'react';

export const useInfiniteScroll = (callback, hasMore, loading) => {
  const loaderRef = useRef();

  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !loading) {
        callback();
      }
    },
    [callback, hasMore, loading]
  );

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '20px',
      threshold: 0,
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [handleObserver]);

  return loaderRef;
};