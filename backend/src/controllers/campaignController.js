import Campaign from '../models/Campaign.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { successResponse, errorResponse, createdResponse, notFoundResponse } from '../utils/apiResponse.js';
import { nanoid } from 'nanoid';

// ==================== CAMPAIGN CRUD ====================

/**
 * Get all campaigns
 * GET /api/campaigns
 */
export const getCampaigns = asyncHandler(async (req, res) => {
  const { 
    status, 
    placement, 
    search, 
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (placement) filter.placement = placement;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('targeting.categories', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Campaign.countDocuments(filter),
  ]);

  return successResponse(res, {
    campaigns,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * Get campaign by ID
 * GET /api/campaigns/:id
 */
export const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('updatedBy', 'firstName lastName email')
    .populate('targeting.categories', 'name slug');

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  return successResponse(res, { campaign });
});

/**
 * Create campaign
 * POST /api/campaigns
 */
export const createCampaign = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    placement,
    targeting,
    schedule,
    ads,
    settings,
    frequency,
    status,
  } = req.body;

  // Generate unique adIds for each ad
  const adsWithIds = (ads || []).map(ad => ({
    ...ad,
    adId: nanoid(10),
  }));

  // Create campaign
  const campaign = await Campaign.create({
    name,
    description,
    placement,
    targeting: targeting || {},
    schedule: schedule || {},
    ads: adsWithIds,
    settings: settings || {},
    frequency: frequency || {},
    status: status || 'draft',
    createdBy: req.user._id,
  });

  await campaign.populate('createdBy', 'firstName lastName email');

  return createdResponse(res, { campaign }, 'Campaign created successfully');
});

/**
 * Update campaign
 * PUT /api/campaigns/:id
 */
export const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  const {
    name,
    description,
    placement,
    targeting,
    schedule,
    ads,
    settings,
    frequency,
    status,
  } = req.body;

  // Update fields
  if (name !== undefined) campaign.name = name;
  if (description !== undefined) campaign.description = description;
  if (placement !== undefined) campaign.placement = placement;
  if (targeting !== undefined) campaign.targeting = targeting;
  if (schedule !== undefined) campaign.schedule = schedule;
  if (settings !== undefined) campaign.settings = settings;
  if (frequency !== undefined) campaign.frequency = frequency;
  if (status !== undefined) campaign.status = status;

  // Update ads (preserve existing adIds or generate new ones)
  if (ads !== undefined) {
    campaign.ads = ads.map(ad => ({
      ...ad,
      adId: ad.adId || nanoid(10),
    }));
  }

  campaign.updatedBy = req.user._id;

  await campaign.save();
  await campaign.populate('createdBy updatedBy', 'firstName lastName email');

  return successResponse(res, { campaign }, 'Campaign updated successfully');
});

/**
 * Delete campaign
 * DELETE /api/campaigns/:id
 */
export const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  await campaign.deleteOne();

  return successResponse(res, { message: 'Campaign deleted successfully' });
});

/**
 * Duplicate campaign
 * POST /api/campaigns/:id/duplicate
 */
export const duplicateCampaign = asyncHandler(async (req, res) => {
  const original = await Campaign.findById(req.params.id);

  if (!original) {
    return notFoundResponse(res, 'Campaign not found');
  }

  // Create duplicate
  const duplicate = new Campaign({
    name: `${original.name} (Copy)`,
    description: original.description,
    placement: original.placement,
    targeting: original.targeting,
    schedule: {
      ...original.schedule.toObject(),
      startDate: new Date(),
      endDate: null,
    },
    ads: original.ads.map(ad => ({
      ...ad.toObject(),
      adId: nanoid(10), // New IDs for duplicated ads
      stats: {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        conversions: 0,
      },
    })),
    settings: original.settings,
    frequency: original.frequency,
    status: 'draft',
    createdBy: req.user._id,
    stats: {
      totalImpressions: 0,
      totalClicks: 0,
      ctr: 0,
      totalConversions: 0,
      budget: original.stats.budget,
      spent: 0,
    },
  });

  await duplicate.save();
  await duplicate.populate('createdBy', 'firstName lastName email');

  return createdResponse(res, { campaign: duplicate }, 'Campaign duplicated successfully');
});

// ==================== CAMPAIGN STATUS ====================

/**
 * Toggle campaign status (active/paused)
 * POST /api/campaigns/:id/toggle
 */
