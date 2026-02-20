import { useSelectAds } from '../../hooks/useAds';
import { InlineAdGroup } from './inlineAds.jsx';

export function BetweenSectionsSlot({
  pageType = 'homepage',
  device = 'desktop',
  sectionIndex = 0,
  limit = 2,
  enabled = true,
  keyPrefix = 'between-sections',
  onTrackAd,
  fixedHeight = 100,
  wrapperClassName = '',
}) {
  const isEnabled = enabled && Number.isInteger(sectionIndex) && sectionIndex >= 0;
  const { data: ads = [] } = useSelectAds('between_sections', {
    pageType,
    device,
    sectionIndex,
    limit,
    enabled: isEnabled,
  });

  if (!ads.length) return null;

  return (
    <div className={wrapperClassName}>
      <InlineAdGroup
        ads={ads}
        keyPrefix={`${keyPrefix}-${sectionIndex}`}
        onTrackAd={onTrackAd}
        fixedHeight={fixedHeight}
      />
    </div>
  );
}
