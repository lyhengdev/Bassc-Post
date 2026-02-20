import { BodyAd } from './BodyAd.jsx';
import { useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';

/**
 * AdsRow - reusable row of ads you can drop into any page/section.
 * Fetches ads for the given placement and renders them in a responsive row.
 */
export function AdsRow({
  placement = 'between_sections',
  placementId,
  pageType = 'all',
  adId,
  categoryId,
  articleId,
  limit = 3,
  className = '',
  showFallback = false,
  fallbackText = 'Advertisement',
}) {
  const device = useDeviceType();
  const { mutate: trackAdEvent } = useTrackAdEvent();
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';

  const { data: ads = [], isLoading } = useSelectAds(placement, {
    pageType,
    device,
    placementId,
    adId,
    categoryId,
    articleId,
    limit,
    enabled: true,
  });

  if (!isLoading && ads.length === 0 && !showFallback) return null;

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      data-placement={placement}
    >
      {ads.map((ad) => (
        <BodyAd
          key={ad._id}
          ad={ad}
          placementOverride={placement}
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

      {isLoading && ads.length === 0 && (
        <div className="col-span-full h-24 rounded-xl bg-dark-100 dark:bg-dark-800 animate-pulse" />
      )}

      {!isLoading && ads.length === 0 && showFallback && (
        <div className="col-span-full h-24 rounded-xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-400 text-sm">
          {fallbackText}
        </div>
      )}
    </div>
  );
}