export const toggleCampaignStatus = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  // Toggle between active and paused
  if (campaign.status === 'active') {
    campaign.status = 'paused';
  } else if (campaign.status === 'paused' || campaign.status === 'draft') {
    campaign.status = 'active';
  }

  campaign.updatedBy = req.user._id;
  await campaign.save();

  return successResponse(res, { campaign }, `Campaign ${campaign.status}`);
});

/**
 * Update campaign status
 * PUT /api/campaigns/:id/status
 */
export const updateCampaignStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['draft', 'active', 'paused', 'ended'].includes(status)) {
    return errorResponse(res, 'Invalid status', 400);
  }

  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  campaign.status = status;
  campaign.updatedBy = req.user._id;
  await campaign.save();

  return successResponse(res, { campaign }, 'Campaign status updated');
});

// ==================== AD VARIATIONS ====================

/**
 * Add ad variation to campaign
 * POST /api/campaigns/:id/ads
 */
export const addAdVariation = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  const adData = {
    ...req.body,
    adId: nanoid(10),
    stats: {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      conversions: 0,
    },
  };

  campaign.ads.push(adData);
  campaign.updatedBy = req.user._id;
  await campaign.save();

  return createdResponse(res, { ad: adData, campaign }, 'Ad variation added successfully');
});

/**
 * Update ad variation
 * PUT /api/campaigns/:id/ads/:adId
 */
export const updateAdVariation = asyncHandler(async (req, res) => {
  const { id, adId } = req.params;

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  const adIndex = campaign.ads.findIndex(ad => ad.adId === adId);

  if (adIndex === -1) {
    return notFoundResponse(res, 'Ad variation not found');
  }

  // Update ad fields
  Object.assign(campaign.ads[adIndex], req.body);
  
  campaign.updatedBy = req.user._id;
  await campaign.save();

  return successResponse(res, { ad: campaign.ads[adIndex], campaign }, 'Ad variation updated');
});

/**
 * Delete ad variation
 * DELETE /api/campaigns/:id/ads/:adId
 */
export const deleteAdVariation = asyncHandler(async (req, res) => {
  const { id, adId } = req.params;

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  const adIndex = campaign.ads.findIndex(ad => ad.adId === adId);

  if (adIndex === -1) {
    return notFoundResponse(res, 'Ad variation not found');
  }

  campaign.ads.splice(adIndex, 1);
  campaign.updatedBy = req.user._id;
  await campaign.save();

  return successResponse(res, { campaign }, 'Ad variation deleted');
});

/**
 * Toggle ad variation status
 * POST /api/campaigns/:id/ads/:adId/toggle
 */
export const toggleAdVariation = asyncHandler(async (req, res) => {
  const { id, adId } = req.params;

  const campaign = await Campaign.findById(id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  const ad = campaign.ads.find(ad => ad.adId === adId);

  if (!ad) {
    return notFoundResponse(res, 'Ad variation not found');
  }

  ad.isActive = !ad.isActive;
  campaign.updatedBy = req.user._id;
  await campaign.save();

  return successResponse(res, { ad, campaign }, `Ad variation ${ad.isActive ? 'activated' : 'deactivated'}`);
});

// ==================== ANALYTICS ====================

/**
 * Get campaign analytics
 * GET /api/campaigns/:id/analytics
 */
export const getCampaignAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  // Update stats
  await campaign.updateStats();

  // Get winning ad
  const winningAd = campaign.getWinningAd();

  // Calculate performance
  const performance = {
    totalImpressions: campaign.stats.totalImpressions,
    totalClicks: campaign.stats.totalClicks,
    ctr: campaign.stats.ctr,
    totalConversions: campaign.stats.totalConversions,
    conversionRate: campaign.stats.totalClicks > 0 
      ? ((campaign.stats.totalConversions / campaign.stats.totalClicks) * 100).toFixed(2)
      : 0,
    adVariations: campaign.ads.length,
    activeAds: campaign.ads.filter(ad => ad.isActive).length,
    winningAd: winningAd ? {
      adId: winningAd.adId,
      impressions: winningAd.stats.impressions,
      clicks: winningAd.stats.clicks,
      ctr: winningAd.stats.ctr,
    } : null,
  };

  return successResponse(res, {
    campaign,
    performance,
    adVariations: campaign.ads,
  });
});

