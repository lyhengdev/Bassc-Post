import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Top Loading Bar
 * Shows a progress bar at the top of the page during navigation
 */
export function TopLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start loading
    setIsLoading(true);
    setProgress(0);

    // Simulate progress
    const intervals = [
      setTimeout(() => setProgress(30), 100),
      setTimeout(() => setProgress(60), 300),
      setTimeout(() => setProgress(80), 600),
    ];

    // Complete loading
    const completeTimer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
    }, 800);

    return () => {
      intervals.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [location.pathname]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1">
      <div
        className="h-full bg-gradient-to-r from-primary-600 via-primary-400 to-primary-600 transition-all duration-300 ease-out"
        style={{ 
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)'
        }}
      />
    </div>
  );
}

/**
 * Global Loading State Hook
 * Manage global loading state across the app
 */
let globalLoadingTimer = null;

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

/**
 * Loading Context
 * Provides loading state throughout the app
 */
const LoadingContext = React.createContext({
  isLoading: false,
  message: '',
  startLoading: () => {},
  stopLoading: () => {},
});

export function LoadingProvider({ children }) {
  const loading = useGlobalLoading();

  return (
    <LoadingContext.Provider value={loading}>
      {children}
      {loading.isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />
          <div className="relative bg-white dark:bg-dark-900 rounded-2xl shadow-2xl p-8 animate-slideUp">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-dark-200 dark:border-dark-700 border-t-primary-600 animate-spin" />
              <p className="text-lg font-medium text-dark-900 dark:text-white">
                {loading.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = React.useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}

export default TopLoadingBar;
