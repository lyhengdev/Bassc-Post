import { Helmet } from 'react-helmet-async';

/**
 * SEO Head Component for News News
 * Provides complete Open Graph, Twitter Card, and structured data
 * for optimal social media sharing with thumbnail previews
 */
export function SEOHead({
  title,
  description,
  image,
  url,
  type = 'article',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
  siteName = 'Bassac Post',
  twitterHandle = '@bassacmedia',
  locale = 'en_US',
  noIndex = false,
}) {
  // Ensure absolute URLs
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = url?.startsWith('http') ? url : `${siteUrl}${url || ''}`;
  const fullImage = image?.startsWith('http') ? image : `${siteUrl}${image || '/LogoV1.png'}`;
  
  // Truncate description for meta tags (160 chars)
  const metaDescription = description?.substring(0, 160) || '';
  
  // Full title with site name
  const fullTitle = title ? `${title} | ${siteName}` : siteName;

  // JSON-LD structured data for Google
  const structuredData = type === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': title,
    'description': metaDescription,
    'image': [fullImage],
    'datePublished': publishedTime,
    'dateModified': modifiedTime || publishedTime,
    'author': author ? {
      '@type': 'Person',
      'name': author,
    } : undefined,
    'publisher': {
      '@type': 'Organization',
      'name': siteName,
      'logo': {
        '@type': 'ImageObject',
        'url': `${siteUrl}/LogoV1.png`,
      },
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': fullUrl,
    },
    'articleSection': section,
    'keywords': tags.join(', '),
  } : {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': siteName,
    'url': siteUrl,
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type === 'article' ? 'article' : 'website'} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title || siteName} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || siteName} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      
      {/* News specific Open Graph */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && section && (
        <meta property="article:section" content={section} />
      )}
      {type === 'article' && tags.map((tag, i) => (
        <meta key={i} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={title || siteName} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={fullImage} />
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      {twitterHandle && <meta name="twitter:creator" content={twitterHandle} />}
      
      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

/**
 * News SEO wrapper - simplified API for articles
 */
export function ArticleSEO({ article, siteSettings }) {
  if (!article) return null;
  
  const authorName = article.author 
    ? `${article.author.firstName} ${article.author.lastName}` 
    : undefined;
    
  return (
    <SEOHead
      title={article.metaTitle || article.title}
      description={article.metaDescription || article.excerpt}
      image={article.featuredImage}
      url={`/article/${article.slug}`}
      type="article"
      publishedTime={article.publishedAt}
      modifiedTime={article.updatedAt}
      author={authorName}
      section={article.category?.name}
      tags={article.tags || []}
      siteName={siteSettings?.siteName}
    />
  );
}

/**
 * Category SEO wrapper
 */
export function CategorySEO({ category, siteSettings }) {
  if (!category) return null;
  
  return (
    <SEOHead
      title={`${category.name} News`}
      description={category.description || `Latest ${category.name} news and articles`}
      image={category.image}
      url={`/category/${category.slug}`}
      type="website"
      siteName={siteSettings?.siteName}
    />
  );
}

export default SEOHead;
