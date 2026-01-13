import { z } from 'zod';

/**
 * Homepage Section Validators
 * Ensures data integrity and prevents invalid configurations
 */

// Valid section types
const SECTION_TYPES = [
  'hero',
  'featured',
  'category_grid',
  'latest',
  'trending',
  'popular',
  'editor_picks',
  'video',
  'newsletter',
  'custom_html',
  'ad_banner',
  'category_tabs',
  'breaking_news',
  'spotlight',
  'opinion',
  'lifestyle'
];

// Base section schema (common fields)
const baseSectionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(SECTION_TYPES),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(100).default(0),
  title: z.string().max(200).optional(),
  showTitle: z.boolean().default(true)
});

// Type-specific settings schemas
const heroSettings = z.object({
  style: z.enum(['full', 'split', 'minimal', 'video']).default('full'),
  autoRotate: z.boolean().default(true),
  rotateInterval: z.number().int().min(3000).max(30000).default(5000),
  showOverlay: z.boolean().default(true),
  height: z.enum(['short', 'medium', 'tall', 'full']).default('medium')
});

const categorySettings = z.object({
  categorySlug: z.string().max(100).optional(),
  categoryId: z.string().max(100).optional(),
  articlesCount: z.number().int().min(1).max(20).default(6),
  layout: z.enum(['grid', 'list', 'featured', 'masonry']).default('grid'),
  columns: z.number().int().min(1).max(6).default(3),
  showExcerpt: z.boolean().default(true),
  showImage: z.boolean().default(true),
  showDate: z.boolean().default(true),
  showAuthor: z.boolean().default(false)
});

const latestSettings = z.object({
  articlesCount: z.number().int().min(1).max(30).default(8),
  layout: z.enum(['grid', 'list', 'compact']).default('grid'),
  columns: z.number().int().min(1).max(4).default(4),
  showPagination: z.boolean().default(false)
});

const customHtmlSettings = z.object({
  content: z.string().max(50000).optional(), // Will be sanitized
  backgroundColor: z.string().max(50).optional(),
  padding: z.number().int().min(0).max(200).default(20)
});

const adBannerSettings = z.object({
  adId: z.string().max(100).optional(),
  fallbackImageUrl: z.string().url().max(500).optional().or(z.literal('')),
  fallbackLinkUrl: z.string().url().max(500).optional().or(z.literal('')),
  showLabel: z.boolean().default(true)
});

const newsletterSettings = z.object({
  title: z.string().max(200).default('Subscribe to our newsletter'),
  description: z.string().max(500).optional(),
  backgroundColor: z.string().max(50).default('#1e40af'),
  textColor: z.string().max(50).default('#ffffff'),
  buttonText: z.string().max(50).default('Subscribe')
});

// Combined section schema with discriminated union
const sectionSchema = z.discriminatedUnion('type', [
  baseSectionSchema.extend({
    type: z.literal('hero'),
    settings: heroSettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('featured'),
    settings: categorySettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('category_grid'),
    settings: categorySettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('latest'),
    settings: latestSettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('trending'),
    settings: latestSettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('popular'),
    settings: latestSettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('editor_picks'),
    settings: categorySettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('video'),
    settings: categorySettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('newsletter'),
    settings: newsletterSettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('custom_html'),
    settings: customHtmlSettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('ad_banner'),
    settings: adBannerSettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('category_tabs'),
    settings: z.object({
      categories: z.array(z.string()).max(10).optional(),
      articlesPerCategory: z.number().int().min(1).max(10).default(5)
    }).optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('breaking_news'),
    settings: z.object({
      maxItems: z.number().int().min(1).max(10).default(5),
      autoScroll: z.boolean().default(true)
    }).optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('spotlight'),
    settings: categorySettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('opinion'),
    settings: categorySettings.optional()
  }),
  baseSectionSchema.extend({
    type: z.literal('lifestyle'),
    settings: categorySettings.optional()
  })
]);

// Homepage sections array schema
const homepageSectionsSchema = z.array(sectionSchema).max(30);

/**
 * Validate homepage sections
 * @param {Array} sections - Array of section objects
 * @returns {Object} - { success, data, errors }
 */
export function validateHomepageSections(sections) {
  try {
    const validated = homepageSectionsSchema.parse(sections);
    return { success: true, data: validated, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      };
    }
    throw error;
  }
}

/**
 * Validate a single section
 */
export function validateSection(section) {
  try {
    const validated = sectionSchema.parse(section);
    return { success: true, data: validated, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      };
    }
    throw error;
  }
}

/**
 * Generate a stable section ID
 */
export function generateSectionId(type) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}_${timestamp}_${random}`;
}

/**
 * Normalize section data (fix common issues)
 */
export function normalizeSection(section, categoryMap = {}) {
  const normalized = { ...section };
  
  // Generate stable ID if missing or client-generated
  if (!normalized.id || normalized.id.startsWith('section_')) {
    normalized.id = generateSectionId(normalized.type);
  }
  
  // Resolve categorySlug to categoryId if needed
  if (normalized.settings?.categorySlug && !normalized.settings?.categoryId) {
    const slug = normalized.settings.categorySlug;
    if (categoryMap[slug]) {
      normalized.settings.categoryId = categoryMap[slug]._id.toString();
    }
  }
  
  // Ensure order is a number
  if (typeof normalized.order !== 'number') {
    normalized.order = parseInt(normalized.order) || 0;
  }
  
  return normalized;
}

export default {
  validateHomepageSections,
  validateSection,
  generateSectionId,
  normalizeSection,
  SECTION_TYPES
};
