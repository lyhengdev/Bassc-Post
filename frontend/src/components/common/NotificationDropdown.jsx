import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, Check, CheckCheck, Trash2, X, 
  FileText, MessageCircle, User, AlertCircle, Mail, Megaphone,
  ChevronRight
} from 'lucide-react';
import { cn, formatRelativeTime } from '../../utils';
import { resolveNotificationLink } from '../../utils/notificationLink';
import useNotificationStore from '../../stores/notificationStore';
import { Button, Badge, Avatar } from '../common/index.jsx';

// Notification type icons
const typeIcons = {
  article_published: FileText,
  article_approved: Check,
  article_rejected: AlertCircle,
  article_submitted: FileText,
  comment_received: MessageCircle,
  comment_reply: MessageCircle,
  comment_approved: Check,
  comment_rejected: AlertCircle,
  user_mentioned: User,
  role_changed: User,
  system_announcement: Megaphone,
  newsletter_subscribed: Mail,
  contact_message: Mail,
};

// Notification type colors
const typeColors = {
  article_published: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  article_approved: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  article_rejected: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  article_submitted: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  comment_received: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  comment_reply: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  comment_approved: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  comment_rejected: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  user_mentioned: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  role_changed: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  system_announcement: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30',
  newsletter_subscribed: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
  contact_message: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
};

function NotificationItem({ notification, onMarkRead, onDelete, onClick }) {
  const Icon = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || 'text-dark-600 bg-dark-100 dark:bg-dark-800';

  return (
    <div
      className={cn(
        'flex gap-3 p-3 hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors cursor-pointer group',
        !notification.isRead && 'bg-primary-50/50 dark:bg-primary-950/20'
      )}
      onClick={() => {
        if (!notification.isRead) onMarkRead(notification._id);
        onClick?.(notification);
      }}
    >
      <div className={cn('p-2 rounded-lg flex-shrink-0', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm line-clamp-1',
          notification.isRead ? 'text-dark-600 dark:text-dark-400' : 'text-dark-900 dark:text-white font-medium'
        )}>
          {notification.title}
        </p>
        <p className="text-xs text-dark-500 line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-dark-400 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-primary-600" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
          className="p-1 opacity-0 group-hover:opacity-100 text-dark-400 hover:text-red-500 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    browserPermission,
    requestBrowserPermission,
  } = useNotificationStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1, false);
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = (notification) => {
    setIsOpen(false);
    const resolvedLink = resolveNotificationLink(notification);
    if (resolvedLink) window.location.href = resolvedLink;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-900 rounded-xl shadow-xl border border-dark-200 dark:border-dark-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-200 dark:border-dark-700">
            <h3 className="font-semibold text-dark-900 dark:text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-dark-500">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {browserPermission !== 'granted' && (
                <button
                  onClick={requestBrowserPermission}
                  className="text-xs link-primary"
                  title="Enable browser notifications"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs link-primary flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-dark-300 mx-auto mb-3" />
                <p className="text-dark-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-100 dark:divide-dark-800">
                {notifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1 px-4 py-3 text-sm link-primary hover:bg-primary-50 dark:hover:bg-primary-900/20 border-t border-dark-200 dark:border-dark-700"
            >
              View all notifications
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
