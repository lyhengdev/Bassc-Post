import { NavLink, useLocation } from 'react-router-dom';
import { Home, Newspaper, Grid3X3, User, LayoutDashboard, Circle } from 'lucide-react';
import { useCategories, usePublicSettings } from '../../hooks/useApi';
import { cn } from '../../utils';

export default function MobileNav() {
  const location = useLocation();
  const { data: settings } = usePublicSettings();
  const { data: categories } = useCategories();

  // Don't show on dashboard pages
  if (location.pathname.startsWith('/dashboard')) {
    return null;
  }

  // Don't show on login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const categorySlugById = new Map();
  (categories || []).forEach((cat) => {
    categorySlugById.set(cat._id, cat.slug);
  });

  const iconMap = {
    home: Home,
    articles: Newspaper,
    article: Newspaper,
    categories: Grid3X3,
    category: Grid3X3,
    account: User,
    profile: User,
    dashboard: LayoutDashboard,
  };

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

  const getMenuIcon = (item) => {
    const iconKey = (item?.icon || item?.label || item?.url || '').toString().toLowerCase();
    const matched = Object.keys(iconMap).find((key) => iconKey.includes(key));
    return matched ? iconMap[matched] : Circle;
  };

  const mobileMenu = Array.isArray(settings?.menus?.mobile) && settings.menus.mobile.length > 0
    ? [...settings.menus.mobile].sort((a, b) => (a.order || 0) - (b.order || 0))
    : null;

  const navItems = mobileMenu
    ? mobileMenu.map((item) => ({
        href: getMenuHref(item),
        icon: getMenuIcon(item),
        label: item.label || 'Link',
        target: item.target || '_self',
      }))
    : [
        { href: '/', icon: Home, label: 'Discover' },
        { href: '/articles', icon: Newspaper, label: 'News' },
        { href: '/categories', icon: Grid3X3, label: 'Categories' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-800 md:hidden safe-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isExternal = /^https?:\/\//.test(item.href);
          const className = 'flex flex-col items-center justify-center py-1 px-4 transition-colors text-dark-500 dark:text-dark-400';
          if (isExternal) {
            return (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                target={item.target}
                rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
                className={className}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </a>
            );
          }
          return (
            <NavLink
              key={`${item.href}-${item.label}`}
              to={item.href}
              target={item.target}
              rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
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
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
