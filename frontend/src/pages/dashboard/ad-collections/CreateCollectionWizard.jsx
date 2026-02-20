import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const PLACEMENTS = [
  { id: 'popup', name: 'Popup', icon: '📱', description: 'Modal overlay popup' },
  { id: 'header', name: 'Header', icon: '📊', description: 'Top banner' },
  { id: 'sidebar', name: 'Sidebar', icon: '📋', description: 'Right rail sidebar' },
  { id: 'footer', name: 'Footer', icon: '⬇️', description: 'Bottom banner' },
  { id: 'in_article', name: 'In News', icon: '📰', description: 'Within article content' },
  { id: 'after_article', name: 'After News', icon: '📄', description: 'Below article' },
  { id: 'before_comments', name: 'Before Comments', icon: '💬', description: 'Above comments section' },
  { id: 'after_hero', name: 'After Hero', icon: '✨', description: 'Below homepage hero' },
  { id: 'between_sections', name: 'Between Sections', icon: '↔️', description: 'Between sections (homepage + list pages)' },
  { id: 'floating_banner', name: 'Floating Banner', icon: '🎯', description: 'Floating sticky banner' },
  { id: 'in_category', name: 'In Category', icon: '🗂️', description: 'Category listing pages' },
  { id: 'in_search', name: 'In Search', icon: '🔎', description: 'Search results pages' },
];

const PAGE_TYPES = [
  { id: 'homepage', name: 'Homepage Only' },
  { id: 'article', name: 'News Pages' },
  { id: 'category', name: 'Category Pages' },
  { id: 'search', name: 'Search Results' },
];

const ROTATION_TYPES = [
  { id: 'weighted', name: 'Weighted', description: 'Based on ad weight (recommended)' },
  { id: 'random', name: 'Random', description: 'Pick random ad each time' },
  { id: 'ab_test', name: 'A/B Test', description: 'Equal split for testing' },
  { id: 'sequential', name: 'Sequential', description: 'Show ads in order' },
];

/**
 * Create Collection Wizard - Step-by-step form
 */
