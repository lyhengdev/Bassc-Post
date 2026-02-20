import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { usePublicSettings } from './useApi';
import { useAuthStore } from '../stores/authStore';

const SELECT_ENDPOINT = '/ad-collections/select';

async function fetchSelectedAd(params) {
  const response = await api.get(SELECT_ENDPOINT, { params });
  // ✅ FIXED: Standardized response handling
  // Handles both { ad: ... } and { data: { ad: ... } } formats
  const payload = response.data?.data || response.data;
  if (Array.isArray(payload?.ads)) {
    return payload.ads.map((ad, index) => {
      const collection = payload?.collections?.[index];
      const popupSettings = collection?.popupSettings;
      const placementId = collection?.placementId;
      const collectionId = collection?._id;
      const merged = {
        ...ad,
        placementId: ad.placementId || placementId,
        _collectionId: ad._collectionId || collectionId,
      };
      if (!popupSettings) return merged;
      return {
        ...merged,
        popupSettings,
        autoCloseSeconds: ad.autoCloseSeconds ?? popupSettings.autoCloseSeconds,
        autoClose: ad.autoClose ?? popupSettings.autoClose,
        showCloseButton: ad.showCloseButton ?? popupSettings.showCloseButton,
        backdropClickClose: ad.backdropClickClose ?? popupSettings.backdropClickClose,
      };
    });
  }
  const ad = payload?.ad || null;
  if (!ad) return null;
  const collection = payload?.collection;
  const popupSettings = collection?.popupSettings;
  const placementId = collection?.placementId;
  const collectionId = collection?._id;
  const merged = {
    ...ad,
    placementId: ad.placementId || placementId,
    _collectionId: ad._collectionId || collectionId,
  };
  if (!popupSettings) return merged;
  return {
    ...merged,
    popupSettings,
    autoCloseSeconds: ad.autoCloseSeconds ?? popupSettings.autoCloseSeconds,
    autoClose: ad.autoClose ?? popupSettings.autoClose,
    showCloseButton: ad.showCloseButton ?? popupSettings.showCloseButton,
    backdropClickClose: ad.backdropClickClose ?? popupSettings.backdropClickClose,
  };
}

function buildInArticleMap(ads, totalParagraphs) {
  const map = {};
  if (!totalParagraphs || ads.length === 0) return map;

  const slots = ads.length;
  const step = Math.max(1, Math.floor(totalParagraphs / (slots + 1)));

  ads.forEach((ad, index) => {
    const insertAfter = Math.min(totalParagraphs, step * (index + 1));
    if (!map[insertAfter]) {
      map[insertAfter] = [];
    }
    map[insertAfter].push(ad);
  });

  return map;
}

/**
 * Hooks for the new Ads API
 * Uses separate ads collection for better scalability
 */

// ==================== PUBLIC HOOKS ====================

/**
 * Get ads for homepage
 */
