import { Link } from 'react-router-dom';
import { Clock, Eye, User } from 'lucide-react';
import { cn, formatRelativeTime, formatDate, truncate } from '../../utils';
import { Badge } from '../common/index.jsx';

// ==================== ARTICLE CARD ====================
export function ArticleCard({ article, variant = 'default', index = 0, priority = false }) {
  const {
    title,
    slug,
    excerpt,
    featuredImage,
    category,
    author,
    publishedAt,
    viewCount,
  } = article;

  // featuredImage is a string URL, not an object
  const imageUrl = featuredImage || `https://picsum.photos/seed/${slug}/800/600`;

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';
  const isHorizontal = variant === 'horizontal';

  // Horizontal variant for mobile-friendly list view
  if (isHorizontal) {
    return (
      <article className="mobile-card flex gap-3 p-3 bg-white dark:bg-dark-900 rounded-xl border border-dark-100 dark:border-dark-800">
        <Link to={`/article/${slug}`} className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="w-24 h-24 sm:w-32 sm:h-24 object-cover rounded-lg"
          />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          {category && (
            <Link to={`/category/${category.slug}`}>
              <Badge
                className="text-[10px] px-2 py-0.5"
                style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color,
                }}
              >
                {category.name}
              </Badge>
            </Link>
          )}
          <Link to={`/article/${slug}`}>
            <h3 className="font-semibold text-sm sm:text-base text-dark-900 dark:text-white line-clamp-2 mt-1">
              {title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 text-xs text-dark-400 mt-1">
            <span>{formatRelativeTime(publishedAt)}</span>
            {viewCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {viewCount}
                </span>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'card card-hover',
        isFeatured && 'lg:flex lg:gap-6'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image with lazy loading */}
      {!isCompact && (
        <Link
          to={`/article/${slug}`}
          className={cn(
            'block overflow-hidden',
            isFeatured && 'lg:w-1/2 lg:flex-shrink-0'
          )}
        >
          <img
            src={imageUrl}
            alt={title}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className={cn(
              'w-full object-cover transition-transform duration-500 hover:scale-105',
              isFeatured ? 'h-48 sm:h-64 lg:h-full' : 'h-40 sm:h-48'
            )}
          />
        </Link>
      )}

      {/* Content */}
      <div className={cn('p-4 sm:p-5', isFeatured && 'lg:py-6')}>
        {/* Category */}
        {category && (
          <Link to={`/category/${category.slug}`} className="inline-block mb-2 sm:mb-3">
            <Badge
              className="hover:opacity-80 transition-opacity text-xs"
              style={{
                backgroundColor: `${category.color}20`,
                color: category.color,
              }}
            >
              {category.name}
            </Badge>
          </Link>
        )}

        {/* Title */}
        <Link to={`/article/${slug}`}>
          <h3
            className={cn(
              'font-display font-bold text-dark-900 dark:text-white',
              'hover:text-primary-600 dark:hover:text-primary-400 transition-colors',
              isFeatured ? 'text-xl sm:text-2xl lg:text-3xl mb-2 sm:mb-3' : 'text-lg sm:text-xl mb-2',
              isCompact && 'text-base sm:text-lg'
            )}
          >
            {isCompact ? truncate(title, 60) : title}
          </h3>
        </Link>

        {/* Excerpt */}
        {!isCompact && excerpt && (
          <p className="text-dark-600 dark:text-dark-400 mb-3 sm:mb-4 line-clamp-2 text-sm sm:text-base">
            {excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-dark-500">
          {author && (
            <div className="flex items-center gap-1 sm:gap-2">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="truncate max-w-[100px] sm:max-w-none">
                {author.fullName ||
                  `${author.firstName} ${author.lastName}`}
              </span>
            </div>
          )}
          {publishedAt && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{formatRelativeTime(publishedAt)}</span>
            </div>
          )}
          {viewCount > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{viewCount}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ==================== FEATURED ARTICLE (Hero) ====================
export function FeaturedArticle({ article }) {
  const { title, slug, excerpt, featuredImage, category, author, publishedAt } =
    article;

  // featuredImage is a string URL, not an object
  const imageUrl = featuredImage || `https://picsum.photos/seed/${slug}/1200/800`;

  return (
    <article className="relative rounded-2xl sm:rounded-3xl overflow-hidden group">
      {/* Image */}
      <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-10">
        {category && (
          <Badge className="mb-2 sm:mb-4 bg-white/20 text-white backdrop-blur-sm text-xs sm:text-sm">
            {category.name}
          </Badge>
        )}

        <Link to={`/article/${slug}`}>
          <h2 className="font-display font-bold text-xl sm:text-3xl lg:text-5xl text-white mb-2 sm:mb-4 hover:text-primary-300 transition-colors line-clamp-3 sm:line-clamp-2">
            {title}
          </h2>
        </Link>

        {excerpt && (
          <p className="hidden sm:block text-white/80 text-base lg:text-lg mb-4 max-w-2xl line-clamp-2">
            {excerpt}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-white/70 text-xs sm:text-sm">
          {author && (
            <span>
              By {author.fullName || `${author.firstName} ${author.lastName}`}
            </span>
          )}
          {publishedAt && (
            <>
              <span className="hidden sm:inline">•</span>
              <span>{formatDate(publishedAt)}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ==================== ARTICLE CONTENT (Editor.js renderer) ====================
export function ArticleContent({ content, inArticleAd }) {
  if (!content || !content.blocks) return null;

  // Get the position where ad should be inserted (default: after 3rd paragraph)
  const adPosition = inArticleAd?.position || 3;
  const shouldShowAd = inArticleAd?.enabled;

  // Count paragraphs to determine ad placement
  let paragraphCount = 0;
  let adInserted = false;

  return (
    <div className="article-content prose prose-lg max-w-none dark:prose-invert">
      {content.blocks.map((block, index) => {
        const blockElement = <Block key={block.id || index} block={block} />;
        
        // Count paragraphs
        if (block.type === 'paragraph') {
          paragraphCount++;
        }

        // Insert ad after the specified paragraph position
        if (shouldShowAd && !adInserted && paragraphCount === adPosition && block.type === 'paragraph') {
          adInserted = true;
          return (
            <div key={block.id || index}>
              {blockElement}
              <InArticleAdBlock settings={inArticleAd} />
            </div>
          );
        }

        return blockElement;
      })}
      
      {/* If article is shorter than ad position, show ad at the end */}
      {shouldShowAd && !adInserted && paragraphCount > 0 && (
        <InArticleAdBlock settings={inArticleAd} />
      )}
    </div>
  );
}

// In-Article Ad Block Component
function InArticleAdBlock({ settings }) {
  if (!settings?.enabled) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const imageUrl = isMobile && settings.mobileImageUrl ? settings.mobileImageUrl : settings.imageUrl;

  const styles = {
    banner: 'bg-dark-50 dark:bg-dark-800/50',
    native: 'bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl shadow-sm',
    card: 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-xl',
  };

  return (
    <div className={cn('my-8 p-4 relative not-prose', styles[settings.style || 'banner'])}>
      {settings.showLabel && (
        <div className="text-xs text-dark-400 mb-2 uppercase tracking-wider text-center">Advertisement</div>
      )}
      
      <a 
        href={settings.linkUrl || '#'} 
        target="_blank" 
        rel="noopener noreferrer sponsored"
        className="block"
      >
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Advertisement" 
            className="w-full h-auto max-h-72 object-contain mx-auto rounded-lg" 
          />
        ) : settings.content ? (
          <div 
            className="text-center text-dark-600 dark:text-dark-300"
            dangerouslySetInnerHTML={{ __html: settings.content }} 
          />
        ) : (
          <div className="h-24 bg-dark-100 dark:bg-dark-700 rounded-lg flex items-center justify-center text-dark-400">
            Advertisement Space
          </div>
        )}
      </a>
    </div>
  );
}

function Block({ block }) {
  const { type, data } = block;

  switch (type) {
    case 'paragraph':
      return <p dangerouslySetInnerHTML={{ __html: data.text }} />;

    case 'header':
      const HeadingTag = `h${data.level}`;
      return <HeadingTag dangerouslySetInnerHTML={{ __html: data.text }} />;

    case 'list':
      const ListTag = data.style === 'ordered' ? 'ol' : 'ul';
      return (
        <ListTag>
          {data.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ListTag>
      );

    case 'quote':
      return (
        <blockquote>
          <p dangerouslySetInnerHTML={{ __html: data.text }} />
          {data.caption && (
            <cite className="block mt-2 text-sm not-italic">
              — {data.caption}
            </cite>
          )}
        </blockquote>
      );

    case 'image':
      return (
        <figure className="my-8">
          <img
            src={data.file?.url || data.url}
            alt={data.caption || ''}
            className={cn(
              'rounded-xl',
              data.withBorder && 'border border-dark-200 dark:border-dark-700',
              data.stretched && 'w-full',
              data.withBackground && 'bg-dark-100 dark:bg-dark-800 p-4'
            )}
          />
          {data.caption && (
            <figcaption className="mt-2 text-center text-sm text-dark-500">
              {data.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'code':
      return (
        <pre>
          <code>{data.code}</code>
        </pre>
      );

    case 'delimiter':
      return (
        <div className="my-10 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-dark-300 dark:bg-dark-600" />
          <span className="w-2 h-2 rounded-full bg-dark-300 dark:bg-dark-600" />
          <span className="w-2 h-2 rounded-full bg-dark-300 dark:bg-dark-600" />
        </div>
      );

    case 'table':
      return (
        <div className="overflow-x-auto my-6">
          <table className="min-w-full border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden">
            <tbody>
              {data.content.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={
                    rowIndex === 0 && data.withHeadings
                      ? 'bg-dark-100 dark:bg-dark-800 font-semibold'
                      : ''
                  }
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-2 border border-dark-200 dark:border-dark-700"
                      dangerouslySetInnerHTML={{ __html: cell }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}
