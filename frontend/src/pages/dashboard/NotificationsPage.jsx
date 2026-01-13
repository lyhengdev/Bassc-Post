import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Bell, Check, CheckCheck, Trash2, RefreshCw,
  FileText, MessageCircle, User, AlertCircle, Mail, Megaphone,
  Settings, Filter
} from 'lucide-react';
import { cn, formatRelativeTime } from '../../utils';
import useNotificationStore from '../../stores/notificationStore';
import { Button, Badge, ContentLoader, Modal, ConfirmModal } from '../../components/common/index.jsx';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Notification type icons
const typeIcons = {
  article_published: FileText,
  article_approved: Check,
  article_rejected: AlertCircle,
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

const typeLabels = {
  article_published: 'Article Published',
  article_approved: 'Article Approved',
  article_rejected: 'Article Rejected',
  comment_received: 'New Comment',
  comment_reply: 'Comment Reply',
  comment_approved: 'Comment Approved',
  comment_rejected: 'Comment Rejected',
  user_mentioned: 'Mentioned',
  role_changed: 'Role Changed',
  system_announcement: 'Announcement',
  newsletter_subscribed: 'New Subscriber',
  contact_message: 'New Message',
};

// Default email preferences
const defaultEmailPrefs = {
  articlePublished: true,
  articleApproved: true,
  commentReceived: true,
  systemAnnouncement: true,
};

export function NotificationsPage() {
  const [filter, setFilter] = useState('all'); // all, unread
  const [typeFilter, setTypeFilter] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState(defaultEmailPrefs);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    browserPermission,
    requestBrowserPermission,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(1, filter === 'unread');
  }, [filter, fetchNotifications]);

  // Load email preferences when settings modal opens
  useEffect(() => {
    if (showSettings) {
      api.get('/notifications/preferences')
        .then(res => {
          if (res.data?.data?.preferences?.email) {
            setEmailPrefs(res.data.data.preferences.email);
          }
        })
        .catch(() => {});
    }
  }, [showSettings]);

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      await api.put('/notifications/preferences', {
        preferences: { email: emailPrefs }
      });
      toast.success('Preferences saved');
      setShowSettings(false);
    } catch (error) {
      toast.error('Failed to save preferences');
    }
    setIsSavingPrefs(false);
  };

  const handleEmailPrefChange = (key) => {
    setEmailPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredNotifications = notifications.filter(n => {
    if (typeFilter && n.type !== typeFilter) return false;
    return true;
  });

  const handleRefresh = () => {
    fetchNotifications(1, filter === 'unread');
  };

  return (
    <>
      <Helmet><title>Notifications - Dashboard</title></Helmet>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">Notifications</h1>
          <p className="text-dark-500 text-sm">{unreadCount} unread notifications</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Mark All Read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex rounded-lg overflow-hidden border border-dark-200 dark:border-dark-700">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors',
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-700'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium transition-colors',
              filter === 'unread'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-dark-800 text-dark-600 dark:text-dark-400 hover:bg-dark-50 dark:hover:bg-dark-700'
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input py-1.5 text-sm w-auto"
        >
          <option value="">All Types</option>
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Browser Notification Banner */}
      {browserPermission !== 'granted' && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-950/30 dark:to-purple-950/30 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Enable Browser Notifications</p>
                <p className="text-sm text-dark-500">Get notified instantly when something happens</p>
              </div>
            </div>
            <Button size="sm" onClick={requestBrowserPermission}>
              Enable
            </Button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {isLoading && notifications.length === 0 ? (
        <ContentLoader />
      ) : filteredNotifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-16 h-16 text-dark-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </h3>
          <p className="text-dark-500">
            {filter === 'unread' 
              ? 'You have no unread notifications'
              : "When something happens, you'll see it here"}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-dark-200 dark:divide-dark-700">
          {filteredNotifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass = typeColors[notification.type] || 'text-dark-600 bg-dark-100 dark:bg-dark-800';

            return (
              <div
                key={notification._id}
                className={cn(
                  'flex gap-4 p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors',
                  !notification.isRead && 'bg-primary-50/30 dark:bg-primary-950/10'
                )}
              >
                <div className={cn('p-3 rounded-xl flex-shrink-0 h-fit', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={cn(
                      'text-sm sm:text-base',
                      notification.isRead ? 'text-dark-700 dark:text-dark-300' : 'text-dark-900 dark:text-white font-semibold'
                    )}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-dark-400 whitespace-nowrap">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-dark-500 mb-2">{notification.message}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[notification.type] || notification.type}
                    </Badge>
                    {notification.link && (
                      <Link
                        to={notification.link}
                        onClick={() => !notification.isRead && markAsRead(notification._id)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        View Details →
                      </Link>
                    )}
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="text-xs text-dark-400 hover:text-dark-600 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification._id)}
                      className="text-xs text-dark-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear All Button */}
      {notifications.length > 0 && (
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => setDeleteAllModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Notifications
          </Button>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteAllModal}
        onClose={() => setDeleteAllModal(false)}
        onConfirm={() => {
          deleteAllNotifications();
          setDeleteAllModal(false);
        }}
        title="Clear All Notifications"
        message="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmText="Delete All"
        variant="danger"
        icon={Trash2}
      />

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Notification Settings">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-dark-900 dark:text-white mb-3">Browser Notifications</h4>
            <div className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
              <div>
                <p className="font-medium text-dark-900 dark:text-white">Desktop Notifications</p>
                <p className="text-sm text-dark-500">
                  {browserPermission === 'granted' 
                    ? 'Enabled - You will receive desktop notifications'
                    : browserPermission === 'denied'
                    ? 'Blocked - Please enable in browser settings'
                    : 'Not enabled'}
                </p>
              </div>
              {browserPermission !== 'granted' && browserPermission !== 'denied' && (
                <Button size="sm" onClick={requestBrowserPermission}>Enable</Button>
              )}
              {browserPermission === 'granted' && (
                <Badge className="badge-success">Enabled</Badge>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-dark-900 dark:text-white mb-3">Email Notifications</h4>
            <p className="text-sm text-dark-500 mb-3">
              Email notifications are sent for important updates like article approvals and new comments.
            </p>
            <div className="space-y-2">
              {[
                { key: 'articlePublished', label: 'Article Published' },
                { key: 'articleApproved', label: 'Article Approved/Rejected' },
                { key: 'commentReceived', label: 'New Comments' },
                { key: 'systemAnnouncement', label: 'System Announcements' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-2 hover:bg-dark-50 dark:hover:bg-dark-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailPrefs[item.key] ?? true}
                    onChange={() => handleEmailPrefChange(item.key)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm text-dark-700 dark:text-dark-300">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-dark-200 dark:border-dark-700">
            <Button variant="secondary" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleSavePreferences} isLoading={isSavingPrefs}>Save Preferences</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
