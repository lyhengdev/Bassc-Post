export const normalizePageType = (pageType) => {
  const normalized = (pageType || '').toString().toLowerCase();
  if (normalized === 'articles') return 'article';
  if (!normalized) return 'other';
  return normalized;
};

export const normalizePagePath = (value = '') => {
  if (!value || typeof value !== 'string') return '';
  let trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      trimmed = new URL(trimmed).pathname || '/';
    } catch (error) {
      return '';
    }
  }
  trimmed = trimmed.split('?')[0].split('#')[0];
  if (!trimmed.startsWith('/')) {
    trimmed = `/${trimmed}`;
  }
  if (trimmed.length > 1 && trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
};

const extractSlug = (pageType, path) => {
  const segments = (path || '').split('/').filter(Boolean);
  if (segments.length === 0) return '';
  const normalizedType = normalizePageType(pageType);
  const prefixes = {
    article: ['article', 'articles'],
    category: ['category', 'categories'],
    page: ['page', 'pages'],
  }[normalizedType];
  if (prefixes && prefixes.includes(segments[0]) && segments.length > 1) {
    return segments[segments.length - 1];
  }
  return '';
};

export const buildPageKey = ({ pageType, pageUrl, fallback = '' } = {}) => {
  const normalizedType = normalizePageType(pageType);
  const path = normalizePagePath(pageUrl);
  const slug = extractSlug(normalizedType, path);
  const keyPart = slug || path || fallback || normalizedType;
  return `${normalizedType}:${keyPart}`;
};

export const buildIdentityKey = ({ userId, sessionId } = {}) => {
  if (userId) return `user:${userId}`;
  if (sessionId) return `session:${sessionId}`;
  return null;
};

export const buildDedupeKey = ({ type, adId, pageKey, identityKey, eventId } = {}) => {
  if (!type || !adId) return null;
  if (eventId) {
    const identityPart = identityKey || 'anon';
    const pagePart = pageKey || 'no-page';
    return `${type}:${identityPart}:${adId}:${pagePart}:${eventId}`;
  }
  if (!identityKey || !pageKey) return null;
  return `${type}:${identityKey}:${adId}:${pageKey}`;
};
