import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { UserPlus, Edit, Trash2, Users as UsersIcon, Mail, Shield } from 'lucide-react';
import { useUsers, useUpdateUser, useDeleteUser } from '../../hooks/useApi';
import { Button, Input, Modal, ContentLoader, EmptyState, Avatar, Badge, ConfirmModal } from '../../components/common/index.jsx';
import { formatRelativeTime } from '../../utils';
import toast from 'react-hot-toast';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useUsers({ page, limit });
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user'
  });

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ firstName: '', lastName: '', email: '', role: 'user' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      toast.error('All fields are required');
      return;
    }

    updateUser(
      { id: editingUser._id, data: formData },
      {
        onSuccess: () => {
          handleCloseModal();
          toast.success('User updated successfully');
        }
      }
    );
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteUser(deleteModal._id, {
        onSuccess: () => {
          setDeleteModal(null);
          toast.success('User deleted successfully');
        }
      });
    }
  };

  const getRoleBadge = (role) => {
    const config = {
      admin: { variant: 'danger', label: 'Admin' },
      editor: { variant: 'warning', label: 'Editor' },
      writer: { variant: 'primary', label: 'Writer' },
      user: { variant: 'neutral', label: 'User' }
    };
    return config[role] || config.user;
  };

  const users = data?.data || [];
  const pagination = data?.pagination || {};
  const total = pagination.total || users.length;
  const totalPages = pagination.totalPages || 1;
  const startIndex = total === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = total === 0 ? 0 : Math.min(page * limit, total);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages || 1);
  }, [page, totalPages]);

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet><title>Users - Bassac Media Center</title></Helmet>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Users</h1>
          <p className="text-dark-500">Manage user accounts and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-dark-500">Users per page</label>
          <input
            type="number"
            min={1}
            value={limit}
            onChange={(e) => {
              const next = Math.max(1, Number(e.target.value || 1));
              setLimit(next);
              setPage(1);
            }}
            className="w-24 px-3 py-2 text-sm bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {users.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead className="bg-dark-50 dark:bg-dark-800">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">User</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Role</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Joined</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {users.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  return (
                    <tr key={user._id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatar} name={user.fullName} size="sm" />
                          <div>
                            <p className="font-medium text-dark-900 dark:text-white">
                              {user.fullName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-dark-600 dark:text-dark-400">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-dark-500 text-sm">
                        {formatRelativeTime(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {user.isEmailVerified ? (
                          <span className="text-emerald-600 text-sm flex items-center gap-1">
                            <Shield className="w-4 h-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-amber-600 text-sm">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-dark-500" />
                          </button>
                          <button
                            onClick={() => setDeleteModal(user)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-dark-100 dark:border-dark-800">
            <p className="text-sm text-dark-500">
              Showing {startIndex}-{endIndex} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage || page === 1}
                className="px-3 py-2 text-sm rounded-lg border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-dark-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!pagination.hasNextPage || page === totalPages}
                className="px-3 py-2 text-sm rounded-lg border border-dark-200 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title="No users found"
          description="User management interface"
        />
      )}

      {/* Edit Modal */}
      {editingUser && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="Edit User"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="user">User</option>
                <option value="writer">Writer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isUpdating}>
                Update User
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteModal?.fullName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}
