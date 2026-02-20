import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn, buildMediaUrl } from '../../utils';

/**
 * BodyAd Component - Renders a single body advertisement
 * 
 * @param {Object} ad - The ad configuration object
 * @param {string} ad.type - 'image' | 'html' | 'adsense' | 'video'
 * @param {string} ad.imageUrl - Image URL for image ads
 * @param {string} ad.mobileImageUrl - Mobile-specific image URL
 * @param {string} ad.sidebarImageUrl - Sidebar/popup image URL
 * @param {string} ad.linkUrl - Click destination URL
 * @param {string} ad.linkTarget - '_self' | '_blank'
 * @param {string} ad.htmlContent - HTML content for html type ads
 * @param {string} ad.videoUrl - Video URL for video ads
 * @param {string} ad.altText - Alt text for images
 * @param {string} ad.style - 'banner' | 'card' | 'native' | 'fullwidth' | 'inline'
 * @param {string} ad.size - 'small' | 'medium' | 'large' | 'responsive'
 * @param {string} ad.alignment - 'left' | 'center' | 'right'
 * @param {number} ad.maxWidth - Maximum width in pixels
 * @param {string} ad.backgroundColor - Background color
 * @param {number} ad.borderRadius - Border radius in pixels
 * @param {number} ad.padding - Padding in pixels
 * @param {boolean} ad.showLabel - Whether to show "Advertisement" label
 * @param {string} ad.labelText - Custom label text
 * @param {string} ad.animation - 'none' | 'fade' | 'slide' | 'zoom'
 * @param {string} className - Additional CSS classes
 * @param {boolean} useNaturalHeight - Render without the default fixed height
 * @param {number} fixedHeight - Force a specific height in pixels
 * @param {string} placementOverride - Placement context for analytics/attributes
 * @param {function} onImpression - Callback when ad is viewed
 * @param {function} onClick - Callback when ad is clicked
 */
