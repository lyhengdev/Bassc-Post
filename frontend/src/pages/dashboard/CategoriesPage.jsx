import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Edit, Trash2, Folder } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useApi';
import { Button, Input, Modal, ContentLoader, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import { buildMediaUrl, getCategoryAccent } from '../../utils';
import toast from 'react-hot-toast';
import useLanguage from '../../hooks/useLanguage';

export function CategoriesPage() {
  const { translateText } = useLanguage();
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
      toast.error(translateText('Category name is required'));
      return;
    }

    if (editingCategory) {
      updateCategory(
        { id: editingCategory._id, data: formData },
        {
          onSuccess: () => {
            handleCloseModal();
            toast.success(translateText('Category updated successfully'));
          }
        }
      );
    } else {
      createCategory(formData, {
        onSuccess: () => {
          handleCloseModal();
          toast.success(translateText('Category created successfully'));
        }
      });
    }
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteCategory(deleteModal._id, {
        onSuccess: () => {
          setDeleteModal(null);
          toast.success(translateText('Category deleted successfully'));
        }
      });
    }
  };

  if (isLoading) return <ContentLoader />;

  const categories = data || [];

  return (
    <>
      <Helmet><title>{`${translateText('Categories')} - Bassac Post`}</title></Helmet>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-dark-400">{translateText('Structure')}</p>
          <h1 className="text-2xl sm:text-2xl font-bold text-dark-900 dark:text-white">{translateText('Categories')}</h1>
          <p className="text-dark-500 mt-1">{translateText('Organize your newsroom topics')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-dark-100 dark:bg-dark-800 px-3 py-1 text-xs text-dark-500">
            {categories.length} {translateText('total')}
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
            {translateText('New Category')}
          </Button>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {categories.map((category) => {
            const accent = category.color || getCategoryAccent(category.name);
            const rawImage = category.image || '';
            const imageUrl = buildMediaUrl(rawImage);
            return (
              <div key={category._id} className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {imageUrl ? (
                  <div className="relative aspect-[16/7] overflow-hidden">
                    <img
                      loading="lazy"
                      src={imageUrl}
                      alt={translateText(category.name)}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900/35 to-transparent" />
                  </div>
                ) : (
                  <div className="h-3 w-full" style={{ backgroundColor: accent }} />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                        <h3 className="font-semibold text-dark-900 dark:text-white">
                          {translateText(category.name)}
                        </h3>
                      </div>
                      <p className="text-xs text-dark-500 mt-1">
                        {category.articleCount || 0} {translateText('news')}
                      </p>
                    </div>
                    <div className="text-xs uppercase tracking-wider text-dark-400">
                      {category.isActive ? translateText('Active') : translateText('Hidden')}
                    </div>
                  </div>

                  {category.description && (
                    <p className="text-dark-600 dark:text-dark-400 text-sm mt-3 line-clamp-2">
                      {translateText(category.description)}
                    </p>
                  )}

                  <div className="flex gap-2 mt-4 pt-4 border-t border-dark-100 dark:border-dark-800">
                    <button
                      onClick={() => handleOpenModal(category)}
                      className="flex-1 btn btn-sm btn-secondary"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      {translateText('Edit')}
                    </button>
                    <button
                      onClick={() => setDeleteModal(category)}
                      className="flex-1 btn btn-sm btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {translateText('Delete')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Folder}
          title={translateText('No categories yet')}
          description={translateText('Create your first category to organize news')}
          action={
            <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
              {translateText('Create Category')}
            </Button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? translateText('Edit Category') : translateText('Create Category')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={translateText('Category Name')}
            placeholder={translateText('e.g., Technology, Sports, Politics')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div>
            <label className="label">{translateText('Description (Optional)')}</label>
            <textarea
              className="input min-h-[100px]"
              placeholder={translateText('Brief description of this category...')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="label">{translateText('Category Image URL (Optional)')}</label>
            <Input
              type="text"
              placeholder={translateText('https://... or /uploads/...')}
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          <div>
            <label className="label">{translateText('Color')}</label>
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
              {translateText('Cancel')}
            </Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              {editingCategory ? translateText('Update Category') : translateText('Create Category')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title={translateText('Delete Category')}
        message={
          deleteModal
            ? `${translateText('Are you sure you want to delete')} "${translateText(deleteModal.name)}"? ${translateText('This action cannot be undone.')}`
            : ''
        }
        confirmText={translateText('Delete')}
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}
