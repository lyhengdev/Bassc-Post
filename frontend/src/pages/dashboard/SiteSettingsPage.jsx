import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Settings, Globe, Palette, Search, Bell, Shield, Code, 
  Save, Upload, Eye, EyeOff, Plus, Trash2, GripVertical,
  Facebook, Twitter, Instagram, Linkedin, Youtube, Github,
  MessageCircle, Send, Hash, Megaphone, ExternalLink
} from 'lucide-react';
import { useSiteSettings, useUpdateSettings, useUpdateBranding, useUpdateSEO, useToggleFeature } from '../../hooks/useApi';
import { Button, Input, Textarea, ContentLoader, Modal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

const SOCIAL_PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'twitter', label: 'Twitter/X', icon: Twitter },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'discord', label: 'Discord', icon: MessageCircle },
  { id: 'tiktok', label: 'TikTok', icon: Hash },
];

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'social', label: 'Social Links', icon: Globe },
  { id: 'features', label: 'Features', icon: Shield },
  { id: 'ads', label: 'Advertisements', icon: Megaphone },
  { id: 'code', label: 'Custom Code', icon: Code },
];

export function SiteSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { data: settings, isLoading } = useSiteSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateSettings();
  const { mutate: updateBranding, isPending: isSavingBranding } = useUpdateBranding();
  const { mutate: updateSEO, isPending: isSavingSEO } = useUpdateSEO();
  const { mutate: toggleFeature } = useToggleFeature();
  
  const [form, setForm] = useState({
    siteName: '',
    siteTagline: '',
    siteDescription: '',
    siteEmail: '',
    sitePhone: '',
    siteAddress: '',
    siteLogo: '',
    siteFavicon: '',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    seo: {
      metaTitle: '',
      metaDescription: '',
      metaKeywords: [],
      ogImage: '',
      googleAnalyticsId: '',
      googleTagManagerId: '',
    },
    socialLinks: [],
    features: {},
    customCode: {
      headerScripts: '',
      footerScripts: '',
      customCSS: '',
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        siteName: settings.siteName || '',
        siteTagline: settings.siteTagline || '',
        siteDescription: settings.siteDescription || '',
        siteEmail: settings.siteEmail || '',
        sitePhone: settings.sitePhone || '',
        siteAddress: settings.siteAddress || '',
        siteLogo: settings.siteLogo || '',
        siteFavicon: settings.siteFavicon || '',
        primaryColor: settings.primaryColor || '#2563eb',
        secondaryColor: settings.secondaryColor || '#64748b',
        accentColor: settings.accentColor || '#f59e0b',
        seo: settings.seo || {},
        socialLinks: settings.socialLinks || [],
        features: settings.features || {},
        customCode: settings.customCode || {},
      });
    }
  }, [settings]);

  const handleSaveGeneral = () => {
    updateSettings({
      siteName: form.siteName,
      siteTagline: form.siteTagline,
      siteDescription: form.siteDescription,
      siteEmail: form.siteEmail,
      sitePhone: form.sitePhone,
      siteAddress: form.siteAddress,
    });
  };

  const handleSaveBranding = () => {
    updateBranding({
      siteLogo: form.siteLogo,
      siteFavicon: form.siteFavicon,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      accentColor: form.accentColor,
    });
  };

  const handleSaveSEO = () => {
    updateSEO(form.seo);
  };

  const handleSaveSocial = () => {
    updateSettings({ socialLinks: form.socialLinks });
  };

  const handleSaveCode = () => {
    updateSettings({ customCode: form.customCode });
  };

  // handleSave removed - ads are now managed in dedicated Ads Control page

  const handleToggleFeature = (feature) => {
    const newValue = !form.features[feature];
    setForm(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: newValue }
    }));
    toggleFeature({ feature, enabled: newValue });
  };

  const addSocialLink = () => {
    setForm(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: 'facebook', url: '', enabled: true }]
    }));
  };

  const removeSocialLink = (index) => {
    setForm(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  const updateSocialLink = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet><title>Site Settings - Bassac Media Center</title></Helmet>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Site Settings</h1>
        <p className="text-dark-500">Configure your website settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-dark-200 dark:border-dark-700 pb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">General Information</h2>
          <div className="space-y-4">
            <Input
              label="Site Name"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              placeholder="Bassac Media Center"
            />
            <Input
              label="Tagline"
              value={form.siteTagline}
              onChange={(e) => setForm({ ...form, siteTagline: e.target.value })}
              placeholder="Your trusted source for news"
            />
            <Textarea
              label="Site Description"
              value={form.siteDescription}
              onChange={(e) => setForm({ ...form, siteDescription: e.target.value })}
              placeholder="A brief description of your website..."
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Email"
                type="email"
                value={form.siteEmail}
                onChange={(e) => setForm({ ...form, siteEmail: e.target.value })}
                placeholder="contact@example.com"
              />
              <Input
                label="Phone Number"
                value={form.sitePhone}
                onChange={(e) => setForm({ ...form, sitePhone: e.target.value })}
                placeholder="+1 234 567 890"
              />
            </div>
            <Textarea
              label="Address"
              value={form.siteAddress}
              onChange={(e) => setForm({ ...form, siteAddress: e.target.value })}
              placeholder="123 Main St, City, Country"
              rows={2}
            />
            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Branding Settings */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Logo & Favicon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Site Logo</label>
                <div className="border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg p-4 text-center">
                  {form.siteLogo ? (
                    <div className="relative inline-block">
                      <img src={form.siteLogo} alt="Logo" className="h-16 mx-auto" />
                      <button
                        onClick={() => setForm({ ...form, siteLogo: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-dark-500">No logo uploaded</p>
                  )}
                  <Input
                    className="mt-2"
                    placeholder="Enter logo URL or upload"
                    value={form.siteLogo}
                    onChange={(e) => setForm({ ...form, siteLogo: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Favicon</label>
                <div className="border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-lg p-4 text-center">
                  {form.siteFavicon ? (
                    <div className="relative inline-block">
                      <img src={form.siteFavicon} alt="Favicon" className="h-8 mx-auto" />
                      <button
                        onClick={() => setForm({ ...form, siteFavicon: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-dark-500">No favicon uploaded</p>
                  )}
                  <Input
                    className="mt-2"
                    placeholder="Enter favicon URL"
                    value={form.siteFavicon}
                    onChange={(e) => setForm({ ...form, siteFavicon: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Brand Colors</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="label">Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="label">Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    value={form.accentColor}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveBranding} isLoading={isSavingBranding} leftIcon={<Save className="w-4 h-4" />}>
                Save Branding
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SEO Settings */}
      {activeTab === 'seo' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">SEO Settings</h2>
          <div className="space-y-4">
            <Input
              label="Default Meta Title"
              value={form.seo.metaTitle || ''}
              onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaTitle: e.target.value } })}
              placeholder="Bassac Media Center - News & Insights"
              maxLength={70}
            />
            <p className="text-xs text-dark-500 -mt-2">{(form.seo.metaTitle || '').length}/70 characters</p>
            
            <Textarea
              label="Default Meta Description"
              value={form.seo.metaDescription || ''}
              onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaDescription: e.target.value } })}
              placeholder="A compelling description for search engines..."
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-dark-500 -mt-2">{(form.seo.metaDescription || '').length}/160 characters</p>

            <Input
              label="Open Graph Image URL"
              value={form.seo.ogImage || ''}
              onChange={(e) => setForm({ ...form, seo: { ...form.seo, ogImage: e.target.value } })}
              placeholder="https://example.com/og-image.jpg"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Google Analytics ID"
                value={form.seo.googleAnalyticsId || ''}
                onChange={(e) => setForm({ ...form, seo: { ...form.seo, googleAnalyticsId: e.target.value } })}
                placeholder="G-XXXXXXXXXX"
              />
              <Input
                label="Google Tag Manager ID"
                value={form.seo.googleTagManagerId || ''}
                onChange={(e) => setForm({ ...form, seo: { ...form.seo, googleTagManagerId: e.target.value } })}
                placeholder="GTM-XXXXXXX"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSEO} isLoading={isSavingSEO} leftIcon={<Save className="w-4 h-4" />}>
                Save SEO Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      {activeTab === 'social' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white">Social Media Links</h2>
            <Button variant="secondary" size="sm" onClick={addSocialLink} leftIcon={<Plus className="w-4 h-4" />}>
              Add Link
            </Button>
          </div>
          
          {form.socialLinks.length === 0 ? (
            <p className="text-dark-500 text-center py-8">No social links added yet</p>
          ) : (
            <div className="space-y-4">
              {form.socialLinks.map((link, index) => {
                const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
                const Icon = platform?.icon || Globe;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
                    <Icon className="w-5 h-5 text-dark-500 flex-shrink-0" />
                    <select
                      value={link.platform}
                      onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                      className="input w-40"
                    >
                      {SOCIAL_PLATFORMS.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <Input
                      className="flex-1"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={link.enabled}
                        onChange={(e) => updateSocialLink(index, 'enabled', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm text-dark-600 dark:text-dark-400">Active</span>
                    </label>
                    <button
                      onClick={() => removeSocialLink(index)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button onClick={handleSaveSocial} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Save Social Links
            </Button>
          </div>
        </div>
      )}

      {/* Features */}
      {activeTab === 'features' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Feature Toggles</h2>
          <div className="space-y-4">
            {[
              { key: 'enableNewsletter', label: 'Newsletter Signup', description: 'Show newsletter subscription form' },
              { key: 'enableContactForm', label: 'Contact Form', description: 'Enable the contact page form' },
              { key: 'enableSearch', label: 'Site Search', description: 'Enable search functionality' },
              { key: 'enableDarkMode', label: 'Dark Mode', description: 'Allow users to switch to dark mode' },
              { key: 'enablePWA', label: 'Progressive Web App', description: 'Enable PWA features (experimental)' },
              { key: 'maintenanceMode', label: 'Maintenance Mode', description: 'Show maintenance page to visitors' },
            ].map(feature => (
              <div key={feature.key} className="flex items-center justify-between p-4 bg-dark-50 dark:bg-dark-800 rounded-lg">
                <div>
                  <p className="font-medium text-dark-900 dark:text-white">{feature.label}</p>
                  <p className="text-sm text-dark-500">{feature.description}</p>
                </div>
                <button
                  onClick={() => handleToggleFeature(feature.key)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.features[feature.key] ? 'bg-primary-600' : 'bg-dark-300 dark:bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      form.features[feature.key] ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advertisements - Redirect to Dedicated Page */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-4">
              <Megaphone className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-dark-900 dark:text-white mb-2">
              Ads Management Has Moved!
            </h2>
            <p className="text-dark-500 mb-6 max-w-md mx-auto">
              We've created a dedicated Ads Control Panel with more features including 
              multiple ads, mobile-specific ads, welcome popups, exit popups, and more.
            </p>
            <Link to="/dashboard/ads">
              <Button size="lg" rightIcon={<ExternalLink className="w-4 h-4" />}>
                Go to Ads Control Panel
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Custom Code */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Custom CSS</h2>
            <textarea
              value={form.customCode.customCSS || ''}
              onChange={(e) => setForm({ ...form, customCode: { ...form.customCode, customCSS: e.target.value } })}
              className="input font-mono text-sm"
              rows={10}
              placeholder="/* Add your custom CSS here */"
            />
          </div>
          
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Header Scripts</h2>
            <textarea
              value={form.customCode.headerScripts || ''}
              onChange={(e) => setForm({ ...form, customCode: { ...form.customCode, headerScripts: e.target.value } })}
              className="input font-mono text-sm"
              rows={6}
              placeholder="<!-- Scripts to add in <head> -->"
            />
          </div>
          
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Footer Scripts</h2>
            <textarea
              value={form.customCode.footerScripts || ''}
              onChange={(e) => setForm({ ...form, customCode: { ...form.customCode, footerScripts: e.target.value } })}
              className="input font-mono text-sm"
              rows={6}
              placeholder="<!-- Scripts to add before </body> -->"
            />
            <div className="flex justify-end mt-4">
              <Button onClick={handleSaveCode} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Save Custom Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
