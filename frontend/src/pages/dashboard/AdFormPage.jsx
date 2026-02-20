import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  Image as ImageIcon,
  Upload,
  X,
  Eye,
  Link as LinkIcon,
  Palette,
  Settings,
  Save,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { buildMediaUrl } from '../../utils';

/**
 * COMPLETE AD FORM - CREATE/EDIT
 * 
 * Features:
 * - Image upload with thumbnail preview
 * - HTML editor
 * - Video URL support
 * - Live preview
 * - All ad settings
 */

export function AdFormPage() {
  const navigate = useNavigate();
  const { collectionId, adId } = useParams();
  const isEdit = !!adId;

  // Form state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collection, setCollection] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'image',
    imageUrl: '',
    mobileImageUrl: '',
    imageUrls: [],
    slideIntervalMs: 3000,
    htmlContent: '',
    videoUrl: '',
    linkUrl: '',
    linkTarget: '_blank',
    ctaText: 'Learn More',
    style: 'banner',
    size: 'responsive',
    alignment: 'center',
    maxWidth: null,
    backgroundColor: '',
    borderRadius: 8,
    padding: 0,
    showLabel: true,
    labelText: 'Advertisement',
    animation: 'fade',
    weight: 50,
    status: 'active',
    order: 0,
    altText: '',
  });

  // Preview states
  const [imagePreview, setImagePreview] = useState('');
  const [mobilePreview, setMobilePreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // ==================== FETCH DATA ====================

  useEffect(() => {
    fetchCollection();
    if (isEdit) {
      fetchAd();
    }
  }, [collectionId, adId]);

  const fetchCollection = async () => {
    try {
      const response = await api.get(`/ad-collections/${collectionId}`);
      setCollection(response.data.collection);
    } catch (error) {
      console.error('Error fetching collection:', error);
      toast.error('Failed to load collection');
    }
  };

  const fetchAd = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ads/${adId}`);
      const ad = response.data.ad;
      setFormData(ad);
      setImagePreview(ad.imageUrl || '');
      setMobilePreview(ad.mobileImageUrl || '');
    } catch (error) {
      console.error('Error fetching ad:', error);
      toast.error('Failed to load ad');
    } finally {
      setLoading(false);
    }
  };

  // ==================== HANDLERS ====================

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      // Create FormData
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      // Upload to your backend
      const response = await api.post('/uploads', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const media = response.data?.data?.media || response.data?.media || response.data;
      const imageUrl = media?.url || media?.path;
      if (!imageUrl) {
        toast.error('Upload succeeded but no URL was returned');
        return;
      }
      handleChange(field, imageUrl);

      // Set preview
      if (field === 'imageUrl') {
        setImagePreview(imageUrl);
      } else if (field === 'mobileImageUrl') {
        setMobilePreview(imageUrl);
      }

      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name) {
      toast.error('Please enter ad name');
      return;
    }

    if (formData.type === 'image' && !formData.imageUrl) {
      toast.error('Please upload an image');
      return;
    }

    if (formData.type === 'html' && !formData.htmlContent) {
      toast.error('Please enter HTML content');
      return;
    }

    if (formData.type === 'video' && !formData.videoUrl) {
      toast.error('Please enter video URL');
      return;
    }

    try {
      setSaving(true);

      if (isEdit) {
        await api.put(`/ads/${adId}`, formData);
        toast.success('Ad updated successfully');
      } else {
        await api.post(`/ad-collections/${collectionId}/ads`, formData);
        toast.success('Ad created successfully');
      }

      navigate(`/dashboard/ads?collection=${collectionId}`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(isEdit ? 'Failed to update ad' : 'Failed to create ad');
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isEdit ? 'Edit Ad' : 'Create Ad'} - Bassac CMS</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Ad' : 'Create New Ad'}
            </h1>
            {collection && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Collection: {collection.name}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ad Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Summer Sale Banner"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe this ad..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ad Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="image">Image</option>
                    <option value="html">HTML</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="testing">Testing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Based on Type */}
            {formData.type === 'image' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Image Content</h2>
                
                <div className="space-y-4">
                  {/* Desktop Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Desktop Image * 
                      {imagePreview && <span className="text-green-600 ml-2">✓ Uploaded</span>}
                    </label>
                    
                    {imagePreview ? (
                      <div className="relative">
                        <img loading="lazy"
                          src={buildMediaUrl(imagePreview)}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('');
                            handleChange('imageUrl', '');
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-700 font-medium">
                            Click to upload
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'imageUrl')}
                            className="hidden"
                          />
                        </label>
                        <p className="text-sm text-gray-500 mt-1">PNG, JPG, WEBP up to 5MB</p>
                      </div>
                    )}
                  </div>

                  {/* Mobile Image (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mobile Image (Optional)
                      {mobilePreview && <span className="text-green-600 ml-2">✓ Uploaded</span>}
                    </label>
                    
                    {mobilePreview ? (
                      <div className="relative">
                        <img loading="lazy"
                          src={buildMediaUrl(mobilePreview)}
                          alt="Mobile Preview"
                          className="w-64 h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setMobilePreview('');
                            handleChange('mobileImageUrl', '');
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center w-64">
                        <ImageIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                            Upload mobile version
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'mobileImageUrl')}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Alt Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Alt Text (Accessibility)
                    </label>
                    <input
                      type="text"
                      value={formData.altText}
                      onChange={(e) => handleChange('altText', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the image for screen readers"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.type === 'html' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">HTML Content</h2>
                <textarea
                  value={formData.htmlContent}
                  onChange={(e) => handleChange('htmlContent', e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="<div>Your HTML code here...</div>"
                />
              </div>
            )}

            {formData.type === 'video' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Video URL</h2>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => handleChange('videoUrl', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            )}

            {/* Link Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Link Settings
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link URL
                  </label>
                  <input
                    type="url"
                    value={formData.linkUrl}
                    onChange={(e) => handleChange('linkUrl', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CTA Text
                  </label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => handleChange('ctaText', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Learn More"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link Target
                  </label>
                  <select
                    value={formData.linkTarget}
                    onChange={(e) => handleChange('linkTarget', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="_blank">New Tab</option>
                    <option value="_self">Same Tab</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Style & Display */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Style & Display
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Style
                  </label>
                  <select
                    value={formData.style}
                    onChange={(e) => handleChange('style', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="banner">Banner</option>
                    <option value="card">Card</option>
                    <option value="native">Native</option>
                    <option value="fullwidth">Full Width</option>
                    <option value="inline">Inline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Size
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => handleChange('size', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="responsive">Responsive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Alignment
                  </label>
                  <select
                    value={formData.alignment}
                    onChange={(e) => handleChange('alignment', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Animation
                  </label>
                  <select
                    value={formData.animation}
                    onChange={(e) => handleChange('animation', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Border Radius (px)
                  </label>
                  <input
                    type="number"
                    value={formData.borderRadius}
                    onChange={(e) => handleChange('borderRadius', parseInt(e.target.value))}
                    min="0"
                    max="50"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Weight (A/B Testing)
                  </label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', parseInt(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Label Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4 mb-4">
                <input
                  type="checkbox"
                  checked={formData.showLabel}
                  onChange={(e) => handleChange('showLabel', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show "Advertisement" Label
                </label>
              </div>

              {formData.showLabel && (
                <input
                  type="text"
                  value={formData.labelText}
                  onChange={(e) => handleChange('labelText', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Advertisement"
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : (isEdit ? 'Update Ad' : 'Create Ad')}
                </button>
              </div>
            </div>
          </form>

          {/* Preview Modal */}
          {showPreview && imagePreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowPreview(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Ad Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <img loading="lazy"
                  src={buildMediaUrl(imagePreview)}
                  alt="Ad Preview"
                  className="w-full rounded-lg"
                  style={{
                    borderRadius: `${formData.borderRadius}px`,
                  }}
                />
                {formData.showLabel && (
                  <div className="mt-2 text-xs text-gray-500">{formData.labelText}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AdFormPage;
