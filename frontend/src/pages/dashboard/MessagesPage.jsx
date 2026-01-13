import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, Reply, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useContactMessages, useReplyContact, useDeleteContact } from '../../hooks/useApi';
import { Button, Modal, Textarea, ContentLoader, EmptyState, Badge, ConfirmModal } from '../../components/common/index.jsx';
import { formatRelativeTime } from '../../utils';
import toast from 'react-hot-toast';

export function MessagesPage() {
  const { data, isLoading } = useContactMessages();
  const { mutate: replyMessage, isPending: isReplying } = useReplyContact();
  const { mutate: deleteMessage, isPending: isDeleting } = useDeleteContact();

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);

  const handleOpenReply = (message) => {
    setSelectedMessage(message);
    setReplyText('');
    setIsReplyModalOpen(true);
  };

  const handleCloseReply = () => {
    setIsReplyModalOpen(false);
    setSelectedMessage(null);
    setReplyText('');
  };

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast.error('Reply message cannot be empty');
      return;
    }

    replyMessage(
      { id: selectedMessage._id, message: replyText },
      {
        onSuccess: () => {
          handleCloseReply();
          toast.success('Reply sent successfully');
        }
      }
    );
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteMessage(deleteModal.id, {
        onSuccess: () => {
          setDeleteModal(null);
          toast.success('Message deleted');
          if (selectedMessage?._id === deleteModal.id) {
            setSelectedMessage(null);
          }
        }
      });
    }
  };

  if (isLoading) return <ContentLoader />;

  const messages = data?.data || [];

  return (
    <>
      <Helmet><title>Messages - Bassac Media Center</title></Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Contact Messages</h1>
        <p className="text-dark-500">Manage contact form submissions</p>
      </div>

      {messages.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1 space-y-3">
            {messages.map((message) => (
              <div
                key={message._id}
                onClick={() => setSelectedMessage(message)}
                className={`card p-4 cursor-pointer transition-all ${
                  selectedMessage?._id === message._id
                    ? 'ring-2 ring-primary-500'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Mail className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <p className="font-medium text-dark-900 dark:text-white truncate">
                      {message.name}
                    </p>
                  </div>
                  {message.replied ? (
                    <Badge variant="success" className="ml-2">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Replied
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="ml-2">
                      <Clock className="w-3 h-3 mr-1" />
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-dark-600 dark:text-dark-400 line-clamp-2 mb-2">
                  {message.message}
                </p>
                <p className="text-xs text-dark-500">
                  {formatRelativeTime(message.createdAt)}
                </p>
              </div>
            ))}
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            {selectedMessage ? (
              <div className="card p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-1">
                      {selectedMessage.name}
                    </h2>
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-primary-600 hover:underline"
                    >
                      {selectedMessage.email}
                    </a>
                    <p className="text-sm text-dark-500 mt-1">
                      {formatRelativeTime(selectedMessage.createdAt)}
                    </p>
                  </div>
                  {selectedMessage.replied ? (
                    <Badge variant="success">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Replied
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <Clock className="w-4 h-4 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>

                {selectedMessage.subject && (
                  <div className="mb-4">
                    <p className="text-sm text-dark-500 mb-1">Subject:</p>
                    <p className="font-medium text-dark-900 dark:text-white">
                      {selectedMessage.subject}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-sm text-dark-500 mb-2">Message:</p>
                  <div className="bg-dark-50 dark:bg-dark-800 rounded-lg p-4">
                    <p className="text-dark-700 dark:text-dark-300 whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>
                </div>

                {selectedMessage.reply && (
                  <div className="mb-6">
                    <p className="text-sm text-dark-500 mb-2">Your Reply:</p>
                    <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border-l-4 border-primary-500">
                      <p className="text-dark-700 dark:text-dark-300 whitespace-pre-wrap">
                        {selectedMessage.reply}
                      </p>
                      <p className="text-xs text-dark-500 mt-2">
                        Sent {formatRelativeTime(selectedMessage.repliedAt)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    leftIcon={<Reply className="w-4 h-4" />}
                    onClick={() => handleOpenReply(selectedMessage)}
                  >
                    {selectedMessage.replied ? 'Reply Again' : 'Send Reply'}
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => handleDelete(selectedMessage._id, selectedMessage.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="card p-12">
                <EmptyState
                  icon={Mail}
                  title="Select a message"
                  description="Choose a message from the list to view details"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Mail}
          title="No messages"
          description="Contact form submissions will appear here"
        />
      )}

      {/* Reply Modal */}
      {selectedMessage && (
        <Modal
          isOpen={isReplyModalOpen}
          onClose={handleCloseReply}
          title="Send Reply"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-dark-500 mb-1">To:</p>
              <p className="font-medium text-dark-900 dark:text-white">
                {selectedMessage.name} ({selectedMessage.email})
              </p>
            </div>

            <div>
              <p className="text-sm text-dark-500 mb-2">Original Message:</p>
              <div className="bg-dark-50 dark:bg-dark-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-dark-600 dark:text-dark-400">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            <Textarea
              label="Your Reply"
              placeholder="Type your reply here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[150px]"
              required
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleCloseReply}>
                Cancel
              </Button>
              <Button
                onClick={handleSendReply}
                isLoading={isReplying}
                leftIcon={<Reply className="w-4 h-4" />}
              >
                Send Reply
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Message"
        message={`Are you sure you want to delete the message from "${deleteModal?.name}"?`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}
