import { Router } from 'express';
import config from '../config/index.js';
import { Article } from '../models/index.js';

const router = Router();

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '');

const resolveUrl = (baseUrl, pathValue) => {
  if (!pathValue) return '';
  if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) return pathValue;
  if (!pathValue.startsWith('/')) return `${baseUrl}/${pathValue}`;
  return `${baseUrl}${pathValue}`;
};

const isLocalhostBaseUrl = (value) => {
  if (!value) return true;
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return true;
  }
};

const getRequestOrigin = (req) => {
  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  const host = (forwardedHost || req.get('host') || '').split(',')[0].trim();
  const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
  return host ? `${protocol}://${host}` : '';
};

const SOCIAL_CRAWLER_SIGNATURES = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'skypeuripreview',
  'pinterest',
  'redditbot',
];

const isSocialCrawler = (req) => {
  const ua = String(req.get('user-agent') || '').toLowerCase();
  if (!ua) return false;
  return SOCIAL_CRAWLER_SIGNATURES.some((signature) => ua.includes(signature));
};

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).send('Missing slug');
    }

    const article = await Article.findOne({ slug, status: 'published' })
      .select('title excerpt metaTitle metaDescription featuredImage publishedAt updatedAt slug author')
      .populate('author', 'firstName lastName fullName')
      .lean();

    if (!article) {
      return res.status(404).send('Article not found');
    }

    const requestOrigin = normalizeBaseUrl(getRequestOrigin(req));
    const configuredApiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
    const configuredSiteUrl = normalizeBaseUrl(config.siteUrl);
    const configuredFrontendUrl = normalizeBaseUrl(config.frontendUrl);
    const siteUrl = !isLocalhostBaseUrl(configuredSiteUrl)
      ? configuredSiteUrl
      : (!isLocalhostBaseUrl(configuredFrontendUrl) ? configuredFrontendUrl : requestOrigin || configuredSiteUrl);
    const imageBaseUrl = !isLocalhostBaseUrl(configuredApiBaseUrl)
      ? configuredApiBaseUrl
      : requestOrigin || siteUrl;
    const title = article.metaTitle || article.title || config.siteName || 'Article';
    const description = article.metaDescription || article.excerpt || config.siteDescription || '';
    const imagePath = article.featuredImage || '/LogoV1.png';
    const imageUrl = imagePath.startsWith('/uploads/')
      ? resolveUrl(imageBaseUrl, imagePath)
      : resolveUrl(siteUrl, imagePath);
    const sharePath = String(req.originalUrl || req.url || `/share/${article.slug}`).split('?')[0] || `/share/${article.slug}`;
    const shareUrl = resolveUrl(requestOrigin || siteUrl, sharePath);
    const articleUrl = resolveUrl(siteUrl, `/article/${article.slug}`);
    const authorName = article.author
      ? (article.author.fullName || `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim())
      : '';
    const publishedTime = article.publishedAt ? new Date(article.publishedAt).toISOString() : '';
    const modifiedTime = article.updatedAt ? new Date(article.updatedAt).toISOString() : publishedTime;

    const disableRedirect = req.query.preview === '1' || isSocialCrawler(req);
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | ${escapeHtml(config.siteName || '')}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(shareUrl)}" />
    <meta name="robots" content="noindex, nofollow" />

    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    ${imageUrl.startsWith('https://') ? `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />` : ''}
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta property="og:site_name" content="${escapeHtml(config.siteName || '')}" />
    <meta property="og:locale" content="en_US" />
    ${publishedTime ? `<meta property="article:published_time" content="${escapeHtml(publishedTime)}" />` : ''}
    ${modifiedTime ? `<meta property="article:modified_time" content="${escapeHtml(modifiedTime)}" />` : ''}
    ${authorName ? `<meta property="article:author" content="${escapeHtml(authorName)}" />` : ''}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(shareUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

    ${disableRedirect ? '' : `<meta http-equiv="refresh" content="0; url=${escapeHtml(articleUrl)}" />`}
  </head>
  <body>
    <p>${disableRedirect ? 'Preview mode (no redirect).' : 'Redirecting to'} <a href="${escapeHtml(articleUrl)}">${escapeHtml(articleUrl)}</a></p>
  </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Vary', 'User-Agent');
    res.send(html);
  } catch (error) {
    console.error('Share page error:', error);
    res.status(500).send('Share page failed');
  }
});

export default router;
