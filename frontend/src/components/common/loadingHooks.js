import React, { useState } from 'react';

/**
 * Global Loading State Hook
 * Manage global loading state across the app
 */
let globalLoadingTimer = null;

export const LoadingContext = React.createContext({
  isLoading: false,
  message: '',
  startLoading: () => {},
  stopLoading: () => {},
});

export function useGlobalLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Loading...');

  const startLoading = (msg = 'Loading...') => {
    setMessage(msg);
    setIsLoading(true);
  };

  const stopLoading = () => {
    // Add slight delay to prevent flashing
    if (globalLoadingTimer) clearTimeout(globalLoadingTimer);
    globalLoadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 200);
  };

  return { isLoading, message, startLoading, stopLoading };
}

export function useLoading() {
  const context = React.useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}
