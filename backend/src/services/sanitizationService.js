import { FilterXSS } from 'xss';

const trustedIframeHosts = [
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
  'google.com',
  'slideshare.net',
  'codepen.io',
  'jsfiddle.net',
  'player.vimeo.com',
];

const sanitizeUrlLocal = (url, type = 'link') => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const lowered = trimmed.toLowerCase();
  if (lowered.startsWith('javascript:') || lowered.startsWith('vbscript:')) return '';
  if (type !== 'image' && lowered.startsWith('data:')) return '';
  if (type === 'iframe') {
    try {
      const parsed = new URL(trimmed, 'http://dummy');
      if (!trustedIframeHosts.some((host) => parsed.hostname.includes(host))) return '';
    } catch {
      return '';
    }
  }
  return trimmed;
};

const baseXss = new FilterXSS({
  whiteList: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes'],
    video: ['src', 'poster', 'width', 'height', 'controls', 'autoplay', 'muted', 'loop', 'playsinline', 'preload'],
    audio: ['src', 'controls', 'autoplay', 'muted', 'loop', 'preload'],
    source: ['src', 'srcset', 'media', 'type', 'sizes'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'title'],
    div: ['class', 'style', 'id', 'data-*'],
    span: ['class', 'style', 'id', 'data-*'],
    p: ['class', 'style', 'id', 'data-*'],
    strong: ['class', 'style'],
    b: ['class', 'style'],
    em: ['class', 'style'],
    i: ['class', 'style'],
    u: ['class', 'style'],
    ul: ['class', 'style'],
    ol: ['class', 'style'],
    li: ['class', 'style'],
    table: ['class', 'style'],
    thead: ['class', 'style'],
    tbody: ['class', 'style'],
    tfoot: ['class', 'style'],
    tr: ['class', 'style'],
    th: ['class', 'style', 'colspan', 'rowspan', 'scope'],
    td: ['class', 'style', 'colspan', 'rowspan'],
    h1: ['class', 'style'],
    h2: ['class', 'style'],
    h3: ['class', 'style'],
    h4: ['class', 'style'],
    h5: ['class', 'style'],
    h6: ['class', 'style'],
    blockquote: ['class', 'style', 'cite'],
    code: ['class', 'style'],
    pre: ['class', 'style'],
    figure: ['class', 'style'],
    figcaption: ['class', 'style'],
    button: ['class', 'style', 'type'],
  },
  stripIgnoreTag: true,
  onTagAttr: (tag, name, value) => {
    if (name === 'src' || name === 'href') {
      const safe = sanitizeUrlLocal(value, tag === 'img' ? 'image' : tag === 'iframe' ? 'iframe' : 'link');
      return `${name}="${safe}"`;
    }
    return undefined;
  },
  onIgnoreTagAttr: () => '',
  safeAttrValue: (tag, name, value) => value,
});

const sanitizeHtml = (content) => {
  if (!content || typeof content !== 'string') return '';
  return baseXss.process(content);
};

const sanitizeService = {
  html: (content) => sanitizeHtml(content),
  adHtml: (content) => sanitizeHtml(content),
  articleContent: (content) => sanitizeHtml(content),
  homepageBlock: (content) => sanitizeHtml(content),
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
  url: (url, type = 'link') => {
    return sanitizeUrlLocal(url, type);
  },
  slug: (text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u1780-\u17FF]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 200);
  },
  filename: (name) => {
    if (!name || typeof name !== 'string') return 'file';
    return name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  },
  isDangerous: (content) => {
    if (!content) return false;
    const lower = content.toLowerCase();
    
    // Comprehensive XSS pattern detection
    const patterns = [
      '<script',
      '</script>',
      'javascript:',
      'vbscript:',
      'data:text/html',
      'onerror=',
      'onerror =',
      'onload=',
      'onload =',
      'onclick=',
      'onclick =',
      'onmouseover=',
      'onmouseout=',
      'onmousemove=',
      'onmouseenter=',
      'onmouseleave=',
      'onfocus=',
      'onblur=',
      'onsubmit=',
      'onchange=',
      'ondblclick=',
      'onkeydown=',
      'onkeyup=',
      'onkeypress=',
      'oninput=',
      'eval(',
      'expression(',
      'document.cookie',
      'document.write',
      'window.location',
      '.innerhtml',
      'fromcharcode',
      '<iframe',
      '</iframe>',
      '<object',
      '</object>',
      '<embed',
      '</embed>',
      '<applet',
      '</applet>',
      'formaction=',
      'behavior:',
      '-moz-binding:',
      '@import',
    ];
    
    // Check if content contains any dangerous patterns
    if (patterns.some(p => lower.includes(p))) {
      return true;
    }
    
    // Check for event handler attributes using regex
    if (/on\w+\s*=/i.test(content)) {
      return true;
    }
    
    return false;
  },
  getTrustedIframeSources: () => [...trustedIframeHosts],
};

export default sanitizeService;
