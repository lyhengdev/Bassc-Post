
import { BodyAd } from './BodyAd';

export function InlineAdGroup({ ads, keyPrefix, onTrackAd, fixedHeight = 100 }) {
  if (!ads?.length) return null;
  return (
    <div className="space-y-4">
      {ads.map((ad) => (
        <BodyAd
          key={`${keyPrefix}-${ad._id}`}
          ad={ad}
          fixedHeight={fixedHeight}
          placementOverride={ad.placementId || ad.servedPlacement || ad.placement}
          onImpression={(adData) => onTrackAd(adData, 'impression')}
          onClick={(adData, meta) => onTrackAd(adData, 'click', meta)}
        />
      ))}
    </div>
  );
}
