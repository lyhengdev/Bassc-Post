import { Link } from 'react-router-dom';
import { Clock, Eye, TrendingUp, ArrowRight } from 'lucide-react';
import { formatRelativeTime, cn, getCategoryAccent, buildMediaUrl } from '../../utils';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { HeroSkeleton } from '../common/Skeleton';

/**
 * Modern Hero Section
 * Inspired by top news platforms (NYTimes, Guardian, BBC)
 */
export function HeroSection({ articles, isLoading }) {
  // Only show loading after 1 second
  const showLoading = useDelayedLoading(isLoading, 1000);

  // Show loading skeleton only if delayed and no data
  if (showLoading && !articles?.length) {
    return <HeroSkeleton />;
  }

  // Empty state
  if (!articles?.length) {
    return (
      <div className="relative h-[500px] rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMCAxMmMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIGZpbGw9IiNmZmYiLz48L2c+PC9zdmc+')] bg-repeat" />
        </div>
        
        <div className="relative text-center text-white px-6 max-w-3xl">
          <h1 className="text-2xl md:text-2xl lg:text-2xl font-bold mb-6 leading-tight">
            Welcome to Bassac Media
          </h1>
          <p className="text-2xl md:text-2xl text-white/90 mb-8 leading-relaxed">
            Your source for in-depth journalism and quality storytelling
          </p>
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 font-semibold rounded-full hover:bg-white/90 transition-colors shadow-lg hover:shadow-xl"
          >
            Explore News
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    );
  }

  const [mainArticle, ...sideArticles] = articles;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Featured News */}
      <div className="lg:col-span-7">
        <MainFeaturedArticle article={mainArticle} />
      </div>

      {/* Side News */}
      <div className="lg:col-span-5 space-y-6">
        {sideArticles.slice(0, 2).map((article, index) => (
          <SideFeaturedArticle key={article._id} article={article} index={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Main Featured News (Large)
 */
function MainFeaturedArticle({ article }) {
  if (!article) return null;

  const { slug, title, excerpt, featuredImage, category, author, publishedAt, views, readTime, featured } = article;

  return (
    <article className="group h-full flex flex-col fade-in">
      <Link to={`/article/${slug}`} className="block flex-1">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden image-overlay-gradient">
          <img
            src={buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/1200/900`}
            alt={title}
            loading="eager" // Main image loads immediately
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Category Badge */}
          {category && (
            <div className="absolute top-6 left-6 z-10">
              <span
                className="category-badge text-white shadow-xl backdrop-blur-sm"
                style={{ 
                  backgroundColor: category.color || getCategoryAccent(category.name),
                  background: `linear-gradient(135deg, ${category.color || getCategoryAccent(category.name)} 0%, ${category.color || getCategoryAccent(category.name)}dd 100%)`
                }}
              >
                {category.name}
              </span>
            </div>
          )}

          {/* Featured Badge */}
          {featured && (
            <div className="absolute top-6 right-6 z-10">
              <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-sm font-bold uppercase tracking-wider rounded-full shadow-xl flex items-center gap-2 backdrop-blur-sm">
                <TrendingUp size={16} />
                Featured
              </span>
            </div>
          )}

          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Title on Image (Optional - Modern Style) */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h2 className="text-2xl md:text-2xl lg:text-2xl font-bold leading-tight mb-2 drop-shadow-2xl line-clamp-3">
              {title}
            </h2>
          </div>
        </div>
      </Link>

      {/* Content Below Image */}
      <div className="mt-4 space-y-3">
        <p className="text-base md:text-lg text-dark-600 dark:text-dark-400 leading-relaxed line-clamp-3">
          {excerpt}
        </p>

        {/* Meta Information */}
        <div className="flex items-center gap-4 text-sm text-dark-500">
          {author && (
            <Link
              to={`/author/${author.username}`}
              className="font-semibold headline-hover flex items-center gap-2"
            >
              {author.avatar && (
                <img loading="lazy"
                  src={buildMediaUrl(author.avatar)}
                  alt={author.name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              {author.name}
            </Link>
          )}
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {formatRelativeTime(publishedAt)}
          </span>
          {readTime && (
            <span className="hidden sm:inline">{readTime} min read</span>
          )}
          {views > 0 && (
            <span className="hidden md:flex items-center gap-1">
              <Eye size={14} />
              {views.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Side Featured News (Medium)
 */
function SideFeaturedArticle({ article, index }) {
  if (!article) return null;

  const { slug, title, excerpt, featuredImage, category, publishedAt, readTime } = article;

  return (
    <article className={cn('group fade-in', index === 1 && 'fade-in-delay-1')}>
      <Link to={`/article/${slug}`} className="block">
        <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-3">
          <img
            src={buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/800/500`}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Category Badge */}
          {category && (
            <div className="absolute top-3 left-3 z-10">
              <span
                className="px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded text-white shadow-lg backdrop-blur-sm"
                style={{ backgroundColor: category.color || getCategoryAccent(category.name) }}
              >
                {category.name}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-2">
        <Link to={`/article/${slug}`}>
          <h3 className="text-lg md:text-2xl font-bold text-dark-900 dark:text-white leading-tight headline-group-hover line-clamp-3">
            {title}
          </h3>
        </Link>
        
        <p className="text-sm text-dark-600 dark:text-dark-400 line-clamp-2 hidden sm:block">
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

/**
 * Alternate Hero Layout - Full Width Split
 */
export function HeroSplitSection({ article }) {
  if (!article) return null;

  const { slug, title, excerpt, featuredImage, category, author, publishedAt, readTime } = article;

  return (
    <article className="relative h-[500px] md:h-[600px] rounded-2xl overflow-hidden group fade-in">
      {/* Background Image */}
      <img
        src={buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/1600/900`}
        alt={title}
        loading="eager"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
      
      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="max-w-2xl px-8 md:px-16 text-white space-y-6">
          {category && (
            <Link
              to={`/category/${category.slug}`}
              className="inline-block category-badge text-white shadow-xl"
              style={{ backgroundColor: category.color || getCategoryAccent(category.name) }}
            >
              {category.name}
            </Link>
          )}
          
          <Link to={`/article/${slug}`}>
            <h1 className="text-2xl md:text-2xl lg:text-2xl xl:text-2xl font-bold leading-tight mb-4 group-hover:text-primary-400 transition-colors">
              {title}
            </h1>
          </Link>
          
          <p className="text-lg md:text-2xl text-white/90 leading-relaxed line-clamp-3">
            {excerpt}
          </p>

          <div className="flex items-center gap-4 text-sm text-white/80">
            {author && (
              <span className="font-semibold flex items-center gap-2">
                {author.avatar && (
                  <img loading="lazy" src={buildMediaUrl(author.avatar)} alt={author.name} className="w-8 h-8 rounded-full border-2 border-white/50" />
                )}
                {author.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatRelativeTime(publishedAt)}
            </span>
            {readTime && <span>{readTime} min read</span>}
          </div>

          <Link
            to={`/article/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-dark-900 font-semibold rounded-full hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Read Full Story
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
