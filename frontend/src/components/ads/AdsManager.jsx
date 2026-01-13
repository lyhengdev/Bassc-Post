import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '../../utils';
import { useAuthStore } from '../../stores/authStore';

// Storage keys for tracking ad displays
const STORAGE_KEYS = {
  welcomePopup: 'bassac_welcome_popup',
  floatingBanner: 'bassac_floating_banner',
  exitPopup: 'bassac_exit_popup',
  scrollAd: 'bassac_scroll_ad',
  mobileInterstitial: 'bassac_mobile_interstitial',
};

// Check if ad should show based on frequency
const shouldShowAd = (key, frequency) => {
  if (frequency === 'always') return true;
  
  const stored = localStorage.getItem(key);
  if (!stored) return true;
  
  const { timestamp } = JSON.parse(stored);
  const now = Date.now();
  
  switch (frequency) {
    case 'once_per_session':
      return !sessionStorage.getItem(key);
    case 'once_per_day':
      return now - timestamp > 24 * 60 * 60 * 1000;
    case 'once_per_week':
      return now - timestamp > 7 * 24 * 60 * 60 * 1000;
    case 'once_ever':
      return false;
    default:
      return true;
  }
};

// Mark ad as shown
const markAdShown = (key, frequency) => {
  const data = JSON.stringify({ timestamp: Date.now() });
  localStorage.setItem(key, data);
  if (frequency === 'once_per_session') {
    sessionStorage.setItem(key, 'true');
  }
};

