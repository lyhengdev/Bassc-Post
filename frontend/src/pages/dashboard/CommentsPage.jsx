import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageCircle, CheckCircle, XCircle, AlertTriangle, Trash2, Eye, Filter, Search, RefreshCw } from 'lucide-react';
import { useAllComments, useModerateComment, useDeleteComment } from '../../hooks/useApi';
import { Button, Avatar, Badge, ContentLoader, Modal, Textarea, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import { formatRelativeTime, cn } from '../../utils';

const statusConfig = {
  pending: { label: 'Pending', color: 'badge-warning', icon: AlertTriangle },
  approved: { label: 'Approved', color: 'badge-success', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'badge-danger', icon: XCircle },
  spam: { label: 'Spam', color: 'badge-neutral', icon: AlertTriangle },
};

export function CommentsPage() {
  const [filter, setFilter] = useState({ status: '', page: 1 });
  const [selectedComment, setSelectedComment] = useState(null);
  const [moderationNote, setModerationNote] = useState('');
  const [selectedComments, setSelectedComments] = useState([]);
  const [deleteModal, setDeleteModal] = useState(null);

  const { data, isLoading, refetch } = useAllComments(filter);
  const { mutate: moderate, isPending: isModerating } = useModerateComment();
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment();

  const comments = data?.data?.comments || [];
  const counts = data?.data?.counts || { pending: 0, approved: 0, rejected: 0, spam: 0 };
  const pagination = data?.data?.pagination || { page: 1, pages: 1, total: 0 };

  const handleModerate = (status) => {
    if (!selectedComment) return;
    moderate(
      { id: selectedComment._id, status, note: moderationNote },
      {
        onSuccess: () => {
          setSelectedComment(null);
          setModerationNote('');
        },
      }
    );
  };

  const handleBulkModerate = (status) => {
    if (selectedComments.length === 0) return;
    // Call bulk moderate for each selected (or implement bulk endpoint call)
    selectedComments.forEach((id) => {
      moderate({ id, status });
    });
    setSelectedComments([]);
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteComment(deleteModal, {
        onSuccess: () => setDeleteModal(null)
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedComments((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedComments.length === comments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(comments.map((c) => c._id));
    }
  };

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet>
        <title>Comments - Dashboard</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Comments</h1>
        <p className="text-dark-500">Moderate and manage user comments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={key}
              onClick={() => setFilter({ ...filter, status: filter.status === key ? '' : key, page: 1 })}
              className={cn(
                'card p-4 text-left transition-all',
                filter.status === key && 'ring-2 ring-primary-500'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={cn('w-5 h-5', 
                  key === 'pending' && 'text-amber-500',
                  key === 'approved' && 'text-emerald-500',
                  key === 'rejected' && 'text-red-500',
                  key === 'spam' && 'text-dark-400'
                )} />
                <span className="text-2xl font-bold text-dark-900 dark:text-white">
                  {counts[key] || 0}
                </span>
              </div>
              <p className="text-sm text-dark-500">{config.label}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {selectedComments.length > 0 && (
              <>
                <span className="text-sm text-dark-500">{selectedComments.length} selected</span>
                <Button size="sm" variant="outline" onClick={() => handleBulkModerate('approved')}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkModerate('rejected')}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkModerate('spam')}>
                  <AlertTriangle className="w-4 h-4 mr-1" /> Spam
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No comments found"
          description={filter.status ? `No ${filter.status} comments` : 'No comments yet'}
        />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const config = statusConfig[comment.status];
            const authorName = comment.author
              ? `${comment.author.firstName} ${comment.author.lastName}`
              : comment.guestName || 'Anonymous';

            return (
              <div
                key={comment._id}
                className={cn(
                  'card p-4 transition-all',
                  selectedComments.includes(comment._id) && 'ring-2 ring-primary-500'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedComments.includes(comment._id)}
                    onChange={() => toggleSelect(comment._id)}
                    className="mt-1 w-4 h-4 text-primary-600 rounded"
                  />

                  {/* Avatar */}
                  <Avatar src={comment.author?.avatar} name={authorName} size="sm" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-dark-900 dark:text-white text-sm">
                        {authorName}
                      </span>
                      {comment.guestEmail && (
                        <span className="text-xs text-dark-400">({comment.guestEmail})</span>
                      )}
                      <span className="text-xs text-dark-400">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                      <Badge className={config.color}>{config.label}</Badge>
                    </div>

                    {/* News link */}
                    {comment.article && (
                      <p className="text-xs text-dark-500 mb-2">
                        on <span className="font-medium">{comment.article.title}</span>
                      </p>
                    )}

                    {/* Comment content */}
                    <p className="text-dark-700 dark:text-dark-300 text-sm">
                      {comment.content}
                    </p>

                    {/* Moderation info */}
                    {comment.moderatedBy && (
                      <p className="text-xs text-dark-400 mt-2">
                        Moderated by {comment.moderatedBy.firstName} {comment.moderatedBy.lastName}
                        {comment.moderationNote && ` - "${comment.moderationNote}"`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedComment(comment)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setDeleteModal(comment._id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Moderation Modal */}
      <Modal
        isOpen={!!selectedComment}
        onClose={() => setSelectedComment(null)}
        title="Moderate Comment"
        size="lg"
      >
        {selectedComment && (
          <div>
            <div className="mb-4 p-4 bg-dark-50 dark:bg-dark-800 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Avatar
                  src={selectedComment.author?.avatar}
                  name={selectedComment.author?.firstName || selectedComment.guestName}
                  size="sm"
                />
                <div>
                  <p className="font-medium text-dark-900 dark:text-white text-sm">
                    {selectedComment.author
                      ? `${selectedComment.author.firstName} ${selectedComment.author.lastName}`
                      : selectedComment.guestName || 'Anonymous'}
                  </p>
                  <p className="text-xs text-dark-400">
                    {formatRelativeTime(selectedComment.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-dark-700 dark:text-dark-300">{selectedComment.content}</p>
            </div>

            <Textarea
              label="Moderation Note (optional)"
              value={moderationNote}
              onChange={(e) => setModerationNote(e.target.value)}
              placeholder="Add a note about this moderation action..."
              className="mb-4"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleModerate('approved')}
                disabled={isModerating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button
                onClick={() => handleModerate('rejected')}
                disabled={isModerating}
                variant="danger"
              >
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button
                onClick={() => handleModerate('spam')}
                disabled={isModerating}
                variant="secondary"
              >
                <AlertTriangle className="w-4 h-4 mr-1" /> Mark as Spam
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}

export default CommentsPage;
