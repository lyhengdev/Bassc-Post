import { cn } from '../../utils';

/**
 * Base Skeleton Component
 * Animated loading placeholder with shimmer effect
 */
export function Skeleton({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'rounded',
    text: 'rounded h-4',
    title: 'rounded h-8',
    subtitle: 'rounded h-6',
    circle: 'rounded-full',
    button: 'rounded-xl h-10',
    card: 'rounded-2xl',
    avatar: 'rounded-full w-10 h-10',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-r from-dark-100 via-dark-200 to-dark-100',
        'dark:from-dark-800 dark:via-dark-700 dark:to-dark-800',
        'before:absolute before:inset-0',
        'before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent dark:before:via-white/10',
        'before:animate-shimmer',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

/**
 * News Card Skeleton
 * For grid/list article layouts
 */
export function ArticleCardSkeleton({ variant = 'card' }) {
  if (variant === 'list') {
    return (
      <div className="flex gap-4 p-4 border-b border-dark-200 dark:border-dark-700">
        <Skeleton className="w-32 h-24 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[16/10] rounded-lg" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-32 mt-2" />
    </div>
  );
}

/**
 * Hero Section Skeleton
 * For main featured article area
 */
export function HeroSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 sm:gap-6">
      {/* Main Featured */}
      <div className="col-span-12 lg:col-span-7 space-y-3">
        <Skeleton className="aspect-[4/3] rounded-lg" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-40 mt-2" />
      </div>

      {/* Side News */}
      <div className="col-span-12 lg:col-span-5 space-y-4 sm:space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[16/10] rounded-lg" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * News Grid Skeleton
 * For article grids (3 columns)
 */
export function ArticleGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * News List Skeleton
 * For vertical article lists
 */
export function ArticleListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} variant="list" />
      ))}
    </div>
  );
}

/**
 * Full News Skeleton
 * For article detail page
 */
export function ArticleDetailSkeleton() {
  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Category & Date */}
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Title */}
      <Skeleton className="h-12 w-full mb-2" />
      <Skeleton className="h-12 w-4/5 mb-6" />

      {/* Excerpt */}
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-3/4 mb-8" />

      {/* Featured Image */}
      <Skeleton className="aspect-video rounded-lg mb-8" />

      {/* Content */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </article>
  );
}

/**
 * Trending Sidebar Skeleton
 */
export function TrendingSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-16 h-16 flex-shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Categories Bar Skeleton
 */
export function CategoriesBarSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="h-9 w-24 flex-shrink-0 rounded-full" />
      ))}
    </div>
  );
}

/**
 * Comment Skeleton
 */
export function CommentSkeleton({ count = 3 }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-40 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Content Shimmer Animation
 * Add to your global CSS or Tailwind config
 */
export const shimmerAnimation = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite linear;
}
`;
