import { useEffect, useState } from 'react';

export function useRightSidebarStickyTop(baseSpacing = 12) {
  const [stickyTop, setStickyTop] = useState(96);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const selectors = [
      'header.sticky.top-0.z-40.shadow-sm',
      'header.sticky.top-0.z-40',
      'header.sticky.top-0',
    ];

    const findStickyHeader = () => selectors.map((selector) => document.querySelector(selector)).find(Boolean);

    const updateStickyTop = () => {
      const stickyHeader = findStickyHeader();
      if (!stickyHeader) {
        setStickyTop(16);
        return;
      }

      const headerHeight = Math.round(stickyHeader.getBoundingClientRect().height);
      setStickyTop(Math.max(16, headerHeight + baseSpacing));
    };

    updateStickyTop();
    window.addEventListener('resize', updateStickyTop);

    const stickyHeader = findStickyHeader();
    let observer;
    if (stickyHeader && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateStickyTop);
      observer.observe(stickyHeader);
    }

    return () => {
      window.removeEventListener('resize', updateStickyTop);
      observer?.disconnect();
    };
  }, [baseSpacing]);

  return stickyTop;
}
