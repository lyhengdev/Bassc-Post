import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, Bell, Home, Sun, Moon, X } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useAuthStore, useThemeStore } from '../../stores/authStore';
import { Avatar } from '../common/index.jsx';
import { NotificationDropdown } from '../common/NotificationDropdown.jsx';
import AdsManager from '../ads/AdsManager.jsx';
import { usePublicSettings } from '../../hooks/useApi';
import { cn } from '../../utils';

// ==================== PUBLIC LAYOUT ====================
export function PublicLayout() {
  const { data: settings } = usePublicSettings();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Determine current page type
  const currentPage = location.pathname === '/' 
    ? 'homepage' 
    : location.pathname.startsWith('/article/') 
    ? 'articles' 
    : location.pathname.startsWith('/category/')
    ? 'category'
    : 'all';

  // Get floating banner settings for layout adjustments
  const floatingBanner = settings?.floatingBanner;
  const hasTopBanner = floatingBanner?.enabled && floatingBanner?.position === 'top';
  const hasBottomBanner = floatingBanner?.enabled && floatingBanner?.position === 'bottom';
  const bannerHeight = { small: 48, medium: 64, large: 80 }[floatingBanner?.height || 'medium'];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Floating Banner - Above Header */}
      {settings && hasTopBanner && (
        <TopFloatingBanner settings={floatingBanner} />
      )}
      
      <Header />
      
      {/* Main content with padding for mobile bottom nav */}
      <main className="flex-grow pb-16 md:pb-0">
        <Outlet />
      </main>
      
      {/* Footer - hidden on mobile when bottom nav is shown */}
      <div className="hidden md:block">
        <Footer />
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
      
      {/* Bottom Floating Banner - Above mobile nav on mobile */}
      {settings && hasBottomBanner && (
        <div className={cn(isMobile && 'mb-16')}>
          <BottomFloatingBanner settings={floatingBanner} />
        </div>
      )}
      
      {/* Other Ads managed by AdsManager (except floating banner) */}
      {settings && (
        <AdsManager settings={{...settings, floatingBanner: { enabled: false }}} currentPage={currentPage} />
      )}
    </div>
  );
}

// Top Floating Banner Component
function TopFloatingBanner({ settings }) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (isDismissed || !settings?.enabled) return null;
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile && !settings.showOnMobile) return null;
  if (!isMobile && !settings.showOnDesktop) return null;
  
  const heights = { small: 'h-12', medium: 'h-16', large: 'h-20' };
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;

  return (
    <div
      className="w-full flex-shrink-0 relative"
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
            Advertisement
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
        Ad
      </span>
    </div>
  );
}

// Bottom Floating Banner Component  
function BottomFloatingBanner({ settings }) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (isDismissed || !settings?.enabled) return null;
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile && !settings.showOnMobile) return null;
  if (!isMobile && !settings.showOnDesktop) return null;
  
  const heights = { small: 'h-12', medium: 'h-16', large: 'h-20' };
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;

  return (
    <div
      className="w-full flex-shrink-0 relative"
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
            Advertisement
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
        Ad
      </span>
    </div>
  );
}

// ==================== DASHBOARD LAYOUT ====================
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950">
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
                <Link to="/" className="hover:text-primary-600">
                  <Home className="w-4 h-4" />
                </Link>
                <span>/</span>
                <span className="text-dark-900 dark:text-white">Dashboard</span>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
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
                  <p className="text-xs text-dark-500 capitalize">{user?.role}</p>
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