// ==================== WELCOME POPUP ====================
export function WelcomePopup({ settings, currentPage }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseBtn, setShowCloseBtn] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);
  const autoCloseRef = useRef(null);

  useEffect(() => {
    if (!settings?.enabled) return;
    
    // Check device type
    const isMobile = window.innerWidth < 768;
    if (isMobile && !settings.showOnMobile) return;
    if (!isMobile && !settings.showOnDesktop) return;
    
    // Check page
    if (settings.pages !== 'all' && settings.pages !== currentPage) return;
    
    // Check date range
    if (settings.startDate && new Date() < new Date(settings.startDate)) return;
    if (settings.endDate && new Date() > new Date(settings.endDate)) return;
    
    // Check frequency
    if (!shouldShowAd(STORAGE_KEYS.welcomePopup, settings.frequency)) return;
    
    // Show after delay
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      markAdShown(STORAGE_KEYS.welcomePopup, settings.frequency);
      
      // Show close button after delay
      if (settings.closeButtonDelay > 0) {
        setTimeout(() => setShowCloseBtn(true), settings.closeButtonDelay);
      } else {
        setShowCloseBtn(true);
      }
      
      // Auto close
      if (settings.autoClose && settings.autoCloseDelay > 0) {
        setCountdown(Math.ceil(settings.autoCloseDelay / 1000));
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              handleClose();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        autoCloseRef.current = interval;
      }
    }, settings.delay || 2000);
    
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(autoCloseRef.current);
    };
  }, [settings, currentPage]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    clearInterval(autoCloseRef.current);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  }, []);

  if (!isVisible || !settings?.enabled) return null;

  const animations = {
    fade: 'animate-fadeIn',
    slide: 'animate-slideUp',
    zoom: 'animate-zoomIn',
    bounce: 'animate-bounceIn',
  };

  const sizes = {
    small: 'max-w-sm',
    medium: 'max-w-md',
    large: 'max-w-2xl',
    fullscreen: 'w-full h-full max-w-none rounded-none',
  };

  const positions = {
    center: 'items-center justify-center',
    bottom: 'items-end justify-center pb-4',
    top: 'items-start justify-center pt-4',
  };

  const isMobile = window.innerWidth < 768;
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex transition-opacity duration-300',
        positions[settings.position || 'center'],
        isClosing ? 'opacity-0' : 'opacity-100'
      )}
      style={{ backgroundColor: settings.overlayColor || 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && settings.showCloseButton && handleClose()}
    >
      <div
        className={cn(
          'relative bg-white dark:bg-dark-900 overflow-hidden transition-all duration-300',
          sizes[settings.size || 'medium'],
          settings.size !== 'fullscreen' && `rounded-[${settings.borderRadius || 16}px]`,
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
          animations[settings.animation || 'zoom']
        )}
        style={{ borderRadius: settings.size !== 'fullscreen' ? settings.borderRadius || 16 : 0 }}
      >
        {/* Close Button */}
        {settings.showCloseButton && showCloseBtn && (
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-black/30 text-white text-sm">
            Closing in {countdown}s
          </div>
        )}

        {/* Image */}
        {imageUrl && (
          <a 
            href={settings.linkUrl || '#'} 
            target={settings.linkUrl ? '_blank' : '_self'} 
            rel="noopener noreferrer sponsored"
            onClick={(e) => !settings.linkUrl && e.preventDefault()}
          >
            <img
              src={imageUrl}
              alt={settings.title || 'Advertisement'}
              className={cn(
                'w-full object-cover',
                settings.size === 'fullscreen' ? 'h-full' : 'max-h-64 sm:max-h-80'
              )}
            />
          </a>
        )}

        {/* Content */}
        {(settings.title || settings.content) && (
          <div className="p-6">
            {settings.title && (
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
                {settings.title}
              </h2>
            )}
            {settings.subtitle && (
              <p className="text-dark-500 dark:text-dark-400 mb-4">{settings.subtitle}</p>
            )}
            {settings.content && (
              <div 
                className="text-dark-600 dark:text-dark-300 mb-4 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: settings.content }}
              />
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              {settings.linkUrl && (
                <a
                  href={settings.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="flex-1 min-w-[120px] px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                >
                  {settings.buttonText || 'Learn More'}
                  <ChevronRight className="w-4 h-4" />
                </a>
              )}
              {settings.secondaryButtonText && (
                <a
                  href={settings.secondaryButtonUrl || '#'}
                  target={settings.secondaryButtonUrl ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  onClick={(e) => !settings.secondaryButtonUrl && (e.preventDefault(), handleClose())}
                  className="flex-1 min-w-[120px] px-6 py-3 border border-dark-300 dark:border-dark-600 text-dark-700 dark:text-dark-300 font-semibold rounded-lg text-center transition-colors hover:bg-dark-100 dark:hover:bg-dark-800"
                >
                  {settings.secondaryButtonText}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Ad Label */}
        <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/20 rounded text-xs text-white/70">
          Ad
        </div>
      </div>
    </div>
  );
}

// ==================== FLOATING BANNER ====================
export function FloatingBanner({ settings }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!settings?.enabled || isDismissed) return;
    
    const isMobile = window.innerWidth < 768;
    if (isMobile && !settings.showOnMobile) return;
    if (!isMobile && !settings.showOnDesktop) return;
    
    // Always show on page load (removed frequency check)
    setIsVisible(true);
    
    if (settings.autoHide && settings.autoHideDelay > 0) {
      const timer = setTimeout(() => handleDismiss(), settings.autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [settings, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || !settings?.enabled) return null;

  const heights = { small: 'h-12', medium: 'h-16', large: 'h-20' };
  const heightValues = { small: 48, medium: 64, large: 80 };
  const isMobile = window.innerWidth < 768;
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;
  const currentHeight = heightValues[settings.height || 'medium'];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed banner */}
      <div 
        style={{ height: currentHeight }} 
        className={settings.position === 'top' ? 'block' : 'hidden'}
      />
      
      <div
        className={cn(
          'fixed left-0 right-0 z-40 transition-transform duration-500',
          settings.position === 'top' ? 'top-0' : 'bottom-0',
          isVisible 
            ? 'translate-y-0' 
            : settings.position === 'top' ? '-translate-y-full' : 'translate-y-full'
        )}
        style={{ backgroundColor: settings.backgroundColor || '#1e40af' }}
      >
        <div className={cn('container-custom flex items-center justify-between', heights[settings.height || 'medium'])}>
          {imageUrl ? (
            <a 
              href={settings.linkUrl || '#'} 
              target="_blank" 
              rel="noopener noreferrer sponsored"
              className="flex-1 h-full flex items-center justify-center"
            >
              <img src={imageUrl} alt="Ad" className="h-full max-w-full object-contain" />
            </a>
          ) : (
            <a 
              href={settings.linkUrl || '#'} 
              target="_blank" 
              rel="noopener noreferrer sponsored"
              className="flex-1 text-center font-medium"
              style={{ color: settings.textColor || '#ffffff' }}
              dangerouslySetInnerHTML={{ __html: settings.content }}
            />
          )}
          
          {settings.showCloseButton && (
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2"
              style={{ color: settings.textColor || '#ffffff' }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="absolute top-1 right-12 text-xs opacity-50" style={{ color: settings.textColor || '#ffffff' }}>
          Ad
        </div>
      </div>
      
      {/* Bottom spacer */}
      <div 
        style={{ height: currentHeight }} 
        className={settings.position === 'bottom' ? 'block' : 'hidden'}
      />
    </>
  );
}

// ==================== SIDEBAR ADS (Desktop floating + Mobile section) ====================
export function SidebarAds({ settings, currentPage }) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (!settings?.stickyOnScroll) return;
    
    const handleScroll = () => {
      setIsSticky(window.scrollY > (settings.topOffset || 100));
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [settings]);

  if (!settings?.enabled) return null;
  
  // Check page visibility
  if (settings.showOnPages !== 'all' && settings.showOnPages !== currentPage) return null;

  // Get active ads
  const activeAds = (settings.ads || [])
    .filter(ad => ad.isActive && ad.imageUrl)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (activeAds.length === 0) return null;

  // Split ads for left and right
  const leftAds = activeAds.filter(ad => ad.position === 'left' || ad.position === 'both');
  const rightAds = activeAds.filter(ad => ad.position === 'right' || ad.position === 'both');

  return (
    <>
      {/* Desktop Floating Sidebars */}
      {leftAds.length > 0 && (
        <div
          className={cn(
            'hidden 2xl:flex flex-col gap-4 fixed left-2 z-40 transition-all duration-300',
            isSticky && settings.stickyOnScroll ? 'top-20' : ''
          )}
          style={{ 
            width: settings.adWidth || 160,
            top: isSticky ? 80 : (settings.topOffset || 100),
          }}
        >
          {leftAds.map((ad, index) => (
            <div key={ad._id || index} className="relative">
              <div className="text-xs text-dark-400 text-center mb-1 opacity-60">Ad</div>
              <a href={ad.linkUrl || '#'} target="_blank" rel="noopener noreferrer sponsored">
                <img 
                  src={ad.imageUrl} 
                  alt={ad.title || 'Advertisement'} 
                  className="w-full rounded-lg shadow-lg hover:shadow-xl transition-shadow" 
                />
              </a>
            </div>
          ))}
        </div>
      )}

      {rightAds.length > 0 && (
        <div
          className={cn(
            'hidden 2xl:flex flex-col gap-4 fixed right-2 z-40 transition-all duration-300',
            isSticky && settings.stickyOnScroll ? 'top-20' : ''
          )}
          style={{ 
            width: settings.adWidth || 160,
            top: isSticky ? 80 : (settings.topOffset || 100),
          }}
        >
          {rightAds.map((ad, index) => (
            <div key={ad._id || index} className="relative">
              <div className="text-xs text-dark-400 text-center mb-1 opacity-60">Ad</div>
              <a href={ad.linkUrl || '#'} target="_blank" rel="noopener noreferrer sponsored">
                <img 
                  src={ad.imageUrl} 
                  alt={ad.title || 'Advertisement'} 
                  className="w-full rounded-lg shadow-lg hover:shadow-xl transition-shadow" 
                />
              </a>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ==================== MOBILE ADS SECTION (Grid display) ====================
export function MobileAdsSection({ settings }) {
  if (!settings?.enabled || !settings?.showOnMobile) return null;

  const activeAds = (settings.ads || [])
    .filter(ad => ad.isActive && (ad.imageUrl || ad.mobileImageUrl))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (activeAds.length === 0) return null;

  const columns = settings.mobileColumns || 2;

  return (
    <div className="2xl:hidden py-6 bg-dark-50 dark:bg-dark-900/50">
      <div className="container-custom">
        <div className="text-xs text-dark-400 text-center mb-3 uppercase tracking-wider">
          Sponsored
        </div>
        <div className={cn(
          'grid gap-4',
          columns === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}>
          {activeAds.map((ad, index) => {
            const imageUrl = ad.mobileImageUrl || ad.imageUrl;
            return (
              <a 
                key={ad._id || index}
                href={ad.linkUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer sponsored"
                className="relative block rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-dark-800"
              >
                <img 
                  src={imageUrl} 
                  alt={ad.title || 'Advertisement'} 
                  className="w-full h-auto object-cover"
                />
                {ad.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-medium truncate">{ad.title}</p>
                  </div>
                )}
                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/40 rounded text-xs text-white/80">
                  Ad
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== MOBILE STICKY BOTTOM ====================
export function MobileStickyBottom({ settings }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!settings?.stickyBottomEnabled || isDismissed) return;
    if (window.innerWidth >= 768) return; // Only mobile
    
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [settings, isDismissed]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-900 shadow-lg border-t border-dark-200 dark:border-dark-700 transition-transform duration-300',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{ height: settings.stickyBottomHeight || 60 }}
    >
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute -top-6 right-2 p-1 bg-dark-200 dark:bg-dark-700 rounded-full"
      >
        <X className="w-4 h-4" />
      </button>
      <a 
        href={settings.stickyBottomLinkUrl || '#'} 
        target="_blank" 
        rel="noopener noreferrer sponsored"
        className="w-full h-full flex items-center justify-center"
      >
        {settings.stickyBottomImageUrl ? (
          <img src={settings.stickyBottomImageUrl} alt="Ad" className="h-full max-w-full object-contain" />
        ) : (
          <span className="text-dark-400">Mobile Ad</span>
        )}
      </a>
      <span className="absolute top-1 left-2 text-xs text-dark-400 opacity-50">Ad</span>
    </div>
  );
}

// ==================== MOBILE INTERSTITIAL ====================
export function MobileInterstitial({ settings }) {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!settings?.interstitialEnabled) return;
    if (window.innerWidth >= 768) return;
    
    if (!shouldShowAd(STORAGE_KEYS.mobileInterstitial, settings.interstitialFrequency)) return;
    
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      markAdShown(STORAGE_KEYS.mobileInterstitial, settings.interstitialFrequency);
      
      const closeTime = Math.ceil((settings.interstitialAutoClose || 5000) / 1000);
      setCountdown(closeTime);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanClose(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }, settings.interstitialDelay || 3000);
    
    return () => clearTimeout(showTimer);
  }, [settings]);

  const handleClose = () => {
    if (canClose) setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={handleClose}
        disabled={!canClose}
        className={cn(
          'absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all',
          canClose ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 cursor-not-allowed'
        )}
      >
        {canClose ? <X className="w-6 h-6" /> : <span className="text-sm font-bold">{countdown}</span>}
      </button>

      {/* Ad content */}
      <a 
        href={settings.interstitialLinkUrl || '#'} 
        target="_blank" 
        rel="noopener noreferrer sponsored"
        className="w-full h-full flex items-center justify-center p-4"
      >
        {settings.interstitialImageUrl ? (
          <img 
            src={settings.interstitialImageUrl} 
            alt="Ad" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-white text-center">
            <p className="text-xl mb-4">Advertisement</p>
            <ExternalLink className="w-8 h-8 mx-auto opacity-50" />
          </div>
        )}
      </a>

      <span className="absolute bottom-4 left-4 text-xs text-white/50">Ad</span>
    </div>
  );
}

// ==================== EXIT INTENT POPUP ====================
export function ExitPopup({ settings }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!settings?.enabled || hasShownRef.current) return;
    if (!settings.showOnMobile && window.innerWidth < 768) return;
    
    if (!shouldShowAd(STORAGE_KEYS.exitPopup, settings.frequency)) return;

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !hasShownRef.current) {
        hasShownRef.current = true;
        setIsVisible(true);
        markAdShown(STORAGE_KEYS.exitPopup, settings.frequency);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [settings]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 transition-opacity duration-300',
        isClosing ? 'opacity-0' : 'opacity-100'
      )}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={cn(
        'relative max-w-lg w-full mx-4 bg-white dark:bg-dark-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300',
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      )}>
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {settings.imageUrl && (
          <img src={settings.imageUrl} alt="" className="w-full h-48 object-cover" />
        )}

        <div className="p-6 text-center">
          <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
            {settings.title || "Wait! Before you go..."}
          </h3>
          {settings.content && (
            <div 
              className="text-dark-600 dark:text-dark-300 mb-4"
              dangerouslySetInnerHTML={{ __html: settings.content }}
            />
          )}
          {settings.linkUrl && (
            <a
              href={settings.linkUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
            >
              {settings.buttonText || 'Stay & Explore'}
              <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="absolute bottom-2 right-2 text-xs text-dark-400 opacity-50">Ad</div>
      </div>
    </div>
  );
}

// ==================== SCROLL TRIGGERED AD ====================
export function ScrollAd({ settings }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!settings?.enabled || isDismissed || hasTriggeredRef.current) return;
    
    if (!shouldShowAd(STORAGE_KEYS.scrollAd, settings.frequency)) return;

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent >= (settings.triggerAt || 50) && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        setIsVisible(true);
        markAdShown(STORAGE_KEYS.scrollAd, settings.frequency);
        
        if (settings.autoClose && settings.autoCloseDelay > 0) {
          setTimeout(() => setIsDismissed(true), settings.autoCloseDelay);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [settings, isDismissed]);

  if (!isVisible || isDismissed) return null;

  const positions = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  const isMobile = window.innerWidth < 768;
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;

  return (
    <div className={cn(
      'fixed z-50 animate-slideUp',
      positions[settings.position || 'bottom-right']
    )}>
      <div className="relative bg-white dark:bg-dark-900 rounded-xl shadow-2xl overflow-hidden max-w-xs">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <a href={settings.linkUrl || '#'} target="_blank" rel="noopener noreferrer sponsored">
          {imageUrl ? (
            <img src={imageUrl} alt="Ad" className="w-full h-auto" />
          ) : (
            <div className="w-64 h-48 bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-400">
              Ad
            </div>
          )}
        </a>

        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/30 rounded text-xs text-white/70">
          Ad
        </div>
      </div>
    </div>
  );
}

// ==================== IN-ARTICLE AD ====================
export function InArticleAd({ settings }) {
  if (!settings?.enabled) return null;

  const isMobile = window.innerWidth < 768;
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;

  const styles = {
    banner: 'bg-dark-50 dark:bg-dark-800/50',
    native: 'bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl',
    card: 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl',
  };

  return (
    <div className={cn('my-8 p-4 relative', styles[settings.style || 'banner'])}>
      {settings.showLabel && (
        <div className="text-xs text-dark-400 mb-2 uppercase tracking-wider">Advertisement</div>
      )}
      
      <a 
        href={settings.linkUrl || '#'} 
        target="_blank" 
        rel="noopener noreferrer sponsored"
        className="block"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Ad" className="w-full h-auto max-h-72 object-contain mx-auto" />
        ) : settings.content ? (
          <div dangerouslySetInnerHTML={{ __html: settings.content }} />
        ) : (
          <div className="h-24 bg-dark-100 dark:bg-dark-700 rounded flex items-center justify-center text-dark-400">
            Advertisement Space
          </div>
        )}
      </a>
    </div>
  );
}

// ==================== MAIN ADS MANAGER ====================
export default function AdsManager({ settings, currentPage = 'all' }) {
  const { user, isAuthenticated } = useAuthStore();
  
  // Check global settings
  if (!settings?.adsGlobal?.masterSwitch) return null;
  if (settings.adsGlobal?.hideForLoggedIn && isAuthenticated) return null;
  if (settings.adsGlobal?.hideForAdmin && user?.role === 'admin') return null;
  
  return (
    <>
      {/* Welcome Popup */}
      <WelcomePopup settings={settings.welcomePopup} currentPage={currentPage} />
      
      {/* Floating Banner */}
      <FloatingBanner settings={settings.floatingBanner} />
      
      {/* Sidebar Ads (Desktop floating) */}
      <SidebarAds settings={settings.sidebarAds} currentPage={currentPage} />
      
      {/* Mobile Sticky Bottom */}
      <MobileStickyBottom settings={settings.mobileAds} />
      
      {/* Mobile Interstitial */}
      <MobileInterstitial settings={settings.mobileAds} />
      
      {/* Exit Intent Popup */}
      <ExitPopup settings={settings.exitPopup} />
      
      {/* Scroll Triggered Ad */}
      <ScrollAd settings={settings.scrollAd} />
    </>
  );
}
