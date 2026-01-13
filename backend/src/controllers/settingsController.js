import SiteSettings from '../models/SiteSettings.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, badRequestResponse } from '../utils/apiResponse.js';

/**
 * Get site settings
 * GET /api/settings
 */
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSettings();
  return successResponse(res, { settings });
});

/**
 * Update site settings
 * PUT /api/settings
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.updateSettings(req.body);
  return successResponse(res, { settings }, 'Settings updated successfully');
});

/**
 * Get public site settings (for frontend)
 * GET /api/settings/public
 */
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSettings();
  
  // Filter active body ads based on schedule and status
  const now = new Date();
  const activeBodyAds = settings.bodyAds?.ads?.filter(ad => {
    if (!ad.isActive) return false;
    if (ad.startDate && new Date(ad.startDate) > now) return false;
    if (ad.endDate && new Date(ad.endDate) < now) return false;
    return true;
  }).sort((a, b) => (b.priority || 0) - (a.priority || 0) || (a.order || 0) - (b.order || 0)) || [];
  
  // Return only public-facing settings
  const publicSettings = {
    siteName: settings.siteName,
    siteTagline: settings.siteTagline,
    siteDescription: settings.siteDescription,
    siteLogo: settings.siteLogo,
    siteFavicon: settings.siteFavicon,
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
    socialLinks: settings.socialLinks.filter(s => s.enabled),
    menus: settings.menus,
    homepageSections: settings.homepageSections.filter(s => s.enabled).sort((a, b) => a.order - b.order),
    widgets: settings.widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order),
    headerSettings: settings.headerSettings,
    footerSettings: settings.footerSettings,
    articleSettings: settings.articleSettings,
    features: settings.features,
    seo: {
      metaTitle: settings.seo.metaTitle,
      metaDescription: settings.seo.metaDescription,
      ogImage: settings.seo.ogImage
    },
    // Ads settings
    welcomePopup: settings.welcomePopup,
    floatingBanner: settings.floatingBanner,
    inArticleAd: settings.inArticleAd,
    // New body ads system
    bodyAds: {
      enabled: settings.bodyAds?.enabled ?? true,
      ads: activeBodyAds,
      globalSettings: settings.bodyAds?.globalSettings || {}
    },
    mobileAds: settings.mobileAds,
    exitPopup: settings.exitPopup,
    scrollAd: settings.scrollAd,
    adsGlobal: settings.adsGlobal,
  };
  
  return successResponse(res, { settings: publicSettings });
});

/**
 * Update homepage sections
 * PUT /api/settings/homepage
 */
export const updateHomepageSections = asyncHandler(async (req, res) => {
  const { sections } = req.body;
  
  if (!Array.isArray(sections)) {
    return badRequestResponse(res, 'Sections must be an array');
  }
  
  // Build category slug -> id map for normalization
  const categories = await Category.find({}).select('slug _id').lean();
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.slug] = cat;
  });
  
  // Normalize and sanitize sections
  const normalizedSections = sections.map(section => {
    const normalized = normalizeSection(section, categoryMap);
    
    // Sanitize custom HTML content
    if (normalized.type === 'custom_html' && normalized.settings?.content) {
      normalized.settings.content = sanitizationService.homepageBlock(normalized.settings.content);
    }
    
    return normalized;
  });
  
  // Validate sections
  const validation = validateHomepageSections(normalizedSections);
  if (!validation.success) {
    return badRequestResponse(res, 'Invalid section configuration', { errors: validation.errors });
  }
  
  const settings = await SiteSettings.getSettings();
  settings.homepageSections = validation.data;
  await settings.save();
  
  return successResponse(res, { sections: settings.homepageSections }, 'Homepage sections updated');
});

/**
 * Update menus
 * PUT /api/settings/menus
 */
export const updateMenus = asyncHandler(async (req, res) => {
  const { menuType, items } = req.body;
  
  if (!['header', 'footer', 'mobile'].includes(menuType)) {
    return badRequestResponse(res, 'Invalid menu type');
  }
  
  const settings = await SiteSettings.getSettings();
  settings.menus[menuType] = items;
  await settings.save();
  
  return successResponse(res, { menu: settings.menus[menuType] }, 'Menu updated successfully');
});

/**
 * Update widgets
 * PUT /api/settings/widgets
 */
export const updateWidgets = asyncHandler(async (req, res) => {
  const { widgets } = req.body;
  
  if (!Array.isArray(widgets)) {
    return badRequestResponse(res, 'Widgets must be an array');
  }
  
  const settings = await SiteSettings.getSettings();
  settings.widgets = widgets;
  await settings.save();
  
  return successResponse(res, { widgets: settings.widgets }, 'Widgets updated');
});

/**
 * Update SEO settings
 * PUT /api/settings/seo
 */
export const updateSEOSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSettings();
  settings.seo = { ...settings.seo, ...req.body };
  await settings.save();
  
  return successResponse(res, { seo: settings.seo }, 'SEO settings updated');
});

/**
 * Update branding
 * PUT /api/settings/branding
 */
export const updateBranding = asyncHandler(async (req, res) => {
  const { siteName, siteTagline, siteLogo, siteFavicon, primaryColor, secondaryColor, accentColor } = req.body;
  
  const settings = await SiteSettings.getSettings();
  
  if (siteName) settings.siteName = siteName;
  if (siteTagline) settings.siteTagline = siteTagline;
  if (siteLogo !== undefined) settings.siteLogo = siteLogo;
  if (siteFavicon !== undefined) settings.siteFavicon = siteFavicon;
  if (primaryColor) settings.primaryColor = primaryColor;
  if (secondaryColor) settings.secondaryColor = secondaryColor;
  if (accentColor) settings.accentColor = accentColor;
  
  await settings.save();
  
  return successResponse(res, { settings }, 'Branding updated successfully');
});

/**
 * Toggle feature
 * PUT /api/settings/features/:feature
 */
export const toggleFeature = asyncHandler(async (req, res) => {
  const { feature } = req.params;
  const { enabled } = req.body;
  
  const settings = await SiteSettings.getSettings();
  
  if (settings.features[feature] === undefined) {
    return badRequestResponse(res, 'Invalid feature');
  }
  
  settings.features[feature] = enabled;
  await settings.save();
  
  return successResponse(res, { features: settings.features }, `Feature ${enabled ? 'enabled' : 'disabled'}`);
});