export function CreateCollectionWizard() {
  const navigate = useNavigate();
  const { collectionId } = useParams();
  const isEditMode = Boolean(collectionId);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    description: '',
    
    // Step 2: Placement & Pages
    placement: '',
    sectionIndex: 0,
    targetPages: ['homepage'],
    
    // Step 3: Targeting & Rotation
    targetDevices: ['desktop', 'mobile', 'tablet'],
    targetUserTypes: ['all'],
    targetCountries: ['all'],
    rotationType: 'weighted',
    frequencyType: 'once_per_session',
    
    // Step 4: Schedule
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    daysOfWeek: [],
    timeStart: '',
    timeEnd: '',
    autoClose: true,
    autoCloseSeconds: 10,
  });

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!collectionId) return;

    let isActive = true;

    const loadCollection = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/ad-collections/${collectionId}`);
        const collection = response.data.collection || response.data.data?.collection;

        if (!collection || !isActive) return;

        setFormData(prev => ({
          ...prev,
          name: collection.name || '',
          description: collection.description || '',
      placement: collection.placement || '',
      sectionIndex: Number.isInteger(collection.sectionIndex) ? collection.sectionIndex : prev.sectionIndex,
      targetPages: collection.targetPages?.length ? collection.targetPages : prev.targetPages,
          targetDevices: collection.targetDevices?.length ? collection.targetDevices : prev.targetDevices,
          targetUserTypes: collection.targetUserTypes?.length ? collection.targetUserTypes : prev.targetUserTypes,
          targetCountries: collection.targetCountries?.length ? collection.targetCountries : prev.targetCountries,
          rotationType: collection.rotationType || prev.rotationType,
          frequencyType: collection.frequency?.type || prev.frequencyType,
          startDate: formatDate(collection.schedule?.startDate) || prev.startDate,
          endDate: formatDate(collection.schedule?.endDate),
          daysOfWeek: collection.schedule?.daysOfWeek || [],
          timeStart: collection.schedule?.timeStart || '',
          timeEnd: collection.schedule?.timeEnd || '',
          autoClose: collection.popupSettings?.autoClose ?? prev.autoClose,
          autoCloseSeconds: collection.popupSettings?.autoCloseSeconds ?? prev.autoCloseSeconds,
        }));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load collection');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadCollection();

    return () => {
      isActive = false;
    };
  }, [collectionId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/ad-collections', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Collection created successfully!');
      navigate(`/dashboard/ad-collections/${data.collection._id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create collection');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/ad-collections/${collectionId}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Collection updated successfully!');
      navigate(`/dashboard/ad-collections/${collectionId}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update collection');
    },
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const payload = {
      name: formData.name,
      description: formData.description,
    placement: formData.placement,
    sectionIndex: formData.placement === 'between_sections' ? Number(formData.sectionIndex || 0) : null,
    targetPages: formData.targetPages,
      targetDevices: formData.targetDevices,
      targetUserTypes: formData.targetUserTypes,
      targetCountries: formData.targetCountries,
      rotationType: formData.rotationType,
      frequency: {
        type: formData.frequencyType,
      },
      schedule: {
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        daysOfWeek: formData.daysOfWeek,
        timeStart: formData.timeStart || null,
        timeEnd: formData.timeEnd || null,
      },
      popupSettings: {
        autoClose: formData.autoClose,
        autoCloseSeconds: formData.autoCloseSeconds,
      },
    };

    if (!isEditMode) {
      payload.status = 'active';
      createMutation.mutate(payload);
      return;
    }

    updateMutation.mutate(payload);
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.name.trim() !== '';
    }
    if (currentStep === 2) {
      const needsSectionIndex = formData.placement === 'between_sections';
      const hasValidSectionIndex = Number.isInteger(Number(formData.sectionIndex)) && Number(formData.sectionIndex) >= 0;
      return formData.placement !== '' && formData.targetPages.length > 0 && (!needsSectionIndex || hasValidSectionIndex);
    }
    return true;
  };

  if (isEditMode && isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">Loading collection...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      {/* Header */}
      <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit Ad Collection' : 'Create New Ad Collection'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Step {currentStep} of 4
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 
                  ${currentStep >= step 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : 'border-gray-300 dark:border-dark-700 text-gray-500'
                  }
                `}>
                  {currentStep > step ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step}</span>
                  )}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-0.5 mx-2 ${currentStep > step ? 'bg-primary-600' : 'bg-gray-300 dark:bg-dark-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-900 rounded-lg shadow-sm border border-gray-200 dark:border-dark-800 p-6">
          {currentStep === 1 && <Step1BasicInfo formData={formData} updateField={updateField} />}
          {currentStep === 2 && <Step2Placement formData={formData} updateField={updateField} />}
          {currentStep === 3 && <Step3Targeting formData={formData} updateField={updateField} />}
          {currentStep === 4 && <Step4Schedule formData={formData} updateField={updateField} />}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-dark-800">
            <button
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                  return;
                }
                if (isEditMode) {
                  navigate(`/dashboard/ad-collections/${collectionId}`);
                  return;
                }
                navigate('/dashboard/ad-collections');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep > 1 ? 'Back' : 'Cancel'}
            </button>

            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isEditMode
                  ? (updateMutation.isPending ? 'Updating...' : 'Update Collection')
                  : (createMutation.isPending ? 'Creating...' : 'Create Collection')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 1: Basic Information
function Step1BasicInfo({ formData, updateField }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Basic Information
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Give your ad collection a name and description
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Collection Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Homepage Hero Banner Campaign"
          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
          placeholder="What is this collection for?"
          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>
  );
}

