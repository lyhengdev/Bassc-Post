import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, {
  authAPI,
  articlesAPI,
  categoriesAPI,
  usersAPI,
  analyticsAPI,
  contactAPI,
  uploadAPI,
  settingsAPI,
  newsletterAPI,
  commentsAPI,
} from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

// ==================== AUTH HOOKS ====================

export function useLogin() {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: (data) => authAPI.login(data),
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data.data;
      login(user, accessToken, refreshToken);
      toast.success('Welcome back!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
    },
  });
}

export function useRegister() {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: (data) => authAPI.register(data),
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data.data;
      login(user, accessToken, refreshToken);
      toast.success('Account created successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authAPI.logout(),
    onSettled: () => {
      logout();
      queryClient.clear();
      toast.success('Logged out successfully');
    },
  });
}

// ==================== ARTICLES HOOKS ====================

export function useArticles(params = {}, queryOptions = {}) {
  const { q, sort, sortBy, sortOrder, ...otherParams } = params;
  
  return useQuery({
    ...queryOptions,
    queryKey: ['articles', params],
    queryFn: async () => {
      let resolvedSortBy = sortBy;
      let resolvedSortOrder = sortOrder;

      if (sort && typeof sort === 'string' && !sortBy) {
        resolvedSortBy = sort.startsWith('-') ? sort.slice(1) : sort;
        resolvedSortOrder = sort.startsWith('-') ? 'desc' : 'asc';
      }

      const requestParams = {
        ...otherParams,
        ...(resolvedSortBy ? { sortBy: resolvedSortBy } : {}),
        ...(resolvedSortOrder ? { sortOrder: resolvedSortOrder } : {}),
      };

      // If there's a search query, use the search endpoint
      if (q && q.length >= 2) {
        const response = await articlesAPI.search({ q, ...requestParams });
        return response.data;
      }
      // Otherwise use the regular getAll endpoint
      const response = await articlesAPI.getAll(requestParams);
      const payload = response.data;
      if (Array.isArray(payload?.data)) {
        return {
          ...payload,
          data: { articles: payload.data },
        };
      }
      return payload;
    },
  });
}

export function useFeaturedArticles(limit = 5) {
  return useQuery({
    queryKey: ['articles', 'featured', limit],
    queryFn: async () => {
      const response = await articlesAPI.getFeatured(limit);
      return response.data.data.articles;
    },
  });
}

export function useLatestArticles(limit = 10) {
  return useQuery({
    queryKey: ['articles', 'latest', limit],
    queryFn: async () => {
      const response = await articlesAPI.getLatest(limit);
      return response.data.data.articles;
    },
    placeholderData: keepPreviousData,
  });
}

export function useArticleBySlug(slug) {
  return useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const response = await articlesAPI.getBySlug(slug);
      return response.data.data.article;
    },
    enabled: !!slug,
  });
}

export function useArticleById(id) {
  return useQuery({
    queryKey: ['article', 'id', id],
    queryFn: async () => {
      const response = await articlesAPI.getById(id);
      return response.data; // Returns { success, data: { article }, message }
    },
    enabled: !!id,
  });
}

export function useArticleInsights(id, options = {}) {
  const { startDate, endDate } = options;

  return useQuery({
    queryKey: ['article', 'insights', id, startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await articlesAPI.getInsights(id, params);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useArticlesByCategory(slug, params = {}) {
  return useQuery({
    queryKey: ['articles', 'category', slug, params],
    queryFn: async () => {
      const response = await articlesAPI.getByCategory(slug, params);
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useRelatedArticles(id, limit = 4) {
  return useQuery({
    queryKey: ['articles', 'related', id, limit],
    queryFn: async () => {
      const response = await articlesAPI.getRelated(id, limit);
      return response.data.data.articles;
    },
    enabled: !!id,
  });
}

export function useMyArticles(params = {}, options = {}) {
  return useQuery({
    queryKey: ['articles', 'my', params],
    queryFn: async () => {
      const response = await articlesAPI.getMy(params);
      return response.data;
    },
    ...options,
  });
}

export function useAdminArticles(params = {}, options = {}) {
  return useQuery({
    queryKey: ['articles', 'admin', params],
    queryFn: async () => {
      const response = await articlesAPI.getAdmin(params);
      return response.data;
    },
    ...options,
  });
}

export function usePendingArticles(params = {}) {
  return useQuery({
    queryKey: ['articles', 'pending', params],
    queryFn: async () => {
      const response = await articlesAPI.getPending(params);
      return response.data;
    },
  });
}

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => articlesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('News created successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create article';
      toast.error(message);
    },
  });
}

export function useUpdateArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => articlesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('News updated successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update article';
      toast.error(message);
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => articlesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('News deleted successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete article';
      toast.error(message);
    },
  });
}

export function useApproveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }) => articlesAPI.approve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('News approved and published');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to approve article';
      toast.error(message);
    },
  });
}

export function useRejectArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }) => articlesAPI.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('News rejected');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to reject article';
      toast.error(message);
    },
  });
}

// ==================== CATEGORIES HOOKS ====================

export function useCategories(params = {}) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: async () => {
      const response = await categoriesAPI.getAll(params);
      return response.data.data.categories;
    },
  });
}

export function useCategoryBySlug(slug) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const response = await categoriesAPI.getBySlug(slug);
      return response.data.data.category;
    },
    enabled: !!slug,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => categoriesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create category';
      toast.error(message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update category';
      toast.error(message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => categoriesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete category';
      toast.error(message);
    },
  });
}

