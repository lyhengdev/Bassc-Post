/**
 * Sanitization Service
 * Prevents XSS attacks by sanitizing HTML content
 * 
 * This is CRITICAL for:
 * - Custom HTML blocks in homepage
 * - Ad HTML content
 * - Article content (if HTML allowed)
 * - Any user-provided HTML
 */

// Allowlisted HTML tags (safe tags only)
const ALLOWED_TAGS = [
  // Structure
  'div', 'span', 'p', 'br', 'hr',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Text formatting
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
  'sub', 'sup', 'mark', 'small', 'big',
  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // Links & Media
  'a', 'img', 'picture', 'source', 'figure', 'figcaption',
  'video', 'audio', 'iframe', // iframe restricted to trusted domains
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Blocks
  'blockquote', 'pre', 'code', 'kbd', 'samp',
  'article', 'section', 'aside', 'header', 'footer', 'nav', 'main',
  // Forms (display only)
  'button',
  // Other
  'abbr', 'address', 'cite', 'q', 'time', 'details', 'summary'
];

// Allowlisted attributes per tag
const ALLOWED_ATTRS = {
  '*': ['class', 'id', 'style', 'title', 'dir', 'lang', 'data-*'],
  'a': ['href', 'target', 'rel', 'download'],
  'img': ['src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes'],
  'picture': [],
  'source': ['src', 'srcset', 'media', 'type', 'sizes'],
  'video': ['src', 'poster', 'width', 'height', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'preload'],
  'audio': ['src', 'controls', 'autoplay', 'muted', 'loop', 'preload'],
  'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'title'],
  'table': ['border', 'cellpadding', 'cellspacing', 'width'],
  'th': ['colspan', 'rowspan', 'scope', 'width'],
  'td': ['colspan', 'rowspan', 'width'],
  'col': ['span', 'width'],
  'colgroup': ['span'],
  'button': ['type', 'disabled'],
  'time': ['datetime'],
  'abbr': ['title'],
  'blockquote': ['cite'],
  'q': ['cite'],
  'ol': ['start', 'type', 'reversed'],
  'li': ['value']
};

// Trusted iframe sources (for embeds)
const TRUSTED_IFRAME_SOURCES = [
  'youtube.com',
  'youtube-nocookie.com',
  'vimeo.com',
  'dailymotion.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'tiktok.com',
  'soundcloud.com',
  'spotify.com',
  'maps.google.com',
  'google.com/maps',
  'slideshare.net',
  'codepen.io',
  'jsfiddle.net'
];

