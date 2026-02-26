const EMBEDDABLE_MARKERS = ['/videos/', '/reel/', '/reels/', '/posts/'];

function normalizePathname(pathname = '/') {
  const compact = `/${String(pathname || '').replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/');
  if (compact.length <= 1) return '/';
  return compact.replace(/\/+$/, '');
}

function detectFacebookTypeFromParsedUrl(parsed) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = normalizePathname(parsed.pathname).toLowerCase();
  const hasVideoQuery = parsed.searchParams.has('v') || parsed.searchParams.has('video_id');

  if (path.includes('/reel/') || path.includes('/reels/') || path.includes('/share/r/')) return 'reel';
  if (
    host === 'fb.watch'
    || path.includes('/videos/')
    || path === '/watch'
    || path.startsWith('/watch/')
    || path.includes('/share/v/')
    || hasVideoQuery
  ) {
    return 'video';
  }
  return 'post';
}

function hasPathIdentifier(pathname, marker) {
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return false;
  const tail = pathname.slice(markerIndex + marker.length);
  return tail.split('/').some(Boolean);
}

function buildCanonicalFacebookUrl(pathname) {
  const url = new URL('https://www.facebook.com');
  url.pathname = pathname;
  return url.toString();
}

function isFacebookHost(hostname = '') {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  return host === 'fb.watch' || host.endsWith('facebook.com');
}

export function normalizeFacebookCandidateUrl(value) {
  const external = normalizeExternalUrl(value);
  if (!external) return '';

  try {
    const parsed = new URL(external);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!isFacebookHost(host)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeShareUrl(parsed) {
  const shared = parsed.searchParams.get('u');
  if (!shared) return '';
  return normalizeFacebookUrl(shared);
}

export function normalizeExternalUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function normalizeFacebookUrl(value) {
  const external = normalizeExternalUrl(value);
  if (!external) return '';

  try {
    const parsed = new URL(external);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!isFacebookHost(host)) return '';

    // Wrapper links are frequently copied from messenger/feed shares.
    if (host === 'fb.watch') {
      const token = parsed.pathname.split('/').filter(Boolean)[0];
      if (!token) return '';
      return `https://fb.watch/${token}/`;
    }

    const pathname = normalizePathname(parsed.pathname);
    if (pathname === '/l.php' || pathname === '/share.php') {
      return normalizeShareUrl(parsed);
    }

    if (pathname.startsWith('/share/')) {
      const normalizedShare = normalizeShareUrl(parsed);
      if (normalizedShare) return normalizedShare;
      return '';
    }

    if (pathname === '/video.php') {
      const videoId = parsed.searchParams.get('v') || parsed.searchParams.get('video_id');
      if (!videoId) return '';
      const watchUrl = new URL('https://www.facebook.com/watch/');
      watchUrl.searchParams.set('v', videoId);
      return watchUrl.toString();
    }

    if (pathname === '/watch') {
      const videoId = parsed.searchParams.get('v') || parsed.searchParams.get('video_id');
      if (!videoId || !/^\d+$/.test(videoId)) return '';
      const watchUrl = new URL('https://www.facebook.com/watch/');
      watchUrl.searchParams.set('v', videoId);
      return watchUrl.toString();
    }

    if (pathname === '/story.php' || pathname === '/permalink.php') {
      const postId = parsed.searchParams.get('story_fbid') || parsed.searchParams.get('fbid');
      const ownerId = parsed.searchParams.get('id');
      if (!postId || !ownerId) return '';
      return buildCanonicalFacebookUrl(`/${ownerId}/posts/${postId}`);
    }

    if (pathname.startsWith('/watch/')) {
      const videoId = parsed.searchParams.get('v') || parsed.searchParams.get('video_id');
      if (!videoId || !/^\d+$/.test(videoId)) return '';
      const watchUrl = new URL('https://www.facebook.com/watch/');
      watchUrl.searchParams.set('v', videoId);
      return watchUrl.toString();
    }

    const hasEmbeddablePath = EMBEDDABLE_MARKERS.some((marker) => hasPathIdentifier(pathname, marker));
    if (!hasEmbeddablePath) {
      return '';
    }

    return buildCanonicalFacebookUrl(pathname);
  } catch {
    return '';
  }
}

export function detectFacebookContentType(value) {
  const normalized = normalizeFacebookUrl(value) || normalizeFacebookCandidateUrl(value);
  if (!normalized) return 'unknown';

  try {
    const parsed = new URL(normalized);
    return detectFacebookTypeFromParsedUrl(parsed);
  } catch {
    return 'unknown';
  }
}

function resolveVideoDisplayMode(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'auto';
  if (normalized === 'reel' || normalized === 'landscape' || normalized === 'auto') return normalized;
  return 'auto';
}

export function buildFacebookEmbedConfig(
  videoUrl,
  { display = 'auto', forceReel = false, autoplay = false, mute } = {},
) {
  const normalized = normalizeFacebookUrl(videoUrl);
  const fallbackCandidate = normalizeFacebookCandidateUrl(videoUrl);
  const href = normalized || fallbackCandidate;
  if (!href) return null;

  const contentType = detectFacebookContentType(href);
  const displayMode = resolveVideoDisplayMode(display);
  const isReel = Boolean(forceReel) || displayMode === 'reel' || (displayMode === 'auto' && contentType === 'reel');
  const params = new URLSearchParams({ href });

  if (contentType === 'post') {
    params.set('show_text', 'true');
    return {
      src: `https://www.facebook.com/plugins/post.php?${params.toString()}`,
      contentType,
      aspectClass: isReel ? 'aspect-[9/16]' : 'aspect-[4/5]',
    };
  }

  params.set('show_text', 'false');
  params.set('autoplay', autoplay ? '1' : '0');
  const shouldMute = typeof mute === 'boolean' ? mute : autoplay;
  params.set('mute', shouldMute ? '1' : '0');
  return {
    src: `https://www.facebook.com/plugins/video.php?${params.toString()}`,
    contentType,
    aspectClass: isReel ? 'aspect-[9/16]' : 'aspect-[16/9]',
  };
}
