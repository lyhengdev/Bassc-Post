import Page from '../models/Page.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { parsePaginationParams } from '../utils/helpers.js';
import { successResponse, createdResponse, badRequestResponse, notFoundResponse } from '../utils/apiResponse.js';

/**
 * Get all pages (admin)
 * GET /api/pages
 */
export const getAllPages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const { status, search } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } }
    ];
  }
  
  const [pages, total] = await Promise.all([
    Page.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Page.countDocuments(filter)
  ]);
  
  return successResponse(res, {
    pages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get published pages (public)
 * GET /api/pages/published
 */
export const getPublishedPages = asyncHandler(async (req, res) => {
  const pages = await Page.find({ status: 'published' })
    .select('title slug excerpt featuredImage template menuOrder showInMenu')
    .sort({ menuOrder: 1 });
  
  return successResponse(res, { pages });
});

/**
 * Get page by slug (public)
 * GET /api/pages/slug/:slug
 */
export const getPageBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  const page = await Page.findOne({ slug, status: 'published' })
    .populate('author', 'firstName lastName avatar');
  
  if (!page) {
    return notFoundResponse(res, 'Page not found');
  }
  
  return successResponse(res, { page });
});

/**
 * Get page by ID (admin)
 * GET /api/pages/:id
 */
export const getPageById = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id)
    .populate('author', 'firstName lastName')
    .populate('parentPage', 'title slug');
  
  if (!page) {
    return notFoundResponse(res, 'Page not found');
  }
  
  return successResponse(res, { page });
});

/**
 * Create page
 * POST /api/pages
 */
export const createPage = asyncHandler(async (req, res) => {
  const { title, slug, content, excerpt, featuredImage, template, status, metaTitle, metaDescription, showInMenu, menuOrder, parentPage } = req.body;
  
  const page = await Page.create({
    title,
    slug, // Include slug from frontend
    content,
    excerpt,
    featuredImage,
    template,
    status: status || 'draft',
    metaTitle,
    metaDescription,
    showInMenu,
    menuOrder,
    parentPage,
    author: req.user._id
  });
  
  await page.populate('author', 'firstName lastName');
  
  return createdResponse(res, { page }, 'Page created successfully');
});

/**
 * Update page
 * PUT /api/pages/:id
 */
export const updatePage = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  
  if (!page) {
    return notFoundResponse(res, 'Page not found');
  }
  
  const allowedUpdates = [
    'title', 'slug', 'content', 'excerpt', 'featuredImage', 'template',
    'status', 'metaTitle', 'metaDescription', 'metaKeywords',
    'showInMenu', 'menuOrder', 'parentPage', 'allowComments', 'password'
  ];
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      page[field] = req.body[field];
    }
  });
  
  page.lastEditedBy = req.user._id;
  await page.save();
  
  await page.populate('author', 'firstName lastName');
  
  return successResponse(res, { page }, 'Page updated successfully');
});

/**
 * Delete page
 * DELETE /api/pages/:id
 */
export const deletePage = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  
  if (!page) {
    return notFoundResponse(res, 'Page not found');
  }
  
  // Check for child pages
  const hasChildren = await Page.exists({ parentPage: page._id });
  if (hasChildren) {
    return badRequestResponse(res, 'Cannot delete page with child pages');
  }
  
  await page.deleteOne();
  
  return successResponse(res, null, 'Page deleted successfully');
});

/**
 * Duplicate page
 * POST /api/pages/:id/duplicate
 */
export const duplicatePage = asyncHandler(async (req, res) => {
  const originalPage = await Page.findById(req.params.id);
  
  if (!originalPage) {
    return notFoundResponse(res, 'Page not found');
  }
  
  const newPage = await Page.create({
    title: `${originalPage.title} (Copy)`,
    content: originalPage.content,
    excerpt: originalPage.excerpt,
    featuredImage: originalPage.featuredImage,
    template: originalPage.template,
    status: 'draft',
    metaTitle: originalPage.metaTitle,
    metaDescription: originalPage.metaDescription,
    author: req.user._id
  });
  
  await newPage.populate('author', 'firstName lastName');
  
  return createdResponse(res, { page: newPage }, 'Page duplicated successfully');
});

/**
 * Get menu pages
 * GET /api/pages/menu
 */
export const getMenuPages = asyncHandler(async (req, res) => {
  const pages = await Page.find({ showInMenu: true, status: 'published' })
    .select('title slug menuOrder parentPage')
    .populate('parentPage', 'title slug')
    .sort({ menuOrder: 1 });
  
  return successResponse(res, { pages });
});

export default {
  getAllPages,
  getPublishedPages,
  getPageBySlug,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  duplicatePage,
  getMenuPages,
};
