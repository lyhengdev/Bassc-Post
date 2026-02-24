import React from 'react';
import { cn, getInitials, buildMediaUrl } from '../../utils';
import { Loader2 } from 'lucide-react';
import useLanguage from '../../hooks/useLanguage';

function localizeNode(node, translateText) {
  if (typeof node === 'string') return translateText(node);
  if (Array.isArray(node)) return node.map((child) => localizeNode(child, translateText));
  return node;
}

// ==================== BUTTON ====================
export const Button = React.forwardRef(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    children,
    leftIcon,
    rightIcon,
    ...props
  },
  ref
) {
  const { translateText } = useLanguage();

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };

  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'btn',
        variants[variant],
        sizes[size],
        isLoading && 'opacity-70 cursor-wait',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {localizeNode(children, translateText)}
      {!isLoading && rightIcon}
    </button>
  );
});

// ==================== INPUT ====================
export const Input = React.forwardRef(function Input(
  { className, type = 'text', error, label, ...props },
  ref
) {
  const { translateText } = useLanguage();
  const localizedLabel = typeof label === 'string' ? translateText(label) : label;
  const localizedError = typeof error === 'string' ? translateText(error) : error;
  const localizedPlaceholder = typeof props.placeholder === 'string' ? translateText(props.placeholder) : props.placeholder;

  return (
    <div className="w-full">
      {localizedLabel && (
        <label className="label">
          {localizedLabel}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        ref={ref}
        className={cn('input', error && 'input-error', className)}
        {...props}
        placeholder={localizedPlaceholder}
      />
      {localizedError && <p className="mt-1.5 text-sm text-red-500">{localizedError}</p>}
    </div>
  );
});

// ==================== TEXTAREA ====================
export const Textarea = React.forwardRef(function Textarea(
  { className, error, label, ...props },
  ref
) {
  const { translateText } = useLanguage();
  const localizedLabel = typeof label === 'string' ? translateText(label) : label;
  const localizedError = typeof error === 'string' ? translateText(error) : error;
  const localizedPlaceholder = typeof props.placeholder === 'string' ? translateText(props.placeholder) : props.placeholder;

  return (
    <div className="w-full">
      {localizedLabel && (
        <label className="label">
          {localizedLabel}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn('input min-h-[120px]', error && 'input-error', className)}
        {...props}
        placeholder={localizedPlaceholder}
      />
      {localizedError && <p className="mt-1.5 text-sm text-red-500">{localizedError}</p>}
    </div>
  );
});

// ==================== AVATAR ====================
export function Avatar({ src, alt, name, size = 'md', className }) {
  const { translateText } = useLanguage();
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl',
  };

  const resolvedSrc = buildMediaUrl(src);

  if (resolvedSrc) {
    return (
      <img loading="lazy"
        src={resolvedSrc}
        alt={alt || name || translateText('Avatar')}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium',
        'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
        sizes[size],
        className
      )}
    >
      {getInitials(name || alt)}
    </div>
  );
}

// ==================== BADGE ====================
export function Badge({ children, variant = 'primary', className, style }) {
  const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    neutral: 'badge-neutral',
  };

  return (
    <span className={cn('badge', variants[variant], className)} style={style}>
      {children}
    </span>
  );
}

// ==================== STATUS BADGE ====================
export function StatusBadge({ status }) {
  const { translateText } = useLanguage();
  const config = {
    draft: { className: 'badge-neutral', label: 'Draft' },
    pending: { className: 'badge-warning', label: 'Pending' },
    published: { className: 'badge-success', label: 'Published' },
    rejected: { className: 'badge-danger', label: 'Rejected' },
    archived: { className: 'badge-neutral', label: 'Archived' },
  };

  const { className, label } = config[status] || config.draft;

  return <span className={cn('badge', className)}>{translateText(label)}</span>;
}

// ==================== SPINNER ====================
export function Spinner({ className, size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-dark-200 dark:border-dark-700 border-t-primary-600',
        sizes[size],
        className
      )}
    />
  );
}

