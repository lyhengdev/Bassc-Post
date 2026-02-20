import { z } from 'zod';

/**
 * Homepage Section Validators
 * Ensures data integrity and prevents invalid configurations
 */

// Valid section types
const SECTION_TYPES = [
  'hero',
  'featured',
  'featured_articles',
  'category_grid',
  'latest',
  'latest_articles',
  'trending',
  'popular',
  'editor_picks',
  'video',
  'newsletter',
  'newsletter_signup',
  'custom_html',
  'ad_banner',
  'category_tabs',
  'breaking_news',
  'spotlight',
  'category_spotlight',
  'opinion',
  'lifestyle',
  'news_list',
  'grid_with_sidebar',
  'magazine_layout'
];

// Base section schema (common fields)
const baseSectionSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(SECTION_TYPES),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(100).default(0),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(200).optional(),
  showTitle: z.boolean().default(true),
  settings: z.record(z.any()).optional()
});

// Flexible section schema to support frontend settings keys
const sectionSchema = baseSectionSchema.passthrough();

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
