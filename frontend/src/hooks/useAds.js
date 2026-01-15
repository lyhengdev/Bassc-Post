import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Hooks for the new Ads API
 * Uses separate ads collection for better scalability
 */

// ==================== PUBLIC HOOKS ====================

/**
 * Get ads for homepage
 */
export function useHomepageAds(device = 'desktop') {
  return useQuery({
    queryKey: ['ads', 'homepage', device],
    queryFn: async () => {
      const { data } = await api.get('/ads/homepage', {
        params: { device }
      });
      return data.data?.ads || {};
    },
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get ads for article page
 */
export function useArticleAds(articleId, options = {}) {
  const { device = 'desktop', categoryId, totalParagraphs = 10 } = options;
  
  return useQuery({
    queryKey: ['ads', 'article', articleId, device],
    queryFn: async () => {
      const { data } = await api.get(`/ads/article/${articleId}`, {
        params: { device, categoryId, totalParagraphs }
      });
      return data.data?.ads || {};
    },
    enabled: !!articleId,
    staleTime: 60 * 1000,
  });
}

/**
 * Select ads for a specific placement
 */
export function useSelectAds(placement, options = {}) {
  const {
    pageType = 'all',
    device = 'desktop',
    sectionIndex,
    paragraphIndex,
    placementId,
    adId,
    categoryId,
    articleId,
    limit = 3,
    enabled = true
  } = options;
  
  return useQuery({
    queryKey: ['ads', 'select', placement, pageType, device, sectionIndex, paragraphIndex, placementId, adId, categoryId, articleId],
    queryFn: async () => {
      const params = { placement, pageType, device, limit };
      if (sectionIndex !== undefined) params.sectionIndex = sectionIndex;
      if (paragraphIndex !== undefined) params.paragraphIndex = paragraphIndex;
      if (placementId) params.placementId = placementId;
      if (adId) params.adId = adId;
      if (categoryId) params.categoryId = categoryId;
      if (articleId) params.articleId = articleId;
      
      const { data } = await api.get('/ads/select', { params });
      return data.data?.ads || [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Track ad event (impression or click)
 */
export function useTrackAdEvent() {
  return useMutation({
    mutationFn: async ({ adId, type, pageType, pageUrl, device, placement }) => {
      const { data } = await api.post('/ads/event', {
        adId,
        type,
        pageType,
        pageUrl,
        device,
        placement
      });
      return data;
    },
    // Don't retry failed events
    retry: false,
    // Fire and forget - don't block UI
    onError: (error) => {
      console.warn('Failed to track ad event:', error.message);
    }
  });
}

// ==================== ADMIN HOOKS ====================

/**
 * Get all ads (admin)
 */
export function useAdminAds(filters = {}) {
  const { status, placement, page = 1, limit = 20, sort = '-createdAt' } = filters;
  
  return useQuery({
    queryKey: ['admin', 'ads', status, placement, page, limit, sort],
    queryFn: async () => {
      const params = { page, limit, sort };
      if (status) params.status = status;
      if (placement) params.placement = placement;
      
      const { data } = await api.get('/ads', { params });
      return data;
    },
  });
}

/**
 * Get single ad (admin)
 */
export function useAdminAd(adId) {
  return useQuery({
    queryKey: ['admin', 'ad', adId],
    queryFn: async () => {
      const { data } = await api.get(`/ads/${adId}`);
      return data.data?.ad;
    },
    enabled: !!adId,
  });
}

/**
 * Create ad (admin)
 */
export function useCreateAd() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (adData) => {
      const { data } = await api.post('/ads', adData);
      return data.ad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
  });
}

/**
 * Update ad (admin)
 */
export function useUpdateAd() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...adData }) => {
      const { data } = await api.put(`/ads/${id}`, adData);
      return data.ad;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ad', variables.id] });
    },
  });
}

/**
 * Delete ad (admin)
 */
export function useDeleteAd() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (adId) => {
      const { data } = await api.delete(`/ads/${adId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
  });
}

/**
 * Duplicate ad (admin)
 */
export function useDuplicateAd() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (adId) => {
      const { data } = await api.post(`/ads/${adId}/duplicate`);
      return data.ad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
  });
}

/**
 * Bulk update ad status (admin)
 */
export function useBulkUpdateAdStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ adIds, status }) => {
      const { data } = await api.patch('/ads/bulk/status', { adIds, status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ads'] });
    },
  });
}

/**
 * Get ad statistics (admin)
 */
export function useAdStats(adId, options = {}) {
  const { startDate, endDate, breakdown = false } = options;
  
  return useQuery({
    queryKey: ['admin', 'ad-stats', adId, startDate, endDate, breakdown],
    queryFn: async () => {
      const params = { breakdown };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const { data } = await api.get(`/ads/${adId}/stats`, { params });
      return data;
    },
    enabled: !!adId,
  });
}

/**
 * Get all ads statistics summary (admin)
 */
export function useAllAdsStats(options = {}) {
  const { startDate, endDate } = options;
  
  return useQuery({
    queryKey: ['admin', 'all-ads-stats', startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const { data } = await api.get('/ads/stats/summary', { params });
      return data.stats;
    },
  });
}

// ==================== HELPER HOOKS ====================

/**
 * Device detection hook
 */
export function useDeviceType() {
  const [device, setDevice] = useState('desktop');
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDevice('mobile');
      } else if (width < 1024) {
        setDevice('tablet');
      } else {
        setDevice('desktop');
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return device;
}

export default {
  // Public
  useHomepageAds,
  useArticleAds,
  useSelectAds,
  useTrackAdEvent,
  // Admin
  useAdminAds,
  useAdminAd,
  useCreateAd,
  useUpdateAd,
  useDeleteAd,
  useDuplicateAd,
  useBulkUpdateAdStatus,
  useAdStats,
  useAllAdsStats,
  // Helpers
  useDeviceType
};