// ==================== CONTENT LOADER ====================
export function ContentLoader({ className, delayMs = 0, mode = 'skeleton' }) {
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

  if (mode === 'spinner') {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={cn('w-full space-y-5', className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2 w-full max-w-xl">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="hidden sm:block h-10 w-28 rounded-xl flex-shrink-0" />
      </div>

      <div className="rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 p-4 sm:p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton
            key={idx}
            className={cn('h-4', idx % 3 === 0 ? 'w-full' : idx % 3 === 1 ? 'w-11/12' : 'w-9/12')}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 p-4 space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SKELETON ====================
export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

// ==================== ARTICLE CARD SKELETON ====================
export function ArticleCardSkeleton() {
  return (
    <div className="card p-4">
      <Skeleton className="w-full h-48 mb-4" />
      <Skeleton className="h-4 w-20 mb-3" />
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-6 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// ==================== ARTICLE LIST SKELETON ====================
export function ArticleListSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ==================== MODAL ====================
export function Modal({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }) {
  const { translateText } = useLanguage();
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'w-full bg-white dark:bg-dark-900 rounded-2xl shadow-xl animate-slideUp',
            sizes[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-200 dark:border-dark-700">
              <h2 className="text-2xl font-semibold text-dark-900 dark:text-white">
                {typeof title === 'string' ? translateText(title) : title}
              </h2>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-dark-500 hover:text-dark-700 hover:bg-dark-100 dark:hover:bg-dark-800"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
}

// ==================== CONFIRM MODAL ====================
export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  isLoading = false,
  icon: Icon
}) {
  const { translateText } = useLanguage();
  if (!isOpen) return null;

  const variants = {
    danger: {
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonClass: 'btn-danger',
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    primary: {
      iconBg: 'bg-primary-100 dark:bg-primary-900/30',
      iconColor: 'text-primary-600 dark:text-primary-400',
      buttonClass: 'btn-primary',
    },
  };

  const config = variants[variant] || variants.danger;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-white dark:bg-dark-900 rounded-2xl shadow-xl animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            {/* Icon */}
            {Icon && (
              <div className={cn('w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center', config.iconBg)}>
                <Icon className={cn('w-7 h-7', config.iconColor)} />
              </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
              {typeof title === 'string' ? translateText(title) : title}
            </h3>

            {/* Message */}
            <p className="text-dark-500 dark:text-dark-400 mb-6">
              {typeof message === 'string' ? translateText(message) : message}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="btn btn-secondary flex-1"
              >
                {typeof cancelText === 'string' ? translateText(cancelText) : cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={cn('btn flex-1 flex items-center justify-center gap-2', config.buttonClass)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {translateText('Processing...')}
                  </>
                ) : (
                  typeof confirmText === 'string' ? translateText(confirmText) : confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== ALERT MODAL ====================
export function AlertModal({
  isOpen,
  onClose,
  title = 'Alert',
  message,
  buttonText = 'OK',
  variant = 'info', // 'info' | 'success' | 'warning' | 'error'
  icon: Icon
}) {
  const { translateText } = useLanguage();
  if (!isOpen) return null;

  const variants = {
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    success: {
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    warning: {
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    error: {
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  };

  const config = variants[variant] || variants.info;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm bg-white dark:bg-dark-900 rounded-2xl shadow-xl animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            {/* Icon */}
            {Icon && (
              <div className={cn('w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center', config.iconBg)}>
                <Icon className={cn('w-7 h-7', config.iconColor)} />
              </div>
            )}

            {/* Title */}
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
              {typeof title === 'string' ? translateText(title) : title}
            </h3>

            {/* Message */}
            <p className="text-dark-500 dark:text-dark-400 mb-6">
              {typeof message === 'string' ? translateText(message) : message}
            </p>

            {/* Button */}
            <button onClick={onClose} className="btn btn-primary w-full">
              {typeof buttonText === 'string' ? translateText(buttonText) : buttonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== EMPTY STATE ====================
export function EmptyState({ icon: Icon, title, description, action }) {
  const { translateText } = useLanguage();
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="mx-auto w-16 h-16 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-dark-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">
        {typeof title === 'string' ? translateText(title) : title}
      </h3>
      {description && (
        <p className="text-dark-500 mb-6 max-w-sm mx-auto">{typeof description === 'string' ? translateText(description) : description}</p>
      )}
      {action}
    </div>
  );
}

// Re-export ErrorBoundary
export { ErrorBoundary, PageErrorFallback, CompactErrorFallback } from './ErrorBoundary.jsx';

// Re-export enhanced Skeleton components
export * from './Skeleton.jsx';

// Re-export new Loading States
export * from './LoadingStates.jsx';

// Re-export Top Loading Bar
export { TopLoadingBar, LoadingProvider, useLoading } from './TopLoadingBar.jsx';
