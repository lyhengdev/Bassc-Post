import { NavLink, useLocation } from 'react-router-dom';
import { Home, Newspaper, Grid3X3, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../utils';

export default function MobileNav() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const canAccessDashboard = isAuthenticated && ['admin', 'editor', 'writer'].includes(user?.role);
  const accountHref = isAuthenticated ? (canAccessDashboard ? '/dashboard' : '/account') : '/login';

  // Don't show on dashboard pages
  if (location.pathname.startsWith('/dashboard')) {
    return null;
  }

  // Don't show on login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const navItems = [
    { href: '/', icon: Home, label: 'Discover' },
    { href: '/articles', icon: Newspaper, label: 'Articles' },
    { href: '/categories', icon: Grid3X3, label: 'Categories' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800 md:hidden safe-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-4 transition-colors',
                isActive 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-dark-500 dark:text-dark-400'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
