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
