import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../utils';

/**
 * ==================== MODERN SPINNER ====================
 * Improved spinner with smooth animation and better visibility
 */
export function Spinner({ className, size = 'md', variant = 'primary' }) {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const variants = {
    primary: 'border-primary-600',
    white: 'border-white',
    dark: 'border-dark-800 dark:border-dark-200',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-dark-200 dark:border-dark-700 border-t-transparent',
        sizes[size],
        variants[variant],
        className
      )}
      style={{
        borderTopColor: 'currentColor'
      }}
    />
  );
}

/**
 * ==================== PULSING DOTS ====================
 * Three dots animation for subtle loading indicator
 */
export function PulsingDots({ className }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/**
 * ==================== PROGRESS BAR ====================
 * Determinate or indeterminate progress bar
 */
export function ProgressBar({ progress, indeterminate = false, className }) {
  if (indeterminate) {
    return (
      <div className={cn('h-1 w-full bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden', className)}>
        <div className="h-full w-1/3 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full animate-progress" />
      </div>
    );
  }

  return (
    <div className={cn('h-1 w-full bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-primary-600 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

/**
 * ==================== SKELETON WITH SHIMMER ====================
 * Enhanced skeleton with gradient shimmer effect
 */
export function Skeleton({ className, variant = 'default' }) {
  const variants = {
    default: 'rounded',
    text: 'rounded h-4',
    title: 'rounded h-8',
    circle: 'rounded-full',
    button: 'rounded-xl h-10',
    card: 'rounded-2xl',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        'bg-gradient-to-r from-dark-100 via-dark-200 to-dark-100',
        'dark:from-dark-800 dark:via-dark-700 dark:to-dark-800',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-shimmer',
        variants[variant],
        className
      )}
    />
  );
}

/**
 * ==================== CONTENT LOADER ====================
 * Full-page loading with message
 */
export function ContentLoader({ 
  className, 
  message = 'Loading...', 
  showMessage = false,
  size = 'lg',
  delayMs = 0 
}) {
  const [show, setShow] = React.useState(delayMs <= 0);

  React.useEffect(() => {
    if (delayMs <= 0) {
      setShow(true);
      return undefined;
    }

    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!show) return null;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16',
      className
    )}>
      <div className="relative">
        <Spinner size={size} />
        {showMessage && (
          <p className="mt-4 text-sm text-dark-500 dark:text-dark-400 animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * ==================== INLINE LOADER ====================
 * Small inline loading indicator
 */
export function InlineLoader({ text = 'Loading', className }) {
  return (
    <div className={cn('flex items-center gap-2 text-dark-600 dark:text-dark-400', className)}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/**
 * ==================== BUTTON LOADER ====================
 * Loading state for buttons
 */
export function ButtonLoader({ text = 'Loading', className }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{text}</span>
    </div>
  );
}

/**
 * ==================== OVERLAY LOADER ====================
 * Full screen overlay with loading
 */
export function OverlayLoader({ 
  isLoading = false, 
  message = 'Processing...', 
  backdrop = true 
}) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      {backdrop && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />
      )}
      
      {/* Loader */}
      <div className="relative bg-white dark:bg-dark-900 rounded-2xl shadow-2xl p-8 animate-slideUp">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" />
          <p className="text-lg font-medium text-dark-900 dark:text-white">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ==================== PAGE LOADER ====================
 * Loading state for entire page with branding
 */
export function PageLoader({ message = 'Loading Bassac Media' }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-dark-950">
      <div className="text-center space-y-6 animate-fadeIn">
        {/* Logo or brand */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
        </div>
        
        {/* Spinner */}
        <Spinner size="lg" />
        
        {/* Message */}
        <p className="text-dark-600 dark:text-dark-400 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * ==================== LAZY LOAD WRAPPER ====================
 * Wrapper for lazy loaded components
 */
export function LazyLoadFallback({ className }) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center', className)}>
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm text-dark-500 dark:text-dark-400">
          Loading page...
        </p>
      </div>
    </div>
  );
}

/**
 * ==================== REFRESH INDICATOR ====================
 * Small indicator for refresh actions
 */
export function RefreshIndicator({ isRefreshing, className }) {
  return (
    <RefreshCw 
      className={cn(
        'w-4 h-4 text-dark-600 dark:text-dark-400 transition-transform',
        isRefreshing && 'animate-spin',
        className
      )} 
    />
  );
}

/**
 * ==================== LOADING TEXT ====================
 * Animated loading text with dots
 */
export function LoadingText({ text = 'Loading', className }) {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className={cn('text-dark-600 dark:text-dark-400', className)}>
      {text}{dots}
    </span>
  );
}

/**
 * ==================== CARD LOADER ====================
 * Loading state for card components
 */
export function CardLoader({ count = 1, className }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" className="w-10 h-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ))}
    </div>
  );
}

/**
 * ==================== TABLE LOADER ====================
 * Loading state for tables
 */
export function TableLoader({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * ==================== PROGRESSIVE LOADER ====================
 * Shows different states based on loading duration
 */
export function ProgressiveLoader({ isLoading, delay = 1000, slowDelay = 3000 }) {
  const [stage, setStage] = React.useState('fast'); // fast | normal | slow

  React.useEffect(() => {
    if (!isLoading) {
      setStage('fast');
      return;
    }

    const normalTimer = setTimeout(() => setStage('normal'), delay);
    const slowTimer = setTimeout(() => setStage('slow'), slowDelay);

    return () => {
      clearTimeout(normalTimer);
      clearTimeout(slowTimer);
    };
  }, [isLoading, delay, slowDelay]);

  if (!isLoading) return null;

  if (stage === 'fast') return null; // Don't show anything for fast loads

  return (
    <div className="flex flex-col items-center gap-3">
      <Spinner size="lg" />
      {stage === 'slow' && (
        <p className="text-sm text-dark-500 animate-fadeIn">
          This is taking longer than usual...
        </p>
      )}
    </div>
  );
}

/**
 * ==================== STATUS LOADER ====================
 * Loading with status message
 */
export function StatusLoader({ status, progress }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Spinner size="md" />
        <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
          {status}
        </span>
      </div>
      {typeof progress === 'number' && (
        <ProgressBar progress={progress} />
      )}
    </div>
  );
}

/**
 * ==================== SHIMMER CONTAINER ====================
 * Container with shimmer effect
 */
export function ShimmerContainer({ children, isLoading, className }) {
  if (!isLoading) return children;

  return (
    <div className={cn('relative', className)}>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </div>
  );
}

// Export all components
export default {
  Spinner,
  PulsingDots,
  ProgressBar,
  Skeleton,
  ContentLoader,
  InlineLoader,
  ButtonLoader,
  OverlayLoader,
  PageLoader,
  LazyLoadFallback,
  RefreshIndicator,
  LoadingText,
  CardLoader,
  TableLoader,
  ProgressiveLoader,
  StatusLoader,
  ShimmerContainer,
};
