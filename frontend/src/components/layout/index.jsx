import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, Home, Sun, Moon, X } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import LanguageSelector from '../common/LanguageSelector.jsx';
import { useAuthStore, useThemeStore } from '../../stores/authStore';
import { Avatar } from '../common/index.jsx';
import { NotificationDropdown } from '../common/NotificationDropdown.jsx';
import { usePublicSettings } from '../../hooks/useApi';
import { useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';
import { BodyAd, PopupAdModal } from '../ads/index.js';
import { cn, buildMediaUrl } from '../../utils';
import { useIsFetching } from '@tanstack/react-query';
import useLanguage, { translateCurrentText } from '../../hooks/useLanguage';

const DASHBOARD_TEXT_NODE_ORIGINAL = new WeakMap();
const DASHBOARD_ATTR_ORIGINAL_ATTR = {
  placeholder: 'data-i18n-original-placeholder',
  title: 'data-i18n-original-title',
  'aria-label': 'data-i18n-original-aria-label',
};
const DASHBOARD_SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);

function applyDashboardTranslations(root, translateText) {
  if (!root || typeof translateText !== 'function') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (!parent || DASHBOARD_SKIP_TAGS.has(parent.tagName) || parent.closest('[data-no-auto-translate="true"]')) {
      node = walker.nextNode();
      continue;
    }

    const currentValue = node.textContent || '';
    if (!currentValue.trim()) {
      node = walker.nextNode();
      continue;
    }

    const originalValue = DASHBOARD_TEXT_NODE_ORIGINAL.get(node) ?? currentValue;
    if (!DASHBOARD_TEXT_NODE_ORIGINAL.has(node)) {
      DASHBOARD_TEXT_NODE_ORIGINAL.set(node, currentValue);
    }

    const translatedValue = translateText(originalValue);
    if (translatedValue !== currentValue) {
      node.textContent = translatedValue;
    }

    node = walker.nextNode();
  }

  const attrSelector = '[placeholder], [title], [aria-label]';
  root.querySelectorAll(attrSelector).forEach((element) => {
    if (element.closest('[data-no-auto-translate="true"]')) return;
    Object.entries(DASHBOARD_ATTR_ORIGINAL_ATTR).forEach(([attr, originalAttr]) => {
      if (!element.hasAttribute(attr)) return;
      if (!element.hasAttribute(originalAttr)) {
        element.setAttribute(originalAttr, element.getAttribute(attr) || '');
      }
      const originalValue = element.getAttribute(originalAttr) || '';
      const translatedValue = translateText(originalValue);
      if (translatedValue && translatedValue !== element.getAttribute(attr)) {
        element.setAttribute(attr, translatedValue);
      }
    });
  });
}

function useGlobalLoaderVisibility() {
  // Only consider first-load queries (pending + fetching), not background refetches.
  const initialFetchCount = useIsFetching({
    predicate: (query) =>
      query.state.fetchStatus === 'fetching' && query.state.status === 'pending',
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (initialFetchCount <= 0) {
      setVisible(false);
      return;
    }

    // Prevent flicker for very fast requests.
    const timer = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(timer);
  }, [initialFetchCount]);

  return visible;
}