// Step 2: Placement & Pages
function Step2Placement({ formData, updateField }) {
  const pageIds = PAGE_TYPES.map((page) => page.id);
  const isAllPagesSelected = formData.targetPages.includes('all') || pageIds.every((id) => formData.targetPages.includes(id));

  const toggleAllPages = (checked) => {
    updateField('targetPages', checked ? ['all', ...pageIds] : []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Where to Show
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Choose ONE placement for this collection
        </p>
      </div>

      {/* Placement Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Choose Placement *
        </label>
        <div className="grid grid-cols-2 gap-4">
          {PLACEMENTS.map((placement) => (
            <button
              key={placement.id}
              onClick={() => updateField('placement', placement.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${formData.placement === placement.id
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-dark-700 hover:border-gray-400'
                }
              `}
            >
              <div className="text-2xl mb-2">{placement.icon}</div>
              <div className="font-medium text-gray-900 dark:text-white">{placement.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{placement.description}</div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Use placement <code>between_sections</code> + section index to target specific sections. Homepage: index = section order.
          News/Category: index 0 is after 2 rows (mobile 2 articles, tablet 4, desktop 6).
        </p>
      </div>

      {formData.placement === 'between_sections' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Section Index *
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.sectionIndex}
            onChange={(e) => updateField('sectionIndex', e.target.value)}
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Example: 0 for the first section, 1 for the second. On News/Category pages, a section is 2 rows.
          </p>
        </div>
      )}

      {/* Page Targeting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Show on Which Pages? *
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllPagesSelected}
              onChange={(e) => toggleAllPages(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">All Pages</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Show everywhere</div>
            </div>
          </label>
          {PAGE_TYPES.map((page) => (
            <label key={page.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.targetPages.includes(page.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    const next = [...new Set([...formData.targetPages, page.id])].filter((id) => id !== 'all');
                    if (next.length === pageIds.length) {
                      updateField('targetPages', ['all', ...pageIds]);
                      return;
                    }
                    updateField('targetPages', next);
                  } else {
                    const next = formData.targetPages.filter((p) => p !== page.id && p !== 'all');
                    updateField('targetPages', next);
                  }
                }}
                className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{page.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 3: Targeting & Rotation
function Step3Targeting({ formData, updateField }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Targeting & Rotation
        </h2>
      </div>

      {/* Device Targeting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Target Devices
        </label>
        <div className="flex gap-4">
          {['desktop', 'mobile', 'tablet'].map((device) => (
            <label key={device} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.targetDevices.includes(device)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateField('targetDevices', [...formData.targetDevices, device]);
                  } else {
                    updateField('targetDevices', formData.targetDevices.filter(d => d !== device));
                  }
                }}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{device}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Rotation Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Ad Rotation Strategy
        </label>
        <div className="space-y-2">
          {ROTATION_TYPES.map((type) => (
            <label key={type.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800 cursor-pointer">
              <input
                type="radio"
                name="rotationType"
                checked={formData.rotationType === type.id}
                onChange={() => updateField('rotationType', type.id)}
                className="mt-0.5 w-4 h-4 text-primary-600"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{type.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Frequency Control */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Frequency Control
        </label>
        <select
          value={formData.frequencyType}
          onChange={(e) => updateField('frequencyType', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
        >
          <option value="unlimited">Unlimited</option>
          <option value="once_per_page">Once per page</option>
          <option value="once_per_session">Once per session</option>
          <option value="once_per_day">Once per day</option>
          <option value="once_per_user">Once per user</option>
        </select>
      </div>
    </div>
  );
}

// Step 4: Schedule
function Step4Schedule({ formData, updateField }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Schedule
        </h2>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date (optional)
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Popup Settings (if placement is popup) */}
      {formData.placement === 'popup' && (
        <div className="border border-gray-200 dark:border-dark-700 rounded-lg p-4 bg-gray-50 dark:bg-dark-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Popup Settings</h3>
          
          <label className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={formData.autoClose}
              onChange={(e) => updateField('autoClose', e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-close popup</span>
          </label>

          {formData.autoClose && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-close after (seconds)
              </label>
              <input
                type="number"
                min="3"
                max="60"
                value={formData.autoCloseSeconds}
                onChange={(e) => updateField('autoCloseSeconds', parseInt(e.target.value))}
                className="w-32 px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CreateCollectionWizard;
