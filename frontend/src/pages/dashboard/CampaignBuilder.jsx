import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Save, X, Eye, Plus, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import PlacementPicker from '../../components/campaigns/PlacementPicker';
import { uploadAPI } from '../../services/api';
import { buildMediaUrl } from '../../utils';

const DEFAULT_CAMPAIGN = {
  name: '',
  description: '',
  placement: 'popup',
  targeting: {
    pages: ['homepage', 'article'],
    devices: ['desktop', 'mobile', 'tablet'],
    visitors: 'all',
    countries: [],
    categories: [],
  },
  schedule: {
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    timezone: 'Asia/Phnom_Penh',
  },
  ads: [
    {
      type: 'image',
      imageUrl: '',
      mobileImageUrl: '',
      linkUrl: '',
      linkTarget: '_blank',
      ctaText: 'Learn More',
      weight: 100,
      isActive: true,
    },
  ],
  settings: {
    popup: {
      autoClose: true,
      autoCloseSeconds: 10,
      showCloseButton: true,
      backdropClickClose: true,
    },
    banner: {
      sticky: false,
      dismissible: true,
    },
    floating: {
      position: 'bottom-right',
      minimizable: true,
    },
    inContent: {
      position: 'after_paragraph',
      paragraphIndex: 3,
    },
  },
  frequency: {
    type: 'once_per_session',
    maxImpressions: 0,
    maxClicks: 0,
  },
  status: 'draft',
};

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  // Load campaign for editing
  useEffect(() => {
    if (isEditing) {
      loadCampaign();
    }
    loadCategories();
  }, [id]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/campaigns/${id}`);
      setCampaign(response.data.campaign);
    } catch (error) {
      toast.error('Failed to load campaign');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSave = async (publishNow = false) => {
    try {
      setSaving(true);

      const payload = {
        ...campaign,
        status: publishNow ? 'active' : campaign.status,
      };

      let response;
      if (isEditing) {
        response = await api.put(`/campaigns/${id}`, payload);
        toast.success('Campaign updated successfully');
      } else {
        response = await api.post('/campaigns', payload);
        toast.success('Campaign created successfully');
      }

      navigate('/dashboard/campaigns');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save campaign');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (index, file, isMobile = false) => {
    try {
      setUploadingIndex(index);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'campaigns');

      const response = await uploadAPI.upload(formData);
      const media = response.data?.data?.media || response.data?.media || response.data;
      const imageUrl = media?.url || media?.path;
      if (!imageUrl) {
        throw new Error('Upload succeeded but no URL was returned');
      }

      const updatedAds = [...campaign.ads];
      if (isMobile) {
        updatedAds[index].mobileImageUrl = imageUrl;
      } else {
        updatedAds[index].imageUrl = imageUrl;
      }

      setCampaign({ ...campaign, ads: updatedAds });
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setUploadingIndex(null);
    }
  };

  const addAdVariation = () => {
    const newWeight = 100 / (campaign.ads.length + 1);
    const updatedAds = campaign.ads.map(ad => ({
      ...ad,
      weight: Math.round(newWeight),
    }));

    updatedAds.push({
      type: 'image',
      imageUrl: '',
      mobileImageUrl: '',
      linkUrl: '',
      linkTarget: '_blank',
      ctaText: 'Learn More',
      weight: Math.round(newWeight),
      isActive: true,
    });

    setCampaign({ ...campaign, ads: updatedAds });
  };

  const removeAdVariation = (index) => {
    if (campaign.ads.length === 1) {
      toast.error('Campaign must have at least one ad');
      return;
    }

    const updatedAds = campaign.ads.filter((_, i) => i !== index);
    const newWeight = 100 / updatedAds.length;
    updatedAds.forEach(ad => {
      ad.weight = Math.round(newWeight);
    });

    setCampaign({ ...campaign, ads: updatedAds });
  };

  const updateAd = (index, field, value) => {
    const updatedAds = [...campaign.ads];
    updatedAds[index][field] = value;
    setCampaign({ ...campaign, ads: updatedAds });
  };

  const updateWeight = (index, weight) => {
    const updatedAds = [...campaign.ads];
    updatedAds[index].weight = parseInt(weight);
    setCampaign({ ...campaign, ads: updatedAds });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isEditing ? 'Edit Campaign' : 'New Campaign'} - Bassac CMS</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Campaign' : 'Create New Campaign'}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {isEditing ? 'Update your campaign settings' : 'Set up your advertising campaign in one page'}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/campaigns')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Form */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                    placeholder="Summer Sale 2024"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={campaign.description}
                    onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                    placeholder="Brief description of this campaign..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Placement Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <PlacementPicker
                value={campaign.placement}
                onChange={(placement) => setCampaign({ ...campaign, placement })}
              />
            </div>

            {/* Targeting */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Targeting
              </h2>

              <div className="space-y-4">
                {/* Pages */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Show on Pages
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {['homepage', 'article', 'category', 'search', 'page'].map((page) => (
                      <label key={page} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaign.targeting.pages.includes(page)}
                          onChange={(e) => {
                            const pages = e.target.checked
                              ? [...campaign.targeting.pages, page]
                              : campaign.targeting.pages.filter(p => p !== page);
                            setCampaign({
                              ...campaign,
                              targeting: { ...campaign.targeting, pages },
                            });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {page}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Devices */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Show on Devices
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['desktop', 'mobile', 'tablet'].map((device) => (
                      <label key={device} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaign.targeting.devices.includes(device)}
                          onChange={(e) => {
                            const devices = e.target.checked
                              ? [...campaign.targeting.devices, device]
                              : campaign.targeting.devices.filter(d => d !== device);
                            setCampaign({
                              ...campaign,
                              targeting: { ...campaign.targeting, devices },
                            });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {device}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Visitors */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Show to Visitors
                  </label>
                  <div className="flex gap-4">
                    {[
                      { value: 'all', label: 'All Visitors' },
                      { value: 'new', label: 'New Visitors Only' },
                      { value: 'returning', label: 'Returning Visitors Only' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visitors"
                          value={option.value}
                          checked={campaign.targeting.visitors === option.value}
                          onChange={(e) => setCampaign({
                            ...campaign,
                            targeting: { ...campaign.targeting, visitors: e.target.value },
                          })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Schedule
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={campaign.schedule.startDate}
                    onChange={(e) => setCampaign({
                      ...campaign,
                      schedule: { ...campaign.schedule, startDate: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={campaign.schedule.endDate}
                    onChange={(e) => setCampaign({
                      ...campaign,
                      schedule: { ...campaign.schedule, endDate: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Ad Variations */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Ad Variations
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Add multiple ads for A/B testing. Weight determines how often each ad is shown.
                  </p>
                </div>
                <button
                  onClick={addAdVariation}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Variation
                </button>
              </div>

              <div className="space-y-4">
                {campaign.ads.map((ad, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Ad Variation {index + 1}
                          </h4>
                          {campaign.ads.length > 1 && (
                            <button
                              onClick={() => removeAdVariation(index)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Desktop Image */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Desktop Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(index, e.target.files[0], false)}
                              disabled={uploadingIndex === index}
                              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {ad.imageUrl && (
                              <img loading="lazy" src={buildMediaUrl(ad.imageUrl)} alt="Preview" className="mt-2 h-20 rounded" />
                            )}
                          </div>

                          {/* Link URL */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Link URL
                            </label>
                            <input
                              type="url"
                              value={ad.linkUrl}
                              onChange={(e) => updateAd(index, 'linkUrl', e.target.value)}
                              placeholder="https://example.com"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                            />
                          </div>

                          {/* CTA Text */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              CTA Text
                            </label>
                            <input
                              type="text"
                              value={ad.ctaText}
                              onChange={(e) => updateAd(index, 'ctaText', e.target.value)}
                              placeholder="Learn More"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                            />
                          </div>

                          {/* Weight */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Weight ({ad.weight}%)
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={ad.weight}
                              onChange={(e) => updateWeight(index, e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 rounded-t-xl">
              <button
                onClick={() => navigate('/dashboard/campaigns')}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving || !campaign.name}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || !campaign.name}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Publish Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
