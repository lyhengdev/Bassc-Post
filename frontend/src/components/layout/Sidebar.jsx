import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PenTool,
  Clock,
  FolderOpen,
  Image,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  Sparkles,
  X,
  Layout,
  Globe,
  Palette,
  MessageCircle,
  Mail,
  Megaphone,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import useLanguage from '../../hooks/useLanguage';
import { cn } from '../../utils';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const { t, translateText } = useLanguage();
  const role = user?.role;

  const menuItems = [
    {
      title: 'Overview',
      items: [
        {
          icon: LayoutDashboard,
          label: 'Dashboard',
          href: '/dashboard',
          roles: ['admin', 'editor', 'writer'],
        },
      ],
    },
    {
      title: 'Content',
      items: [
        {
          icon: FileText,
          label: 'My Posts',
          href: '/dashboard/articles',
          roles: ['writer', 'editor', 'admin'],
        },
        {
          icon: PenTool,
          label: 'New Post',
          href: '/dashboard/articles/new',
          roles: ['writer', 'editor', 'admin'],
        },
        {
          icon: Clock,
          label: 'Pending Review',
          href: '/dashboard/pending',
          roles: ['editor', 'admin'],
        },
        {
          icon: FolderOpen,
          label: 'Categories',
          href: '/dashboard/categories',
          roles: ['admin'],
        },
        {
          icon: Image,
          label: 'Media',
          href: '/dashboard/media',
          roles: ['writer', 'editor', 'admin'],
        },
      ],
    },
    {
      title: 'AI Tools',
      items: [
        {
          icon: Sparkles,
          label: 'AI Assistant',
          href: '/dashboard/ai',
          roles: ['writer', 'editor', 'admin'],
        },
      ],
    },
    {
      title: 'Design',
      items: [
        {
          icon: Layout,
          label: 'Homepage Builder',
          href: '/dashboard/homepage',
          roles: ['admin'],
        },
        {
          icon: Megaphone,
          label: 'Ads Control',
          href: '/dashboard/ads',
          roles: ['admin'],
        },
        {
          icon: Palette,
          label: 'Site Settings',
          href: '/dashboard/settings',
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          icon: Users,
          label: 'Users',
          href: '/dashboard/users',
          roles: ['admin'],
        },
        {
          icon: MessageSquare,
          label: 'Messages',
          href: '/dashboard/messages',
          roles: ['admin'],
        },
        {
          icon: MessageCircle,
          label: 'Comments',
          href: '/dashboard/comments',
          roles: ['editor', 'admin'],
        },
        {
          icon: Mail,
          label: 'Newsletter',
          href: '/dashboard/newsletter',
          roles: ['admin'],
        },
        {
          icon: BarChart3,
          label: 'Analytics',
          href: '/dashboard/analytics',
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: Settings,
          label: 'Profile',
          href: '/dashboard/profile',
          roles: ['admin', 'editor', 'writer', 'user'],
        },
      ],
    },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-dark-900',
          'border-r border-dark-200 dark:border-dark-800',
          'transition-transform duration-300',
          'lg:translate-x-0 lg:z-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-200 dark:border-dark-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold">B</span>
            </div>
            <span className="font-display font-bold text-lg text-dark-900 dark:text-white">
              {t('nav.dashboard', 'Dashboard')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 h-[calc(100vh-8rem)] overflow-y-auto">
          {filteredMenuItems.map((section) => (
            <div key={section.title}>
              <h4 className="px-3 mb-2 text-smcou font-semibold text-dark-500 uppercase tracking-wider">
                {translateText(section.title)}
              </h4>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/dashboard'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                            : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-white'
                        )
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      {translateText(item.label)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* Back to Website */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-white transition-colors"
          >
            <Globe className="w-5 h-5" />
            {t('common.backToWebsite', 'Back to Website')}
          </a>
        </div>
      </aside>
    </>
  );
}
