import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  FileText, Plus, Edit, Trash2, Copy, Eye, EyeOff, 
  MoreVertical, Search, Filter, ArrowLeft, Save,
  Globe, Lock, Layout, AlertCircle
} from 'lucide-react';
import { usePages, useDeletePage, useDuplicatePage, usePageById, useCreatePage, useUpdatePage } from '../../hooks/useApi';
import { Button, Input, Textarea, ContentLoader, Modal, StatusBadge, EmptyState, ConfirmModal, AlertModal } from '../../components/common/index.jsx';
import EditorComponent from '../../components/common/EditorJS';
import { formatRelativeTime } from '../../utils';
import { useRef, useEffect } from 'react';

// Helper function to generate URL-friendly slug
const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Pages List Component
export function PagesListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const navigate = useNavigate();
  
  const { data, isLoading } = usePages({ search, status: statusFilter || undefined });
  const { mutate: deletePage, isPending: isDeleting } = useDeletePage();
  const { mutate: duplicatePage } = useDuplicatePage();

  const handleDelete = () => {
    if (deleteModal) {
      deletePage(deleteModal, {
        onSuccess: () => setDeleteModal(null)
      });
    }
  };

  const handleDuplicate = (id) => {
    duplicatePage(id);
  };

  if (isLoading) return <ContentLoader />;

  const pages = data?.data?.pages || [];

  return (
    <>
      <Helmet><title>Pages - Bassac Media Center</title></Helmet>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Pages</h1>
          <p className="text-dark-500">Manage your website pages</p>
        </div>
        <Link to="/dashboard/pages/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Page</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {/* Pages List */}
      {pages.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No pages yet"
          description="Create your first page to get started"
          action={
            <Link to="/dashboard/pages/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>Create Page</Button>
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-50 dark:bg-dark-800">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Title</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Template</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Last Updated</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {pages.map((page) => (
                  <tr key={page._id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                          <FileText className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-dark-900 dark:text-white">{page.title}</p>
                          <p className="text-sm text-dark-500">/page/{page.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        page.status === 'published' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : page.status === 'private'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-400'
                      }`}>
                        {page.status === 'published' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {page.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-dark-500 capitalize">{page.template}</td>
                    <td className="px-6 py-4 text-dark-500">{formatRelativeTime(page.updatedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {page.status === 'published' && (
                          <a 
                            href={`/page/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                            title="View page"
                          >
                            <Eye className="w-4 h-4 text-dark-500" />
                          </a>
                        )}
                        <button 
                          onClick={() => navigate(`/dashboard/pages/${page._id}/edit`)}
                          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                          title="Edit page"
                        >
                          <Edit className="w-4 h-4 text-dark-500" />
                        </button>
                        <button 
                          onClick={() => handleDuplicate(page._id)}
                          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                          title="Duplicate page"
                        >
                          <Copy className="w-4 h-4 text-dark-500" />
                        </button>
                        <button 
                          onClick={() => setDeleteModal(page._id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          title="Delete page"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-dark-100 dark:divide-dark-800">
            {pages.map((page) => (
              <div key={page._id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <FileText className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">{page.title}</p>
                      <p className="text-sm text-dark-500">/page/{page.slug}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    page.status === 'published' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : page.status === 'private'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-400'
                  }`}>
                    {page.status === 'published' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {page.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-dark-500">
                    <span className="capitalize">{page.template}</span> • {formatRelativeTime(page.updatedAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    {page.status === 'published' && (
                      <a 
                        href={`/page/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-dark-500" />
                      </a>
                    )}
                    <button 
                      onClick={() => navigate(`/dashboard/pages/${page._id}/edit`)}
                      className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-dark-500" />
                    </button>
                    <button 
                      onClick={() => handleDuplicate(page._id)}
                      className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg"
                    >
                      <Copy className="w-4 h-4 text-dark-500" />
                    </button>
                    <button 
                      onClick={() => setDeleteModal(page._id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Page"
        message="Are you sure you want to delete this page? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}

// Page Editor Component
export function PageEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  
  const { data: page, isLoading: isLoadingPage } = usePageById(id);
  const { mutate: createPage, isPending: isCreating } = useCreatePage();
  const { mutate: updatePage, isPending: isUpdating } = useUpdatePage();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: { blocks: [] },
    template: 'default',
    status: 'draft',
    featuredImage: '',
    metaTitle: '',
    metaDescription: '',
    showInMenu: false,
    menuOrder: 0,
  });

  useEffect(() => {
    if (page) {
      setForm({
        title: page.title || '',
        slug: page.slug || '',
        excerpt: page.excerpt || '',
        content: page.content || { blocks: [] },
        template: page.template || 'default',
        status: page.status || 'draft',
        featuredImage: page.featuredImage || '',
        metaTitle: page.metaTitle || '',
        metaDescription: page.metaDescription || '',
        showInMenu: page.showInMenu || false,
        menuOrder: page.menuOrder || 0,
      });
    }
  }, [page]);

  const handleContentChange = (content) => {
    setForm(prev => ({ ...prev, content }));
  };

  const handleSubmit = async (status) => {
    if (!form.title.trim()) {
      setAlertModal({ isOpen: true, message: 'Please enter a page title' });
      return;
    }

    let content = form.content;
    if (editorRef.current) {
      content = await editorRef.current.save();
    }

    const data = {
      ...form,
      content,
      status: status || form.status,
    };

    if (id) {
      updatePage({ id, data }, {
        onSuccess: () => navigate('/dashboard/pages'),
      });
    } else {
      createPage(data, {
        onSuccess: () => navigate('/dashboard/pages'),
      });
    }
  };

  if (id && isLoadingPage) return <ContentLoader />;

  const isSaving = isCreating || isUpdating;

  return (
    <>
      <Helmet><title>{id ? 'Edit Page' : 'New Page'} - Bassac Media Center</title></Helmet>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard/pages')} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
              {id ? 'Edit Page' : 'Create New Page'}
            </h1>
            <p className="text-dark-500">Use the editor to create your page content</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => handleSubmit('draft')} isLoading={isSaving}>
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit('published')} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            {id ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <Input
              label="Page Title"
              value={form.title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setForm({ 
                  ...form, 
                  title: newTitle,
                  // Auto-generate slug only if slug is empty or matches previous auto-generated slug
                  slug: (!form.slug || form.slug === generateSlug(form.title)) 
                    ? generateSlug(newTitle) 
                    : form.slug
                });
              }}
              placeholder="Enter page title"
              className="text-xl font-bold"
            />
            <div className="mt-4">
              <Input
                label="Slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })}
                placeholder="page-url-slug"
              />
              <p className="text-xs text-dark-500 mt-1">URL: /page/{form.slug || 'your-page-slug'}</p>
            </div>
          </div>

          <div className="card p-6">
            <label className="label mb-4">Page Content</label>
            <div className="border border-dark-200 dark:border-dark-700 rounded-lg min-h-[400px]">
              <EditorComponent
                ref={editorRef}
                data={form.content}
                onChange={handleContentChange}
                placeholder="Start writing your page content..."
              />
            </div>
          </div>

          {/* SEO */}
          <div className="card p-6">
            <h3 className="font-semibold text-dark-900 dark:text-white mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <Input
                label="Meta Title"
                value={form.metaTitle}
                onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                placeholder="SEO title (max 70 characters)"
                maxLength={70}
              />
              <Textarea
                label="Meta Description"
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                placeholder="SEO description (max 160 characters)"
                maxLength={160}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="card p-6">
            <h3 className="font-semibold text-dark-900 dark:text-white mb-4">Page Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="label">Template</label>
                <select
                  value={form.template}
                  onChange={(e) => setForm({ ...form, template: e.target.value })}
                  className="input"
                >
                  <option value="default">Default</option>
                  <option value="full-width">Full Width</option>
                  <option value="sidebar-left">Sidebar Left</option>
                  <option value="sidebar-right">Sidebar Right</option>
                  <option value="landing">Landing Page</option>
                  <option value="blank">Blank</option>
                </select>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="card p-6">
            <label className="label">Featured Image</label>
            {form.featuredImage ? (
              <div className="relative group">
                <img src={form.featuredImage} alt="Featured" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => setForm({ ...form, featuredImage: '' })}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Input
                placeholder="Enter image URL"
                value={form.featuredImage}
                onChange={(e) => setForm({ ...form, featuredImage: e.target.value })}
              />
            )}
          </div>

          {/* Menu Settings */}
          <div className="card p-6">
            <h3 className="font-semibold text-dark-900 dark:text-white mb-4">Menu Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showInMenu}
                  onChange={(e) => setForm({ ...form, showInMenu: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-dark-700 dark:text-dark-300">Show in navigation menu</span>
              </label>
              {form.showInMenu && (
                <Input
                  type="number"
                  label="Menu Order"
                  value={form.menuOrder}
                  onChange={(e) => setForm({ ...form, menuOrder: parseInt(e.target.value) })}
                  min={0}
                />
              )}
            </div>
          </div>
        </div>
      </div>

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
