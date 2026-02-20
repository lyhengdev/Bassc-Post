import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, Users, UserCheck, UserX, Clock, Trash2, Download, RefreshCw, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Button, Badge, ContentLoader, Modal, Input, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import { formatDate, cn } from '../../utils';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: { label: 'Pending', color: 'badge-warning' },
  confirmed: { label: 'Confirmed', color: 'badge-success' },
  unsubscribed: { label: 'Unsubscribed', color: 'badge-neutral' },
};

export function NewsletterPage() {
  const [filter, setFilter] = useState({ status: '', search: '', page: 1 });
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch subscribers
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['newsletter', filter],
    queryFn: async () => {
      const response = await api.get('/newsletter', { params: filter });
      return response.data;
    },
  });

  // Delete mutation
  const { mutate: deleteSubscriber, isPending: isDeleting } = useMutation({
    mutationFn: (id) => api.delete(`/newsletter/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletter'] });
      toast.success('Subscriber deleted');
      setSelectedSubscriber(null);
      setDeleteModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete');
    },
  });

  const subscribers = data?.data?.subscribers || [];
  const stats = data?.data?.stats || { total: 0, pending: 0, confirmed: 0, unsubscribed: 0 };
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const handleExport = async () => {
    try {
      const response = await api.get('/newsletter/export', {
        params: { status: filter.status },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'newsletter-subscribers.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const handleDelete = () => {
    if (selectedSubscriber) {
      deleteSubscriber(selectedSubscriber._id);
    }
  };

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet>
        <title>Newsletter - Dashboard</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Newsletter Subscribers</h1>
        <p className="text-dark-500">Manage your newsletter subscribers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-primary-500" />
            <span className="text-2xl font-bold text-dark-900 dark:text-white">{stats.total}</span>
          </div>
          <p className="text-sm text-dark-500">Total Subscribers</p>
        </div>
        <button
          onClick={() => setFilter({ ...filter, status: filter.status === 'confirmed' ? '' : 'confirmed', page: 1 })}
          className={cn('card p-4 text-left transition-all', filter.status === 'confirmed' && 'ring-2 ring-primary-500')}
        >
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            <span className="text-2xl font-bold text-dark-900 dark:text-white">{stats.confirmed}</span>
          </div>
          <p className="text-sm text-dark-500">Confirmed</p>
        </button>
        <button
          onClick={() => setFilter({ ...filter, status: filter.status === 'pending' ? '' : 'pending', page: 1 })}
          className={cn('card p-4 text-left transition-all', filter.status === 'pending' && 'ring-2 ring-primary-500')}
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-2xl font-bold text-dark-900 dark:text-white">{stats.pending}</span>
          </div>
          <p className="text-sm text-dark-500">Pending</p>
        </button>
        <button
          onClick={() => setFilter({ ...filter, status: filter.status === 'unsubscribed' ? '' : 'unsubscribed', page: 1 })}
          className={cn('card p-4 text-left transition-all', filter.status === 'unsubscribed' && 'ring-2 ring-primary-500')}
        >
          <div className="flex items-center justify-between mb-2">
            <UserX className="w-5 h-5 text-dark-400" />
            <span className="text-2xl font-bold text-dark-900 dark:text-white">{stats.unsubscribed}</span>
          </div>
          <p className="text-sm text-dark-500">Unsubscribed</p>
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value, page: 1 })}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Subscribers List */}
      {subscribers.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No subscribers found"
          description={filter.search || filter.status ? 'Try adjusting your filters' : 'No one has subscribed yet'}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="text-left py-3 px-4 font-medium text-dark-500 text-sm">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-dark-500 text-sm">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-dark-500 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-dark-500 text-sm">Source</th>
                  <th className="text-left py-3 px-4 font-medium text-dark-500 text-sm">Subscribed</th>
                  <th className="text-right py-3 px-4 font-medium text-dark-500 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => {
                  const config = statusConfig[subscriber.status];
                  return (
                    <tr
                      key={subscriber._id}
                      className="border-b border-dark-100 dark:border-dark-800 hover:bg-dark-50 dark:hover:bg-dark-800/50"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-dark-900 dark:text-white">
                          {subscriber.email}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-dark-600 dark:text-dark-400">
                        {subscriber.name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={config.color}>{config.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-dark-500 text-sm capitalize">
                        {subscriber.source || 'website'}
                      </td>
                      <td className="py-3 px-4 text-dark-500 text-sm">
                        {formatDate(subscriber.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setSelectedSubscriber(subscriber)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-dark-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.pages}
            onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!selectedSubscriber}
        onClose={() => setSelectedSubscriber(null)}
        title="Delete Subscriber"
      >
        {selectedSubscriber && (
          <div>
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              Are you sure you want to delete <strong>{selectedSubscriber.email}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedSubscriber(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default NewsletterPage;