export function useHomepageAds(device = 'desktop', sectionCount = 3) {
  const { data: settings } = usePublicSettings();
  const { isAuthenticated, user } = useAuthStore();
  const adsGlobal = settings?.adsGlobal;
  const adsEnabled = adsGlobal?.masterSwitch !== false;
  const hideForLoggedIn = adsGlobal?.hideForLoggedIn && isAuthenticated;
  const hideForAdmin = adsGlobal?.hideForAdmin && user?.role === 'admin';
  const shouldHideAds = !adsEnabled || hideForLoggedIn || hideForAdmin;

  return useQuery({
    queryKey: ['ads', 'homepage', device, sectionCount],
    queryFn: async () => {
      if (shouldHideAds) {
        return { after_hero: [], between_sections: {} };
      }
      const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
      const normalizedSectionCount = Number.isFinite(sectionCount)
        ? Math.max(0, Math.floor(sectionCount))
        : 3;
      
      const afterHeroAd = await fetchSelectedAd({
        placement: 'after_hero',
        pageType: 'homepage',
        device,
        pageUrl, // ✅ FIXED: Added pageUrl
      });

      const betweenSectionsAds = await Promise.all(
        Array.from({ length: normalizedSectionCount }, (_, index) =>
          fetchSelectedAd({
            placement: 'between_sections',
            pageType: 'homepage',
            device,
            sectionIndex: index,
            limit: 2,
            pageUrl, // ✅ FIXED: Added pageUrl
          })
        )
      );

      const betweenSectionsMap = {};
      betweenSectionsAds.forEach((ad, index) => {
        const list = Array.isArray(ad) ? ad : (ad ? [ad] : []);
        if (list.length > 0) {
          betweenSectionsMap[index] = list;
        }
      });

      return {
        after_hero: afterHeroAd ? [afterHeroAd] : [],
        between_sections: betweenSectionsMap,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in React Query v5)
    retry: 2, // ✅ FIXED: Added retry logic
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    enabled: !shouldHideAds,
  });
}

/**
 * Get indexed between-sections ads for list-like pages (news/category/home custom sections).
 */
export function useBetweenSectionAds(options = {}) {
  const {
    pageType = 'homepage',
    device = 'desktop',
    sectionCount = 3,
    limit = 2,
    enabled = true,
    pageUrl
  } = options;
  const { data: settings } = usePublicSettings();
  const { isAuthenticated, user } = useAuthStore();
  const adsGlobal = settings?.adsGlobal;
  const adsEnabled = adsGlobal?.masterSwitch !== false;
  const hideForLoggedIn = adsGlobal?.hideForLoggedIn && isAuthenticated;
  const hideForAdmin = adsGlobal?.hideForAdmin && user?.role === 'admin';
  const shouldHideAds = !adsEnabled || hideForLoggedIn || hideForAdmin;
  const resolvedPageUrl = pageUrl || (typeof window !== 'undefined' ? window.location.pathname : undefined);
  const normalizedSectionCount = Number.isFinite(sectionCount)
    ? Math.max(0, Math.floor(sectionCount))
    : 0;

  return useQuery({
    queryKey: ['ads', 'between_sections', pageType, device, normalizedSectionCount, limit, resolvedPageUrl],
    queryFn: async () => {
      if (shouldHideAds || normalizedSectionCount <= 0) return {};
      const selected = await Promise.all(
        Array.from({ length: normalizedSectionCount }, (_, sectionIndex) =>
          fetchSelectedAd({
            placement: 'between_sections',
            pageType,
            device,
            sectionIndex,
            limit,
            pageUrl: resolvedPageUrl,
          })
        )
      );

      return selected.reduce((acc, entry, sectionIndex) => {
        const list = Array.isArray(entry) ? entry : (entry ? [entry] : []);
        if (list.length) acc[sectionIndex] = list;
        return acc;
      }, {});
    },
    enabled: enabled && !shouldHideAds,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get ads for article page
 */
export function useArticleAds(articleId, options = {}) {
  const { device = 'desktop', categoryId, totalParagraphs = 10 } = options;
  const { data: settings } = usePublicSettings();
  const { isAuthenticated, user } = useAuthStore();
  const adsGlobal = settings?.adsGlobal;
  const adsEnabled = adsGlobal?.masterSwitch !== false;
  const hideForLoggedIn = adsGlobal?.hideForLoggedIn && isAuthenticated;
  const hideForAdmin = adsGlobal?.hideForAdmin && user?.role === 'admin';
  const shouldHideAds = !adsEnabled || hideForLoggedIn || hideForAdmin;
  
  return useQuery({
    queryKey: ['ads', 'article', articleId, device],
    queryFn: async () => {
      if (shouldHideAds) {
        return { in_article: {}, after_article: [], before_comments: [] };
      }
      const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
      const slotCount = totalParagraphs >= 9 ? 3 : totalParagraphs >= 6 ? 2 : totalParagraphs >= 3 ? 1 : 0;

      const inArticleAds = await Promise.all(
        Array.from({ length: slotCount }).map((_, index) =>
          fetchSelectedAd({
            placement: 'in_article',
            pageType: 'article',
            device,
            categoryId,
            articleId,
            paragraphIndex: index + 1,
            pageUrl, // ✅ FIXED: Added pageUrl
          })
        )
      );

      const inArticleMap = buildInArticleMap(
        inArticleAds.filter(Boolean),
        totalParagraphs
      );

      const afterArticleAd = await fetchSelectedAd({
        placement: 'after_article',
        pageType: 'article',
        device,
        categoryId,
        articleId,
        pageUrl, // ✅ FIXED: Added pageUrl
      });

      const beforeCommentsAd = await fetchSelectedAd({
        placement: 'before_comments',
        pageType: 'article',
        device,
        categoryId,
        articleId,
        pageUrl, // ✅ FIXED: Added pageUrl
      });

      return {
        in_article: inArticleMap,
        after_article: afterArticleAd ? [afterArticleAd] : [],
        before_comments: beforeCommentsAd ? [beforeCommentsAd] : [],
      };
    },
    enabled: !!articleId && !shouldHideAds,
    staleTime: 60 * 1000,
    retry: 2, // ✅ FIXED: Added retry logic
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
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
    enabled = true,
    pageUrl
  } = options;
  const resolvedPageUrl = pageUrl || (typeof window !== 'undefined' ? window.location.pathname : undefined);
  const { data: settings } = usePublicSettings();
  const { isAuthenticated, user } = useAuthStore();
  const adsGlobal = settings?.adsGlobal;
  const adsEnabled = adsGlobal?.masterSwitch !== false;
  const hideForLoggedIn = adsGlobal?.hideForLoggedIn && isAuthenticated;
  const hideForAdmin = adsGlobal?.hideForAdmin && user?.role === 'admin';
  const shouldHideAds = !adsEnabled || hideForLoggedIn || hideForAdmin;
  
  return useQuery({
    queryKey: ['ads', 'select', placement, pageType, device, sectionIndex, paragraphIndex, placementId, adId, categoryId, articleId, resolvedPageUrl, limit],
    queryFn: async () => {
      if (shouldHideAds) return [];
      const params = { placement, pageType, device, limit };
      if (sectionIndex !== undefined) params.sectionIndex = sectionIndex;
      if (paragraphIndex !== undefined) params.paragraphIndex = paragraphIndex;
      if (placementId) params.placementId = placementId;
      if (adId) params.adId = adId;
      if (categoryId) params.categoryId = categoryId;
      if (articleId) params.articleId = articleId;
      if (resolvedPageUrl) params.pageUrl = resolvedPageUrl;

      const result = await fetchSelectedAd(params);
      if (Array.isArray(result)) return result;
      if (!result) return [];
      if (limit <= 1) return [result];

      const collected = [result];
      const excludeCollectionIds = new Set([result._collectionId].filter(Boolean));
      const excludeAdIds = new Set([result._id].filter(Boolean));

      for (let i = 1; i < limit; i += 1) {
        const next = await fetchSelectedAd({
          ...params,
          excludeCollectionIds: Array.from(excludeCollectionIds).join(','),
          excludeAdIds: Array.from(excludeAdIds).join(','),
          limit: 1,
        });
        if (!next) break;
        if (Array.isArray(next)) {
          next.forEach((ad) => {
            if (!excludeAdIds.has(ad._id)) {
              collected.push(ad);
              if (ad._collectionId) excludeCollectionIds.add(ad._collectionId);
              excludeAdIds.add(ad._id);
            }
          });
          if (collected.length >= limit) break;
        } else if (!excludeAdIds.has(next._id)) {
          collected.push(next);
          if (next._collectionId) excludeCollectionIds.add(next._collectionId);
          excludeAdIds.add(next._id);
        } else {
          break;
        }
      }

      return collected.slice(0, limit);
    },
    enabled: enabled && !shouldHideAds,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000, // ✅ FIXED: Renamed from cacheTime
    retry: 2, // ✅ FIXED: Added retry logic
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnMount: false, // ✅ FIXED: Prevent unnecessary refetches
    refetchOnWindowFocus: false, // ✅ FIXED: Don't refetch on window focus
  });
}

/**
 * Track ad event (impression or click)
 */
export function useTrackAdEvent() {
  return useMutation({
    mutationFn: async ({ adId, type, pageType, pageUrl, device, placement, eventTimestamp }) => {
      const normalizedPageType = pageType === 'articles' ? 'article' : pageType;
      const eventId = type === 'click' && eventTimestamp
        ? `${adId}:${Math.round(eventTimestamp)}:${pageUrl || ''}`
        : undefined;
      const { data } = await api.post('/ads/track', {
        adId,
        type,
        eventType: type,
        pageType: normalizedPageType,
        pageUrl,
        device,
        placement,
        ...(eventId ? { eventId } : {}),
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
 * Get single ad (admin)
 */
export function useAdminAd(adId) {
  return useQuery({
    queryKey: ['admin', 'ad', adId],
    queryFn: async () => {
      const { data } = await api.get(`/ads/${adId}`);
      return data.ad || data.data?.ad;
    },
    enabled: !!adId,
  });
}

/**
 * Get ad statistics (admin)
 */
export function useAdStats(adId, options = {}) {
  const { startDate, endDate } = options;
  
  return useQuery({
    queryKey: ['admin', 'ad-stats', adId, startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const { data } = await api.get(`/ads/${adId}/analytics`, { params });
      const analytics = data.analytics || data.data?.analytics || {};
      const stats = analytics.stats || analytics;
      const daily = data.daily || data.data?.daily || analytics.daily || [];

      return {
        data: {
          stats: {
            impressions: Number(stats.impressions || 0),
            clicks: Number(stats.clicks || 0),
            ctr: stats.ctr || 0,
          },
          daily: Array.isArray(daily) ? daily : [],
        },
      };
    },
    enabled: !!adId,
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
  useBetweenSectionAds,
  useArticleAds,
  useSelectAds,
  useTrackAdEvent,
  // Admin
  useAdminAd,
  useAdStats,
  // Helpers
  useDeviceType
};
