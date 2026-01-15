import { clsx } from 'clsx';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

// Combine class names
export function cn(...inputs) {
  return clsx(inputs);
}

// Format date
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
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