// ==================== PUBLIC LAYOUT ====================
export function PublicLayout() {
  const { data: settings } = usePublicSettings();
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const isImmersiveVideoRoute = /^\/videos\/?$/.test(location.pathname || '');
  const device = useDeviceType();
  const { mutate: trackAdEvent } = useTrackAdEvent();
  const [isFloatingDismissed, setIsFloatingDismissed] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const showGlobalLoader = useGlobalLoaderVisibility();
  
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', settings.primaryColor || '#2563eb');
    root.style.setProperty('--brand-secondary', settings.secondaryColor || '#64748b');
    root.style.setProperty('--brand-accent', settings.accentColor || '#f59e0b');
  }, [settings?.primaryColor, settings?.secondaryColor, settings?.accentColor, settings]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const faviconHref = settings?.siteFavicon ? buildMediaUrl(settings.siteFavicon) : '/favicon.svg';
    const touchIconHref = settings?.siteLogo ? buildMediaUrl(settings.siteLogo) : '/favicon-logo-512.png';
    const faviconType = faviconHref.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

    const upsertHeadLink = ({ rel, href, type, sizes }) => {
      let link = document.head.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
      if (type) link.setAttribute('type', type);
      else link.removeAttribute('type');
      if (sizes) link.setAttribute('sizes', sizes);
      else link.removeAttribute('sizes');
    };

    upsertHeadLink({ rel: 'icon', href: faviconHref, type: faviconType });
    upsertHeadLink({ rel: 'shortcut icon', href: faviconHref, type: faviconType });
    upsertHeadLink({ rel: 'apple-touch-icon', href: touchIconHref, sizes: '180x180', type: 'image/png' });
  }, [settings?.siteFavicon, settings?.siteLogo]);
  
  // Get floating banner settings for layout adjustments
  const floatingBanner = settings?.floatingBanner;
  const hasTopBanner = floatingBanner?.enabled && floatingBanner?.position === 'top';
  const hasBottomBanner = floatingBanner?.enabled && floatingBanner?.position === 'bottom';
  const bannerHeight = { small: 48, medium: 64, large: 80 }[floatingBanner?.height || 'medium'];
  const isSettingsBannerActive = settings && (hasTopBanner || hasBottomBanner);
  const searchParams = new URLSearchParams(location.search);
  const pageType = location.pathname === '/'
    ? 'homepage'
    : location.pathname.startsWith('/article')
      ? 'article'
      : location.pathname.startsWith('/category')
        ? 'category'
        : location.pathname.startsWith('/articles') && searchParams.get('q')
          ? 'search'
        : location.pathname.startsWith('/articles')
          ? 'article'
          : 'other';
  const pageUrl = location.pathname;
  const { data: floatingAds } = useSelectAds('floating_banner', {
    pageType,
    device,
    limit: 1
  });
  const floatingAd = floatingAds?.[0];
  const { data: popupAds } = useSelectAds('popup', {
    pageType,
    device,
    pageUrl,
    limit: 1
  });
  const popupAd = popupAds?.[0];
  const { data: headerAds } = useSelectAds('header', {
    pageType,
    device,
    pageUrl,
    limit: 1
  });
  const headerAd = headerAds?.[0];

  useEffect(() => {
    setIsFloatingDismissed(false);
  }, [floatingAd?._id, location.pathname]);

  useEffect(() => {
    if (popupAd) {
      setIsPopupOpen(true);
    } else {
      setIsPopupOpen(false);
    }
  }, [popupAd?._id, location.pathname]);

  return (
    <div className={cn('min-h-screen flex flex-col font-public', isImmersiveVideoRoute && 'bg-black')}>
      {showGlobalLoader && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse pointer-events-none" />
      )}
      {/* Top Floating Banner - Above Header */}
      {!isImmersiveVideoRoute && settings && hasTopBanner && (
        <TopFloatingBanner settings={floatingBanner} />
      )}
      
      {!isImmersiveVideoRoute && headerAd && (
        <div className="border-b border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900">
          <div className="container-custom py-3">
            <BodyAd
              ad={headerAd}
              placementOverride="header"
              useNaturalHeight
              className="max-h-[120px]"
              onImpression={(adData) => trackAdEvent({
                adId: adData._id,
                type: 'impression',
                pageType,
                pageUrl,
                device,
                placement: adData.placement
              })}
              onClick={(adData, meta) => trackAdEvent({
                adId: adData._id,
                type: 'click',
                pageType,
                pageUrl,
                device,
                placement: adData.placement,
                eventTimestamp: meta?.eventTimestamp
              })}
            />
          </div>
        </div>
      )}

      {!isImmersiveVideoRoute && <Header />}

      
      {/* Main content with padding for mobile bottom nav */}
      <main className={cn('flex-grow', isImmersiveVideoRoute ? 'pb-0' : 'pb-16 md:pb-0')}>
        <Outlet />
      </main>
      
      
      {/* Footer - hidden on mobile when bottom nav is shown */}
      {!isImmersiveVideoRoute && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
      
      {/* Mobile Bottom Navigation */}
      {!isImmersiveVideoRoute && <MobileNav />}
      
      {/* Bottom Floating Banner - Above mobile nav on mobile */}
      {!isImmersiveVideoRoute && settings && hasBottomBanner && (
        <div className={cn(isMobile && 'mb-16')}>
          <BottomFloatingBanner settings={floatingBanner} />
        </div>
      )}

      {!isImmersiveVideoRoute && !isSettingsBannerActive && floatingAd && !isFloatingDismissed && (
        <FloatingAdBanner
          ad={floatingAd}
          onClose={() => setIsFloatingDismissed(true)}
          onImpression={(adData) => trackAdEvent({
            adId: adData._id,
            type: 'impression',
            pageType,
            pageUrl,
            device,
            placement: adData.placement
          })}
          onClick={(adData, meta) => trackAdEvent({
            adId: adData._id,
            type: 'click',
            pageType,
            pageUrl,
            device,
            placement: adData.placement,
            eventTimestamp: meta?.eventTimestamp
          })}
        />
      )}

      {!isImmersiveVideoRoute && (
        <PopupAdModal
          ad={popupAd}
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onImpression={(adData) => trackAdEvent({
            adId: adData._id,
            type: 'impression',
            pageType,
            pageUrl,
            device,
            placement: adData.placement
          })}
          onClick={(adData, meta) => trackAdEvent({
            adId: adData._id,
            type: 'click',
            pageType,
            pageUrl,
            device,
            placement: adData.placement,
            eventTimestamp: meta?.eventTimestamp
          })}
        />
      )}
      
    </div>
  );
}