export function BodyAd({ 
  ad, 
  className = '', 
  useNaturalHeight = false,
  fixedHeight,
  placementOverride = '',
  onImpression,
  onClick 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const adRef = useRef(null);
  const hasTrackedImpression = useRef(false); // ✅ FIXED: Use ref instead of state
  
  const resolvedPlacement = placementOverride || ad.servedPlacement || ad.placementId || ad.placement;
  const adForEvents = resolvedPlacement && ad.placement !== resolvedPlacement
    ? { ...ad, placement: resolvedPlacement }
    : ad;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intersection observer for lazy loading and impressions
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // ✅ FIXED: Use ref to prevent double-firing
          if (!hasTrackedImpression.current && onImpression) {
            hasTrackedImpression.current = true;
            onImpression(adForEvents);
          }
        }
      },
      { threshold: 0.5 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, [ad._id, onImpression, resolvedPlacement]); // ✅ FIXED: Removed hasImpression from dependencies

  const isSidebarOrPopup = resolvedPlacement === 'popup' || resolvedPlacement === 'right_sidebar' || resolvedPlacement === 'right_hero';
  const baseImageUrl = isSidebarOrPopup && ad.sidebarImageUrl
    ? ad.sidebarImageUrl
    : ((isMobile && ad.mobileImageUrl) ? ad.mobileImageUrl : ad.imageUrl);
  const rawSlideImages = Array.isArray(ad.imageUrls) && ad.imageUrls.length > 0
    && !(isSidebarOrPopup && ad.sidebarImageUrl)
    ? ad.imageUrls
    : (baseImageUrl ? [baseImageUrl] : []);
  const slideImages = rawSlideImages
    .map((url) => buildMediaUrl(url))
    .filter(Boolean);
  const slideIntervalMs = ad.slideIntervalMs || 3000;

  useEffect(() => {
    if (slideImages.length <= 1) return undefined;
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideImages.length);
    }, slideIntervalMs);
    return () => clearInterval(intervalId);
  }, [slideImages.length, slideIntervalMs]);

  // Style mappings
  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-xl',
    large: 'max-w-4xl',
    responsive: 'w-full',
  };

  const alignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  };

  const animationClasses = {
    none: '',
    fade: 'animate-fadeIn',
    slide: 'animate-slideUp',
    zoom: 'animate-zoomIn',
  };

  const isPopup = resolvedPlacement === 'popup';
  const isImageAd = ad.type === 'image';
  const forcedHeight = (useNaturalHeight || isPopup)
    ? undefined
    : (typeof fixedHeight === 'number' ? fixedHeight : 175);

  const handleClick = (event) => {
    if (event?.stopPropagation) event.stopPropagation();
    if (onClick) {
      onClick(adForEvents, { eventTimestamp: event?.timeStamp });
    }
  };

  const renderCtaButton = (className = '') => {
    if (!ad.linkUrl) return null;
    const label = ad.ctaText || 'Learn more';
    const classes = cn(
      'inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors',
      className
    );
    if (ad.linkUrl.startsWith('/')) {
      return (
        <Link
          to={ad.linkUrl}
          onClick={handleClick}
          className={classes}
        >
          {label}
        </Link>
      );
    }
    return (
      <a
        href={ad.linkUrl}
        target={ad.linkTarget || '_blank'}
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className={classes}
      >
        {label}
      </a>
    );
  };

  // Render content based on ad type
  const renderAdContent = () => {
    switch (ad.type) {
      case 'image':
        if (imageError || slideImages.length === 0) {
          return null; // Don't render broken images
        }
        return (
          <div className={cn('relative')} style={forcedHeight ? { height: `${forcedHeight}px` } : undefined}>
            <img loading="lazy"
              src={slideImages[currentIndex]}
              alt={ad.altText || 'Advertisement'}
              className={cn(
                'w-full object-contain',
                isPopup ? 'h-auto' : (forcedHeight ? 'h-full' : 'h-auto')
              )}
              style={{ borderRadius: isPopup ? undefined : `${ad.borderRadius || 8}px` }}
              onError={() => setImageError(true)}
            />
            {ad.linkUrl && isSidebarOrPopup && (
              <div className="absolute bottom-3 right-3">
                {renderCtaButton()}
              </div>
            )}
            {slideImages.length > 1 && (
              <div className="absolute bottom-3 left-3 flex gap-1">
                {slideImages.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 w-4 rounded-full ${
                      index === currentIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'html':
        return (
          <div 
            dangerouslySetInnerHTML={{ __html: ad.htmlContent }}
            className="ad-html-content"
          />
        );

      case 'video':
        return (
          <video
            src={buildMediaUrl(ad.videoUrl)}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto"
            style={{ borderRadius: `${ad.borderRadius || 8}px` }}
          />
        );

      case 'adsense':
        // Google AdSense would be handled differently
        return (
          <div 
            dangerouslySetInnerHTML={{ __html: ad.htmlContent }}
            className="adsense-container"
          />
        );

      default:
        return null;
    }
  };

  // Style based on ad.style
  const getStyleClasses = () => {
    if (isPopup) {
      return 'bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl';
    }
    if (isImageAd) {
      return 'overflow-hidden';
    }
    switch (ad.style) {
      case 'card':
        return 'bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden';
      case 'native':
        return 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg';
      case 'fullwidth':
        return 'w-full bg-gray-100 dark:bg-gray-800';
      case 'inline':
        return '';
      case 'banner':
      default:
        return 'bg-white dark:bg-gray-800 rounded-lg overflow-hidden';
    }
  };

  if (!isVisible && ad.animation !== 'none') {
    // Placeholder for lazy loading
    return (
      <div 
        ref={adRef}
        className={`min-h-[100px] ${className}`}
        style={forcedHeight ? { minHeight: `${forcedHeight}px` } : undefined}
        aria-hidden="true"
      />
    );
  }

  const adContent = renderAdContent();
  
  // Don't render if no content
  if (!adContent) return null;

  const wrapperStyle = {
    maxWidth: ad.maxWidth ? `${ad.maxWidth}px` : undefined,
    minHeight: forcedHeight ? `${forcedHeight}px` : undefined,
    maxHeight: forcedHeight ? `${forcedHeight}px` : undefined,
    height: forcedHeight ? `${forcedHeight}px` : undefined,
    backgroundColor: isImageAd ? undefined : (ad.backgroundColor || undefined),
    borderRadius: isImageAd ? undefined : `${ad.borderRadius || 8}px`,
    padding: isImageAd ? undefined : (ad.padding ? `${ad.padding}px` : undefined),
  };

  const adWrapper = (
    <div
      ref={adRef}
      className={`
        body-ad relative
        ${sizeClasses[ad.size] || 'w-full'}
        ${alignmentClasses[ad.alignment] || 'mx-auto'}
        ${animationClasses[ad.animation] || ''}
        ${forcedHeight ? 'overflow-hidden' : ''}
        ${isImageAd ? 'bg-black/50' : ''}
        ${getStyleClasses()}
        ${className}
      `}
      style={wrapperStyle}
      data-ad-id={ad._id}
      data-ad-placement={resolvedPlacement || ad.placement}
    >
      {/* Advertisement Label */}
      {ad.showLabel && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-xs uppercase tracking-wider text-white bg-black/50 px-2 py-0.5 rounded">
            {ad.labelText || 'Advertisement'}
          </span>
        </div>
      )}
      
      {adContent}

      {ad.type !== 'image' && (ad.title || ad.description) && (
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/90">
          {ad.title && (
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {ad.title}
            </div>
          )}
          {ad.description && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {ad.description}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Wrap in link if linkUrl is provided
  if (ad.linkUrl && ad.type === 'image') {
    if (ad.linkUrl.startsWith('/')) {
      return (
        <Link 
          to={ad.linkUrl} 
          onClick={handleClick}
          className="block"
        >
          {adWrapper}
        </Link>
      );
    }
    return (
      <a 
        href={ad.linkUrl}
        target={ad.linkTarget || '_blank'}
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block"
      >
        {adWrapper}
      </a>
    );
  }

  return adWrapper;
}

/**
 * BodyAdSlot - A slot component that renders ads for a specific placement
 * 
 * @param {string} placement - The placement type
 * @param {number} sectionIndex - For 'between_sections' placement
 * @param {number} paragraphIndex - For 'in_article' placement
 * @param {string} placementId - For 'custom' placement
 * @param {Array} ads - Array of all body ads from settings
 * @param {Object} globalSettings - Global body ads settings
 * @param {string} pageType - Current page type ('homepage', 'articles', 'category', etc.)
 * @param {boolean} isLoggedIn - Whether user is logged in
 */
export function BodyAdSlot({
  placement,
  sectionIndex,
  paragraphIndex,
  placementId,
  ads = [],
  globalSettings = {},
  pageType = 'all',
  isLoggedIn = false,
  className = '',
  onImpression,
  onClick,
}) {
  // Filter ads for this specific placement
  const filteredAds = ads.filter(ad => {
    // Check placement match
    if (ad.placement !== placement) return false;
    
    // For between_sections, check sectionIndex
    if (placement === 'between_sections' && ad.sectionIndex !== sectionIndex) return false;
    
    // For in_article, check paragraphIndex
    if (placement === 'in_article' && ad.paragraphIndex !== paragraphIndex) return false;
    
    // For custom placement, check placementId
    if (placement === 'custom' && ad.placementId !== placementId) return false;
    
    // Check page targeting (optional on new API)
    if (ad.showOnPages && ad.showOnPages !== 'all' && ad.showOnPages !== pageType) return false;
    
    // Check auth targeting (optional on new API)
    if (isLoggedIn && ad.showForLoggedIn === false) return false;
    if (!isLoggedIn && ad.showForGuests === false) return false;
    
    return true;
  });

  // Sort by priority (higher first) then order
  const sortedAds = filteredAds.sort((a, b) => 
    (b.priority || 0) - (a.priority || 0) || (a.order || 0) - (b.order || 0)
  );

  // Limit number of ads if maxAdsPerPage is set
  // Note: This is per-slot limit, global limit should be handled at page level
  const adsToShow = sortedAds.slice(0, 2); // Max 2 ads per slot

  if (adsToShow.length === 0) return null;

  return (
    <div className={`body-ad-slot my-6 ${className}`} data-placement={placement}>
      {adsToShow.map((ad, index) => (
        <BodyAd
          key={ad._id}
          ad={ad}
          className={index > 0 ? 'mt-4' : ''}
          placementOverride={placement}
          onImpression={onImpression}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

export default BodyAd;
