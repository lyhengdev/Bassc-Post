import { useMemo, useState } from 'react';
import {Link, NavLink, useNavigate, useLocation} from 'react-router-dom';
import {
    Search,
    Sun,
    Moon,
    User,
    LogOut,
    LayoutDashboard,
} from 'lucide-react';
import {useAuthStore, useThemeStore} from '../../stores/authStore';
import {useLogout, useCategories, usePublicSettings} from '../../hooks/useApi';
import {Button, Avatar} from '../common/index.jsx';
import {NotificationDropdown} from '../common/NotificationDropdown.jsx';
import {cn} from '../../utils';

export default function Header() {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const {isAuthenticated, user} = useAuthStore();
    const {theme, toggleTheme} = useThemeStore();
    const {mutate: logout} = useLogout();
    const {data: categories} = useCategories();
    const {data: settings} = usePublicSettings();

    const siteName = settings?.siteName || 'Bassac Media';
    const siteLogo = settings?.siteLogo;
    const headerSettings = settings?.headerSettings || {};
    const features = settings?.features || {};
    const showSearchToggle = headerSettings.showSearch !== false && features.enableSearch !== false;
    const showDarkModeToggle = headerSettings.showDarkModeToggle !== false && features.enableDarkMode !== false;
    const showCategoriesNav = headerSettings.showCategories !== false;
    const isSticky = headerSettings.sticky !== false;
    const canAccessDashboard = isAuthenticated && ['admin', 'editor', 'writer'].includes(user?.role);

    const headerMenu = useMemo(() => {
        const normalize = (value) => (value || '').toString().trim().toLowerCase();
        const menuItems = settings?.menus?.header;
        const baseMenu = Array.isArray(menuItems) && menuItems.length > 0
            ? [...menuItems].sort((a, b) => (a.order || 0) - (b.order || 0))
            : [
                { label: 'News', url: '/articles', target: '_self' },
                ...(canAccessDashboard ? [{ label: 'Dashboard', url: '/dashboard', target: '_self' }] : []),
                { label: 'About', url: '/about', target: '_self' },
                { label: 'Contact', url: '/contact', target: '_self' },
            ];

        const hasCategoriesTab = baseMenu.some((item) => {
            const label = normalize(item?.label);
            const url = normalize(item?.url);
            return label === 'categories' || url === '/categories';
        });

        if (hasCategoriesTab) return baseMenu;

        const newsIndex = baseMenu.findIndex((item) => {
            const label = normalize(item?.label);
            const url = normalize(item?.url);
            return label === 'news' || url === '/articles';
        });
        const insertAt = newsIndex >= 0 ? newsIndex + 1 : 1;

        return [
            ...baseMenu.slice(0, insertAt),
            { label: 'Categories', url: '/categories', target: '_self' },
            ...baseMenu.slice(insertAt),
        ];
    }, [settings?.menus?.header, canAccessDashboard]);

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
            return item.url || '/';
        }
        return item.url || '/';
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
            return currentPath === '/articles' || currentPath.startsWith('/article/');
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

        if (isExternal) {
            return (
                <a
                    href={href}
                    target={target}
                    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                    className={resolvedClassName}
                >
                    {label}
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
                {label}
            </Link>
        );
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/articles?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
            setSearchOpen(false);
        }
    };

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
                                    return <img loading="lazy" src={siteLogo} alt={siteName} className="h-8 md:h-10 w-auto" />;
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
                                                    item.label?.toUpperCase() || 'LINK'
                                                )}
                                            </span>
                                        );
                                    }
                                    return (
                                        <div key={item.id || item.url || item.label} className="relative group">
                                            {renderMenuLink(
                                                item,
                                                'pb-1 border-b-2 transition-colors',
                                                item.label?.toUpperCase() || 'MENU'
                                            )}
                                            <div className="absolute left-0 top-full pt-2 hidden group-hover:block">
                                                <div className="min-w-[180px] rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 shadow-lg py-2">
                                                    {item.children.map((child) => (
                                                        <span key={child.id || child.url || child.label} className="block">
                                                            {renderMenuLink(
                                                                child,
                                                                'block px-4 py-2 text-sm border-l-2 transition-colors',
                                                                child.label || 'LINK',
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

                            {/* Search */}
                            {showSearchToggle && (
                                <button
                                    onClick={() => setSearchOpen(!searchOpen)}
                                    className="p-2 text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors"
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
                                                            <LayoutDashboard className="w-4 h-4"/> Dashboard
                                                        </Link>
                                                    )}
                                                    <Link to={profilePath} className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                        <User className="w-4 h-4"/> Profile
                                                    </Link>
                                                    <div className="md:hidden">
                                                        <Link to="/about" className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                            About
                                                        </Link>
                                                        <Link to="/contact" className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                            Contact
                                                        </Link>
                                                    </div>
                                                    <button onClick={() => { closeUserMenu(); logout(); }} className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                                        <LogOut className="w-4 h-4"/> Logout
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Link to="/login" className="px-3 py-2 md:px-4 md:py-2 bg-primary-600 text-white text-xs md:text-sm font-medium rounded hover:bg-primary-700 transition-colors">
                                    SIGN IN
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
                                DISCOVER
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

            {/* Search Bar */}
            {searchOpen && showSearchToggle && (
                <div className="absolute top-full left-0 right-0 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-700 shadow-lg py-4">
                    <form onSubmit={handleSearch} className="container-custom">
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400"/>
                            <input
                                type="text"
                                placeholder="Search news, topics..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-dark-200 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                            />
                        </div>
                    </form>
                </div>
            )}

        </header>
    );
}
