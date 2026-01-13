import { Category, Article } from '../models/index.js';
import { parsePaginationParams } from '../utils/helpers.js';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  notFoundResponse,
  conflictResponse,
  badRequestResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Create category (admin)
 * POST /api/categories
 */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, color, parent, order, metaTitle, metaDescription } = req.body;

  // Check if name exists
  const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existingCategory) {
    return conflictResponse(res, 'Category with this name already exists');
  }

  // Validate parent if provided
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return badRequestResponse(res, 'Parent category not found');
    }
  }

  const category = await Category.create({
    name,
    description,
    color,
    parent: parent || null,
    order: order || 0,
    metaTitle,
    metaDescription,
  });

  return createdResponse(res, { category }, 'Category created successfully');
});

/**
 * Get all categories (public)
 * GET /api/categories
 */
export const getCategories = asyncHandler(async (req, res) => {
  const { includeInactive, tree } = req.query;

  let query = Category.find();

  // Only include active by default
  if (includeInactive !== 'true') {
    query = query.where('isActive', true);
  }

  // Get as tree structure
  if (tree === 'true') {
    const categories = await Category.getTree();
    return successResponse(res, { categories });
  }

  const categories = await query.sort({ order: 1, name: 1 });

  return successResponse(res, { categories });
});

/**
 * Get category by slug (public)
 * GET /api/categories/:slug
 */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const category = await Category.findOne({ slug, isActive: true })
    .populate('subcategories');

  if (!category) {
    return notFoundResponse(res, 'Category not found');
  }

  return successResponse(res, { category });
});

/**
 * Get category by ID
 * GET /api/categories/id/:id
 */
export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate('parent', 'name slug')
    .populate('subcategories');

  if (!category) {
    return notFoundResponse(res, 'Category not found');
  }

  return successResponse(res, { category });
});

/**
 * Update category (admin)
 * PUT /api/categories/:id
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return notFoundResponse(res, 'Category not found');
  }

  const { name, description, color, parent, order, isActive, metaTitle, metaDescription } = req.body;

  // Check name uniqueness if changed
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: category._id },
    });
    if (existingCategory) {
      return conflictResponse(res, 'Category with this name already exists');
    }
    category.name = name;
  }

  // Validate parent
  if (parent !== undefined) {
    if (parent === null || parent === '') {
      category.parent = null;
    } else {
      // Can't be parent of itself
      if (parent === category._id.toString()) {
        return badRequestResponse(res, 'Category cannot be its own parent');
      }
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return badRequestResponse(res, 'Parent category not found');
      }
      category.parent = parent;
    }
  }

  if (description !== undefined) category.description = description;
  if (color !== undefined) category.color = color;
  if (order !== undefined) category.order = order;
  if (isActive !== undefined) category.isActive = isActive;
  if (metaTitle !== undefined) category.metaTitle = metaTitle;
  if (metaDescription !== undefined) category.metaDescription = metaDescription;

  await category.save();

  return successResponse(res, { category }, 'Category updated successfully');
});

/**
 * Delete category (admin)
 * DELETE /api/categories/:id
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return notFoundResponse(res, 'Category not found');
  }

  // Check if category has articles
  const articleCount = await Article.countDocuments({ category: category._id });
  if (articleCount > 0) {
    return badRequestResponse(
      res,
      `Cannot delete category with ${articleCount} articles. Please reassign articles first.`
    );
  }

  // Check if category has subcategories
  const subcategoryCount = await Category.countDocuments({ parent: category._id });
  if (subcategoryCount > 0) {
    return badRequestResponse(
      res,
      `Cannot delete category with ${subcategoryCount} subcategories. Please delete or reassign them first.`
    );
  }

  await category.deleteOne();

  return successResponse(res, null, 'Category deleted successfully');
});

/**
 * Reorder categories (admin)
 * PUT /api/categories/reorder
 */
export const reorderCategories = asyncHandler(async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    return badRequestResponse(res, 'Categories must be an array');
  }

  // Update order for each category
  const updatePromises = categories.map((item, index) =>
    Category.findByIdAndUpdate(item.id, { order: item.order ?? index })
  );

  await Promise.all(updatePromises);

  return successResponse(res, null, 'Categories reordered successfully');
});

/**
 * Get category stats (admin)
 * GET /api/categories/stats
 */
export const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await Category.aggregate([
    {
      $lookup: {
        from: 'articles',
        localField: '_id',
        foreignField: 'category',
        as: 'articles',
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        color: 1,
        isActive: 1,
        totalArticles: { $size: '$articles' },
        publishedArticles: {
          $size: {
            $filter: {
              input: '$articles',
              as: 'article',
              cond: { $eq: ['$$article.status', 'published'] },
            },
          },
        },
        totalViews: { $sum: '$articles.viewCount' },
      },
    },
    { $sort: { publishedArticles: -1 } },
  ]);

  return successResponse(res, { stats });
});

export default {
  createCategory,
  getCategories,
  getCategoryBySlug,
  getCategoryById,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getCategoryStats,
};
