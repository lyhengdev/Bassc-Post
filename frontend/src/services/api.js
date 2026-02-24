import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { getApiBaseUrl, getPreferredLanguageCode } from '../utils';

const API_URL = getApiBaseUrl();

// CSRF token storage
let csrfToken = null;

// Get CSRF token from cookie
function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

// Fetch CSRF token from server
async function fetchCsrfToken() {
  try {
    const response = await axios.get(`${API_URL}/auth/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = response.data?.data?.csrfToken || getCsrfTokenFromCookie();
    return csrfToken;
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error);
    // Try to get from cookie as fallback
    csrfToken = getCsrfTokenFromCookie();
    return csrfToken;
  }
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for CSRF
});

// Request interceptor - add auth token and CSRF token
api.interceptors.request.use(
  async (config) => {
    // Add auth token
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for mutation requests
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutationMethods.includes(config.method?.toUpperCase())) {
      // Get CSRF token if not already available
      if (!csrfToken) {
        csrfToken = getCsrfTokenFromCookie();
        if (!csrfToken) {
          await fetchCsrfToken();
        }
      }
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh and CSRF errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle CSRF token errors
    if (error.response?.data?.code === 'CSRF_INVALID' && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      // Fetch new CSRF token and retry
      await fetchCsrfToken();
      if (csrfToken) {
        originalRequest.headers['X-CSRF-Token'] = csrfToken;
        return api(originalRequest);
      }
    }

    // Handle auth token errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = originalRequest.url || '';
      const method = originalRequest.method?.toUpperCase() || 'GET';
      
      // List of public endpoints that don't require authentication
      const publicEndpoints = [
        '/articles',           // GET articles list
        '/categories',         // GET categories
        '/pages/published',    // GET published pages
        '/pages/menu',         // GET menu
        '/settings/public',    // GET public settings
      ];
      
      // Check if this is a public GET endpoint
      const isPublicGet = method === 'GET' && publicEndpoints.some(ep => 
        url.startsWith(ep) || url.includes('/comments')
      );
      
      // Only attempt refresh for protected endpoints
      if (!isPublicGet) {
        originalRequest._retry = true;

        try {
          const refreshToken = useAuthStore.getState().refreshToken;
          if (refreshToken) {
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            }, {
              withCredentials: true,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            useAuthStore.getState().setTokens(accessToken, newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// Initialize CSRF token on app load
fetchCsrfToken().catch(() => {});

function withLanguageParams(params = {}) {
  const next = { ...(params || {}) };
  if (next.language || next.lang) return next;
  const language = getPreferredLanguageCode();
  if (language) {
    next.language = language;
  }
  return next;
}

// Auth API
export const authAPI = {
  checkEmail: (email) => api.get('/auth/check-email', { params: { email } }),
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  socialExchange: (code) => api.post('/auth/social/exchange', { code }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// News API
export const articlesAPI = {
  getAll: (params) => api.get('/articles', { params: withLanguageParams(params) }),
  getFeatured: (limit = 5, params = {}) => api.get('/articles/featured', { params: withLanguageParams({ limit, ...params }) }),
  getLatest: (limit = 10, params = {}) => api.get('/articles/latest', { params: withLanguageParams({ limit, ...params }) }),
  resolveBySlug: (slug, language) => api.get(`/articles/resolve/${slug}`, { params: { language } }),
  getBySlug: (slug) => api.get(`/articles/slug/${slug}`),
  getById: (id) => api.get(`/articles/id/${id}`),
  getByCategory: (slug, params) => api.get(`/articles/category/${slug}`, {params: withLanguageParams(params) }),
  search: (params) => api.get('/articles/search', { params: withLanguageParams(params) }),
  getRelated: (id, limit = 4, params = {}) => api.get(`/articles/${id}/related`, { params: withLanguageParams({ limit, ...params }) }),
  recordView: (id) => api.post(`/articles/${id}/view`),
  getInsights: (id, params) => api.get(`/articles/${id}/insights`, { params }),
  getMy: (params) => api.get('/articles/my', { params: withLanguageParams(params) }),
  getAdmin: (params) => api.get('/articles/admin', { params: withLanguageParams(params) }),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
  getPending: (params) => api.get('/articles/pending', { params: withLanguageParams(params) }),
  approve: (id, notes) => api.put(`/articles/${id}/approve`, { notes }),
  reject: (id, reason) => api.put(`/articles/${id}/reject`, { reason }),
};

// Categories API
export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getBySlug: (slug) => api.get(`/categories/slug/${slug}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) =>
    api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Upload API
export const uploadAPI = {
  upload: (formData, folder = 'general') => {
    formData.append('folder', folder);
    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getAll: (params) => api.get('/uploads', { params }),
  delete: (id) => api.delete(`/uploads/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboardSummary: () => api.get('/dashboard/summary'),
  getViews: (days = 30) => api.get('/analytics/views', { params: { days } }),
  getArticles: (days = 30) => api.get('/analytics/articles', { params: { days } }),
  getAds: (days = 30) => api.get('/analytics/ads', { params: { days } }),
  getAll: () => api.get('/analytics'),
};

// Contact API
export const contactAPI = {
  submit: (data) => api.post('/contact', data),
  getAll: (params) => api.get('/contact', { params }),
  reply: (id, data) => api.post(`/contact/${id}/reply`, data),
  delete: (id) => api.delete(`/contact/${id}`),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  getPublic: () => api.get('/settings/public'),
  update: (data) => api.put('/settings', data),
  updateHomepage: (sections) => api.put('/settings/homepage', { sections }),
  updateMenus: (menuType, items) => api.put('/settings/menus', { menuType, items }),
  updateWidgets: (widgets) => api.put('/settings/widgets', { widgets }),
  updateSEO: (data) => api.put('/settings/seo', data),
  updateBranding: (data) => api.put('/settings/branding', data),
  toggleFeature: (feature, enabled) => api.put(`/settings/features/${feature}`, { enabled }),
};

// Newsletter API
export const newsletterAPI = {
  subscribe: (data) => api.post('/newsletter/subscribe', data),
  confirm: (token) => api.post('/newsletter/confirm', { token }),
  unsubscribe: (data) => api.post('/newsletter/unsubscribe', data),
};

// Comments API
export const commentsAPI = {
  getByArticle: (articleId, params) => api.get(`/articles/${articleId}/comments`, { params }),
  create: (articleId, data) => api.post(`/articles/${articleId}/comments`, data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
  like: (id) => api.post(`/comments/${id}/like`),
  // Admin
  getAll: (params) => api.get('/comments', { params }),
  moderate: (id, data) => api.put(`/comments/${id}/moderate`, data),
  bulkModerate: (data) => api.post('/comments/bulk-moderate', data),
};

export default api;
