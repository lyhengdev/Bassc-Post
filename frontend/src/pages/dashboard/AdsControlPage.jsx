import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart3, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, ContentLoader, ConfirmModal, Input, Modal } from '../../components/common/index.jsx';
import {
  useAdminAds,
  useAllAdsStats,
  useCreateAd,
  useDeleteAd,
  useDuplicateAd,
  useUpdateAd,
} from '../../hooks/useAds';
import { useAdminArticles, useCategories } from '../../hooks/useApi';
import { uploadAPI } from '../../services/api';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

const defaultForm = {
  name: '',
  status: 'draft',
  type: 'image',
  placement: 'between_sections',
  placements: ['between_sections'],
  placementId: '',
  imageUrl: '',
  mobileImageUrl: '',
  imageUrls: [],
  linkUrl: '',
  linkTarget: '_blank',
  htmlContent: '',
  videoUrl: '',
  altText: '',
  title: '',
  description: '',
  ctaText: '',
  autoCloseSeconds: 0,
  slideIntervalMs: 3000,
  sectionIndex: 0,
  paragraphIndex: 3,
  priority: 0,
  weight: 100,
  startDate: '',
  endDate: '',
  pages: 'all',
  devices: {
    desktop: true,
    mobile: true,
    tablet: true,
  },
  categories: [],
  excludeCategories: [],
  articles: [],
  userStatus: {
    loggedIn: true,
    guest: true,
  },
};

const placements = [
  { value: 'after_hero', label: 'After Hero' },
  { value: 'between_sections', label: 'Between Sections' },
  { value: 'in_article', label: 'In Article' },
  { value: 'after_article', label: 'After Article' },
  { value: 'before_comments', label: 'Before Comments' },
  { value: 'in_category', label: 'In Category' },
  { value: 'in_search', label: 'In Search' },
  { value: 'floating_banner', label: 'Floating Banner' },
  { value: 'popup', label: 'Popup' },
  { value: 'custom', label: 'Custom' },
];
const customPlacementOptions = [
  { value: 'right_hero', label: 'Right Hero (homepage sidebar)' },
  { value: 'right_sidebar', label: 'Right Sidebar (articles/homepage)' },
  { value: 'homepage_custom', label: 'Homepage Custom Slot' },
  { value: 'article_custom', label: 'Article Custom Slot' },
];

const statusOptions = ['draft', 'active', 'paused', 'archived'];
const typeOptions = ['image', 'html', 'adsense', 'video'];
const pageOptions = ['all', 'homepage', 'articles', 'category', 'search', 'custom'];

function dateValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function AdsControlPage() {
  const [status, setStatus] = useState('');
  const [placement, setPlacement] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingMobileImage, setIsUploadingMobileImage] = useState(false);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [isMobileDragOver, setIsMobileDragOver] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const { data: adsResponse, isLoading } = useAdminAds({
    status: status || undefined,
    placement: placement || undefined,
    page,
  });
  const { data: categoriesData } = useCategories();
  const { data: adminArticlesResponse } = useAdminArticles(
    { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' },
    { enabled: isModalOpen && activeStep === 2 && form.pages === 'custom' }
  );
  const { data: adsStats } = useAllAdsStats();
  const { mutateAsync: createAd, isPending: isCreating } = useCreateAd();
  const { mutateAsync: updateAd, isPending: isUpdating } = useUpdateAd();
  const { mutateAsync: deleteAd, isPending: isDeleting } = useDeleteAd();
  const { mutateAsync: duplicateAd, isPending: isDuplicating } = useDuplicateAd();

  const ads = adsResponse?.data?.ads || [];
  const pagination = adsResponse?.data?.pagination;
  const categories = categoriesData || [];
  const adminArticles = adminArticlesResponse?.data?.data || [];
  const statsById = useMemo(() => {
    const entries = (adsStats || []).map((stat) => [stat.adId, stat]);
    return new Map(entries);
  }, [adsStats]);

  const isSaving = isCreating || isUpdating;

  const openCreate = () => {
    setEditingAd(null);
    setForm(defaultForm);
    setActiveStep(0);
    setIsModalOpen(true);
  };

  const openEdit = (ad) => {
    setEditingAd(ad);
    setForm({
      ...defaultForm,
      ...ad,
      sectionIndex: ad.sectionIndex ?? 0,
      paragraphIndex: ad.paragraphIndex ?? 3,
      placement: ad.placement || 'between_sections',
      placements: ad.placements?.length ? ad.placements : [ad.placement || 'between_sections'],
      pages: ad.targeting?.pages || 'all',
      devices: ad.targeting?.devices || defaultForm.devices,
      categories: ad.targeting?.categories || [],
      excludeCategories: ad.targeting?.excludeCategories || [],
      articles: ad.targeting?.articles || [],
      userStatus: ad.targeting?.userStatus || defaultForm.userStatus,
      startDate: dateValue(ad.schedule?.startDate),
      endDate: dateValue(ad.schedule?.endDate),
      imageUrls: ad.imageUrls || [],
      slideIntervalMs: ad.slideIntervalMs ?? 3000,
    });
    setActiveStep(0);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingAd(null);
    setActiveStep(0);
    setIsModalOpen(false);
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeviceToggle = (key) => {
    setForm((prev) => ({
      ...prev,
      devices: { ...prev.devices, [key]: !prev.devices[key] },
    }));
  };

  const handlePlacementToggle = (value) => {
    setForm((prev) => {
      const current = new Set(prev.placements || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      const next = Array.from(current);
      return {
        ...prev,
        placements: next,
        placement: next[0] || prev.placement || 'between_sections',
      };
    });
  };

  const handleUserStatusToggle = (key) => {
    setForm((prev) => ({
      ...prev,
      userStatus: { ...prev.userStatus, [key]: !prev.userStatus[key] },
    }));
  };

  const handleMultiToggle = (field, id) => {
    setForm((prev) => {
      const current = new Set(prev[field]);
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      return { ...prev, [field]: Array.from(current) };
    });
  };

  const handleImageUrlsUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const validFiles = files.filter((file) => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      toast.error('Please upload image files');
      event.target.value = '';
      return;
    }
    setIsUploadingImage(true);
    try {
      const remainingSlots = Math.max(0, 5 - form.imageUrls.length);
      const uploads = validFiles.slice(0, remainingSlots);
      const uploadedUrls = [];
      for (const file of uploads) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await uploadAPI.upload(formData, 'ads');
        const url = response?.data?.data?.media?.url;
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length === 0) {
        throw new Error('Upload failed');
      }
      setForm((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...uploadedUrls].slice(0, 5),
      }));
      toast.success('Images uploaded');
    } catch (error) {
      const message = error?.response?.data?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveImageUrl = (index) => {
    setForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const uploadAdImage = async (file, field, setUploading) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadAPI.upload(formData, 'ads');
      const url = response?.data?.data?.media?.url;
      if (!url) {
        throw new Error('Upload failed');
      }
      handleChange(field, url);
      toast.success('Image uploaded');
    } catch (error) {
      const message = error?.response?.data?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleAdImageUpload = async (event, field, setUploading) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAdImage(file, field, setUploading);
    event.target.value = '';
  };

  const handleDrop = async (event, field, setUploading, setDragOver) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await uploadAdImage(file, field, setUploading);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDragEnter = (event, setDragOver) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event, setDragOver) => {
    event.preventDefault();
    setDragOver(false);
  };

  const renderImageUploader = ({
    title,
    label,
    field,
    value,
    isUploading,
    setUploading,
    isDragOver,
    setDragOver,
    inputId,
  }) => (
    <div
      className={cn(
        'rounded-xl border border-dashed p-4 transition-colors',
        isDragOver
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
          : 'border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900'
      )}
      onDrop={(event) => handleDrop(event, field, setUploading, setDragOver)}
      onDragOver={handleDragOver}
      onDragEnter={(event) => handleDragEnter(event, setDragOver)}
      onDragLeave={(event) => handleDragLeave(event, setDragOver)}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-dark-900 dark:text-white">{title}</h4>
          <p className="text-xs text-dark-500">Drag & drop or upload an image</p>
        </div>
        <label className="btn btn-sm btn-secondary cursor-pointer">
          Upload
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAdImageUpload(e, field, setUploading)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-dark-100 dark:border-dark-800 bg-dark-50 dark:bg-dark-950 overflow-hidden aspect-[4/3] flex items-center justify-center">
          {value ? (
            <img src={value} alt={`${title} preview`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-dark-400">Preview</span>
          )}
        </div>
        <div className="space-y-3">
          <Input
            label={label}
            value={value}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder="https://"
          />
          {isUploading && (
            <span className="text-xs text-dark-500">Uploading...</span>
          )}
          <p className="text-xs text-dark-400">Recommended: 1200x900 or larger.</p>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Ad name is required');
      return;
    }
    if (!form.placements.length) {
      toast.error('Select at least one placement');
      return;
    }

    const payload = {
      name: form.name.trim(),
      status: form.status,
      type: form.type,
      placement: form.placement,
      placements: form.placements,
      placementId: form.placementId?.trim() || '',
      imageUrl: form.imageUrl,
      mobileImageUrl: form.mobileImageUrl,
      linkUrl: form.linkUrl,
      linkTarget: form.linkTarget,
      htmlContent: form.htmlContent,
      videoUrl: form.videoUrl,
      altText: form.altText,
      title: form.title,
      description: form.description,
      ctaText: form.ctaText,
      autoCloseSeconds: Number(form.autoCloseSeconds) || 0,
      imageUrls: form.imageUrls,
      slideIntervalMs: Number(form.slideIntervalMs) || 3000,
      sectionIndex: Number(form.sectionIndex) || 0,
      paragraphIndex: Number(form.paragraphIndex) || 3,
      priority: Number(form.priority) || 0,
      weight: Number(form.weight) || 100,
      targeting: {
        pages: form.pages,
        devices: form.devices,
        userStatus: form.userStatus,
        categories: form.categories,
        excludeCategories: form.excludeCategories,
        articles: form.articles,
      },
      schedule: {
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      },
    };

    try {
      if (editingAd?._id) {
        await updateAd({ id: editingAd._id, ...payload });
        toast.success('Ad updated');
      } else {
        await createAd(payload);
        toast.success('Ad created');
      }
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save ad');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAd(deleteTarget._id);
      toast.success('Ad deleted');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete ad');
    }
  };

  const handleDuplicate = async (ad) => {
    try {
      await duplicateAd(ad._id);
      toast.success('Ad duplicated');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to duplicate ad');
    }
  };

  return (
    <>
      <Helmet><title>Ads Control Panel - Dashboard</title></Helmet>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">Ads Control Panel</h1>
          <p className="text-dark-500 text-sm">Manage ads served by the collection-based /api/ads system.</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 sm:mr-2" />
          <span>Create Ad</span>
        </Button>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Placement</label>
            <select
              value={placement}
              onChange={(e) => {
                setPlacement(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All</option>
              {placements.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-4">
        {isLoading ? (
          <ContentLoader />
        ) : ads.length === 0 ? (
          <p className="text-dark-500 text-sm">No ads found for the current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-dark-500 border-b border-dark-200 dark:border-dark-700">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Placement</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Impressions</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">CTR</th>
                  <th className="py-2 pr-4">Updated</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => {
                  const stats = statsById.get(ad._id) || { impressions: 0, clicks: 0, ctr: 0 };
                  return (
                    <tr key={ad._id} className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-dark-900 dark:text-white">{ad.name}</div>
                      <div className="text-xs text-dark-500">Priority {ad.priority ?? 0}</div>
                    </td>
                    <td className="py-3 pr-4 capitalize">{ad.status}</td>
                    <td className="py-3 pr-4 capitalize">{ad.placement?.replace('_', ' ')}</td>
                    <td className="py-3 pr-4 uppercase">{ad.type}</td>
                    <td className="py-3 pr-4">{stats.impressions?.toLocaleString() || 0}</td>
                    <td className="py-3 pr-4">{stats.clicks?.toLocaleString() || 0}</td>
                    <td className="py-3 pr-4">{stats.ctr ? `${stats.ctr}%` : '0%'}</td>
                    <td className="py-3 pr-4 text-xs text-dark-500">
                      {ad.updatedAt ? new Date(ad.updatedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          className="p-2 rounded hover:bg-dark-100 dark:hover:bg-dark-800"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(ad)}
                          className="p-2 rounded hover:bg-dark-100 dark:hover:bg-dark-800"
                          title="Duplicate"
                          disabled={isDuplicating}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/dashboard/ads/${ad._id}/insights`}
                          className="p-2 rounded hover:bg-dark-100 dark:hover:bg-dark-800"
                          title="Insights"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ad)}
                          className="p-2 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Archive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4 text-sm">
            <span className="text-dark-500">
              Page {pagination.page} of {pagination.pages}
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
                onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={editingAd ? 'Edit Ad' : 'Create Ad'}>
        <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 -mx-2 px-2">
          {['Basics', 'Media', 'Targeting', 'Schedule'].map((label, index) => (
            <div key={label} className="flex items-center gap-2 flex-shrink-0">
              <div
                className={cn(
                  'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-semibold border',
                  activeStep === index
                    ? 'bg-primary-600 text-white border-primary-600'
                    : activeStep > index
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-dark-200 dark:border-dark-700 text-dark-500 dark:text-dark-300'
                )}
              >
                {index + 1}
              </div>
              <span className={cn(
                'text-xs sm:text-sm font-medium',
                activeStep >= index ? 'text-dark-900 dark:text-white' : 'text-dark-400'
              )}>
                {label}
              </span>
              {index < 3 && <div className="w-6 h-px bg-dark-200 dark:bg-dark-700" />}
            </div>
          ))}
        </div>

        {activeStep === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Optional headline"
            />
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="input"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="input"
              >
                {typeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Placements</label>
              <div className="grid grid-cols-2 gap-2">
                {placements.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.placements.includes(option.value)}
                      onChange={() => handlePlacementToggle(option.value)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {form.placements.length === 0 && (
                <p className="text-xs text-red-500 mt-2">Select at least one placement.</p>
              )}
            </div>
          {form.placements.includes('between_sections') && (
            <Input
              label="Section Index"
              type="number"
              value={form.sectionIndex}
              onChange={(e) => handleChange('sectionIndex', e.target.value)}
              min={0}
            />
          )}
          {form.placements.includes('custom') && (
            <Input
              label="Placement ID"
              value={form.placementId || ''}
              onChange={(e) => handleChange('placementId', e.target.value)}
              placeholder="right_hero"
              list="ads-custom-placement-options"
            />
          )}
          {form.placements.includes('custom') && (
            <datalist id="ads-custom-placement-options">
              {customPlacementOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
          )}
          {form.placements.includes('in_article') && (
            <Input
              label="Paragraph Index"
              type="number"
              value={form.paragraphIndex}
              onChange={(e) => handleChange('paragraphIndex', e.target.value)}
              min={1}
            />
          )}
            <Input
              label="Link URL"
              value={form.linkUrl}
              onChange={(e) => handleChange('linkUrl', e.target.value)}
              placeholder="https://"
            />
            <Input
              label="Alt Text"
              value={form.altText}
              onChange={(e) => handleChange('altText', e.target.value)}
            />
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Short description for the ad"
              />
            </div>
            <Input
              label="CTA Button Text"
              value={form.ctaText}
              onChange={(e) => handleChange('ctaText', e.target.value)}
              placeholder="Learn more"
            />
            <div>
              <label className="label">Link Target</label>
              <select
                value={form.linkTarget}
                onChange={(e) => handleChange('linkTarget', e.target.value)}
                className="input"
              >
                <option value="_blank">New Tab</option>
                <option value="_self">Same Tab</option>
              </select>
            </div>
            <Input
              label="Auto Close (seconds)"
              type="number"
              value={form.autoCloseSeconds}
              onChange={(e) => handleChange('autoCloseSeconds', e.target.value)}
              min={0}
              placeholder="0 = no auto close"
            />
            <Input
              label="Slide Interval (ms)"
              type="number"
              value={form.slideIntervalMs}
              onChange={(e) => handleChange('slideIntervalMs', e.target.value)}
              min={1000}
              placeholder="3000"
            />
          </div>
        )}

        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dark-100 dark:border-dark-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-dark-900 dark:text-white">Ad Images (1-5)</h4>
                  <p className="text-xs text-dark-500">Upload multiple images for a sliding ad.</p>
                </div>
                <label className="btn btn-sm btn-secondary cursor-pointer">
                  Upload Images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUrlsUpload}
                    disabled={form.imageUrls.length >= 5}
                  />
                </label>
              </div>
              {isUploadingImage && (
                <p className="text-xs text-dark-500 mb-2">Uploading...</p>
              )}
              <div className="grid grid-cols-5 gap-2">
                {form.imageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative rounded-lg overflow-hidden border border-dark-100 dark:border-dark-800">
                    <img src={url} alt={`Ad ${index + 1}`} className="w-full h-16 object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-black/70 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center"
                      onClick={() => handleRemoveImageUrl(index)}
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {form.imageUrls.length === 0 && (
                  <div className="col-span-5 text-xs text-dark-400">
                    Upload at least one image to enable the slider.
                  </div>
                )}
              </div>
            </div>
            {renderImageUploader({
              title: 'Desktop Image',
              label: 'Image URL',
              field: 'imageUrl',
              value: form.imageUrl,
              isUploading: isUploadingImage,
              setUploading: setIsUploadingImage,
              isDragOver: isImageDragOver,
              setDragOver: setIsImageDragOver,
              inputId: 'ad-image-upload',
            })}
            {renderImageUploader({
              title: 'Mobile Image',
              label: 'Mobile Image URL',
              field: 'mobileImageUrl',
              value: form.mobileImageUrl,
              isUploading: isUploadingMobileImage,
              setUploading: setIsUploadingMobileImage,
              isDragOver: isMobileDragOver,
              setDragOver: setIsMobileDragOver,
              inputId: 'ad-mobile-image-upload',
            })}
            {(form.type === 'html' || form.type === 'adsense') && (
              <div>
                <label className="label">HTML Content</label>
                <textarea
                  className="input font-mono text-sm"
                  rows={4}
                  value={form.htmlContent}
                  onChange={(e) => handleChange('htmlContent', e.target.value)}
                />
              </div>
            )}
            {form.type === 'video' && (
              <Input
                label="Video URL"
                value={form.videoUrl}
                onChange={(e) => handleChange('videoUrl', e.target.value)}
                placeholder="https://"
              />
            )}
          </div>
        )}

        {activeStep === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Page Targeting</label>
              <select
                value={form.pages}
                onChange={(e) => handleChange('pages', e.target.value)}
                className="input"
              >
                {pageOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Devices</label>
              <div className="flex flex-wrap gap-4">
                {['desktop', 'mobile', 'tablet'].map((device) => (
                  <label key={device} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.devices[device]}
                      onChange={() => handleDeviceToggle(device)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    {device}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">User Status</label>
              <div className="flex flex-wrap gap-4">
                {['loggedIn', 'guest'].map((statusKey) => (
                  <label key={statusKey} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.userStatus[statusKey]}
                      onChange={() => handleUserStatusToggle(statusKey)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    {statusKey === 'loggedIn' ? 'Logged-in' : 'Guests'}
                  </label>
                ))}
              </div>
            </div>
            {form.pages === 'custom' && (
              <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-dark-100 dark:border-dark-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-dark-900 dark:text-white">Target Categories</h4>
                      <p className="text-xs text-dark-500">Show on selected categories only</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-primary-600 hover:underline"
                      onClick={() => handleChange('categories', [])}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto pr-2 space-y-2">
                    {categories.length === 0 && (
                      <p className="text-xs text-dark-400">No categories available.</p>
                    )}
                    {categories.map((cat) => (
                      <label key={cat._id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.categories.includes(cat._id)}
                          onChange={() => handleMultiToggle('categories', cat._id)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-dark-100 dark:border-dark-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-dark-900 dark:text-white">Target Articles</h4>
                      <p className="text-xs text-dark-500">Show on selected articles only</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-primary-600 hover:underline"
                      onClick={() => handleChange('articles', [])}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto pr-2 space-y-2">
                    {adminArticles.length === 0 && (
                      <p className="text-xs text-dark-400">No articles loaded.</p>
                    )}
                    {adminArticles.map((article) => (
                      <label key={article._id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.articles.includes(article._id)}
                          onChange={() => handleMultiToggle('articles', article._id)}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="line-clamp-1">{article.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeStep === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
            <Input
              label="Priority"
              type="number"
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            />
            <Input
              label="Weight"
              type="number"
              value={form.weight}
              onChange={(e) => handleChange('weight', e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={resetForm}>Cancel</Button>
          <Button
            variant="secondary"
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          {activeStep < 3 ? (
            <Button onClick={() => setActiveStep((prev) => Math.min(3, prev + 1))}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} isLoading={isSaving}>Save</Button>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Ad"
        message={`Delete ${deleteTarget?.name || 'this ad'}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}

export default AdsControlPage;