// ==================== USERS HOOKS ====================

export function useUsers(params = {}) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = await usersAPI.getAll(params);
      return response.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: (data) => usersAPI.updateProfile(data),
    onSuccess: (response) => {
      const rawUser = response?.data?.data?.user;
      const normalizedUser = rawUser
        ? {
            ...rawUser,
            profileCompletionRequired: Boolean(rawUser.profileNeedsCompletion),
            profileMissingFields: Array.isArray(rawUser.profileMissingFields)
              ? rawUser.profileMissingFields
              : [],
          }
        : rawUser;

      updateUser(normalizedUser);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    },
  });
}

// ==================== DASHBOARD HOOKS ====================

export function useDashboardSummary(options = {}) {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const response = await analyticsAPI.getDashboardSummary();
      return response.data.data;
    },
    ...options,
  });
}

export function useAnalyticsViews(days = 30, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'views', days],
    queryFn: async () => {
      const response = await analyticsAPI.getViews(days);
      return response.data.data;
    },
    ...options,
  });
}

export function useAnalyticsArticles(days = 30, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'articles', days],
    queryFn: async () => {
      const response = await analyticsAPI.getArticles(days);
      return response.data.data;
    },
    ...options,
  });
}

export function useAnalyticsAds(days = 30, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'ads', days],
    queryFn: async () => {
      const response = await analyticsAPI.getAds(days);
      return response.data.data;
    },
    ...options,
  });
}

// ==================== CONTACT HOOKS ====================

export function useSubmitContact() {
  return useMutation({
    mutationFn: (data) => contactAPI.submit(data),
    onSuccess: () => {
      toast.success('Message sent successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to send message';
      toast.error(message);
    },
  });
}

export function useContactMessages() {
  return useQuery({
    queryKey: ['contact-messages'],
    queryFn: async () => {
      const response = await contactAPI.getAll();
      return response.data;
    },
  });
}

export function useReplyContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, message }) => contactAPI.reply(id, { reply: message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      toast.success('Reply sent successfully');
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => contactAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      toast.success('Message deleted');
    },
  });
}

// ==================== MEDIA HOOKS ====================

export function useMedia(params = {}) {
  return useQuery({
    queryKey: ['media', params],
    queryFn: async () => {
      const response = await uploadAPI.getAll(params);
      return response.data;
    },
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => api.post('/uploads/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Files uploaded successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to upload files';
      toast.error(message);
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => uploadAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media deleted successfully');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete media';
      toast.error(message);
    },
  });
}

// ==================== ANALYTICS HOOKS ====================

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await analyticsAPI.getAll();
      return response.data;
    },
  });
}

// ==================== AI HOOKS ====================

export function useAI(endpoint) {
  return useMutation({
    mutationFn: (data) => api.post(`/ai/${endpoint}`, data),
    onError: (error) => {
      const message = error.response?.data?.message || 'AI request failed';
      toast.error(message);
    },
  });
}

// ==================== USERS HOOKS (ADDITIONAL) ====================

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
  });
}

// ==================== SETTINGS HOOKS ====================

export function useSiteSettings() {
  return useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const response = await settingsAPI.get();
      return response.data.data.settings;
    },
  });
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['publicSettings'],
    queryFn: async () => {
      const response = await settingsAPI.getPublic();
      return response.data.data.settings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => settingsAPI.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });
}

export function useUpdateHomepageSections() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sections) => settingsAPI.updateHomepage(sections),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      toast.success('Homepage layout updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update homepage');
    },
  });
}

export function useUpdateMenus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ menuType, items }) => settingsAPI.updateMenus(menuType, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      toast.success('Menu updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update menu');
    },
  });
}

export function useUpdateWidgets() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (widgets) => settingsAPI.updateWidgets(widgets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      toast.success('Widgets updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update widgets');
    },
  });
}

export function useUpdateBranding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => settingsAPI.updateBranding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      toast.success('Branding updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update branding');
    },
  });
}

export function useUpdateSEO() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => settingsAPI.updateSEO(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success('SEO settings updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update SEO');
    },
  });
}

export function useToggleFeature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ feature, enabled }) => settingsAPI.toggleFeature(feature, enabled),
    onSuccess: (_, { feature, enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success(`Feature ${enabled ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to toggle feature');
    },
  });
}

// ==================== NEWSLETTER HOOKS ====================

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: (data) => newsletterAPI.subscribe(data),
    onSuccess: () => {
      toast.success('Thank you for subscribing!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    },
  });
}

// ==================== COMMENT HOOKS ====================

export function useArticleComments(articleId, params = {}) {
  return useQuery({
    queryKey: ['comments', articleId, params],
    queryFn: async () => {
      const response = await commentsAPI.getByArticle(articleId, params);
      return response.data;
    },
    enabled: !!articleId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ articleId, data }) => commentsAPI.create(articleId, data),
    onSuccess: (_, { articleId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
      toast.success('Comment submitted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit comment');
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => commentsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    },
  });
}

export function useLikeComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => commentsAPI.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}

// Admin comment hooks
export function useAllComments(params = {}) {
  return useQuery({
    queryKey: ['comments', 'all', params],
    queryFn: async () => {
      const response = await commentsAPI.getAll(params);
      return response.data;
    },
  });
}

export function useModerateComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, note }) => commentsAPI.moderate(id, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success('Comment moderated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to moderate comment');
    },
  });
}
