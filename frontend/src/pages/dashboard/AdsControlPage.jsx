import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Megaphone, Settings, Image, Link, Clock, Eye, EyeOff,
  Smartphone, Monitor, Save, ToggleLeft, ToggleRight,
  Layout, MousePointer, Scroll, LogOut, ChevronDown,
  ChevronUp, AlertCircle, CheckCircle, X, Play, Pause,
  Plus, Trash2, GripVertical, ArrowUp, ArrowDown
} from 'lucide-react';
import { useSiteSettings, useUpdateSettings } from '../../hooks/useApi';
import { Button, Input, ContentLoader, ConfirmModal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

const AD_SECTIONS = [
  { id: 'welcomePopup', label: 'Welcome Popup', icon: Layout, description: 'Full-screen popup when visitors enter' },
  { id: 'floatingBanner', label: 'Floating Banner', icon: Megaphone, description: 'Sticky banner at top/bottom' },
  { id: 'bodyAds', label: 'Body Ads', icon: Layout, description: 'Dynamic ads throughout content body' },
  { id: 'mobileAds', label: 'Mobile Ads', icon: Smartphone, description: 'Mobile-specific ad placements' },
  { id: 'inArticleAd', label: 'In-Article Ad (Legacy)', icon: Layout, description: 'Single ad within article content' },
  { id: 'scrollAd', label: 'Scroll Ad', icon: Scroll, description: 'Appears after scrolling' },
  { id: 'exitPopup', label: 'Exit Popup', icon: LogOut, description: 'Shows when leaving site' },
  { id: 'adsGlobal', label: 'Global Settings', icon: Settings, description: 'Master controls for all ads' },
];

// Reusable Toggle Component
function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between p-4 bg-dark-50 dark:bg-dark-800 rounded-lg">
      <div>
        <p className="font-medium text-dark-900 dark:text-white">{label}</p>
        {description && <p className="text-sm text-dark-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          enabled ? 'bg-primary-600' : 'bg-dark-300 dark:bg-dark-600'
        }`}
      >
        <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-8' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

// Collapsible Section
function AdSection({ id, label, icon: Icon, description, children, isOpen, onToggle, isEnabled }) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-dark-100 dark:bg-dark-700 text-dark-400'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-dark-900 dark:text-white">{label}</h3>
              {isEnabled ? (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium bg-dark-100 text-dark-500 dark:bg-dark-700 dark:text-dark-400 rounded-full">
                  Disabled
                </span>
              )}
            </div>
            <p className="text-sm text-dark-500">{description}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-dark-400" /> : <ChevronDown className="w-5 h-5 text-dark-400" />}
      </button>
      {isOpen && <div className="p-4 pt-0 border-t border-dark-200 dark:border-dark-700">{children}</div>}
    </div>
  );
}

export function AdsControlPage() {
  const { data: settings, isLoading } = useSiteSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateSettings();
  const [openSections, setOpenSections] = useState(['welcomePopup']);
  const [deleteAdModal, setDeleteAdModal] = useState(null);
  const [form, setForm] = useState({
    welcomePopup: {},
    floatingBanner: {},
    inArticleAd: {},
    bodyAds: { enabled: true, ads: [], globalSettings: {} },
    mobileAds: {},
    exitPopup: {},
    scrollAd: {},
    adsGlobal: { masterSwitch: true },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        welcomePopup: settings.welcomePopup || {},
        floatingBanner: settings.floatingBanner || {},
        inArticleAd: settings.inArticleAd || {},
        bodyAds: settings.bodyAds || { enabled: true, ads: [], globalSettings: {} },
        mobileAds: settings.mobileAds || {},
        exitPopup: settings.exitPopup || {},
        scrollAd: settings.scrollAd || {},
        adsGlobal: settings.adsGlobal || { masterSwitch: true },
      });
    }
  }, [settings]);

  const toggleSection = (id) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const updateField = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleSave = () => {
    updateSettings(form, {
      onSuccess: () => toast.success('Ad settings saved successfully!'),
      onError: () => toast.error('Failed to save settings'),
    });
  };

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet>
        <title>Ads Control Panel | Dashboard</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">
            Ads Control Panel
          </h1>
          <p className="text-dark-500">Manage all advertisement placements</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
          Save All Changes
        </Button>
      </div>

      {/* Master Switch Banner */}
      <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
        form.adsGlobal?.masterSwitch 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center gap-3">
          {form.adsGlobal?.masterSwitch ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <p className="font-semibold text-dark-900 dark:text-white">
              {form.adsGlobal?.masterSwitch ? 'Ads are ENABLED' : 'Ads are DISABLED'}
            </p>
            <p className="text-sm text-dark-500">
              {form.adsGlobal?.masterSwitch 
                ? 'All configured ads are showing to visitors' 
                : 'All ads are hidden. Enable to show ads.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => updateField('adsGlobal', 'masterSwitch', !form.adsGlobal?.masterSwitch)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            form.adsGlobal?.masterSwitch
              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
          }`}
        >
          {form.adsGlobal?.masterSwitch ? 'Disable All' : 'Enable All'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Welcome Popup */}
        <AdSection
          id="welcomePopup"
          label="Welcome Popup"
          icon={Layout}
          description="Full-screen popup when visitors enter your site"
          isOpen={openSections.includes('welcomePopup')}
          onToggle={() => toggleSection('welcomePopup')}
          isEnabled={form.welcomePopup?.enabled}
        >
          <div className="space-y-4 pt-4">
            <Toggle
              enabled={form.welcomePopup?.enabled}
              onChange={(v) => updateField('welcomePopup', 'enabled', v)}
              label="Enable Welcome Popup"
            />

            {form.welcomePopup?.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Title"
                    value={form.welcomePopup?.title || ''}
                    onChange={(e) => updateField('welcomePopup', 'title', e.target.value)}
                    placeholder="Special Offer!"
                  />
                  <Input
                    label="Subtitle"
                    value={form.welcomePopup?.subtitle || ''}
                    onChange={(e) => updateField('welcomePopup', 'subtitle', e.target.value)}
                    placeholder="Limited time only"
                  />
                  <Input
                    label="Desktop Image URL"
                    value={form.welcomePopup?.imageUrl || ''}
                    onChange={(e) => updateField('welcomePopup', 'imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Mobile Image URL"
                    value={form.welcomePopup?.mobileImageUrl || ''}
                    onChange={(e) => updateField('welcomePopup', 'mobileImageUrl', e.target.value)}
                    placeholder="https://... (optional)"
                  />
                  <Input
                    label="Link URL"
                    value={form.welcomePopup?.linkUrl || ''}
                    onChange={(e) => updateField('welcomePopup', 'linkUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Button Text"
                    value={form.welcomePopup?.buttonText || ''}
                    onChange={(e) => updateField('welcomePopup', 'buttonText', e.target.value)}
                    placeholder="Learn More"
                  />
                </div>

                <div className="col-span-2">
                  <label className="label">Content (HTML supported)</label>
                  <textarea
                    value={form.welcomePopup?.content || ''}
                    onChange={(e) => updateField('welcomePopup', 'content', e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="<p>Your promotional content here...</p>"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="label">Display Delay (ms)</label>
                    <Input
                      type="number"
                      value={form.welcomePopup?.delay || 2000}
                      onChange={(e) => updateField('welcomePopup', 'delay', parseInt(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="label">Position</label>
                    <select
                      value={form.welcomePopup?.position || 'center'}
                      onChange={(e) => updateField('welcomePopup', 'position', e.target.value)}
                      className="input"
                    >
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Size</label>
                    <select
                      value={form.welcomePopup?.size || 'medium'}
                      onChange={(e) => updateField('welcomePopup', 'size', e.target.value)}
                      className="input"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="fullscreen">Fullscreen</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Animation</label>
                    <select
                      value={form.welcomePopup?.animation || 'zoom'}
                      onChange={(e) => updateField('welcomePopup', 'animation', e.target.value)}
                      className="input"
                    >
                      <option value="fade">Fade</option>
                      <option value="zoom">Zoom</option>
                      <option value="slide">Slide</option>
                      <option value="bounce">Bounce</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="label">Frequency</label>
                    <select
                      value={form.welcomePopup?.frequency || 'once_per_session'}
                      onChange={(e) => updateField('welcomePopup', 'frequency', e.target.value)}
                      className="input"
                    >
                      <option value="always">Every Visit</option>
                      <option value="once_per_session">Once Per Session</option>
                      <option value="once_per_day">Once Per Day</option>
                      <option value="once_per_week">Once Per Week</option>
                      <option value="once_ever">Once Ever</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Show On Pages</label>
                    <select
                      value={form.welcomePopup?.pages || 'homepage'}
                      onChange={(e) => updateField('welcomePopup', 'pages', e.target.value)}
                      className="input"
                    >
                      <option value="all">All Pages</option>
                      <option value="homepage">Homepage Only</option>
                      <option value="articles">Articles Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Border Radius</label>
                    <Input
                      type="number"
                      value={form.welcomePopup?.borderRadius || 16}
                      onChange={(e) => updateField('welcomePopup', 'borderRadius', parseInt(e.target.value))}
                      min={0}
                      max={50}
                    />
                  </div>
                  <div>
                    <label className="label">X Button Delay (ms)</label>
                    <Input
                      type="number"
                      value={form.welcomePopup?.closeButtonDelay || 0}
                      onChange={(e) => updateField('welcomePopup', 'closeButtonDelay', parseInt(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Toggle
                    enabled={form.welcomePopup?.showCloseButton ?? true}
                    onChange={(v) => updateField('welcomePopup', 'showCloseButton', v)}
                    label="Show Close (X) Button"
                  />
                  <Toggle
                    enabled={form.welcomePopup?.autoClose}
                    onChange={(v) => updateField('welcomePopup', 'autoClose', v)}
                    label="Auto Close"
                  />
                  {form.welcomePopup?.autoClose && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-dark-500">After</span>
                      <Input
                        type="number"
                        value={(form.welcomePopup?.autoCloseDelay || 10000) / 1000}
                        onChange={(e) => updateField('welcomePopup', 'autoCloseDelay', parseInt(e.target.value) * 1000)}
                        className="w-20"
                        min={1}
                      />
                      <span className="text-sm text-dark-500">seconds</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  <Toggle
                    enabled={form.welcomePopup?.showOnDesktop ?? true}
                    onChange={(v) => updateField('welcomePopup', 'showOnDesktop', v)}
                    label="Show on Desktop"
                  />
                  <Toggle
                    enabled={form.welcomePopup?.showOnMobile ?? true}
                    onChange={(v) => updateField('welcomePopup', 'showOnMobile', v)}
                    label="Show on Mobile"
                  />
                </div>
              </>
            )}
          </div>
        </AdSection>

        {/* Floating Banner */}
        <AdSection
          id="floatingBanner"
          label="Floating Banner"
          icon={Megaphone}
          description="Sticky banner at top or bottom of screen"
          isOpen={openSections.includes('floatingBanner')}
          onToggle={() => toggleSection('floatingBanner')}
          isEnabled={form.floatingBanner?.enabled}
        >
          <div className="space-y-4 pt-4">
            <Toggle
              enabled={form.floatingBanner?.enabled}
              onChange={(v) => updateField('floatingBanner', 'enabled', v)}
              label="Enable Floating Banner"
            />

            {form.floatingBanner?.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Desktop Image URL"
                    value={form.floatingBanner?.imageUrl || ''}
                    onChange={(e) => updateField('floatingBanner', 'imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Mobile Image URL"
                    value={form.floatingBanner?.mobileImageUrl || ''}
                    onChange={(e) => updateField('floatingBanner', 'mobileImageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Link URL"
                    value={form.floatingBanner?.linkUrl || ''}
                    onChange={(e) => updateField('floatingBanner', 'linkUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <div>
                    <label className="label">Or Text Content (HTML)</label>
                    <Input
                      value={form.floatingBanner?.content || ''}
                      onChange={(e) => updateField('floatingBanner', 'content', e.target.value)}
                      placeholder="<b>Special Offer!</b> Click here"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="label">Position</label>
                    <select
                      value={form.floatingBanner?.position || 'bottom'}
                      onChange={(e) => updateField('floatingBanner', 'position', e.target.value)}
                      className="input"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Height</label>
                    <select
                      value={form.floatingBanner?.height || 'medium'}
                      onChange={(e) => updateField('floatingBanner', 'height', e.target.value)}
                      className="input"
                    >
                      <option value="small">Small (48px)</option>
                      <option value="medium">Medium (64px)</option>
                      <option value="large">Large (80px)</option>
                    </select>
                  </div>
                  <Input
                    label="Background Color"
                    type="color"
                    value={form.floatingBanner?.backgroundColor || '#1e40af'}
                    onChange={(e) => updateField('floatingBanner', 'backgroundColor', e.target.value)}
                  />
                  <Input
                    label="Text Color"
                    type="color"
                    value={form.floatingBanner?.textColor || '#ffffff'}
                    onChange={(e) => updateField('floatingBanner', 'textColor', e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <Toggle
                    enabled={form.floatingBanner?.showCloseButton ?? true}
                    onChange={(v) => updateField('floatingBanner', 'showCloseButton', v)}
                    label="Show Close Button"
                  />
                  <Toggle
                    enabled={form.floatingBanner?.showOnDesktop ?? true}
                    onChange={(v) => updateField('floatingBanner', 'showOnDesktop', v)}
                    label="Show on Desktop"
                  />
                  <Toggle
                    enabled={form.floatingBanner?.showOnMobile ?? true}
                    onChange={(v) => updateField('floatingBanner', 'showOnMobile', v)}
                    label="Show on Mobile"
                  />
                </div>
              </>
            )}
          </div>
        </AdSection>

        {/* Body Ads - Dynamic ads throughout content */}
        <AdSection
          id="bodyAds"
          label="Body Ads"
          icon={Layout}
          description="Dynamic ads that can be placed anywhere in content body"
          isOpen={openSections.includes('bodyAds')}
          onToggle={() => toggleSection('bodyAds')}
          isEnabled={form.bodyAds?.enabled}
        >
          <div className="space-y-6 pt-4">
            <Toggle
              enabled={form.bodyAds?.enabled}
              onChange={(v) => updateField('bodyAds', 'enabled', v)}
              label="Enable Body Ads System"
              description="Show dynamic advertisements throughout content"
            />

            {form.bodyAds?.enabled && (
              <>
                {/* Global Settings */}
                <div className="p-4 border border-dark-200 dark:border-dark-700 rounded-xl">
                  <h4 className="font-medium text-dark-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Global Body Ad Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Max Ads Per Page"
                      type="number"
                      value={form.bodyAds?.globalSettings?.maxAdsPerPage || 5}
                      onChange={(e) => updateField('bodyAds', 'globalSettings', {
                        ...form.bodyAds?.globalSettings,
                        maxAdsPerPage: parseInt(e.target.value)
                      })}
                      min={1}
                      max={20}
                    />
                    <Input
                      label="Min Spacing Between Ads"
                      type="number"
                      value={form.bodyAds?.globalSettings?.minSpacingBetweenAds || 3}
                      onChange={(e) => updateField('bodyAds', 'globalSettings', {
                        ...form.bodyAds?.globalSettings,
                        minSpacingBetweenAds: parseInt(e.target.value)
                      })}
                      min={1}
                      max={10}
                    />
                    <div>
                      <label className="label">Default Animation</label>
                      <select
                        value={form.bodyAds?.globalSettings?.defaultAnimation || 'fade'}
                        onChange={(e) => updateField('bodyAds', 'globalSettings', {
                          ...form.bodyAds?.globalSettings,
                          defaultAnimation: e.target.value
                        })}
                        className="input"
                      >
                        <option value="none">None</option>
                        <option value="fade">Fade In</option>
                        <option value="slide">Slide Up</option>
                        <option value="zoom">Zoom In</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Toggle
                      enabled={form.bodyAds?.globalSettings?.lazyLoad ?? true}
                      onChange={(v) => updateField('bodyAds', 'globalSettings', {
                        ...form.bodyAds?.globalSettings,
                        lazyLoad: v
                      })}
                      label="Lazy Load Ads"
                      description="Load ads only when they're about to be visible"
                    />
                  </div>
                </div>

                {/* Ads List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-dark-900 dark:text-white">
                      Body Advertisements ({(form.bodyAds?.ads || []).length})
                    </h4>
                    <Button
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        const newAd = {
                          _id: Date.now().toString(),
                          name: `Ad ${(form.bodyAds?.ads || []).length + 1}`,
                          isActive: true,
                          type: 'image',
                          imageUrl: '',
                          mobileImageUrl: '',
                          linkUrl: '',
                          linkTarget: '_blank',
                          htmlContent: '',
                          altText: '',
                          style: 'banner',
                          size: 'responsive',
                          alignment: 'center',
                          maxWidth: 728,
                          backgroundColor: '',
                          borderRadius: 8,
                          padding: 16,
                          showLabel: true,
                          labelText: 'Advertisement',
                          placement: 'between_sections',
                          sectionIndex: 2,
                          paragraphIndex: 3,
                          placementId: '',
                          showOnPages: 'all',
                          showOnMobile: true,
                          showOnDesktop: true,
                          showForLoggedIn: true,
                          showForGuests: true,
                          startDate: null,
                          endDate: null,
                          priority: 0,
                          order: (form.bodyAds?.ads || []).length,
                          frequency: 'always',
                          animation: 'fade',
                          createdAt: new Date().toISOString(),
                        };
                        updateField('bodyAds', 'ads', [...(form.bodyAds?.ads || []), newAd]);
                      }}
                    >
                      Add New Body Ad
                    </Button>
                  </div>

                  {(form.bodyAds?.ads || []).length === 0 ? (
                    <div className="text-center py-8 bg-dark-50 dark:bg-dark-800 rounded-xl">
                      <Image className="w-12 h-12 mx-auto text-dark-300 mb-3" />
                      <p className="text-dark-500">No body ads created yet</p>
                      <p className="text-sm text-dark-400">Click "Add New Body Ad" to create dynamic content ads</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(form.bodyAds?.ads || []).map((ad, index) => (
                        <div 
                          key={ad._id} 
                          className={`p-4 border rounded-xl transition-colors ${
                            ad.isActive 
                              ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10' 
                              : 'border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800/50'
                          }`}
                        >
                          {/* Ad Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 flex-shrink-0 bg-dark-100 dark:bg-dark-700 rounded-lg overflow-hidden">
                                {ad.imageUrl ? (
                                  <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-dark-400">
                                    <Image className="w-6 h-6" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-dark-900 dark:text-white">{ad.name || `Ad #${index + 1}`}</span>
                                  <button
                                    onClick={() => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], isActive: !ad.isActive };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                      ad.isActive 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                        : 'bg-dark-200 text-dark-500 dark:bg-dark-600'
                                    }`}
                                  >
                                    {ad.isActive ? 'Active' : 'Inactive'}
                                  </button>
                                </div>
                                <p className="text-sm text-dark-500">
                                  {ad.placement?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                                  {ad.placement === 'between_sections' && ` (After Section ${ad.sectionIndex + 1})`}
                                  {ad.placement === 'in_article' && ` (After Paragraph ${ad.paragraphIndex})`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  if (index > 0) {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    [newAds[index - 1], newAds[index]] = [newAds[index], newAds[index - 1]];
                                    updateField('bodyAds', 'ads', newAds);
                                  }
                                }}
                                disabled={index === 0}
                                className="p-1.5 hover:bg-dark-100 dark:hover:bg-dark-700 rounded disabled:opacity-30"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (index < (form.bodyAds?.ads || []).length - 1) {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    [newAds[index], newAds[index + 1]] = [newAds[index + 1], newAds[index]];
                                    updateField('bodyAds', 'ads', newAds);
                                  }
                                }}
                                disabled={index === (form.bodyAds?.ads || []).length - 1}
                                className="p-1.5 hover:bg-dark-100 dark:hover:bg-dark-700 rounded disabled:opacity-30"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteAdModal({ type: 'bodyAds', index })}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Ad Form */}
                          <div className="space-y-4">
                            {/* Basic Info Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <Input
                                label="Ad Name"
                                value={ad.name || ''}
                                onChange={(e) => {
                                  const newAds = [...(form.bodyAds?.ads || [])];
                                  newAds[index] = { ...newAds[index], name: e.target.value };
                                  updateField('bodyAds', 'ads', newAds);
                                }}
                                placeholder="My Ad"
                              />
                              <div>
                                <label className="label">Ad Type</label>
                                <select
                                  value={ad.type || 'image'}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], type: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="input"
                                >
                                  <option value="image">Image</option>
                                  <option value="html">Custom HTML</option>
                                  <option value="adsense">Google AdSense</option>
                                  <option value="video">Video</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Style</label>
                                <select
                                  value={ad.style || 'banner'}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], style: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="input"
                                >
                                  <option value="banner">Banner</option>
                                  <option value="card">Card</option>
                                  <option value="native">Native</option>
                                  <option value="fullwidth">Full Width</option>
                                  <option value="inline">Inline</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Size</label>
                                <select
                                  value={ad.size || 'responsive'}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], size: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="input"
                                >
                                  <option value="small">Small</option>
                                  <option value="medium">Medium</option>
                                  <option value="large">Large</option>
                                  <option value="responsive">Responsive</option>
                                </select>
                              </div>
                            </div>

                            {/* Image URLs (for image type) */}
                            {ad.type === 'image' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input
                                  label="Desktop Image URL"
                                  value={ad.imageUrl || ''}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], imageUrl: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  placeholder="https://..."
                                />
                                <Input
                                  label="Mobile Image URL (optional)"
                                  value={ad.mobileImageUrl || ''}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], mobileImageUrl: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  placeholder="https://..."
                                />
                              </div>
                            )}

                            {/* HTML Content (for html/adsense type) */}
                            {(ad.type === 'html' || ad.type === 'adsense') && (
                              <div>
                                <label className="label">HTML/Script Content</label>
                                <textarea
                                  value={ad.htmlContent || ''}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], htmlContent: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="input min-h-[100px] font-mono text-sm"
                                  placeholder="<script>...</script> or <ins>...</ins>"
                                />
                              </div>
                            )}

                            {/* Link Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <Input
                                label="Link URL"
                                value={ad.linkUrl || ''}
                                onChange={(e) => {
                                  const newAds = [...(form.bodyAds?.ads || [])];
                                  newAds[index] = { ...newAds[index], linkUrl: e.target.value };
                                  updateField('bodyAds', 'ads', newAds);
                                }}
                                placeholder="https://..."
                                className="md:col-span-2"
                              />
                              <div>
                                <label className="label">Open Link In</label>
                                <select
                                  value={ad.linkTarget || '_blank'}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], linkTarget: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="input"
                                >
                                  <option value="_blank">New Tab</option>
                                  <option value="_self">Same Tab</option>
                                </select>
                              </div>
                            </div>

                            {/* Placement Settings */}
                            <div className="p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
                              <h5 className="text-sm font-medium text-dark-900 dark:text-white mb-3">Placement Settings</h5>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="label">Placement</label>
                                  <select
                                    value={ad.placement || 'between_sections'}
                                    onChange={(e) => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], placement: e.target.value };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    className="input"
                                  >
                                    <option value="after_hero">After Hero Section</option>
                                    <option value="between_sections">Between Sections</option>
                                    <option value="in_article">In Article Content</option>
                                    <option value="after_article">After Article</option>
                                    <option value="before_comments">Before Comments</option>
                                    <option value="in_category">In Category Listing</option>
                                    <option value="in_search">In Search Results</option>
                                    <option value="custom">Custom (by ID)</option>
                                  </select>
                                </div>
                                {ad.placement === 'between_sections' && (
                                  <Input
                                    label="After Section #"
                                    type="number"
                                    value={ad.sectionIndex ?? 2}
                                    onChange={(e) => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], sectionIndex: parseInt(e.target.value) };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    min={0}
                                    max={20}
                                  />
                                )}
                                {ad.placement === 'in_article' && (
                                  <Input
                                    label="After Paragraph #"
                                    type="number"
                                    value={ad.paragraphIndex ?? 3}
                                    onChange={(e) => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], paragraphIndex: parseInt(e.target.value) };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    min={1}
                                    max={50}
                                  />
                                )}
                                {ad.placement === 'custom' && (
                                  <Input
                                    label="Placement ID"
                                    value={ad.placementId || ''}
                                    onChange={(e) => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], placementId: e.target.value };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    placeholder="custom-slot-1"
                                  />
                                )}
                                <div>
                                  <label className="label">Show On Pages</label>
                                  <select
                                    value={ad.showOnPages || 'all'}
                                    onChange={(e) => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], showOnPages: e.target.value };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    className="input"
                                  >
                                    <option value="all">All Pages</option>
                                    <option value="homepage">Homepage Only</option>
                                    <option value="articles">Articles Only</option>
                                    <option value="category">Category Pages</option>
                                    <option value="search">Search Results</option>
                                  </select>
                                </div>
                                <Input
                                  label="Priority"
                                  type="number"
                                  value={ad.priority ?? 0}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], priority: parseInt(e.target.value) };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  min={0}
                                  max={100}
                                />
                              </div>
                            </div>

                            {/* Display & Targeting */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="flex items-center gap-2 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
                                <input
                                  type="checkbox"
                                  checked={ad.showOnDesktop ?? true}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], showOnDesktop: e.target.checked };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="w-4 h-4 rounded border-dark-300"
                                />
                                <label className="text-sm text-dark-700 dark:text-dark-300 flex items-center gap-1">
                                  <Monitor className="w-4 h-4" /> Desktop
                                </label>
                              </div>
                              <div className="flex items-center gap-2 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
                                <input
                                  type="checkbox"
                                  checked={ad.showOnMobile ?? true}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], showOnMobile: e.target.checked };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="w-4 h-4 rounded border-dark-300"
                                />
                                <label className="text-sm text-dark-700 dark:text-dark-300 flex items-center gap-1">
                                  <Smartphone className="w-4 h-4" /> Mobile
                                </label>
                              </div>
                              <div className="flex items-center gap-2 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
                                <input
                                  type="checkbox"
                                  checked={ad.showLabel ?? true}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], showLabel: e.target.checked };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="w-4 h-4 rounded border-dark-300"
                                />
                                <label className="text-sm text-dark-700 dark:text-dark-300">Show Label</label>
                              </div>
                              <div>
                                <label className="label">Alignment</label>
                                <select
                                  value={ad.alignment || 'center'}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], alignment: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  className="input"
                                >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                                </select>
                              </div>
                            </div>

                            {/* Advanced Settings (collapsible) */}
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                                Advanced Settings
                              </summary>
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input
                                  label="Max Width (px)"
                                  type="number"
                                  value={ad.maxWidth || 728}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], maxWidth: parseInt(e.target.value) };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                />
                                <Input
                                  label="Border Radius (px)"
                                  type="number"
                                  value={ad.borderRadius ?? 8}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], borderRadius: parseInt(e.target.value) };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                />
                                <Input
                                  label="Padding (px)"
                                  type="number"
                                  value={ad.padding ?? 16}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], padding: parseInt(e.target.value) };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                />
                                <div>
                                  <label className="label">Animation</label>
                                  <select
                                    value={ad.animation || 'fade'}
                                    onChange={(e) => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], animation: e.target.value };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    className="input"
                                  >
                                    <option value="none">None</option>
                                    <option value="fade">Fade</option>
                                    <option value="slide">Slide</option>
                                    <option value="zoom">Zoom</option>
                                  </select>
                                </div>
                                <Input
                                  label="Background Color"
                                  type="color"
                                  value={ad.backgroundColor || '#ffffff'}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], backgroundColor: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                />
                                <Input
                                  label="Alt Text"
                                  value={ad.altText || ''}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], altText: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                  placeholder="Advertisement description"
                                />
                                <Input
                                  label="Label Text"
                                  value={ad.labelText || 'Advertisement'}
                                  onChange={(e) => {
                                    const newAds = [...(form.bodyAds?.ads || [])];
                                    newAds[index] = { ...newAds[index], labelText: e.target.value };
                                    updateField('bodyAds', 'ads', newAds);
                                  }}
                                />
                                <div>
                                  <label className="label">Frequency</label>
                                  <select
                                    value={ad.frequency || 'always'}
                                    onChange={(e) => {
                                      const newAds = [...(form.bodyAds?.ads || [])];
                                      newAds[index] = { ...newAds[index], frequency: e.target.value };
                                      updateField('bodyAds', 'ads', newAds);
                                    }}
                                    className="input"
                                  >
                                    <option value="always">Always</option>
                                    <option value="once_per_page">Once Per Page</option>
                                    <option value="once_per_session">Once Per Session</option>
                                  </select>
                                </div>
                              </div>
                            </details>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </AdSection>

        {/* Mobile Ads */}
        <AdSection
          id="mobileAds"
          label="Mobile Ads"
          icon={Smartphone}
          description="Ads specifically for mobile devices"
          isOpen={openSections.includes('mobileAds')}
          onToggle={() => toggleSection('mobileAds')}
          isEnabled={form.mobileAds?.stickyBottomEnabled || form.mobileAds?.interstitialEnabled}
        >
          <div className="space-y-6 pt-4">
            {/* Sticky Bottom */}
            <div className="p-4 border border-dark-200 dark:border-dark-700 rounded-lg">
              <Toggle
                enabled={form.mobileAds?.stickyBottomEnabled}
                onChange={(v) => updateField('mobileAds', 'stickyBottomEnabled', v)}
                label="Sticky Bottom Banner"
                description="Fixed banner at bottom of mobile screen"
              />
              {form.mobileAds?.stickyBottomEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Input
                    label="Image URL"
                    value={form.mobileAds?.stickyBottomImageUrl || ''}
                    onChange={(e) => updateField('mobileAds', 'stickyBottomImageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Link URL"
                    value={form.mobileAds?.stickyBottomLinkUrl || ''}
                    onChange={(e) => updateField('mobileAds', 'stickyBottomLinkUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Height (px)"
                    type="number"
                    value={form.mobileAds?.stickyBottomHeight || 60}
                    onChange={(e) => updateField('mobileAds', 'stickyBottomHeight', parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Interstitial */}
            <div className="p-4 border border-dark-200 dark:border-dark-700 rounded-lg">
              <Toggle
                enabled={form.mobileAds?.interstitialEnabled}
                onChange={(v) => updateField('mobileAds', 'interstitialEnabled', v)}
                label="Fullscreen Interstitial"
                description="Full-screen ad on mobile (shows countdown)"
              />
              {form.mobileAds?.interstitialEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Image URL"
                    value={form.mobileAds?.interstitialImageUrl || ''}
                    onChange={(e) => updateField('mobileAds', 'interstitialImageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Link URL"
                    value={form.mobileAds?.interstitialLinkUrl || ''}
                    onChange={(e) => updateField('mobileAds', 'interstitialLinkUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <div>
                    <label className="label">Show Frequency</label>
                    <select
                      value={form.mobileAds?.interstitialFrequency || 'once_per_session'}
                      onChange={(e) => updateField('mobileAds', 'interstitialFrequency', e.target.value)}
                      className="input"
                    >
                      <option value="every_page">Every Page</option>
                      <option value="once_per_session">Once Per Session</option>
                      <option value="once_per_day">Once Per Day</option>
                    </select>
                  </div>
                  <Input
                    label="Close After (seconds)"
                    type="number"
                    value={(form.mobileAds?.interstitialAutoClose || 5000) / 1000}
                    onChange={(e) => updateField('mobileAds', 'interstitialAutoClose', parseInt(e.target.value) * 1000)}
                    min={3}
                  />
                </div>
              )}
            </div>
          </div>
        </AdSection>

        {/* In-Article Ad */}
        <AdSection
          id="inArticleAd"
          label="In-Article Ad"
          icon={Layout}
          description="Ad placement within article content"
          isOpen={openSections.includes('inArticleAd')}
          onToggle={() => toggleSection('inArticleAd')}
          isEnabled={form.inArticleAd?.enabled}
        >
          <div className="space-y-4 pt-4">
            <Toggle
              enabled={form.inArticleAd?.enabled}
              onChange={(v) => updateField('inArticleAd', 'enabled', v)}
              label="Enable In-Article Ads"
            />

            {form.inArticleAd?.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Desktop Image URL"
                    value={form.inArticleAd?.imageUrl || ''}
                    onChange={(e) => updateField('inArticleAd', 'imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Mobile Image URL"
                    value={form.inArticleAd?.mobileImageUrl || ''}
                    onChange={(e) => updateField('inArticleAd', 'mobileImageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Link URL"
                    value={form.inArticleAd?.linkUrl || ''}
                    onChange={(e) => updateField('inArticleAd', 'linkUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="After Paragraph #"
                    type="number"
                    value={form.inArticleAd?.position || 3}
                    onChange={(e) => updateField('inArticleAd', 'position', parseInt(e.target.value))}
                    min={1}
                  />
                  <div>
                    <label className="label">Style</label>
                    <select
                      value={form.inArticleAd?.style || 'banner'}
                      onChange={(e) => updateField('inArticleAd', 'style', e.target.value)}
                      className="input"
                    >
                      <option value="banner">Banner</option>
                      <option value="native">Native</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <Toggle
                    enabled={form.inArticleAd?.showLabel ?? true}
                    onChange={(v) => updateField('inArticleAd', 'showLabel', v)}
                    label="Show 'Advertisement' Label"
                  />
                </div>
                <div>
                  <label className="label">HTML Content (optional, used if no image)</label>
                  <textarea
                    value={form.inArticleAd?.content || ''}
                    onChange={(e) => updateField('inArticleAd', 'content', e.target.value)}
                    placeholder="<div>Your ad HTML here...</div>"
                    className="input font-mono text-sm"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        </AdSection>

        {/* Scroll Ad */}
        <AdSection
          id="scrollAd"
          label="Scroll-Triggered Ad"
          icon={Scroll}
          description="Appears after user scrolls a certain percentage"
          isOpen={openSections.includes('scrollAd')}
          onToggle={() => toggleSection('scrollAd')}
          isEnabled={form.scrollAd?.enabled}
        >
          <div className="space-y-4 pt-4">
            <Toggle
              enabled={form.scrollAd?.enabled}
              onChange={(v) => updateField('scrollAd', 'enabled', v)}
              label="Enable Scroll Ad"
            />

            {form.scrollAd?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Image URL"
                  value={form.scrollAd?.imageUrl || ''}
                  onChange={(e) => updateField('scrollAd', 'imageUrl', e.target.value)}
                  placeholder="https://..."
                />
                <Input
                  label="Link URL"
                  value={form.scrollAd?.linkUrl || ''}
                  onChange={(e) => updateField('scrollAd', 'linkUrl', e.target.value)}
                  placeholder="https://..."
                />
                <Input
                  label="Trigger at Scroll %"
                  type="number"
                  value={form.scrollAd?.triggerAt || 50}
                  onChange={(e) => updateField('scrollAd', 'triggerAt', parseInt(e.target.value))}
                  min={10}
                  max={90}
                />
                <div>
                  <label className="label">Position</label>
                  <select
                    value={form.scrollAd?.position || 'bottom-right'}
                    onChange={(e) => updateField('scrollAd', 'position', e.target.value)}
                    className="input"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="center">Center</option>
                  </select>
                </div>
                <Toggle
                  enabled={form.scrollAd?.autoClose ?? true}
                  onChange={(v) => updateField('scrollAd', 'autoClose', v)}
                  label="Auto Close"
                />
                {form.scrollAd?.autoClose && (
                  <Input
                    label="Auto Close After (seconds)"
                    type="number"
                    value={(form.scrollAd?.autoCloseDelay || 8000) / 1000}
                    onChange={(e) => updateField('scrollAd', 'autoCloseDelay', parseInt(e.target.value) * 1000)}
                    min={3}
                  />
                )}
              </div>
            )}
          </div>
        </AdSection>

        {/* Exit Popup */}
        <AdSection
          id="exitPopup"
          label="Exit Intent Popup"
          icon={LogOut}
          description="Shows when user tries to leave (Desktop only)"
          isOpen={openSections.includes('exitPopup')}
          onToggle={() => toggleSection('exitPopup')}
          isEnabled={form.exitPopup?.enabled}
        >
          <div className="space-y-4 pt-4">
            <Toggle
              enabled={form.exitPopup?.enabled}
              onChange={(v) => updateField('exitPopup', 'enabled', v)}
              label="Enable Exit Popup"
            />

            {form.exitPopup?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Title"
                  value={form.exitPopup?.title || ''}
                  onChange={(e) => updateField('exitPopup', 'title', e.target.value)}
                  placeholder="Wait! Before you go..."
                />
                <Input
                  label="Button Text"
                  value={form.exitPopup?.buttonText || ''}
                  onChange={(e) => updateField('exitPopup', 'buttonText', e.target.value)}
                  placeholder="Stay & Explore"
                />
                <Input
                  label="Image URL"
                  value={form.exitPopup?.imageUrl || ''}
                  onChange={(e) => updateField('exitPopup', 'imageUrl', e.target.value)}
                  placeholder="https://..."
                />
                <Input
                  label="Link URL"
                  value={form.exitPopup?.linkUrl || ''}
                  onChange={(e) => updateField('exitPopup', 'linkUrl', e.target.value)}
                  placeholder="https://..."
                />
                <div className="md:col-span-2">
                  <label className="label">Content (HTML)</label>
                  <textarea
                    value={form.exitPopup?.content || ''}
                    onChange={(e) => updateField('exitPopup', 'content', e.target.value)}
                    className="input"
                    rows={2}
                    placeholder="Subscribe to our newsletter..."
                  />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select
                    value={form.exitPopup?.frequency || 'once_per_session'}
                    onChange={(e) => updateField('exitPopup', 'frequency', e.target.value)}
                    className="input"
                  >
                    <option value="always">Always</option>
                    <option value="once_per_session">Once Per Session</option>
                    <option value="once_per_day">Once Per Day</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </AdSection>

        {/* Global Settings */}
        <AdSection
          id="adsGlobal"
          label="Global Ad Settings"
          icon={Settings}
          description="Master controls affecting all ad placements"
          isOpen={openSections.includes('adsGlobal')}
          onToggle={() => toggleSection('adsGlobal')}
          isEnabled={true}
        >
          <div className="space-y-4 pt-4">
            <Toggle
              enabled={form.adsGlobal?.masterSwitch ?? true}
              onChange={(v) => updateField('adsGlobal', 'masterSwitch', v)}
              label="Master Switch"
              description="Turn all ads on/off instantly"
            />
            <Toggle
              enabled={form.adsGlobal?.hideForLoggedIn}
              onChange={(v) => updateField('adsGlobal', 'hideForLoggedIn', v)}
              label="Hide for Logged In Users"
              description="Don't show ads to authenticated users"
            />
            <Toggle
              enabled={form.adsGlobal?.hideForAdmin ?? true}
              onChange={(v) => updateField('adsGlobal', 'hideForAdmin', v)}
              label="Hide for Admins"
              description="Don't show ads to admin users"
            />
            <Toggle
              enabled={form.adsGlobal?.analyticsEnabled ?? true}
              onChange={(v) => updateField('adsGlobal', 'analyticsEnabled', v)}
              label="Track Ad Analytics"
              description="Log impressions and clicks"
            />
          </div>
        </AdSection>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={handleSave} 
          isLoading={isSaving} 
          size="lg"
          className="shadow-lg"
          leftIcon={<Save className="w-5 h-5" />}
        >
          Save Changes
        </Button>
      </div>

      {/* Delete Ad Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteAdModal !== null}
        onClose={() => setDeleteAdModal(null)}
        onConfirm={() => {
          if (deleteAdModal?.type === 'bodyAds') {
            const newAds = (form.bodyAds?.ads || []).filter((_, i) => i !== deleteAdModal.index);
            updateField('bodyAds', 'ads', newAds);
          }
          setDeleteAdModal(null);
        }}
        title="Delete Ad"
        message="Are you sure you want to delete this ad? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        icon={Trash2}
      />
    </>
  );
}

export default AdsControlPage;