// Top Floating Banner Component
function TopFloatingBanner({ settings }) {
  const { translateText } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (isDismissed || !settings?.enabled) return null;
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile && !settings.showOnMobile) return null;
  if (!isMobile && !settings.showOnDesktop) return null;
  
  const heights = { small: 'h-12', medium: 'h-16', large: 'h-20' };
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;
  const resolvedImageUrl = buildMediaUrl(imageUrl);

  return (
    <div
      className="w-full flex-shrink-0 relative"
      style={{ backgroundColor: settings.backgroundColor || '#1e40af' }}
    >
      <div className={cn('container-custom flex items-center justify-between', heights[settings.height || 'medium'])}>
        {resolvedImageUrl ? (
          <a 
            href={settings.linkUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer sponsored"
            className="flex-1 h-full flex items-center justify-center"
          >
            <img loading="lazy" src={resolvedImageUrl} alt={translateText('Ad')} className="h-full max-w-full object-contain" />
          </a>
        ) : settings.content ? (
          <a 
            href={settings.linkUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer sponsored"
            className="flex-1 text-center font-medium"
            style={{ color: settings.textColor || '#ffffff' }}
            dangerouslySetInnerHTML={{ __html: settings.content }}
          />
        ) : (
          <span className="flex-1 text-center font-medium" style={{ color: settings.textColor || '#ffffff' }}>
            {translateText('Advertisement')}
          </span>
        )}
        
        {settings.showCloseButton && (
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2 flex-shrink-0"
            style={{ color: settings.textColor || '#ffffff' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <span className="absolute top-1 right-2 text-xs opacity-50" style={{ color: settings.textColor || '#ffffff' }}>
        {translateText('Ad')}
      </span>
    </div>
  );
}

// Bottom Floating Banner Component  
function BottomFloatingBanner({ settings }) {
  const { translateText } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (isDismissed || !settings?.enabled) return null;
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile && !settings.showOnMobile) return null;
  if (!isMobile && !settings.showOnDesktop) return null;
  
  const heights = { small: 'h-12', medium: 'h-16', large: 'h-20' };
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;
  const resolvedImageUrl = buildMediaUrl(imageUrl);

  return (
    <div
      className="w-full flex-shrink-0 relative"
      style={{ backgroundColor: settings.backgroundColor || '#1e40af' }}
    >
      <div className={cn('container-custom flex items-center justify-between', heights[settings.height || 'medium'])}>
        {resolvedImageUrl ? (
          <a 
            href={settings.linkUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer sponsored"
            className="flex-1 h-full flex items-center justify-center"
          >
            <img loading="lazy" src={resolvedImageUrl} alt={translateText('Ad')} className="h-full max-w-full object-contain" />
          </a>
        ) : settings.content ? (
          <a 
            href={settings.linkUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer sponsored"
            className="flex-1 text-center font-medium"
            style={{ color: settings.textColor || '#ffffff' }}
            dangerouslySetInnerHTML={{ __html: settings.content }}
          />
        ) : (
          <span className="flex-1 text-center font-medium" style={{ color: settings.textColor || '#ffffff' }}>
            {translateText('Advertisement')}
          </span>
        )}
        
        {settings.showCloseButton && (
          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2 flex-shrink-0"
            style={{ color: settings.textColor || '#ffffff' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <span className="absolute top-1 right-2 text-xs opacity-50" style={{ color: settings.textColor || '#ffffff' }}>
        {translateText('Ad')}
      </span>
    </div>
  );
}

function FloatingAdBanner({ ad, onClose, onImpression, onClick }) {
  const { translateText } = useLanguage();
  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4">
      <div className="relative mx-auto max-w-4xl rounded-xl bg-white dark:bg-dark-900 shadow-xl border border-dark-200 dark:border-dark-700 p-3">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white dark:bg-dark-900 shadow flex items-center justify-center text-dark-500 hover:text-dark-700"
          aria-label={translateText('Close ad')}
        >
          <X className="w-4 h-4" />
        </button>
        <BodyAd ad={ad} placementOverride="floating_banner" onImpression={onImpression} onClick={onClick} />
      </div>
    </div>
  );
}

// ==================== DASHBOARD LAYOUT ====================
export function DashboardLayout() {
  const { t, translateText, language } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const showGlobalLoader = useGlobalLoaderVisibility();
  const dashboardRootRef = useRef(null);

  useEffect(() => {
    const root = dashboardRootRef.current;
    if (!root || typeof MutationObserver === 'undefined') return undefined;

    let isApplying = false;
    const runTranslation = () => {
      if (isApplying) return;
      isApplying = true;
      try {
        applyDashboardTranslations(root, translateCurrentText);
      } finally {
        isApplying = false;
      }
    };

    runTranslation();
    const observer = new MutationObserver(() => runTranslation());
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => observer.disconnect();
  }, [language, translateText]);

  useEffect(() => {
    const root = dashboardRootRef.current;
    if (!root) return undefined;

    const runTranslation = () => {
      applyDashboardTranslations(root, translateCurrentText);
    };

    window.addEventListener('app:language-change', runTranslation);
    window.addEventListener('languagechange', runTranslation);

    return () => {
      window.removeEventListener('app:language-change', runTranslation);
      window.removeEventListener('languagechange', runTranslation);
    };
  }, []);

  return (
    <div ref={dashboardRootRef} className="min-h-screen bg-dark-50 dark:bg-dark-950 font-dashboard">
      {showGlobalLoader && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse pointer-events-none" />
      )}
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-800">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden md:flex items-center gap-2 text-sm text-dark-500">
                <Link to="/" className="headline-hover">
                  <Home className="w-4 h-4" />
                </Link>
                <span>/</span>
                <span className="text-dark-900 dark:text-white">{t('nav.dashboard', 'Dashboard')}</span>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <LanguageSelector variant="compact" />

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-white hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Notifications */}
              <NotificationDropdown />

              {/* User Info */}
              <div className="flex items-center gap-3 pl-4 border-l border-dark-200 dark:border-dark-700">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-dark-900 dark:text-white">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-dark-500 capitalize">{translateText(user?.role)}</p>
                </div>
                <Avatar src={user?.avatar} name={user?.fullName} size="sm" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Re-export individual components
export { default as Header } from './Header';
export { default as Footer } from './Footer';
export { default as Sidebar } from './Sidebar';
