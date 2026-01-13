import {useState} from 'react';
import {Link, NavLink, useNavigate, useLocation} from 'react-router-dom';
import {
    Menu,
    X,
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/articles?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
            setSearchOpen(false);
            setMobileMenuOpen(false);
        }
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);
    const closeUserMenu = () => setUserMenuOpen(false);

    // Check if current path matches category
    const isActiveCategory = (slug) => {
        return location.pathname === `/category/${slug}`;
    };

    return (
        <header className="sticky top-0 z-40 bg-white dark:bg-dark-900 shadow-sm">
            {/* Top Bar */}
            <div className="border-b border-dark-100 dark:border-dark-800">
                <div className="container-custom">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                            {siteLogo ? (
                              <img src={siteLogo} alt={siteName} className="h-8 md:h-10 w-auto" />
                            ) : (
                              <div className="flex items-center">
                                  <span className="font-bold text-2xl md:text-3xl text-primary-600 dark:text-primary-400 tracking-tight">
                                      BASSAC
                                  </span>
                                  <span className="font-bold text-2xl md:text-3xl text-dark-900 dark:text-white tracking-tight">
                                      MEDIA
                                  </span>
                              </div>
                            )}
                        </Link>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            {/* Top Nav Links - Desktop */}
                            <nav className="hidden md:flex items-center gap-4 mr-4 text-sm">
                                <Link to="/about" className="text-dark-500 hover:text-dark-900 dark:hover:text-white">
                                    ABOUT
                                </Link>
                                <Link to="/contact" className="text-dark-500 hover:text-dark-900 dark:hover:text-white">
                                    CONTACT
                                </Link>
                            </nav>

                            {/* Divider */}
                            <div className="hidden md:block w-px h-6 bg-dark-200 dark:bg-dark-700 mx-2" />

                            {/* Search */}
                            <button
                                onClick={() => setSearchOpen(!searchOpen)}
                                className="p-2 text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors"
                            >
                                <Search className="w-5 h-5"/>
                            </button>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors"
                            >
                                {theme === 'dark' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                            </button>

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
                                                    <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                        <LayoutDashboard className="w-4 h-4"/> Dashboard
                                                    </Link>
                                                    <Link to="/dashboard/profile" className="flex items-center gap-2 px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800" onClick={closeUserMenu}>
                                                        <User className="w-4 h-4"/> Profile
                                                    </Link>
                                                    <button onClick={() => { closeUserMenu(); logout(); }} className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                                        <LogOut className="w-4 h-4"/> Logout
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Link to="/login" className="hidden md:block px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors">
                                    SIGN IN
                                </Link>
                            )}

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-dark-500 hover:text-dark-900 dark:hover:text-white"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Navigation Bar */}
            <div className="bg-white dark:bg-dark-900 border-b border-dark-100 dark:border-dark-800">
                <div className="container-custom">
                    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                        <NavLink
                            to="/"
                            className={({isActive}) => cn(
                                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
                                isActive 
                                    ? 'text-primary-600 dark:text-primary-400 border-primary-600' 
                                    : 'text-dark-600 dark:text-dark-300 border-transparent hover:text-primary-600'
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
                                        ? 'text-primary-600 dark:text-primary-400 border-primary-600'
                                        : 'text-dark-600 dark:text-dark-300 border-transparent hover:text-primary-600'
                                )}
                            >
                                {cat.name.toUpperCase()}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Search Bar */}
            {searchOpen && (
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

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-dark-900 border-b border-dark-200 dark:border-dark-700 shadow-lg">
                    <div className="container-custom py-4 space-y-2">
                        <Link to="/about" onClick={closeMobileMenu} className="block px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 rounded">About</Link>
                        <Link to="/contact" onClick={closeMobileMenu} className="block px-4 py-2 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 rounded">Contact</Link>
                        {!isAuthenticated && (
                            <Link to="/login" onClick={closeMobileMenu} className="block px-4 py-2 bg-primary-600 text-white text-center rounded hover:bg-primary-700">Sign In</Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
