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

    const siteUrl = normalizeBaseUrl(config.siteUrl);
    const title = article.metaTitle || article.title || config.siteName || 'Article';
    const description = article.metaDescription || article.excerpt || config.siteDescription || '';
    const imageUrl = resolveUrl(siteUrl, article.featuredImage || '/og-default.jpg');
    const articleUrl = resolveUrl(siteUrl, `/article/${article.slug}`);
    const authorName = article.author
      ? (article.author.fullName || `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim())
      : '';
    const publishedTime = article.publishedAt ? new Date(article.publishedAt).toISOString() : '';
    const modifiedTime = article.updatedAt ? new Date(article.updatedAt).toISOString() : publishedTime;

    const disableRedirect = req.query.preview === '1';
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | ${escapeHtml(config.siteName || '')}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(articleUrl)}" />

    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(articleUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta property="og:site_name" content="${escapeHtml(config.siteName || '')}" />
    <meta property="og:locale" content="en_US" />
    ${publishedTime ? `<meta property="article:published_time" content="${escapeHtml(publishedTime)}" />` : ''}
    ${modifiedTime ? `<meta property="article:modified_time" content="${escapeHtml(modifiedTime)}" />` : ''}
    ${authorName ? `<meta property="article:author" content="${escapeHtml(authorName)}" />` : ''}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(articleUrl)}" />
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
    res.send(html);
  } catch (error) {
    console.error('Share page error:', error);
    res.status(500).send('Share page failed');
  }
});

export default router;
