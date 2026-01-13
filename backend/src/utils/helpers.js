import crypto from 'crypto';
import xss from 'xss';

/**
 * Generate random string
 */
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate hash from string (for visitor tracking)
 */
export const generateHash = (input) => {
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHtml = (html) => {
  return xss(html, {
    whiteList: {
      a: ['href', 'target', 'rel'],
      b: [],
      strong: [],
      i: [],
      em: [],
      u: [],
      br: [],
      p: [],
      ul: [],
      ol: [],
      li: [],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      blockquote: [],
      code: ['class'],
      pre: [],
      img: ['src', 'alt', 'width', 'height'],
      span: ['class'],
      div: ['class'],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });
};

/**
 * Sanitize Editor.js content
 */
export const sanitizeEditorContent = (content) => {
  if (!content || !content.blocks) return content;

  const sanitizedBlocks = content.blocks.map((block) => {
    const sanitizedData = { ...block.data };

    // Sanitize text content based on block type
    switch (block.type) {
      case 'paragraph':
      case 'header':
      case 'quote':
        if (sanitizedData.text) {
          sanitizedData.text = sanitizeHtml(sanitizedData.text);
        }
        break;
      case 'list':
        if (sanitizedData.items) {
          sanitizedData.items = sanitizedData.items.map((item) => sanitizeHtml(item));
        }
        break;
      case 'checklist':
        if (sanitizedData.items) {
          sanitizedData.items = sanitizedData.items.map((item) => ({
            ...item,
            text: sanitizeHtml(item.text),
          }));
        }
        break;
      case 'table':
        if (sanitizedData.content) {
          sanitizedData.content = sanitizedData.content.map((row) =>
            row.map((cell) => sanitizeHtml(cell))
          );
        }
        break;
    }

    return { ...block, data: sanitizedData };
  });

  return { ...content, blocks: sanitizedBlocks };
};

/**
 * Parse pagination params
 */
export const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Parse sort params
 */
export const parseSortParams = (query, allowedFields = ['createdAt', 'updatedAt']) => {
  const sortField = allowedFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  return { [sortField]: sortOrder };
};

/**
 * Build MongoDB filter from query params
 */
export const buildFilter = (query, filterConfig) => {
  const filter = {};

  Object.entries(filterConfig).forEach(([key, config]) => {
    const value = query[key];
    if (value === undefined || value === '') return;

    switch (config.type) {
      case 'exact':
        filter[config.field || key] = value;
        break;
      case 'regex':
        filter[config.field || key] = { $regex: value, $options: 'i' };
        break;
      case 'boolean':
        filter[config.field || key] = value === 'true';
        break;
      case 'objectId':
        if (value.match(/^[0-9a-fA-F]{24}$/)) {
          filter[config.field || key] = value;
        }
        break;
      case 'array':
        filter[config.field || key] = { $in: value.split(',') };
        break;
      case 'dateRange':
        if (query[`${key}From`] || query[`${key}To`]) {
          filter[config.field || key] = {};
          if (query[`${key}From`]) {
            filter[config.field || key].$gte = new Date(query[`${key}From`]);
          }
          if (query[`${key}To`]) {
            filter[config.field || key].$lte = new Date(query[`${key}To`]);
          }
        }
        break;
    }
  });

  return filter;
};

/**
 * Format date for display
 */
export const formatDate = (date, locale = 'en-US') => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Calculate relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length).trim() + suffix;
};

/**
 * Extract client IP from request
 */
export const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip
  );
};

/**
 * Get device type from user agent
 */
export const getDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return 'mobile';
  return 'desktop';
};

/**
 * Sleep utility
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  generateRandomString,
  generateHash,
  sanitizeHtml,
  sanitizeEditorContent,
  parsePaginationParams,
  parseSortParams,
  buildFilter,
  formatDate,
  getRelativeTime,
  truncateText,
  getClientIp,
  getDeviceType,
  sleep,
};
