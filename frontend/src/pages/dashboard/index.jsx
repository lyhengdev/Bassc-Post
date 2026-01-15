import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BarChart3, FileText, Eye, Clock, CheckCircle, PenTool, TrendingUp, Plus, Edit, Trash2, Camera, AlertCircle, XCircle, ExternalLink } from 'lucide-react';
import { useDashboardSummary, useMyArticles, useAdminArticles, usePendingArticles, useDeleteArticle, useApproveArticle, useRejectArticle, useUpdateProfile } from '../../hooks/useApi';
import { usersAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Button, ContentLoader, StatusBadge, Avatar, Modal, Input, Textarea, EmptyState, ConfirmModal, AlertModal } from '../../components/common/index.jsx';
import { formatNumber, formatRelativeTime } from '../../utils';
import toast from 'react-hot-toast';

export function DashboardHome() {
  const { user } = useAuthStore();
  const { data, isLoading } = useDashboardSummary();

  if (isLoading) return <ContentLoader />;

  const stats = data?.stats || {};
  const role = user?.role;

  let statCards = [];
  if (role === 'admin') {
    statCards = [
      { label: 'Total Articles', value: stats.totalArticles || 0, icon: FileText, bgColor: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600' },
      { label: 'Published', value: stats.publishedArticles || 0, icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
      { label: 'Pending', value: stats.pendingArticles || 0, icon: Clock, bgColor: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
      { label: 'Total Views', value: stats.totalViews || 0, icon: Eye, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
    ];
  } else if (role === 'editor') {
    statCards = [
      { label: 'Pending Review', value: stats.pendingArticles || 0, icon: Clock, bgColor: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
      { label: 'Reviewed Today', value: stats.reviewedToday || 0, icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
    ];
  } else {
    statCards = [
      { label: 'My Articles', value: stats.totalArticles || 0, icon: FileText, bgColor: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600' },
      { label: 'Published', value: stats.publishedArticles || 0, icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
      { label: 'Drafts', value: stats.draftArticles || 0, icon: PenTool, bgColor: 'bg-dark-100 dark:bg-dark-800', iconColor: 'text-dark-600' },
      { label: 'Total Views', value: stats.totalViews || 0, icon: Eye, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
    ];
  }

  return (
    <>
      <Helmet><title>Dashboard - Bassac Media Center</title></Helmet>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Welcome back, {user?.firstName}!</h1>
        <p className="text-dark-500">Here's what's happening today</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{formatNumber(stat.value)}</p>
            <p className="text-sm text-dark-500">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Recent Articles</h2>
          {data?.recentArticles?.length > 0 ? (
            <div className="space-y-3">
              {data.recentArticles.map((article) => (
                <div key={article._id} className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-800 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-dark-900 dark:text-white truncate">{article.title}</p>
                    <p className="text-sm text-dark-500">{formatRelativeTime(article.createdAt)}</p>
                  </div>
                  <StatusBadge status={article.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-4">No recent articles</p>
          )}
        </div>
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/dashboard/articles/new" className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Write New Article</span>
            </Link>
            <Link to="/dashboard/articles" className="flex items-center gap-3 p-3 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors">
              <FileText className="w-5 h-5" />
              <span className="font-medium">View My Articles</span>
            </Link>
            {(role === 'editor' || role === 'admin') && (
              <Link to="/dashboard/pending" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Review Pending Articles</span>
              </Link>
            )}
            {role === 'admin' && (
              <Link to="/dashboard/ads" className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors">
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Ad Insights</span>
              </Link>
            )}
            {role === 'admin' && (
              <Link to="/dashboard/articles" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                <BarChart3 className="w-5 h-5" />
                <span className="font-medium">Article Insights</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function MyArticlesPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({
    page,
    limit: 10,
    status: statusFilter || undefined,
    q: search || undefined,
  }), [page, statusFilter, search]);
  const isAdmin = user?.role === 'admin';
  const adminQuery = useAdminArticles(params, { enabled: isAdmin });
  const myQuery = useMyArticles(params, { enabled: !isAdmin });
  const data = isAdmin ? adminQuery.data : myQuery.data;
  const isLoading = isAdmin ? adminQuery.isLoading : myQuery.isLoading;
  const { mutate: deleteArticle, isPending: isDeleting } = useDeleteArticle();
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState(null);

  const handleDelete = () => {
    if (deleteModal) {
      deleteArticle(deleteModal, {
        onSuccess: () => setDeleteModal(null)
      });
    }
  };

  if (isLoading) return <ContentLoader />;
  const articles = data?.data || [];
  const pagination = data?.pagination;

  return (
    <>
      <Helmet><title>{isAdmin ? 'All Articles' : 'My Articles'} - Bassac Media Center</title></Helmet>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">{isAdmin ? 'All Articles' : 'My Articles'}</h1>
          <p className="text-dark-500 text-sm">
            {isAdmin ? 'Review and manage every article across the newsroom.' : 'Drafts, submissions, and published stories in one place.'}
          </p>
        </div>
        <Link to="/dashboard/articles/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Article</Button>
        </Link>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title..."
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {articles.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50 dark:bg-dark-800">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Title</th>
                    {isAdmin && <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Author</th>}
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Views</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Date</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {articles.map((article) => (
                    <tr key={article._id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link to={`/article/${article.slug}`} className="block w-12 h-12 flex-shrink-0">
                            <img
                              src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/120/120`}
                              alt={article.title}
                              className="w-12 h-12 rounded-lg object-cover"
                              loading="lazy"
                            />
                          </Link>
                          <Link
                            to={`/article/${article.slug}`}
                            className="font-medium text-dark-900 dark:text-white truncate max-w-xs block hover:text-primary-600 transition-colors"
                          >
                            {article.title}
                          </Link>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-sm text-dark-500">
                          {article.author?.fullName || `${article.author?.firstName || ''} ${article.author?.lastName || ''}`.trim() || 'Unknown'}
                        </td>
                      )}
                      <td className="px-6 py-4"><StatusBadge status={article.status} /></td>
                      <td className="px-6 py-4 text-dark-500">{article.viewCount || 0}</td>
                      <td className="px-6 py-4 text-dark-500">{formatRelativeTime(article.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/article/${article.slug}`}
                            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                            title="View article"
                          >
                            <ExternalLink className="w-4 h-4 text-dark-500" />
                          </Link>
                          <Link
                            to={`/dashboard/articles/${article._id}/insights`}
                            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                            title="Insights"
                          >
                            <BarChart3 className="w-4 h-4 text-dark-500" />
                          </Link>
                          <button onClick={() => navigate(`/dashboard/articles/${article._id}/edit`)} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"><Edit className="w-4 h-4 text-dark-500" /></button>
                          <button onClick={() => setDeleteModal(article._id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {articles.map((article) => (
              <div key={article._id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Link to={`/article/${article.slug}`} className="flex items-start gap-3 flex-1">
                    <img
                      src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/120/120`}
                      alt={article.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                    <span className="font-medium text-dark-900 dark:text-white line-clamp-2 hover:text-primary-600 transition-colors">
                      {article.title}
                    </span>
                  </Link>
                  <StatusBadge status={article.status} />
                </div>
                {isAdmin && (
                  <p className="text-xs text-dark-500 mb-2">
                    {article.author?.fullName || `${article.author?.firstName || ''} ${article.author?.lastName || ''}`.trim() || 'Unknown'}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-dark-500">
                  <div className="flex items-center gap-4">
                    <span>{article.viewCount || 0} views</span>
                    <span>{formatRelativeTime(article.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/article/${article.slug}`}
                      className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      title="View article"
                    >
                      <ExternalLink className="w-4 h-4 text-dark-500" />
                    </Link>
                    <Link
                      to={`/dashboard/articles/${article._id}/insights`}
                      className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      title="Insights"
                    >
                      <BarChart3 className="w-4 h-4 text-dark-500" />
                    </Link>
                    <button onClick={() => navigate(`/dashboard/articles/${article._id}/edit`)} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"><Edit className="w-4 h-4 text-dark-500" /></button>
                    <button onClick={() => setDeleteModal(article._id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm">
              <span className="text-dark-500">
                Page {pagination.page} of {pagination.totalPages} • {pagination.total} articles
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={FileText}
          title={isAdmin ? 'No articles found' : 'No articles yet'}
          description={isAdmin ? 'Try adjusting your filters or create the first article.' : 'Start writing your first article.'}
          action={<Link to="/dashboard/articles/new"><Button leftIcon={<Plus className="w-4 h-4" />}>New Article</Button></Link>}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}

export function PendingArticlesPage() {
  const { data, isLoading } = usePendingArticles();
  const { mutate: approveArticle, isPending: isApproving } = useApproveArticle();
  const { mutate: rejectArticle, isPending: isRejecting } = useRejectArticle();
  const [rejectModal, setRejectModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  const handleApprove = () => {
    if (approveModal) {
      approveArticle({ id: approveModal, notes: '' }, {
        onSuccess: () => setApproveModal(null)
      });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setAlertModal({ isOpen: true, message: 'Please provide a reason for rejection' });
      return;
    }
    rejectArticle({ id: rejectModal, reason: rejectReason }, {
      onSuccess: () => {
        setRejectModal(null);
        setRejectReason('');
      }
    });
  };

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet><title>Pending Articles - Bassac Media Center</title></Helmet>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Pending Review</h1>
        <p className="text-dark-500">Articles awaiting your approval</p>
      </div>
      {data?.data?.length > 0 ? (
        <div className="space-y-4">
              {data.data.map((article) => (
                <div key={article._id} className="card p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0 flex gap-4">
                      <Link to={`/article/${article.slug}`} className="block w-16 h-16 flex-shrink-0">
                        <img
                          src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/160/160`}
                          alt={article.title}
                          className="w-16 h-16 rounded-lg object-cover"
                          loading="lazy"
                        />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to={`/article/${article.slug}`}
                          className="font-semibold text-dark-900 dark:text-white mb-1 truncate block hover:text-primary-600 transition-colors"
                        >
                          {article.title}
                        </Link>
                        <p className="text-dark-500 text-sm mb-2">
                          By {article.author?.fullName || 'Unknown'} • {formatRelativeTime(article.createdAt)}
                        </p>
                        <p className="text-dark-600 dark:text-dark-400 line-clamp-2">{article.excerpt}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link to={`/article/${article.slug}`}>
                        <Button variant="secondary" size="sm">View</Button>
                      </Link>
                      <Button variant="secondary" size="sm" onClick={() => setApproveModal(article._id)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={() => setRejectModal(article._id)}>Reject</Button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      ) : (
        <EmptyState icon={CheckCircle} title="All caught up!" description="No articles pending review" />
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={!!approveModal}
        onClose={() => setApproveModal(null)}
        onConfirm={handleApprove}
        title="Approve Article"
        message="Are you sure you want to approve this article for publication?"
        confirmText="Approve"
        variant="primary"
        isLoading={isApproving}
        icon={CheckCircle}
      />

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject Article">
        <Textarea label="Rejection Reason" placeholder="Enter reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="mb-4" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} isLoading={isRejecting}>Reject Article</Button>
        </div>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        title="Validation Error"
        message={alertModal.message}
        variant="warning"
        icon={AlertCircle}
      />
    </>
  );
}

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const response = await usersAPI.uploadAvatar(formData);
      const avatar = response?.data?.data?.avatar;
      if (avatar) {
        setUser({ ...user, avatar });
        setAvatarFile(null);
        setAvatarPreview(null);
        toast.success('Profile picture updated!');
      } else {
        toast.error('Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(form);
  };

  return (
    <>
      <Helmet><title>Profile - Bassac Media Center</title></Helmet>
      <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-6">Profile</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          {/* Avatar with upload */}
          <div className="relative inline-block mb-4">
            <Avatar 
              src={avatarPreview || user?.avatar} 
              name={user?.fullName} 
              size="xl" 
              className="mx-auto"
            />
            <label 
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full cursor-pointer transition-colors shadow-lg"
            >
              <Camera className="w-4 h-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          
          {/* Upload Button */}
          {avatarFile && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-dark-500 truncate">{avatarFile.name}</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  size="sm" 
                  onClick={handleAvatarUpload} 
                  isLoading={isUploadingAvatar}
                >
                  Upload
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          <h2 className="text-xl font-semibold text-dark-900 dark:text-white">{user?.fullName}</h2>
          <p className="text-dark-500">{user?.email}</p>
          <p className="text-sm text-primary-600 capitalize mt-1">{user?.role}</p>
        </div>
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Edit Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Textarea label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
            <Button type="submit" isLoading={isPending}>Save Changes</Button>
          </form>
        </div>
      </div>
    </>
  );
}

export { ArticleEditorPage } from './ArticleEditorPage';
export { CategoriesPage } from './CategoriesPage';
export { UsersPage } from './UsersPage';
export { MediaPage } from './MediaPage';
export { MessagesPage } from './MessagesPage';
export { AnalyticsPage } from './AnalyticsPage';
export { AIAssistantPage } from './AIAssistantPage';
export { SiteSettingsPage } from './SiteSettingsPage';
export { HomepageBuilderPage } from './HomepageBuilderPage';
export { PagesListPage, PageEditorPage } from './PagesPage';
export { CommentsPage } from './CommentsPage';
export { NewsletterPage } from './NewsletterPage';
export { NotificationsPage } from './NotificationsPage';
export { AdsControlPage } from './AdsControlPage';
export { AdInsightsPage } from './AdInsightsPage';
export { ArticleInsightsPage } from './ArticleInsightsPage';
