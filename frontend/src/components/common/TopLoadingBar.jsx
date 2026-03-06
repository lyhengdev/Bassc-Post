import { useState, useEffect } from 'react';
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

export default TopLoadingBar;
