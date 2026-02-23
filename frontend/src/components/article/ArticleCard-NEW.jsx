import { Link } from 'react-router-dom';
import { Clock, Eye, TrendingUp } from 'lucide-react';
import { formatRelativeTime, cn, getCategoryAccent, buildMediaUrl } from '../../utils';

/**
 * Modern News Card Component
 * Inspired by NYTimes, BBC, and Medium
 */
export function ArticleCard({ article, variant = 'standard', className, showImage = true, priority = false }) {
  if (!article) return null;

  const {
    _id,
    slug,
    title,
    excerpt,
    featuredImage,
    category,
    author,
    publishedAt,
    views,
    readTime,
    featured
  } = article;

  // Variant: Large Featured
  if (variant === 'featured-large') {
    return (
      <article className={cn('group relative fade-in', className)}>
        <Link to={`/article/${slug}`} className="block">
          {/* Image with Overlay */}
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-4 image-overlay-gradient">
              <img
                src={buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/800/450`}
                alt={title}
                loading={priority ? 'eager' : 'lazy'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            
            {/* Category Badge on Image */}
            {category && (
              <div className="absolute top-4 left-4 z-10">
                <span
                  className="category-badge text-white shadow-lg"
                  style={{ backgroundColor: category.color || getCategoryAccent(category.name) }}
                >
                  {category.name}
                </span>
              </div>
            )}

            {/* Featured Badge */}
            {featured && (
              <div className="absolute top-4 right-4 z-10">
                <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                  <TrendingUp size={12} />
                  Featured
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-2xl lg:text-2xl font-bold text-dark-900 dark:text-white leading-tight headline-group-hover line-clamp-3">
              {title}
            </h2>
            
            <p className="text-base md:text-lg text-dark-600 dark:text-dark-400 leading-relaxed line-clamp-2">
              {excerpt}
            </p>

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-sm text-dark-500 dark:text-dark-500">
              {author && (
                <span className="font-medium headline-hover">
                  {author.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatRelativeTime(publishedAt)}
              </span>
              {readTime && (
                <span>{readTime} min read</span>
              )}
              {views > 0 && (
                <span className="flex items-center gap-1">
                  <Eye size={14} />
                  {views.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </Link>
      </article>
    );
  }

  // Variant: Horizontal (List)
  if (variant === 'horizontal') {
    return (
      <article className={cn('group flex gap-4 pb-4 border-b border-dark-200 dark:border-dark-700 last:border-0 fade-in', className)}>
        {showImage && (
          <Link to={`/article/${slug}`} className="flex-shrink-0">
            <div className="w-32 md:w-40 aspect-[4/3] rounded-lg overflow-hidden">
              <img
                src={buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/400/300`}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </Link>
        )}
        
        <div className="flex-1 min-w-0 space-y-2">
          {category && (
            <Link
              to={`/category/${category.slug}`}
              className="inline-block text-xs font-semibold uppercase tracking-wider hover:underline transition-colors"
              style={{ color: category.color || getCategoryAccent(category.name) }}
            >
              {category.name}
            </Link>
          )}
          
          <Link to={`/article/${slug}`}>
            <h3 className="text-lg md:text-2xl font-bold text-dark-900 dark:text-white leading-tight headline-group-hover line-clamp-2">
              {title}
            </h3>
          </Link>
          
          <p className="text-sm text-dark-600 dark:text-dark-400 line-clamp-2 hidden md:block">
            {excerpt}
          </p>

          <div className="flex items-center gap-3 text-xs text-dark-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatRelativeTime(publishedAt)}
            </span>
            {readTime && <span>{readTime} min</span>}
          </div>
        </div>
      </article>
    );
  }

  // Variant: Compact (Sidebar)
  if (variant === 'compact') {
    return (
      <article className={cn('group flex gap-3 fade-in', className)}>
        <Link to={`/article/${slug}`} className="flex-shrink-0">
          <div className="w-20 h-20 rounded-lg overflow-hidden">
            <img
              src={buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/200/200`}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>
        
        <div className="flex-1 min-w-0 space-y-1">
          {category && (
            <span
              className="inline-block text-xs font-semibold uppercase tracking-wider"
              style={{ color: category.color || getCategoryAccent(category.name) }}
            >
              {category.name}
            </span>
          )}
          
          <Link to={`/article/${slug}`}>
            <h4 className="text-sm font-bold text-dark-900 dark:text-white leading-tight headline-group-hover line-clamp-3">
              {title}
            </h4>
          </Link>
          
          <span className="text-xs text-dark-500 flex items-center gap-1">
            <Clock size={10} />
            {formatRelativeTime(publishedAt)}
          </span>
        </div>
      </article>
    );
  }

  // Variant: Standard (Grid Card)
  return (
    <article className={cn('group space-y-3 fade-in hover-lift', className)}>
      {showImage && (
        <Link to={`/article/${slug}`} className="block">
          <div className="aspect-[16/10] rounded-lg overflow-hidden bg-dark-100 dark:bg-dark-800">
            <img
              src={buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/600/400`}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>
      )}
      
      <div className="space-y-2">
        {category && (
          <Link
            to={`/category/${category.slug}`}
            className="inline-block text-xs font-semibold uppercase tracking-wider hover:underline transition-colors"
            style={{ color: category.color || getCategoryAccent(category.name) }}
          >
            {category.name}
          </Link>
        )}
        
        <Link to={`/article/${slug}`}>
          <h3 className="text-2xl font-bold text-dark-900 dark:text-white leading-tight headline-group-hover line-clamp-3">
            {title}
          </h3>
        </Link>
        
        <p className="text-sm text-dark-600 dark:text-dark-400 leading-relaxed line-clamp-3">
          {excerpt}
        </p>

        <div className="flex items-center gap-3 text-xs text-dark-500 pt-1">
          {author && (
            <span className="font-medium">{author.name}</span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatRelativeTime(publishedAt)}
          </span>
          {readTime && <span>{readTime} min</span>}
        </div>
      </div>
    </article>
  );
}

/**
 * News Grid Component
 * Responsive grid with delayed loading
 */
export function ArticleGrid({ articles, isLoading, showLoading, columns = 3, className }) {
  // Don't show loading skeleton if we have data (even if refetching)
  if (showLoading && !articles?.length) {
    return (
      <div className={cn(
        'grid gap-6',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}>
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!articles?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-500 dark:text-dark-400">No articles found</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'grid gap-6',
      columns === 2 && 'grid-cols-1 md:grid-cols-2',
      columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      className
    )}>
      {articles.map((article, index) => (
        <ArticleCard
          key={article._id}
          article={article}
          priority={index < 2} // First 2 images load eagerly
          className={`fade-in-delay-${Math.min(index, 2)}`}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton Loader (defined here for convenience)
 */
function ArticleCardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="aspect-[16/10] rounded-lg bg-dark-200 dark:bg-dark-700" />
      <div className="h-3 w-20 bg-dark-200 dark:bg-dark-700 rounded" />
      <div className="h-6 w-full bg-dark-200 dark:bg-dark-700 rounded" />
      <div className="h-6 w-4/5 bg-dark-200 dark:bg-dark-700 rounded" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-dark-200 dark:bg-dark-700 rounded" />
        <div className="h-4 w-3/4 bg-dark-200 dark:bg-dark-700 rounded" />
      </div>
      <div className="h-3 w-32 bg-dark-200 dark:bg-dark-700 rounded" />
    </div>
  );
}
