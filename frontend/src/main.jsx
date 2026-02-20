import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import toast, { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Toast configuration
const toastOptions = {
  duration: 4000,
  style: {
    background: '#1e293b',
    color: '#f1f5f9',
    borderRadius: '12px',
    padding: '16px',
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: '#f1f5f9',
    },
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: '#f1f5f9',
    },
  },
};

const updateSW = registerSW({
  onNeedRefresh() {
    toast.custom((t) => (
      <div className="flex items-center gap-3 rounded-lg bg-dark-900 text-white px-4 py-3 shadow-lg">
        <span className="text-sm">Update available</span>
        <button
          className="px-3 py-1 text-xs font-semibold bg-primary-600 rounded"
          onClick={() => {
            updateSW(true);
            toast.dismiss(t.id);
          }}
        >
          Reload
        </button>
      </div>
    ), { duration: Infinity });
  },
  onOfflineReady() {
    toast.success('App ready to work offline');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster position="top-right" toastOptions={toastOptions} />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
