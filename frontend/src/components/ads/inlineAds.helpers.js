// Shared helpers for list-page "between sections" ad logic.
// Rule: 2 rows = 1 section (so sectionIndex increments every 2 rows).

export const getSectionIndexAfterRows = (renderedCount, columns) => {
  const itemsPerSection = columns * 2; // 2 rows per section
  return Math.floor(renderedCount / itemsPerSection) - 1;
};

export const createAdTracker = ({ trackAdEvent, pageType, pageUrl, device }) => (adData, type, meta) =>
  trackAdEvent({
    adId: adData._id,
    type,
    pageType,
    pageUrl,
    device,
    placement: adData.placement,
    eventTimestamp: meta?.eventTimestamp,
  });