// Dangerous patterns to remove
const DANGEROUS_PATTERNS = [
  // Script injection
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Event handlers
  /\bon\w+\s*=/gi,
  // javascript: URLs
  /javascript\s*:/gi,
  // data: URLs (except safe image types)
  /data\s*:\s*(?!image\/(png|jpeg|jpg|gif|webp|svg\+xml))[^;,]*/gi,
  // vbscript: URLs
  /vbscript\s*:/gi,
  // Expression in CSS
  /expression\s*\(/gi,
  // import in CSS
  /@import/gi,
  // Behavior in CSS (IE)
  /behavior\s*:/gi,
  // -moz-binding (Firefox)
  /-moz-binding/gi,
  // XML data islands
  /<xml\b[^>]*>/gi,
  // Form actions (prevent phishing)
  /<form\b[^>]*>/gi,
  // Meta refresh
  /<meta\b[^>]*http-equiv\s*=\s*["']?refresh/gi,
  // Base href hijacking
  /<base\b[^>]*>/gi,
  // Object/embed/applet (plugin exploits)
  /<(object|embed|applet)\b[^>]*>/gi
];

// CSS property blacklist
const DANGEROUS_CSS_PROPERTIES = [
  'behavior',
  'expression',
  '-moz-binding',
  'javascript'
];

/**
 * Remove dangerous patterns from HTML
 */
function removeDangerousPatterns(html) {
  let clean = html;
  DANGEROUS_PATTERNS.forEach(pattern => {
    clean = clean.replace(pattern, '');
  });
  return clean;
}

/**
 * Sanitize CSS style attribute
 */
function sanitizeStyle(style) {
  if (!style) return '';
  
  // Remove dangerous CSS
  let clean = style;
  DANGEROUS_CSS_PROPERTIES.forEach(prop => {
    const regex = new RegExp(`${prop}\\s*:`, 'gi');
    clean = clean.replace(regex, 'blocked:');
  });
  
  // Remove url() except for safe image types
  clean = clean.replace(/url\s*\(\s*["']?(?!data:image\/)[^)]+\)/gi, 'url(blocked)');
  
  return clean;
}

/**
 * Check if URL is safe
 */
function isSafeUrl(url, type = 'link') {
  if (!url) return true;
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('vbscript:')) return false;
  if (trimmed.startsWith('data:') && type !== 'image') return false;
  
  // For iframes, check against trusted sources
  if (type === 'iframe') {
    try {
      const urlObj = new URL(url);
      return TRUSTED_IFRAME_SOURCES.some(domain => 
        urlObj.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if tag is allowed
 */
function isAllowedTag(tag) {
  return ALLOWED_TAGS.includes(tag.toLowerCase());
}

/**
 * Get allowed attributes for a tag
 */
function getAllowedAttrs(tag) {
  const tagLower = tag.toLowerCase();
  const globalAttrs = ALLOWED_ATTRS['*'] || [];
  const tagAttrs = ALLOWED_ATTRS[tagLower] || [];
  return [...globalAttrs, ...tagAttrs];
}

/**
 * Simple HTML parser and sanitizer
 * For production, consider using DOMPurify on server via jsdom
 */
function sanitizeHtml(html, options = {}) {
  if (!html || typeof html !== 'string') return '';
  
  const {
    allowScripts = false,
    allowForms = false,
    allowIframes = true,
    customAllowedTags = [],
    customAllowedAttrs = {}
  } = options;
  
  let clean = html;
  
  // Step 1: Remove dangerous patterns
  clean = removeDangerousPatterns(clean);
  
  // Step 2: Remove disallowed tags
  // This is a simple implementation - for production use DOMPurify
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  const allAllowedTags = [...ALLOWED_TAGS, ...customAllowedTags];
  
  clean = clean.replace(tagRegex, (match, tag) => {
    const tagLower = tag.toLowerCase();
    
    // Special handling
    if (tagLower === 'script' && !allowScripts) return '';
    if (tagLower === 'form' && !allowForms) return '';
    if (tagLower === 'iframe' && !allowIframes) return '';
    
    if (!allAllowedTags.includes(tagLower)) {
      return ''; // Remove disallowed tag
    }
    
    return match;
  });
  
  // Step 3: Clean event handlers from remaining HTML
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Step 4: Clean href/src with javascript:
  clean = clean.replace(/\s+(href|src)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '');
  
  // Step 5: Sanitize style attributes
  clean = clean.replace(/\s+style\s*=\s*["']([^"']*)["']/gi, (match, style) => {
    const sanitized = sanitizeStyle(style);
    return sanitized ? ` style="${sanitized}"` : '';
  });
  
  return clean.trim();
}

/**
 * Sanitize for specific contexts
 */
const sanitizationService = {
  /**
   * Sanitize HTML content (general)
   */
  html: (content, options = {}) => sanitizeHtml(content, options),
  
  /**
   * Sanitize ad HTML (more restrictive)
   */
  adHtml: (content) => sanitizeHtml(content, {
    allowScripts: false,
    allowForms: false,
    allowIframes: true // Allow for video embeds
  }),
  
  /**
   * Sanitize article content
   */
  articleContent: (content) => sanitizeHtml(content, {
    allowScripts: false,
    allowForms: false,
    allowIframes: true
  }),
  
  /**
   * Sanitize homepage custom block
   */
  homepageBlock: (content) => sanitizeHtml(content, {
    allowScripts: false,
    allowForms: false,
    allowIframes: true
  }),
  
  /**
   * Sanitize plain text (remove all HTML)
   */
  plainText: (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim();
  },
  
  /**
   * Sanitize URL
   */
  url: (url, type = 'link') => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    return isSafeUrl(trimmed, type) ? trimmed : '';
  },
  
  /**
   * Sanitize slug
   */
  slug: (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u1780-\u17FF]+/g, '-') // Include Khmer characters
      .replace(/^-+|-+$/g, '')
      .substring(0, 200);
  },
  
  /**
   * Sanitize filename
   */
  filename: (name) => {
    if (!name || typeof name !== 'string') return 'file';
    return name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  },
  
  /**
   * Check if content contains dangerous patterns
   */
  isDangerous: (content) => {
    if (!content) return false;
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(content));
  },
  
  /**
   * Get list of trusted iframe sources
   */
  getTrustedIframeSources: () => [...TRUSTED_IFRAME_SOURCES]
};

export default sanitizationService;
