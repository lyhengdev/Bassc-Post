import { useEffect, useState } from 'react';
import { BodyAd } from '../../../components/ads/index.js';
import useLanguage from '../../../hooks/useLanguage';

export function SidebarAdSlot({ ads = [], ad, pageType, pageUrl, device, trackAdEvent }) {
  const { translateText } = useLanguage();
  const list = Array.isArray(ads) && ads.length ? ads : ad ? [ad] : [];

  return (
    <div className="pr-1">
      <div className="text-xs text-dark-400 mb-1">{translateText('Ad')}</div>
      <div className="bg-dark-100 dark:bg-dark-800 rounded-lg overflow-hidden">
        {list.length ? (
          <div className="p-2 space-y-3">
            {list.map((item) => (
              <BodyAd
                key={item._id}
                ad={item}
                useNaturalHeight
                placementOverride={item.placementId || item.servedPlacement || item.placement}
                onImpression={(adData) =>
                  trackAdEvent({
                    adId: adData._id,
                    type: 'impression',
                    pageType,
                    pageUrl,
                    device,
                    placement: adData.placement,
                  })
                }
                onClick={(adData, meta) =>
                  trackAdEvent({
                    adId: adData._id,
                    type: 'click',
                    pageType,
                    pageUrl,
                    device,
                    placement: adData.placement,
                    eventTimestamp: meta?.eventTimestamp,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="aspect-[300/600] flex items-center justify-center text-dark-400 text-sm">
            <div className="text-center p-4">
              <p className="font-medium mb-2">{translateText('Advertisement')}</p>
              <p className="text-xs">300 x 600</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