/**
 * Get dashboard summary
 * GET /api/campaigns/dashboard/summary
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const [
    totalCampaigns,
    activeCampaigns,
    pausedCampaigns,
    draftCampaigns,
    allCampaigns,
  ] = await Promise.all([
    Campaign.countDocuments(),
    Campaign.countDocuments({ status: 'active' }),
    Campaign.countDocuments({ status: 'paused' }),
    Campaign.countDocuments({ status: 'draft' }),
    Campaign.find({}).select('stats').lean(),
  ]);

  // Aggregate stats
  const totalStats = allCampaigns.reduce((acc, campaign) => ({
    impressions: acc.impressions + (campaign.stats?.totalImpressions || 0),
    clicks: acc.clicks + (campaign.stats?.totalClicks || 0),
    conversions: acc.conversions + (campaign.stats?.totalConversions || 0),
  }), { impressions: 0, clicks: 0, conversions: 0 });

  const ctr = totalStats.impressions > 0 
    ? ((totalStats.clicks / totalStats.impressions) * 100).toFixed(2)
    : 0;

  return successResponse(res, {
    summary: {
      totalCampaigns,
      activeCampaigns,
      pausedCampaigns,
      draftCampaigns,
      totalImpressions: totalStats.impressions,
      totalClicks: totalStats.clicks,
      totalConversions: totalStats.conversions,
      averageCtr: ctr,
    },
  });
});

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Get campaign for display (public)
 * POST /api/campaigns/display
 */
export const getCampaignForDisplay = asyncHandler(async (req, res) => {
  const {
    placement,
    page,
    device,
    country,
    categoryId,
  } = req.body;

  // Find matching campaigns
  const filter = {
    status: 'active',
    placement,
  };

  // Filter by page
  if (page && page !== 'all') {
    filter.$or = [
      { 'targeting.pages': page },
      { 'targeting.pages': { $size: 0 } }, // No targeting = show everywhere
    ];
  }

  // Filter by device
  if (device) {
    filter.$or = [
      { 'targeting.devices': device },
      { 'targeting.devices': { $size: 0 } },
    ];
  }

  // Get campaigns
  const campaigns = await Campaign.find(filter)
    .populate('targeting.categories', 'slug')
    .lean();

  // Filter by schedule
  const now = new Date();
  const runningCampaigns = campaigns.filter(campaign => {
    const started = !campaign.schedule.startDate || new Date(campaign.schedule.startDate) <= now;
    const notEnded = !campaign.schedule.endDate || new Date(campaign.schedule.endDate) >= now;
    return started && notEnded;
  });

  if (runningCampaigns.length === 0) {
    return successResponse(res, { campaign: null });
  }

  // Select one campaign (weighted random if multiple)
  const selectedCampaign = runningCampaigns[Math.floor(Math.random() * runningCampaigns.length)];

  // Select ad from campaign
  const campaign = await Campaign.findById(selectedCampaign._id);
  const selectedAd = campaign.selectAd();

  if (!selectedAd) {
    return successResponse(res, { campaign: null });
  }

  return successResponse(res, {
    campaign: {
      _id: campaign._id,
      name: campaign.name,
      placement: campaign.placement,
      settings: campaign.settings,
      frequency: campaign.frequency,
      ad: selectedAd,
    },
  });
});

/**
 * Track ad event (impression/click)
 * POST /api/campaigns/track
 */
export const trackAdEvent = asyncHandler(async (req, res) => {
  const { campaignId, adId, event } = req.body;

  if (!['impression', 'click', 'conversion'].includes(event)) {
    return errorResponse(res, 'Invalid event type', 400);
  }

  const campaign = await Campaign.findById(campaignId);

  if (!campaign) {
    return notFoundResponse(res, 'Campaign not found');
  }

  const ad = campaign.ads.find(a => a.adId === adId);

  if (!ad) {
    return notFoundResponse(res, 'Ad not found');
  }

  // Update stats
  if (event === 'impression') {
    ad.stats.impressions += 1;
  } else if (event === 'click') {
    ad.stats.clicks += 1;
  } else if (event === 'conversion') {
    ad.stats.conversions += 1;
  }

  // Recalculate CTR
  if (ad.stats.impressions > 0) {
    ad.stats.ctr = parseFloat(((ad.stats.clicks / ad.stats.impressions) * 100).toFixed(2));
  }

  await campaign.save();
  await campaign.updateStats();

  return successResponse(res, { message: 'Event tracked successfully' });
});

export default {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  toggleCampaignStatus,
  updateCampaignStatus,
  addAdVariation,
  updateAdVariation,
  deleteAdVariation,
  toggleAdVariation,
  getCampaignAnalytics,
  getDashboardSummary,
  getCampaignForDisplay,
  trackAdEvent,
};
