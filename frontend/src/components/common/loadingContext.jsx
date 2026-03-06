import { LoadingContext, useGlobalLoading } from './loadingHooks.js';

export function LoadingProvider({ children }) {
  const loading = useGlobalLoading();

  return (
    <LoadingContext.Provider value={loading}>
      {children}
      {loading.isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />
          <div className="relative bg-white dark:bg-dark-900 rounded-2xl shadow-2xl p-8 animate-slideUp">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-dark-200 dark:border-dark-700 border-t-primary-600 animate-spin" />
              <p className="text-lg font-medium text-dark-900 dark:text-white">
                {loading.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
