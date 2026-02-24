import { clsx } from 'clsx';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function getPreferredLanguageCode() {
  if (typeof window === 'undefined') return 'en';
  const stored = (localStorage.getItem('preferredLanguage') || localStorage.getItem('i18nextLng') || '').toLowerCase();
  if (stored.startsWith('km')) return 'km';
  if (stored.startsWith('zh')) return 'zh';
  return 'en';
}

function getLocaleTag() {
  const language = getPreferredLanguageCode();
  if (language === 'km') return 'km-KH';
  if (language === 'zh') return 'zh-CN';
  return 'en-US';
}

// Combine class names
export function cn(...inputs) {
  return clsx(inputs);
}

// Format date
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (formatStr === 'MMM d, yyyy' && typeof Intl !== 'undefined') {
      return new Intl.DateTimeFormat(getLocaleTag(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(dateObj);
    }
    return format(dateObj, formatStr);
  } catch {
    return '';
  }
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date) {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined') {
      const rtf = new Intl.RelativeTimeFormat(getLocaleTag(), { numeric: 'auto' });
      const diffSeconds = Math.round((dateObj.getTime() - Date.now()) / 1000);
      const absSeconds = Math.abs(diffSeconds);

      if (absSeconds < 60) return rtf.format(diffSeconds, 'second');
      const diffMinutes = Math.round(diffSeconds / 60);
      if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
      const diffHours = Math.round(diffMinutes / 60);
      if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
      const diffDays = Math.round(diffHours / 24);
      if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
      const diffMonths = Math.round(diffDays / 30);
      if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
      const diffYears = Math.round(diffMonths / 12);
      return rtf.format(diffYears, 'year');
    }
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return '';
  }
}

// Truncate text
export function truncate(text, length = 100) {
  if (!text || text.length <= length) return text;
  return text.substring(0, length).trim() + '...';
}

function normalizeBaseUrl(url, fallback = '/api') {
  const raw = (url || '').trim();
  if (!raw) return fallback;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_API_URL, '/api');
}

export function buildApiUrl(path = '') {
  const base = getApiBaseUrl();
  if (!path) return base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function buildMediaUrl(path = '') {
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path)) return path;
  if (/^(data|blob):/i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiBase = getApiBaseUrl();

  if (/^https?:\/\//i.test(apiBase)) {
    try {
      return `${new URL(apiBase).origin}${normalizedPath}`;
    } catch {
      return normalizedPath;
    }
  }

  return normalizedPath;
}

// Get initials from name
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function hashString(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryAccent(name, fallback = '#6B7280') {
  if (!name) return fallback;
  const hue = hashString(name) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function getCategoryThumbnail(name) {
  const label = (name || 'Category').trim();
  const initials = getInitials(label);
  const hue = hashString(label) % 360;
  const hue2 = (hue + 40) % 360;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="hsl(${hue},70%,45%)" />
          <stop offset="100%" stop-color="hsl(${hue2},70%,55%)" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#g)"/>
      <circle cx="68" cy="68" r="36" fill="rgba(255,255,255,0.25)"/>
      <text x="68" y="76" font-size="28" font-family="Arial, sans-serif" fill="#ffffff" text-anchor="middle" font-weight="700">${initials}</text>
      <text x="24" y="210" font-size="20" font-family="Arial, sans-serif" fill="#ffffff" opacity="0.9">${label}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Format number with commas
export function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
}

// Calculate read time
export function calculateReadTime(wordCount) {
  const minutes = Math.ceil((wordCount || 0) / 200);
  return `${minutes} min read`;
}

// Format bytes to human readable
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
