import mongoose from 'mongoose';

// Widget schema for sidebar/footer widgets
const widgetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['recent_posts', 'categories', 'tags', 'newsletter', 'social_links', 'custom_html', 'advertisement', 'popular_posts', 'author_box'],
    required: true 
  },
  title: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  position: { type: String, enum: ['sidebar', 'footer'], default: 'sidebar' },
  order: { type: Number, default: 0 },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

// Menu item schema
const menuItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  url: { type: String, default: '' },
  type: { type: String, enum: ['link', 'page', 'category', 'dropdown'], default: 'link' },
  target: { type: String, enum: ['_self', '_blank'], default: '_self' },
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
  children: [{ type: mongoose.Schema.Types.Mixed }],
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Page' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
}, { _id: false });

// Homepage section schema for dynamic layout
const homeSectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'hero', 
      'featured_articles', 
      'category_grid', 
      'latest_articles', 
      'breaking_news',
      'newsletter_signup',
      'custom_html',
      'trending',
      'editor_picks',
      'video_section',
      'category_spotlight',
      'category_tabs',
      'news_list',
      'grid_with_sidebar',
      'magazine_layout',
      'author_spotlight',
      'advertisement',
      'ad_banner',
      'video'
    ],
    required: true 
  },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  settings: {
    layout: { type: String, default: 'grid' }, // grid, list, carousel, masonry
    columns: { type: Number, default: 3 },
    limit: { type: Number, default: 6 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    categorySlug: { type: String, default: '' }, // For category_spotlight section
    showExcerpt: { type: Boolean, default: true },
    showAuthor: { type: Boolean, default: true },
    showDate: { type: Boolean, default: true },
    showCategory: { type: Boolean, default: true },
    showReadTime: { type: Boolean, default: false },
    customHtml: { type: String, default: '' },
    backgroundColor: { type: String, default: '' },
    textColor: { type: String, default: '' },
    sidebarTitle: { type: String, default: 'More Stories' },
    imageUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    altText: { type: String, default: '' },
    position: { type: String, default: 'horizontal' },
    adId: { type: String, default: '' },
    fallbackImageUrl: { type: String, default: '' },
    fallbackLinkUrl: { type: String, default: '' },
    showLabel: { type: Boolean, default: true },
    placement: { type: String, default: 'custom' },
    placementId: { type: String, default: '' }
  }
}, { _id: false });

