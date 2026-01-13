import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// Error Boundary Class Component (required for catching React errors)
class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
    // Here you could also log to an error reporting service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          reset: this.handleReset,
        })
      ) : (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          reset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// Default Error Fallback UI
function DefaultErrorFallback({ error, errorInfo, reset }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-dark-500 mb-6">
          An unexpected error occurred. Please try again or go back to the home page.
        </p>

        {isDev && error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-left overflow-auto max-h-48">
            <p className="text-sm font-mono text-red-600 dark:text-red-400">
              {error.toString()}
            </p>
            {errorInfo?.componentStack && (
              <pre className="mt-2 text-xs text-red-500 dark:text-red-400 whitespace-pre-wrap">
                {errorInfo.componentStack}
              </pre>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

// Page-level Error Fallback (full page)
export function PageErrorFallback({ error, reset }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-dark-50 dark:bg-dark-950">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-3">
          Oops! Something went wrong
        </h1>
        <p className="text-dark-500 mb-8">
          We're sorry, but something unexpected happened. Our team has been notified.
        </p>

        {isDev && error && (
          <div className="mb-8 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-left overflow-auto max-h-48">
            <p className="text-sm font-mono text-red-600 dark:text-red-400">
              {error.toString()}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

// Compact Error Fallback (for smaller components)
export function CompactErrorFallback({ error, reset }) {
  return (
    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
      <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
      <p className="text-sm text-red-600 dark:text-red-400 mb-3">Failed to load</p>
      <button
        onClick={reset}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        Try again
      </button>
    </div>
  );
}

// Export the main ErrorBoundary wrapper
export function ErrorBoundary({ children, fallback, FallbackComponent }) {
  const renderFallback = fallback || (FallbackComponent ? (props) => <FallbackComponent {...props} /> : null);
  
  return (
    <ErrorBoundaryClass fallback={renderFallback}>
      {children}
    </ErrorBoundaryClass>
  );
}

export default ErrorBoundary;
