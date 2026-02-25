import { useMemo, useState, useEffect, useRef } from 'react';
import {Link, NavLink, useNavigate, useLocation} from 'react-router-dom';
import {
    Search,
    X,
    Sun,
    Moon,
    User,
    LogOut,
    LayoutDashboard,
} from 'lucide-react';
import {useAuthStore, useThemeStore} from '../../stores/authStore';
import {useLogout, useCategories, usePublicSettings} from '../../hooks/useApi';
import useLanguage from '../../hooks/useLanguage';
import {Avatar} from '../common/index.jsx';
import {NotificationDropdown} from '../common/NotificationDropdown.jsx';
import LanguageSelector from '../common/LanguageSelector.jsx';
import {cn, buildMediaUrl} from '../../utils';

const SEARCH_OVERLAY_ANIMATION_MS = 220;

export default function Header() {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchOverlayVisible, setSearchOverlayVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);
    const searchCloseTimerRef = useRef(null);

    const navigate = useNavigate();
    const location = useLocation();
    const {isAuthenticated, user} = useAuthStore();
    const {theme, toggleTheme} = useThemeStore();
    const {t, translateText} = useLanguage();
    const {mutate: logout} = useLogout();
    const {data: categories} = useCategories();
    const {data: settings} = usePublicSettings();

    const siteName = settings?.siteName || 'Bassac Post';
    const siteLogo = settings?.siteLogo;
    const headerSettings = settings?.headerSettings || {};
    const features = settings?.features || {};
    const showSearchToggle = headerSettings.showSearch !== false && features.enableSearch !== false;
    const showDarkModeToggle = headerSettings.showDarkModeToggle !== false && features.enableDarkMode !== false;
    const showCategoriesNav = headerSettings.showCategories !== false;
    const isSticky = headerSettings.sticky !== false;
    const canAccessDashboard = isAuthenticated && ['admin', 'editor', 'writer'].includes(user?.role);

    const normalizeLegacyVideoHref = (value = '/') => {
        const raw = String(value || '/').trim();
        if (!raw) return '/';

        try {
            const parsed = /^https?:\/\//i.test(raw)
                ? new URL(raw)
                : new URL(raw, 'https://bassac.local');
            const pathname = parsed.pathname.length > 1 && parsed.pathname.endsWith('/')
                ? parsed.pathname.slice(0, -1)
                : parsed.pathname || '/';

            if (pathname === '/articles' && parsed.searchParams.get('feed') === 'video') {
                if (/^https?:\/\//i.test(raw)) {
                    parsed.pathname = '/videos';
                    parsed.search = '';
                    return parsed.toString();
                }
                return '/videos';
            }

            return raw;
        } catch {
            return raw;
        }
    };

    const headerMenu = useMemo(() => {
        const normalize = (value) => (value || '').toString().trim().toLowerCase();
        const resolvePath = (value) => {
            const href = normalizeLegacyVideoHref(value || '/');
            try {
                const parsed = /^https?:\/\//i.test(href) ? new URL(href) : new URL(href, 'https://bassac.local');
                const path = parsed.pathname || '/';
                return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
            } catch {
                const path = String(href || '/').split('#')[0].split('?')[0];
                if (!path.startsWith('/')) return `/${path}`;
                return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
            }
        };
        const menuItems = settings?.menus?.header;
        const baseMenu = Array.isArray(menuItems) && menuItems.length > 0
            ? [...menuItems].sort((a, b) => (a.order || 0) - (b.order || 0))
            : [
                { label: t('nav.news', 'News'), url: '/articles', target: '_self' },
                { label: t('nav.video', 'Video'), url: '/videos', target: '_self' },
                ...(canAccessDashboard ? [{ label: t('nav.dashboard', 'Dashboard'), url: '/dashboard', target: '_self' }] : []),
                { label: t('nav.about', 'About'), url: '/about', target: '_self' },
                { label: t('nav.contact', 'Contact'), url: '/contact', target: '_self' },
            ];

        const hasVideoTab = baseMenu.some((item) => {
            const label = normalize(item?.label);
            const path = resolvePath(item?.url);
            return label === 'video' || path === '/videos';
        });

        const menuWithVideo = hasVideoTab
            ? baseMenu
            : (() => {
                const newsIndex = baseMenu.findIndex((item) => {
                    const label = normalize(item?.label);
                    const path = resolvePath(item?.url);
                    return label === 'news' || path === '/articles';
                });
                const insertAt = newsIndex >= 0 ? newsIndex + 1 : 1;
                return [
                    ...baseMenu.slice(0, insertAt),
                    { label: t('nav.video', 'Video'), url: '/videos', target: '_self' },
                    ...baseMenu.slice(insertAt),
                ];
            })();

        const hasCategoriesTab = menuWithVideo.some((item) => {
            const label = normalize(item?.label);
            const path = resolvePath(item?.url);
            return label === 'categories' || path === '/categories';
        });

        if (hasCategoriesTab) return menuWithVideo;

        const videoIndex = menuWithVideo.findIndex((item) => {
            const label = normalize(item?.label);
            const path = resolvePath(item?.url);
            return label === 'video' || path === '/videos';
        });
        const newsIndex = menuWithVideo.findIndex((item) => {
            const label = normalize(item?.label);
            const path = resolvePath(item?.url);
            return label === 'news' || path === '/articles';
        });
        const insertAt = videoIndex >= 0 ? videoIndex + 1 : (newsIndex >= 0 ? newsIndex + 1 : 1);

        return [
            ...menuWithVideo.slice(0, insertAt),
            { label: t('nav.categories', 'Categories'), url: '/categories', target: '_self' },
            ...menuWithVideo.slice(insertAt),
        ];
    }, [settings?.menus?.header, canAccessDashboard, t]);

    const categorySlugById = useMemo(() => {
        const map = new Map();
        (categories || []).forEach((cat) => {
            map.set(cat._id, cat.slug);
        });
        return map;
    }, [categories]);

    const getMenuHref = (item) => {
        if (!item) return '/';
        if (item.type === 'category') {
            const slug = item.categorySlug || categorySlugById.get(item.categoryId);
            return slug ? `/category/${slug}` : '/categories';
        }
        if (item.type === 'page') {
            return normalizeLegacyVideoHref(item.url || '/');
        }
        return normalizeLegacyVideoHref(item.url || '/');
    };

    const normalizePath = (value = '/') => {
        const path = String(value || '/').split('#')[0].split('?')[0];
        if (!path.startsWith('/')) return `/${path}`;
        if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
        return path;
    };

    const isMenuItemActive = (item, href) => {
        const currentPath = normalizePath(location.pathname || '/');
        const normalizedHref = normalizePath(href || '/');
        const normalizedLabel = (item?.label || '').toString().trim().toLowerCase();

        if (normalizedHref === '/articles' || normalizedLabel === 'news') {
            if (currentPath === '/videos') return false;
            return currentPath === '/articles' || currentPath.startsWith('/article/');
        }

        if (normalizedHref === '/videos' || normalizedLabel === 'video') {
            return currentPath === '/videos';
        }

        if (normalizedHref === '/categories' || normalizedLabel === 'categories') {
            return currentPath === '/categories' || currentPath.startsWith('/category/');
        }

        if (normalizedHref === '/dashboard' || normalizedLabel === 'dashboard') {
            return currentPath.startsWith('/dashboard');
        }

        if (normalizedHref === '/about' || normalizedLabel === 'about') {
            return currentPath === '/about';
        }

        if (normalizedHref === '/contact' || normalizedLabel === 'contact') {
            return currentPath === '/contact';
        }

        if (normalizedHref === '/') {
            return currentPath === '/';
        }

        return currentPath === normalizedHref || currentPath.startsWith(`${normalizedHref}/`);
    };

    const getLocalizedMenuLabel = (item, fallback = 'Link') => {
        const href = normalizePath(getMenuHref(item));
        const normalizedLabel = (item?.label || '').toString().trim().toLowerCase();

        if (href === '/articles' || normalizedLabel === 'news') return t('nav.news', item?.label || fallback);
        if (href === '/videos' || normalizedLabel === 'video') return t('nav.video', item?.label || fallback);
        if (href === '/categories' || normalizedLabel === 'categories') return t('nav.categories', item?.label || fallback);
        if (href === '/dashboard' || normalizedLabel === 'dashboard') return t('nav.dashboard', item?.label || fallback);
        if (href === '/about' || normalizedLabel === 'about') return t('nav.about', item?.label || fallback);
        if (href === '/contact' || normalizedLabel === 'contact') return t('nav.contact', item?.label || fallback);

        return item?.label || fallback;
    };

    const renderMenuLink = (
        item,
        className,
        label,
        activeClassName = 'text-primary-700 dark:text-primary-300 font-semibold border-primary-500 dark:border-primary-400',
        inactiveClassName = 'text-dark-500 dark:text-dark-300 border-transparent hover:text-dark-900 dark:hover:text-white'
    ) => {
        const href = getMenuHref(item);
        const isExternal = /^https?:\/\//.test(href);
        const target = item.target || '_self';
        const isActive = !isExternal && isMenuItemActive(item, href);
        const resolvedClassName = cn(className, isActive ? activeClassName : inactiveClassName);
        const localizedLabel = typeof label === 'string' ? translateText(label) : label;

        if (isExternal) {
            return (
                <a
                    href={href}
                    target={target}
                    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                    className={resolvedClassName}
                >
                    {localizedLabel}
                </a>
            );
        }
        return (
            <Link
                to={href}
                target={target}
                rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                className={resolvedClassName}
            >
                {localizedLabel}
            </Link>
        );
    };

    const openSearchOverlay = () => {
        if (searchCloseTimerRef.current) {
            window.clearTimeout(searchCloseTimerRef.current);
            searchCloseTimerRef.current = null;
        }
        setSearchOverlayVisible(true);
        setSearchOpen(true);
    };

    const closeSearchOverlay = () => {
        if (!searchOpen && !searchOverlayVisible && !searchCloseTimerRef.current) {
            return;
        }
        setSearchOpen(false);
        if (searchCloseTimerRef.current) {
            window.clearTimeout(searchCloseTimerRef.current);
        }
        searchCloseTimerRef.current = window.setTimeout(() => {
            setSearchOverlayVisible(false);
            searchCloseTimerRef.current = null;
        }, SEARCH_OVERLAY_ANIMATION_MS);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/articles?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
            closeSearchOverlay();
        }
    };

    useEffect(() => {
        if (!searchOpen) return;
        const timer = window.setTimeout(() => {
            searchInputRef.current?.focus();
        }, 10);
        return () => window.clearTimeout(timer);
    }, [searchOpen]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        if (searchOverlayVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalOverflow || '';
        }
        return () => {
            document.body.style.overflow = originalOverflow || '';
        };
    }, [searchOverlayVisible]);

    useEffect(() => {
        const onKeyDown = (event) => {
            const targetTag = event.target?.tagName;
            const isTypingTarget = ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || event.target?.isContentEditable;

            if (event.key === 'Escape' && searchOpen) {
                closeSearchOverlay();
                return;
            }

            if (!showSearchToggle || isTypingTarget) return;

            const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
            const isSlash = event.key === '/';
            if (isShortcut || isSlash) {
                event.preventDefault();
                openSearchOverlay();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [searchOpen, showSearchToggle]);

    useEffect(() => {
        closeSearchOverlay();
    }, [location.pathname, location.search]);

    useEffect(() => {
        return () => {
            if (searchCloseTimerRef.current) {
                window.clearTimeout(searchCloseTimerRef.current);
            }
        };
    }, []);

    const closeUserMenu = () => setUserMenuOpen(false);
    const profilePath = canAccessDashboard ? '/dashboard/profile' : '/account';

    // Check if current path matches category
    const isActiveCategory = (slug) => {
        return location.pathname === `/category/${slug}`;
    };

    return (
        <header className={`${isSticky ? 'sticky top-0' : ''} z-40 bg-white dark:bg-dark-900 shadow-sm`}>
            {/* Top Bar */}
            <div className="border-b border-dark-100 dark:border-dark-800">
                <div className="container-custom">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                            {(() => {
                                const stripUrl = (value) => String(value || '').split('#')[0].split('?')[0];
                                const strippedLogo = stripUrl(siteLogo);
                                const shouldUseDefaultLogo = !siteLogo
                                  || strippedLogo.endsWith('/LogoV1.png')
                                  || strippedLogo.endsWith('/logo_v1.png')
                                  || strippedLogo.endsWith('LogoV1.png')
                                  || strippedLogo.endsWith('logo_v1.png');

                                if (!shouldUseDefaultLogo) {
                                    return <img loading="lazy" src={buildMediaUrl(siteLogo)} alt={siteName} className="h-8 md:h-10 w-auto" />;
                                }

                                return (
                                  <>
                                    <img
                                      loading="lazy"
                                      src="/LogoV1.png"
                                      alt={siteName}
                                      className="h-8 md:h-10 w-auto dark:hidden"
                                    />
                                    <img
                                      loading="lazy"
                                      src="/LogoV1_white.png"
                                      alt={siteName}
                                      className="h-8 md:h-10 w-auto hidden dark:block"
                                    />
                                  </>
                                );
                            })()}
                        </Link>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            {/* Top Nav Links - Desktop */}
                            <nav className="hidden md:flex items-center gap-4 mr-4 text-sm">
                                {headerMenu.map((item) => {
                                    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                                    if (!hasChildren) {
                                        return (
                                            <span key={item.id || item.url || item.label}>
                                                {renderMenuLink(
                                                    item,
                                                    'pb-1 border-b-2 transition-colors',
                                                    getLocalizedMenuLabel(item, 'LINK')
                                                )}
                                            </span>
                                        );
                                    }
                                    return (
                                        <div key={item.id || item.url || item.label} className="relative group">
                                            {renderMenuLink(
                                                item,
                                                'pb-1 border-b-2 transition-colors',
                                                getLocalizedMenuLabel(item, 'MENU')
                                            )}
                                            <div className="absolute left-0 top-full pt-2 hidden group-hover:block">
                                                <div className="min-w-[180px] rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-lg py-2">
                                                    {item.children.map((child) => (
                                                        <span key={child.id || child.url || child.label} className="block">
                                                            {renderMenuLink(
                                                                child,
                                                                'block px-4 py-2 text-sm border-l-2 transition-colors',
                                                                getLocalizedMenuLabel(child, 'LINK'),
                                                                'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-primary-500 dark:border-primary-400',
                                                                'text-dark-600 dark:text-dark-300 border-transparent hover:bg-dark-100 dark:hover:bg-dark-800'
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </nav>

                            {/* Divider */}
                            <div className="hidden md:block w-px h-6 bg-dark-200 dark:bg-dark-700 mx-2" />

                            {/* Language */}
                            <LanguageSelector variant="compact" />

                            {/* Search */}
                            {showSearchToggle && (
                                <button
                                    onClick={openSearchOverlay}
                                    className="p-2 text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors"
                                    aria-label={t('search.open', 'Open search')}
                                    title={`${t('search.button', 'Search')} (Ctrl/Cmd + K)`}
                                >
                                    <Search className="w-5 h-5"/>
                                </button>
                            )}

                            {/* Theme Toggle */}
                            {showDarkModeToggle && (
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors"
                                >
                                    {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                                </button>
                            )}

                            {/* Auth */}
                            {isAuthenticated ? (
                                <>
                                    <NotificationDropdown />
                                    <div className="relative">
                                        <button
                                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                                            className="flex items-center gap-2 p-1 rounded-full hover:bg-dark-100 dark:hover:bg-dark-800"
                                        >
                                            <Avatar src={user?.avatar} name={user?.fullName} size="sm"/>
                                        </button>

                                        {userMenuOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={closeUserMenu}/>
                                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-900 rounded-lg shadow-lg border border-dark-200 dark:border-dark-700 py-2 z-50">
                                                    <div className="px-4 py-2 border-b border-dark-200 dark:border-dark-700">
                                                        <p className="font-medium text-dark-900 dark:text-white truncate">{user?.fullName}</p>
                                                        <p className="text-sm text-dark-500 truncate">{user?.email}</p>
                                                    </div>
                                                    {canAccessDashboard && (
                                                        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                            <LayoutDashboard className="w-4 h-4"/> {t('nav.dashboard', 'Dashboard')}
                                                        </Link>
                                                    )}
                                                    <Link to={profilePath} className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                        <User className="w-4 h-4"/> {t('nav.profile', 'Profile')}
                                                    </Link>
                                                    <div className="md:hidden">
                                                        <Link to="/about" className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                            {t('nav.about', 'About')}
                                                        </Link>
                                                        <Link to="/contact" className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                            {t('nav.contact', 'Contact')}
                                                        </Link>
                                                    </div>
                                                    <button onClick={() => { closeUserMenu(); logout(); }} className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                                        <LogOut className="w-4 h-4"/> {t('auth.logout', 'Logout')}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Link to="/login" className="px-3 py-2 md:px-4 md:py-2 bg-primary-600 text-white text-xs md:text-sm font-medium rounded hover:bg-primary-700 transition-colors">
                                    {t('auth.signIn', 'SIGN IN')}
                                </Link>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* Category Navigation Bar */}
            {showCategoriesNav && (
                <div className="bg-white dark:bg-dark-900 border-b border-dark-100 dark:border-dark-800">
                    <div className="container-custom">
                        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                            <NavLink
                                to="/"
                                className={({isActive}) => cn(
                                    'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                                    isActive 
                                        ? 'text-primary-700 dark:text-primary-300 border-primary-600 dark:border-primary-400 bg-primary-50/60 dark:bg-primary-900/20' 
                                        : 'text-dark-600 dark:text-dark-300 border-transparent hover:text-primary-700 dark:hover:text-primary-300'
                                )}
                            >
                                {t('nav.discover', 'DISCOVER')}
                            </NavLink>
                            {categories?.map((cat) => (
                                <Link
                                    key={cat._id}
                                    to={`/category/${cat.slug}`}
                                    className={cn(
                                        'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                                        isActiveCategory(cat.slug)
                                            ? 'text-primary-700 dark:text-primary-300 border-primary-600 dark:border-primary-400 bg-primary-50/60 dark:bg-primary-900/20'
                                            : 'text-dark-600 dark:text-dark-300 border-transparent hover:text-primary-700 dark:hover:text-primary-300'
                                    )}
                                >
                                    {cat.name.toUpperCase()}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Search Overlay */}
            {searchOverlayVisible && showSearchToggle && (
                <div
                    className={cn(
                        'fixed inset-0 z-[70] bg-dark-950/45 backdrop-blur-sm transition-opacity duration-200 ease-out',
                        searchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    )}
                    onClick={closeSearchOverlay}
                >
                    <div className="container-custom pt-20 sm:pt-24" onClick={(event) => event.stopPropagation()}>
                        <div
                            className={cn(
                                'mx-auto max-w-3xl overflow-hidden rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-2xl transition-all duration-200 ease-out',
                                searchOpen ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-2 scale-[0.98] opacity-0'
                            )}
                        >
                            <form onSubmit={handleSearch} className="border-b border-dark-200 dark:border-dark-700 p-3 sm:p-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400"/>
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder={t('search.placeholder', 'Search news, topics, categories...')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full rounded-full border border-dark-200 dark:border-dark-600 bg-dark-50 dark:bg-dark-800 py-3 pl-12 pr-10 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-dark-200 dark:hover:bg-dark-700"
                                                aria-label={t('common.clearSearch', 'Clear search')}
                                            >
                                                <X className="w-4 h-4 text-dark-400" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
                                    >
                                        {t('search.button', 'Search')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={closeSearchOverlay}
                                        className="hidden sm:inline-flex items-center justify-center rounded-full border border-dark-200 dark:border-dark-700 px-4 py-2.5 text-sm font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                                    >
                                        {t('search.close', 'Close')}
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-4 p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs uppercase tracking-[0.2em] text-dark-400">{t('search.quickJump', 'Quick Jump')}</p>
                                    <span className="hidden sm:inline text-xs text-dark-400">{t('search.escToClose', 'Press Esc to close')}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        to="/articles"
                                        onClick={closeSearchOverlay}
                                        className="rounded-full bg-dark-100 dark:bg-dark-800 px-3 py-1.5 text-sm text-dark-700 dark:text-dark-200 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                                    >
                                        {t('search.allNews', 'All News')}
                                    </Link>
                                    <Link
                                        to="/categories"
                                        onClick={closeSearchOverlay}
                                        className="rounded-full bg-dark-100 dark:bg-dark-800 px-3 py-1.5 text-sm text-dark-700 dark:text-dark-200 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                                    >
                                        {t('nav.categories', 'Categories')}
                                    </Link>
                                    <Link
                                        to="/about"
                                        onClick={closeSearchOverlay}
                                        className="rounded-full bg-dark-100 dark:bg-dark-800 px-3 py-1.5 text-sm text-dark-700 dark:text-dark-200 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                                    >
                                        {t('nav.about', 'About')}
                                    </Link>
                                </div>

                                {Array.isArray(categories) && categories.length > 0 && (
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-dark-400 mb-2">{t('search.trendingTopics', 'Trending Topics')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.slice(0, 10).map((cat) => (
                                                <Link
                                                    key={cat._id}
                                                    to={`/category/${cat.slug}`}
                                                    onClick={closeSearchOverlay}
                                                    className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                                                    style={{
                                                        borderColor: `${cat.color || '#64748b'}55`,
                                                        color: cat.color || '#64748b',
                                                        backgroundColor: `${cat.color || '#64748b'}14`,
                                                    }}
                                                >
                                                    {cat.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </header>
    );
}