// Social link schema
const socialLinkSchema = new mongoose.Schema({
  platform: { 
    type: String, 
    enum: ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'telegram', 'whatsapp', 'github', 'discord'],
    required: true 
  },
  url: { type: String, required: true },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
  // Basic Site Info
  siteName: { type: String, default: 'Bassac Post' },
  siteTagline: { type: String, default: 'Your trusted source for news and insights' },
  siteDescription: { type: String, default: '' },
  siteLogo: { type: String, default: '' },
  siteFavicon: { type: String, default: '' },
  siteEmail: { type: String, default: '' },
  sitePhone: { type: String, default: '' },
  siteAddress: { type: String, default: '' },
  
  // Branding
  primaryColor: { type: String, default: '#2563eb' },
  secondaryColor: { type: String, default: '#64748b' },
  accentColor: { type: String, default: '#f59e0b' },
  
  // SEO Settings
  seo: {
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    metaKeywords: [String],
    ogImage: { type: String, default: '' },
    googleAnalyticsId: { type: String, default: '' },
    googleTagManagerId: { type: String, default: '' },
    facebookPixelId: { type: String, default: '' },
    enableSitemap: { type: Boolean, default: true },
    enableRobotsTxt: { type: Boolean, default: true }
  },
  
  // Social Links
  socialLinks: [socialLinkSchema],
  
  // Navigation Menus
  menus: {
    header: [menuItemSchema],
    footer: [menuItemSchema],
    mobile: [menuItemSchema]
  },
  
  // Homepage Layout
  homepageSections: [homeSectionSchema],
  
  // Widgets
  widgets: [widgetSchema],
  
  // Article Settings
  articleSettings: {
    defaultLayout: { type: String, enum: ['standard', 'wide', 'full'], default: 'standard' },
    enableComments: { type: Boolean, default: true },
    enableSharing: { type: Boolean, default: true },
    enableRelatedPosts: { type: Boolean, default: true },
    relatedPostsCount: { type: Number, default: 4 },
    enableAuthorBox: { type: Boolean, default: true },
    enableTableOfContents: { type: Boolean, default: false },
    enableReadingProgress: { type: Boolean, default: true }
  },
  
  // Header Settings
  headerSettings: {
    layout: { type: String, enum: ['default', 'centered', 'minimal'], default: 'default' },
    sticky: { type: Boolean, default: true },
    showSearch: { type: Boolean, default: true },
    showDarkModeToggle: { type: Boolean, default: true },
    showCategories: { type: Boolean, default: true },
    breakingNewsEnabled: { type: Boolean, default: true },
    breakingNewsText: { type: String, default: '' }
  },
  
  // Footer Settings
  footerSettings: {
    layout: { type: String, enum: ['default', 'minimal', 'centered'], default: 'default' },
    copyrightText: { type: String, default: '© {year} Bassac Post. All rights reserved.' },
    showSocialLinks: { type: Boolean, default: true },
    showNewsletter: { type: Boolean, default: true },
    columns: { type: Number, default: 4 }
  },
  
  // Features Toggle
  features: {
    enableNewsletter: { type: Boolean, default: true },
    enableContactForm: { type: Boolean, default: true },
    enableSearch: { type: Boolean, default: true },
    enableDarkMode: { type: Boolean, default: true },
    enablePWA: { type: Boolean, default: false },
    enableAMP: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'Site is under maintenance. Please check back later.' }
  },
  
  // Custom Code
  customCode: {
    headerScripts: { type: String, default: '' },
    footerScripts: { type: String, default: '' },
    customCSS: { type: String, default: '' }
  },
  
  // ==================== COMPREHENSIVE ADS SYSTEM ====================
  
  // Welcome/Entry Popup Ad (shows when user enters site)
  welcomePopup: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    mobileImageUrl: { type: String, default: '' }, // Different image for mobile
    linkUrl: { type: String, default: '' },
    buttonText: { type: String, default: 'Learn More' },
    secondaryButtonText: { type: String, default: '' }, // Optional secondary button
    secondaryButtonUrl: { type: String, default: '' },
    delay: { type: Number, default: 2000 },
    autoClose: { type: Boolean, default: true },
    autoCloseDelay: { type: Number, default: 10000 }, // Auto close after 10s
    showCloseButton: { type: Boolean, default: true },
    closeButtonDelay: { type: Number, default: 0 }, // Delay before showing X button
    animation: { type: String, enum: ['fade', 'slide', 'zoom', 'bounce'], default: 'zoom' },
    position: { type: String, enum: ['center', 'bottom', 'top'], default: 'center' },
    size: { type: String, enum: ['small', 'medium', 'large', 'fullscreen'], default: 'medium' },
    theme: { type: String, enum: ['light', 'dark', 'gradient', 'image'], default: 'light' },
    overlayColor: { type: String, default: 'rgba(0,0,0,0.6)' },
    borderRadius: { type: Number, default: 16 },
    showOnMobile: { type: Boolean, default: true },
    showOnDesktop: { type: Boolean, default: true },
    frequency: { type: String, enum: ['always', 'once_per_session', 'once_per_day', 'once_per_week', 'once_ever'], default: 'once_per_session' },
    pages: { type: String, enum: ['all', 'homepage', 'articles', 'category'], default: 'homepage' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },

  // Floating/Sticky Banner Ad (bottom or top of screen)
  floatingBanner: {
    enabled: { type: Boolean, default: false },
    position: { type: String, enum: ['top', 'bottom'], default: 'bottom' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    mobileImageUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    backgroundColor: { type: String, default: '#1e40af' },
    textColor: { type: String, default: '#ffffff' },
    showCloseButton: { type: Boolean, default: true },
    autoHide: { type: Boolean, default: false },
    autoHideDelay: { type: Number, default: 15000 },
    showOnMobile: { type: Boolean, default: true },
    showOnDesktop: { type: Boolean, default: true },
    height: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    frequency: { type: String, enum: ['always', 'once_per_session', 'once_per_day'], default: 'once_per_session' },
  },

  // In-Article Ads (legacy - kept for backward compatibility, use /api/ads instead)
  inArticleAd: {
    enabled: { type: Boolean, default: false },
    position: { type: Number, default: 3 }, // After which paragraph
    imageUrl: { type: String, default: '' },
    mobileImageUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    content: { type: String, default: '' },
    showLabel: { type: Boolean, default: true }, // "Advertisement" label
    style: { type: String, enum: ['banner', 'native', 'card'], default: 'banner' },
  },

  // Mobile-Specific Ads
  mobileAds: {
    // Sticky bottom banner for mobile
    stickyBottomEnabled: { type: Boolean, default: false },
    stickyBottomImageUrl: { type: String, default: '' },
    stickyBottomLinkUrl: { type: String, default: '' },
    stickyBottomHeight: { type: Number, default: 60 },
    // Interstitial (full-screen mobile ad)
    interstitialEnabled: { type: Boolean, default: false },
    interstitialImageUrl: { type: String, default: '' },
    interstitialLinkUrl: { type: String, default: '' },
    interstitialFrequency: { type: String, enum: ['every_page', 'once_per_session', 'once_per_day'], default: 'once_per_session' },
    interstitialDelay: { type: Number, default: 3000 },
    interstitialAutoClose: { type: Number, default: 5000 },
  },

  // Exit Intent Popup (shows when user tries to leave)
  exitPopup: {
    enabled: { type: Boolean, default: false },
    title: { type: String, default: 'Wait! Before you go...' },
    content: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    buttonText: { type: String, default: 'Stay & Explore' },
    showOnMobile: { type: Boolean, default: false }, // Usually disabled on mobile
    frequency: { type: String, enum: ['always', 'once_per_session', 'once_per_day'], default: 'once_per_session' },
  },

  // Scroll-Triggered Ad (shows after scrolling certain %)
  scrollAd: {
    enabled: { type: Boolean, default: false },
    triggerAt: { type: Number, default: 50 }, // Percentage scrolled
    imageUrl: { type: String, default: '' },
    mobileImageUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },
    position: { type: String, enum: ['bottom-right', 'bottom-left', 'center'], default: 'bottom-right' },
    autoClose: { type: Boolean, default: true },
    autoCloseDelay: { type: Number, default: 8000 },
    frequency: { type: String, enum: ['always', 'once_per_session', 'once_per_day'], default: 'once_per_session' },
  },

  // Global Ad Settings
  adsGlobal: {
    masterSwitch: { type: Boolean, default: true }, // Kill switch for all ads
    respectDoNotTrack: { type: Boolean, default: false },
    hideForLoggedIn: { type: Boolean, default: false },
    hideForAdmin: { type: Boolean, default: true },
    loadingStrategy: { type: String, enum: ['eager', 'lazy', 'intersection'], default: 'lazy' },
    analyticsEnabled: { type: Boolean, default: true },
  }
}, {
  timestamps: true,
  collection: 'sitesettings'
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
    return settings;
  }

  // One-time runtime normalization for legacy branding values.
  let shouldSave = false;
  if (settings.siteName === 'Bassac Media Center' || settings.siteName === 'Bassac Media') {
    settings.siteName = 'Bassac Post';
    shouldSave = true;
  }
  if (
    settings.footerSettings?.copyrightText
    && /Bassac Media Center|Bassac Media/.test(settings.footerSettings.copyrightText)
  ) {
    settings.footerSettings.copyrightText = settings.footerSettings.copyrightText
      .replace(/Bassac Media Center/g, 'Bassac Post')
      .replace(/Bassac Media/g, 'Bassac Post');
    shouldSave = true;
  }
  if (shouldSave) {
    await settings.save();
  }

  return settings;
};

siteSettingsSchema.statics.updateSettings = async function(data) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(data);
  } else {
    Object.assign(settings, data);
    await settings.save();
  }
  return settings;
};

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
