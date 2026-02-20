import { useState, useEffect } from 'react';

/**
 * Smart loading hook that only shows loading state after a delay
 * This prevents flashing loading indicators for fast requests
 * 
 * @param {boolean} isLoading - The actual loading state
 * @param {number} delay - Delay in ms before showing loading (default: 1000ms)
 * @returns {boolean} - Whether to show loading state
 */
export function useDelayedLoading(isLoading, delay = 1000) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Immediately hide loading when done
      setShowLoading(false);
      return;
    }

    // Show loading only after delay
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowLoading(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return showLoading;
}

/**
 * Hook to track if content is loaded (not first render)
 * Prevents showing loading on cached data
 */
export function useContentLoaded() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    setIsFirstLoad(false);
  }, []);

  return !isFirstLoad;
}

/**
 * Smart loading that considers both loading state and data presence
 * Only shows loading if data is not available AND loading is taking time
 * 
 * @param {boolean} isLoading - The loading state
 * @param {any} data - The data that's being loaded
 * @param {number} delay - Delay before showing loading
 * @returns {boolean} - Whether to show loading skeleton
 */
export function useSmartLoading(isLoading, data, delay = 1000) {
  const showDelayedLoading = useDelayedLoading(isLoading, delay);
  const hasContent = useContentLoaded();

  // Show loading only if:
  // 1. We're actually loading
  // 2. We don't have data yet
  // 3. Enough time has passed (delayed loading)
  // 4. It's not just a refetch (we already have content)
  return isLoading && !data && showDelayedLoading && !hasContent;
}
