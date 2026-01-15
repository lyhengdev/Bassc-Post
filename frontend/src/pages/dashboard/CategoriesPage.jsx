import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, Folder } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useApi';
import { Button, Input, Modal, ContentLoader, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import { getCategoryAccent } from '../../utils';
import toast from 'react-hot-toast';

export function CategoriesPage() {
  const { data, isLoading } = useCategories();
  const { mutate: createCategory, isPending: isCreating } = useCreateCategory();
  const { mutate: updateCategory, isPending: isUpdating } = useUpdateCategory();
  const { mutate: deleteCategory, isPending: isDeleting } = useDeleteCategory();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    color: '#3B82F6'
  });

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        image: category.image || '',
        color: category.color || '#3B82F6'
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', image: '', color: '#3B82F6' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', image: '', color: '#3B82F6' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (editingCategory) {
      updateCategory(
        { id: editingCategory._id, data: formData },
        {
          onSuccess: () => {
            handleCloseModal();
            toast.success('Category updated successfully');
          }
        }
      );
    } else {
      createCategory(formData, {
        onSuccess: () => {
          handleCloseModal();
          toast.success('Category created successfully');
        }
      });
    }
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteCategory(deleteModal._id, {
        onSuccess: () => {
          setDeleteModal(null);
          toast.success('Category deleted successfully');
        }
      });
    }
  };

  if (isLoading) return <ContentLoader />;

  const categories = data || [];

  return (
    <>
      <Helmet><title>Categories - Bassac Media Center</title></Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Categories</h1>
          <p className="text-dark-500">Manage article categories</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
          New Category
        </Button>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category._id} className="card overflow-hidden">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: category.color || getCategoryAccent(category.name) }}
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-dark-900 dark:text-white">
                      {category.name}
                    </h3>
                    <p className="text-sm text-dark-500">
                      {category.articleCount || 0} articles
                    </p>
                  </div>
                </div>
                {category.description && (
                  <p className="text-dark-600 dark:text-dark-400 text-sm mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="flex gap-2 pt-4 border-t border-dark-100 dark:border-dark-800">
                  <button
                    onClick={() => handleOpenModal(category)}
                    className="flex-1 btn btn-sm btn-secondary"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteModal(category)}
                    className="flex-1 btn btn-sm btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Folder}
          title="No categories yet"
          description="Create your first category to organize articles"
          action={
            <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
              Create Category
            </Button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            placeholder="e.g., Technology, Sports, Politics"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Brief description of this category..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Category Image URL (Optional)</label>
            <Input
              type="text"
              placeholder="https://... or /uploads/..."
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-10 rounded-lg cursor-pointer"
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteModal?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}
