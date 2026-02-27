/* eslint react/jsx-uses-vars: "error" */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Clock, Eye, Search, X, TrendingUp, User, ArrowUpRight, ExternalLink, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useCategories, usePublicSettings } from '../../hooks/useApi';
import { useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';
import { articlesAPI } from '../../services/api';
import { ArticleCard } from '../../components/article/index.jsx';
import { Button, Badge, ArticleListSkeleton, Input } from '../../components/common/index.jsx';
import { BodyAd } from '../../components/ads/index.js';
import { BetweenSectionsSlot } from '../../components/ads/BetweenSectionsSlot.jsx';
import { InlineAdGroup, createAdTracker, getSectionIndexAfterRows } from '../../components/ads/inlineAds.jsx';
import { buildMediaUrl, cn, formatRelativeTime, getCategoryAccent } from '../../utils';
import { buildFacebookEmbedConfig, normalizeFacebookCandidateUrl } from '../../utils/facebookEmbed';
import { SidebarAdSlot, useRightSidebarStickyTop } from './shared/rightSidebarAds.jsx';
import useLanguage from '../../hooks/useLanguage';

const REEL_MOTION_PRESETS = {
  snappy: {
    wheelLockMs: 180,
    touchLockMs: 140,
    swipeThresholdPx: 20,
    wheelStepDeltaPx: 14,
    stepAnimationMs: 130,
  },
  cinematic: {
    wheelLockMs: 320,
    touchLockMs: 240,
    swipeThresholdPx: 32,
    wheelStepDeltaPx: 22,
    stepAnimationMs: 240,
  },
};

// Change this in one place to tune reels feel.
const ACTIVE_REEL_MOTION_PRESET = 'cinematic';

// ==================== HOME PAGE ====================

function ArticleCardNews({ article }) {
  const { translateText } = useLanguage();
  return (
    <article className="bg-white dark:bg-dark-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group flex items-stretch gap-4 p-4 sm:flex-col sm:gap-0 sm:p-0 sm:h-full">
      {/* Image */}
      <Link to={`/article/${article.slug}`} className="block flex-shrink-0 sm:flex-shrink">
        <div className="relative w-24 h-24 sm:w-auto sm:h-auto sm:aspect-[16/10] overflow-hidden rounded-md">
          <img loading="lazy"
            src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/600/375`}
            alt={article.title}
            className="w-full h-full object-cover object-center bg-dark-100 dark:bg-dark-800 group-hover:scale-105 transition-transform duration-300"
          />

        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0 p-0 sm:p-5 sm:flex sm:flex-col">

        {/* Title */}
        {article.category && (
          <span
            className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              backgroundColor: `${article.category.color || getCategoryAccent(article.category.name)}E6`,
              color: '#ffffff',
            }}
          >
              {article.category.name}
            </span>
        )}
        <Link to={`/article/${article.slug}`}>
          <h3 className="font-bold text-lg text-dark-900 dark:text-white leading-snug mb-2 line-clamp-1 headline-group-hover">
            {article.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-dark-500 text-sm line-clamp-2 mb-2">
            {article.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="mt-auto flex items-center gap-4 text-dark-400 text-sm">
          {article.author && (
            <div className="hidden min-[421px]:flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{article.author.fullName || translateText('Admin')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatRelativeTime(article.publishedAt)}</span>
          </div>
          {article.viewCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span>{article.viewCount}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function SearchFeedCard({ article }) {
  const { translateText } = useLanguage();
  const imageUrl = buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/240/240`;

  return (
    <article className="rounded-xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link to={`/article/${article.slug}`} className="block flex-shrink-0">
          <img
            loading="lazy"
            src={imageUrl}
            alt={article.title}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover bg-dark-100 dark:bg-dark-800"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-dark-500 dark:text-dark-400">
            {article.category && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold"
                style={{
                  backgroundColor: `${article.category.color || getCategoryAccent(article.category.name)}20`,
                  color: article.category.color || getCategoryAccent(article.category.name),
                }}
              >
                {article.category.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>

          <Link to={`/article/${article.slug}`}>
            <h2 className="mt-1.5 text-base sm:text-lg font-semibold text-dark-900 dark:text-white leading-snug line-clamp-2 headline-hover">
              {article.title}
            </h2>
          </Link>

          {article.excerpt && (
            <p className="mt-1.5 text-xs sm:text-sm text-dark-600 dark:text-dark-300 leading-relaxed line-clamp-2">
              {article.excerpt}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2 text-xs text-dark-500 dark:text-dark-400">
              {article.author && <span className="truncate">{article.author.fullName || translateText('Admin')}</span>}
              {article.viewCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {article.viewCount}
                </span>
              )}
            </div>
            <Link
              to={`/article/${article.slug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {translateText('Open')} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// ==================== ARTICLES PAGE ====================
export function ArticlesPage() {
  const navigate = useNavigate();
  const { t, translateText, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasLegacyVideoFeed = searchParams.get('feed') === 'video';
  const categorySlug = searchParams.get('category') || '';
  const searchQuery = searchParams.get('q') || '';
  const [search, setSearch] = useState(searchQuery);
  const loadMoreRef = useRef(null);
  const limit = 10;

  const {
    data: articlesPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['articles', 'infinite', { category: categorySlug, q: searchQuery, limit, language }],
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        page: pageParam,
        limit,
        language,
        ...(categorySlug ? { category: categorySlug } : {}),
        ...(searchQuery ? { q: searchQuery } : {}),
      };
      const response = searchQuery
        ? await articlesAPI.search(params)
        : await articlesAPI.getAll(params);
      return { ...response.data, __page: pageParam };
    },
    initialPageParam: 1,
    enabled: !hasLegacyVideoFeed,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination || lastPage.data?.pagination;
      if (pagination?.page && pagination?.pages) {
        return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
      }
      const page = lastPage.__page || 1;
      const items = lastPage.data?.articles || lastPage.data || lastPage.articles || [];
      return items.length >= limit ? page + 1 : undefined;
    },
  });
  const device = useDeviceType();
  const isNonDesktop = device !== 'desktop';
  const { data: searchAds } = useSelectAds('in_search', {
    pageType: 'search',
    device,
    limit: 1,
    enabled: !!searchQuery
  });
  const { data: sidebarAds } = useSelectAds('sidebar', {
    pageType: 'article',
    device,
    limit: 10
  });
  const { data: sidebarAdsDesktop } = useSelectAds('sidebar', {
    pageType: 'article',
    device: 'desktop',
    limit: 10,
    enabled: isNonDesktop
  });
  const { data: rightSidebarAds } = useSelectAds('custom', {
    pageType: 'article',
    device,
    placementId: 'right_sidebar',
    limit: 10
  });
  const { data: rightSidebarAdsDesktop } = useSelectAds('custom', {
    pageType: 'article',
    device: 'desktop',
    placementId: 'right_sidebar',
    limit: 10,
    enabled: isNonDesktop
  });
  const { mutate: trackAdEvent } = useTrackAdEvent();
  const sidebarStickyTop = useRightSidebarStickyTop();
  const searchAd = searchAds?.[0];
  const resolvedSidebarAds = sidebarAds?.length ? sidebarAds : (isNonDesktop ? (sidebarAdsDesktop || []) : []);
  const resolvedRightSidebarAds = rightSidebarAds?.length ? rightSidebarAds : (isNonDesktop ? (rightSidebarAdsDesktop || []) : []);
  const sidebarStackAds = [...resolvedSidebarAds, ...resolvedRightSidebarAds]
    .filter((ad, index, arr) => ad?._id && arr.findIndex((item) => item?._id === ad._id) === index);
  const inlineSidebarAds = sidebarStackAds.slice(0, 2);
  const isSearchMode = Boolean(searchQuery);
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  const articles = articlesPages?.pages?.flatMap((page) => (
    page?.data?.articles || page?.data || page?.articles || []
  )) || [];
  const resultCountLabel = hasNextPage
    ? t('articles.resultsMore', '{{count}}+ results', { count: articles.length })
    : t('articles.results', '{{count}} results', { count: articles.length });
  const getNewsGridColumns = () => {
    if (typeof window === 'undefined') return 3;
    const width = window.innerWidth;
    if (width >= 1024) return 3;
    if (width >= 640) return 2;
    return 1;
  };
  const [newsGridColumns, setNewsGridColumns] = useState(getNewsGridColumns);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => setNewsGridColumns(getNewsGridColumns());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (hasLegacyVideoFeed) {
      navigate('/videos', { replace: true });
    }
  }, [hasLegacyVideoFeed, navigate]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return undefined;
    const target = loadMoreRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const trackNewsAd = createAdTracker({
    trackAdEvent,
    pageType: 'article',
    pageUrl,
    device
  });


  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    const trimmed = search.trim();
    if (trimmed) params.set('q', trimmed);
    else params.delete('q');
    params.set('page', '1');
    setSearchParams(params);
  };

  if (hasLegacyVideoFeed) {
    return null;
  }

  return (
    <>
      <Helmet><title>{`${t('nav.news', 'News')} - Bassac Post`}</title></Helmet>

      <div className="container-custom py-4 lg:py-6 text-[15px] sm:text-base">
        {/* Main Layout: Content + Sidebar Ad */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <section className="mb-5 rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 sm:p-5 shadow-sm">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="search"
                    enterKeyHint="search"
                    placeholder={translateText('Search posts, topics, authors...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 rounded-full border border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-dark-200 dark:hover:bg-dark-700"
                      aria-label={t('common.clearSearch', 'Clear search')}
                    >
                      <X className="w-4 h-4 text-dark-400" />
                    </button>
                  )}
                </div>
              </form>
            </section>

            {isSearchMode ? (
              <section className="mb-6 rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 sm:p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-dark-400">{t('articles.searchResults', 'Search Results')}</p>
                <h1 className="mt-1 text-2xl lg:text-3xl font-bold text-dark-900 dark:text-white">"{searchQuery}"</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-dark-500">
                  <span>{isLoading ? t('common.searching', 'Searching...') : resultCountLabel}</span>
                </div>
              </section>
            ) : (
              <div className="mb-6">
                <h1 className="text-2xl lg:text-2xl font-bold text-dark-900 dark:text-white mb-2">
                  {t('articles.newsFeed', 'News Feed')}
                </h1>
                <p className="text-dark-500">
                  {translateText('Find stories faster with search and category filters.')}
                </p>
              </div>
            )}

            {searchAd && (
              <div className="mb-6">
                <BodyAd
                  ad={searchAd}
                  placementOverride="in_search"
                  onImpression={(adData) => trackAdEvent({
                    adId: adData._id,
                    type: 'impression',
                    pageType: 'search',
                    pageUrl,
                    device,
                    placement: adData.placement
                  })}
                  onClick={(adData, meta) => trackAdEvent({
                    adId: adData._id,
                    type: 'click',
                    pageType: 'search',
                    pageUrl,
                    device,
                    placement: adData.placement,
                    eventTimestamp: meta?.eventTimestamp
                  })}
                />
              </div>
            )}

            {/* Results */}
            {isLoading ? (
              <div className={
                isSearchMode
                  ? 'space-y-4'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              }>
                {[...Array(isSearchMode ? 6 : 9)].map((_, i) => (
                  isSearchMode ? (
                    <div key={i} className="bg-white dark:bg-dark-900 rounded-xl border border-dark-100 dark:border-dark-800 shadow-sm p-3 sm:p-4">
                      <div className="flex gap-3 sm:gap-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 skeleton rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 skeleton rounded w-1/3" />
                          <div className="h-5 skeleton rounded w-5/6" />
                          <div className="h-4 skeleton rounded w-4/5" />
                          <div className="h-4 skeleton rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="bg-white dark:bg-dark-900 rounded-2xl overflow-hidden border border-dark-100 dark:border-dark-800 shadow-sm">
                      <div className={cn('aspect-[16/10]', 'skeleton')} />
                      <div className="p-5 space-y-3">
                        <div className="h-5 skeleton rounded w-24" />
                        <div className="h-6 skeleton rounded w-5/6" />
                        <div className="h-4 skeleton rounded w-3/4" />
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : articles.length > 0 ? (
              <div>
                {isSearchMode ? (
                  <div className="space-y-4">
                    {articles.map((article) => (
                      <SearchFeedCard key={article._id} article={article} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
		                  {articles.map((article, index) => (
	                    <Fragment key={article._id}>
	                      <ArticleCardNews article={article} />
	                      {(() => {
	                        const renderedCount = index + 1;
	                        const itemsPerSection = newsGridColumns * 2; // 2 rows per section
	                        if (renderedCount % itemsPerSection !== 0) return null;
	                        const sectionIndex = getSectionIndexAfterRows(renderedCount, newsGridColumns);
	                        const shouldShowInlineSidebarAds = isNonDesktop && sectionIndex === 0 && inlineSidebarAds.length > 0;
	                        return (
	                          <Fragment>
	                            {shouldShowInlineSidebarAds && (
	                              <div className="col-span-full">
	                                <div className="mb-4">
	                                <InlineAdGroup
	                                  ads={inlineSidebarAds}
	                                  keyPrefix="news-sidebar-inline"
	                                  onTrackAd={trackNewsAd}
	                                />
	                                </div>
	                              </div>
	                            )}
	                            <BetweenSectionsSlot
	                              pageType="article"
	                              device={device}
	                              sectionIndex={sectionIndex}
	                              limit={2}
	                              keyPrefix="news-between-sections"
	                              onTrackAd={trackNewsAd}
	                              fixedHeight={100}
	                              wrapperClassName="col-span-full"
	                            />
	                          </Fragment>
	                        );
	                      })()}
	                    </Fragment>
	                  ))}
	                </div>
                )}

                {hasNextPage && (
                  <div className="flex justify-center items-center mt-12">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="px-6 py-2 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                    >
                      {isFetchingNextPage ? t('common.loadingMore', 'Loading more...') : t('common.loadMore', 'Load more')}
                    </button>
                  </div>
                )}
                <div ref={loadMoreRef} className="h-1" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 text-center py-16 px-6">
                <Search className="w-10 h-10 mx-auto text-dark-400 mb-3" />
                <p className="text-dark-700 dark:text-dark-200 text-lg font-semibold">
                  {t('articles.noNewsFound', 'No news found')}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setSearchParams(new URLSearchParams());
                    }}
                    className="mt-4 inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                  >
                    <X className="w-4 h-4" />
                    {t('common.clearSearch', 'Clear search')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Ad */}
          <aside
            className="hidden lg:block w-[300px] flex-shrink-0 lg:self-start lg:sticky"
            style={{ top: `${sidebarStickyTop}px` }}
          >
            <SidebarAdSlot
              ads={sidebarStackAds}
              pageType="article"
              pageUrl={pageUrl}
              device={device}
              trackAdEvent={trackAdEvent}
            />
          </aside>
        </div>
      </div>
    </>
  );
}

// ==================== VIDEOS PAGE (REELS STYLE) ====================
export function VideosPage() {
  const { t, translateText, language } = useLanguage();
  const motionPreset = REEL_MOTION_PRESETS[ACTIVE_REEL_MOTION_PRESET] || REEL_MOTION_PRESETS.snappy;
  const reelsViewportRef = useRef(null);
  const directVideoRefs = useRef({});
  const transitionFrameRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const queuedAdvanceIndexRef = useRef(null);
  const wheelLockRef = useRef(false);
  const scrollAnimatingRef = useRef(false);
  const touchStartYRef = useRef(0);
  const touchActiveRef = useRef(false);
  const touchLockRef = useRef(false);
  const autoplayRetryTimerRef = useRef(null);
  const hasUserGestureRef = useRef(false);
  const activeReelIndexRef = useRef(0);
  const WHEEL_LOCK_MS = motionPreset.wheelLockMs;
  const TOUCH_LOCK_MS = motionPreset.touchLockMs;
  const SWIPE_THRESHOLD_PX = motionPreset.swipeThresholdPx;
  const WHEEL_STEP_DELTA_PX = motionPreset.wheelStepDeltaPx;
  const PREFETCH_BUFFER = 3;
  const STEP_ANIMATION_MS = motionPreset.stepAnimationMs;
  const limit = 8;
  const [failedEmbeds, setFailedEmbeds] = useState({});
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [playSession, setPlaySession] = useState(1);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [showAutoplayPrompt, setShowAutoplayPrompt] = useState(true);
  const [loadingEmbeds, setLoadingEmbeds] = useState({});
  const [saveDataEnabled, setSaveDataEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Always let FB control audio; start muted for autoplay
  const embedPreloadRadius = saveDataEnabled ? 0 : 1;
  const detailRenderRadius = embedPreloadRadius + 2;
  const mutedAutoplayStartedRef = useRef(false);
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  }, []);
  const [showMobileHint, setShowMobileHint] = useState(false);

  const getGestureDone = useCallback(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('reelsGestureDone') === '1';
    } catch {
      return false;
    }
  }, []);

  const [showGestureOverlay, setShowGestureOverlay] = useState(() => !isTouchDevice && !getGestureDone());

  const queueAutoplayRetry = useCallback((delay = 0) => {
    if (isTouchDevice) return;
    if (typeof window === 'undefined') return;
    if (autoplayRetryTimerRef.current) {
      window.clearTimeout(autoplayRetryTimerRef.current);
    }
    autoplayRetryTimerRef.current = window.setTimeout(() => {
      autoplayRetryTimerRef.current = null;
      setPlaySession((value) => value + 1);
    }, Math.max(0, delay));
  }, [isTouchDevice]);

  const {
    data: videosPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['videos', 'infinite', { limit, language }],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await articlesAPI.getAll({
        page: pageParam,
        limit,
        language,
        postType: 'video',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      });
      return { ...response.data, __page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination || lastPage.data?.pagination;
      if (pagination?.page && pagination?.pages) {
        return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
      }
      const page = lastPage.__page || 1;
      const items = lastPage.data?.articles || lastPage.data || lastPage.articles || [];
      return items.length >= limit ? page + 1 : undefined;
    },
  });

  const allArticles = useMemo(() => (
    videosPages?.pages?.flatMap((page) => (page?.data?.articles || page?.data || page?.articles || [])) || []
  ), [videosPages]);

  const videos = useMemo(() => {
    const seenIds = new Set();
    return allArticles
      .map((article, index) => {
        const facebookUrl = normalizeFacebookCandidateUrl(article?.videoUrl || '');
        const directUrl = article?.directVideoUrl
          || article?.videoFileUrl
          || article?.videoFile?.url
          || article?.video?.url
          || article?.file?.url
          || '';
        const sourceUrl = facebookUrl || directUrl;
        const id = article?._id || article?.slug || `video-${index}`;
        return {
          id,
          facebookUrl,
          directUrl,
          sourceUrl,
          title: article?.title || '',
          excerpt: article?.excerpt || '',
          slug: article?.slug || '',
          publishedAt: article?.publishedAt || article?.createdAt || '',
          category: article?.category || null,
        };
      })
      .filter((item) => item.sourceUrl)
      .filter((item) => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
  }, [allArticles]);

  const feedIdentity = useMemo(() => {
    const first = videos[0];
    return `${language}:${first?.id || 'none'}:${first?.sourceUrl || 'none'}`;
  }, [language, videos]);
  const firstVideoHasDirect = Boolean(videos[0]?.directUrl);
  const activeVideo = videos[activeReelIndex] || null;
  const activeVideoId = activeVideo?.id || '';

  useEffect(() => {
    if (videos.length === 0) {
      activeReelIndexRef.current = 0;
      if (activeReelIndex !== 0) setActiveReelIndex(0);
      return;
    }
    if (activeReelIndex > videos.length - 1) {
      const bounded = videos.length - 1;
      activeReelIndexRef.current = bounded;
      setActiveReelIndex(bounded);
    }
  }, [activeReelIndex, videos.length]);

  useEffect(() => {
    activeReelIndexRef.current = activeReelIndex;
  }, [activeReelIndex]);

  const maybePrefetchMore = useCallback((index) => {
    if (!hasNextPage || isFetchingNextPage || videos.length === 0) return;
    const remainingAfter = videos.length - 1 - index;
    if (remainingAfter <= PREFETCH_BUFFER) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, videos.length]);

  useEffect(() => {
    setFailedEmbeds({});
    setActiveReelIndex(0);
    activeReelIndexRef.current = 0;
    setPlaySession(1);
    const gestureDone = getGestureDone();
    const shouldHideOverlays = gestureDone || hasUserGestureRef.current || (isTouchDevice && firstVideoHasDirect);
    setShowSwipeHint(!shouldHideOverlays);
    setShowAutoplayPrompt(!shouldHideOverlays);
    setLoadingEmbeds({});
    setIsMuted(true);
    // iPhone/Android: avoid replay-loop CTA; desktop keeps explicit first-play affordance.
    setShowGestureOverlay(!isTouchDevice && !shouldHideOverlays);
    if (shouldHideOverlays && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('reelsGestureDone', '1');
      } catch {
        // Ignore storage failures (e.g., Safari private mode).
      }
    }
    mutedAutoplayStartedRef.current = false;
    directVideoRefs.current = {};
    if (autoplayRetryTimerRef.current) {
      window.clearTimeout(autoplayRetryTimerRef.current);
      autoplayRetryTimerRef.current = null;
    }
    if (scrollFrameRef.current) {
      window.cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  }, [feedIdentity, firstVideoHasDirect, getGestureDone, isTouchDevice]);

  useEffect(() => {
    if (!isTouchDevice) return undefined;
    if (showGestureOverlay) return undefined;
    setShowMobileHint(true);
    const timer = window.setTimeout(() => setShowMobileHint(false), 3500);
    return () => window.clearTimeout(timer);
  }, [isTouchDevice, showGestureOverlay, activeReelIndex]);

  useEffect(() => {
    const viewport = reelsViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = 0;
  }, [feedIdentity]);

  const isControlTarget = (target) => {
    if (typeof Element === 'undefined' || !target) return false;
    if (target instanceof Element) {
      return Boolean(target.closest('[data-reels-control="true"]'));
    }
    if (typeof Node !== 'undefined' && target instanceof Node && target.parentElement) {
      return Boolean(target.parentElement.closest('[data-reels-control="true"]'));
    }
    return false;
  };

  useEffect(() => {
    return () => {
      if (transitionFrameRef.current) {
        window.cancelAnimationFrame(transitionFrameRef.current);
      }
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      if (autoplayRetryTimerRef.current) {
        window.clearTimeout(autoplayRetryTimerRef.current);
        autoplayRetryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleResumePlayback = () => {
      if (document.visibilityState !== 'visible') return;
      if (!hasUserGestureRef.current) return;
      queueAutoplayRetry();
    };

    const handleOnline = () => {
      if (!hasUserGestureRef.current) return;
      queueAutoplayRetry(50);
    };

    document.addEventListener('visibilitychange', handleResumePlayback);
    window.addEventListener('focus', handleResumePlayback);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleResumePlayback);
      window.removeEventListener('focus', handleResumePlayback);
      window.removeEventListener('online', handleOnline);
    };
  }, [queueAutoplayRetry]);

  useEffect(() => {
    const connection = typeof navigator !== 'undefined' ? navigator.connection || navigator.webkitConnection || navigator.mozConnection : null;
    if (connection && typeof connection.saveData === 'boolean') {
      setSaveDataEnabled(Boolean(connection.saveData));
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (hasUserGestureRef.current) {
      setShowGestureOverlay(false);
      return;
    }
    hasUserGestureRef.current = true;
    setShowGestureOverlay(false);
    setShowSwipeHint(false);
    setShowAutoplayPrompt(false);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('reelsGestureDone', '1');
      } catch {
        // Ignore storage failures (e.g., Safari private mode).
      }
    }
    queueAutoplayRetry();
  }, [queueAutoplayRetry]);

  const handleViewportGestureCapture = useCallback((event) => {
    if (!isTouchDevice) return;
    if (isControlTarget(event.target)) return;
    if (!showGestureOverlay && hasUserGestureRef.current) return;
    startPlayback();
  }, [isTouchDevice, showGestureOverlay, startPlayback]);

  const jumpToReel = useCallback((index, { animate = true } = {}) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 1) return;
    const itemHeight = viewport.clientHeight || 1;
    const boundedIndex = Math.max(0, Math.min(videos.length - 1, index));
    activeReelIndexRef.current = boundedIndex;
    setActiveReelIndex((prev) => (prev === boundedIndex ? prev : boundedIndex));
    maybePrefetchMore(boundedIndex);
    const targetTop = boundedIndex * itemHeight;

    if (!animate) {
      viewport.scrollTop = targetTop;
      return;
    }

    if (transitionFrameRef.current) {
      window.cancelAnimationFrame(transitionFrameRef.current);
    }

    scrollAnimatingRef.current = true;
    const startTop = viewport.scrollTop;
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 1) {
      viewport.scrollTop = targetTop;
      scrollAnimatingRef.current = false;
      return;
    }

    const startTime = window.performance.now();
    const step = (timestamp) => {
      const progress = Math.min(1, (timestamp - startTime) / STEP_ANIMATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      viewport.scrollTop = startTop + distance * eased;
      if (progress < 1) {
        transitionFrameRef.current = window.requestAnimationFrame(step);
      } else {
        transitionFrameRef.current = null;
        scrollAnimatingRef.current = false;
      }
    };

    transitionFrameRef.current = window.requestAnimationFrame(step);
  }, [STEP_ANIMATION_MS, maybePrefetchMore, videos.length]);

  useEffect(() => {
    const queuedIndex = queuedAdvanceIndexRef.current;
    if (queuedIndex == null) return;
    if (queuedIndex <= videos.length - 1) {
      jumpToReel(queuedIndex);
      queuedAdvanceIndexRef.current = null;
    }
  }, [jumpToReel, videos.length]);

  const moveReelByStep = useCallback((direction, { animate = true, force = false } = {}) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 2) return;
    if (scrollAnimatingRef.current && !force) return;
    if (force && transitionFrameRef.current) {
      window.cancelAnimationFrame(transitionFrameRef.current);
      transitionFrameRef.current = null;
      scrollAnimatingRef.current = false;
    }

    const currentIndex = activeReelIndexRef.current;
    const nextIndex = Math.max(0, Math.min(videos.length - 1, currentIndex + direction));

    if (nextIndex === currentIndex) {
      if (direction > 0 && hasNextPage && !isFetchingNextPage) {
        queuedAdvanceIndexRef.current = currentIndex + 1;
        fetchNextPage();
      }
      return;
    }

    jumpToReel(nextIndex, { animate });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }

    if (direction > 0 && hasNextPage && !isFetchingNextPage) {
      const remainingAfterNext = videos.length - 1 - nextIndex;
      if (remainingAfterNext <= PREFETCH_BUFFER) {
        fetchNextPage();
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, jumpToReel, videos.length]);

  const handleThumbStep = useCallback((direction) => {
    startPlayback();
    // Thumb controls on phone should feel immediate and never lock the screen.
    moveReelByStep(direction, { animate: false, force: true });
  }, [moveReelByStep, startPlayback]);

  const handleReelsWheel = (event) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 2) return;
    if (scrollAnimatingRef.current) return;
    if (isControlTarget(event.target)) return;
    if (Math.abs(event.deltaY) < WHEEL_STEP_DELTA_PX) return;

    event.preventDefault();
    if (wheelLockRef.current) return;

    startPlayback();
    const direction = event.deltaY > 0 ? 1 : -1;
    wheelLockRef.current = true;
    moveReelByStep(direction);
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, WHEEL_LOCK_MS);
  };

  const handleReelsTouchStart = (event) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 2) return;
    if (scrollAnimatingRef.current) return;
    if (!event.touches?.length) return;
    if (isControlTarget(event.target)) {
      touchActiveRef.current = false;
      return;
    }

    startPlayback();
    touchStartYRef.current = event.touches[0].clientY;
    touchActiveRef.current = true;
  };

  const handleReelsTouchMove = (event) => {
    if (touchActiveRef.current) {
      event.preventDefault();
    }
  };

  const handleReelsTouchEnd = (event) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 2) return;
    if (scrollAnimatingRef.current) return;
    if (!touchActiveRef.current || !event.changedTouches?.length) return;
    if (isControlTarget(event.target)) {
      touchActiveRef.current = false;
      return;
    }

    touchActiveRef.current = false;
    const endY = event.changedTouches[0].clientY;
    const deltaY = touchStartYRef.current - endY;
    if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return;
    if (touchLockRef.current) return;

    const direction = deltaY > 0 ? 1 : -1;
    touchLockRef.current = true;
    moveReelByStep(direction);
    window.setTimeout(() => {
      touchLockRef.current = false;
    }, TOUCH_LOCK_MS);
  };

  const handleReelsScroll = () => {
    const viewport = reelsViewportRef.current;
    if (!viewport) return;
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const itemHeight = viewport.clientHeight || 1;
      const nextIndex = Math.max(0, Math.min(videos.length - 1, Math.round(viewport.scrollTop / itemHeight)));
      if (nextIndex !== activeReelIndexRef.current) {
        startPlayback();
        activeReelIndexRef.current = nextIndex;
        setActiveReelIndex(nextIndex);
      }
      maybePrefetchMore(nextIndex);
    });
  };

  const handleReelsKeyDown = (event) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 1) return;
    if (scrollAnimatingRef.current) return;
    if (isControlTarget(event.target)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      startPlayback();
      moveReelByStep(1);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      startPlayback();
      moveReelByStep(-1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      startPlayback();
      jumpToReel(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      startPlayback();
      jumpToReel(videos.length - 1);
    }
  };

  useEffect(() => {
    // Retry after snap animation settles so Facebook iframe gets the active reel in-view.
    if (!hasUserGestureRef.current) return;
    queueAutoplayRetry(STEP_ANIMATION_MS + 40);
  }, [STEP_ANIMATION_MS, activeReelIndex, queueAutoplayRetry]);

  useEffect(() => {
    if (!activeVideoId) return;
    // Mark the active reel as loading when it first becomes active or when we restart playback.
    setLoadingEmbeds((prev) => {
      if (prev[activeVideoId] === true) return prev;
      return { ...prev, [activeVideoId]: true };
    });
  }, [activeVideoId, playSession, isMuted]);

  useEffect(() => {
    if (!activeVideoId) return;
    Object.entries(directVideoRefs.current).forEach(([videoId, node]) => {
      if (!node) return;
      const isActive = videoId === activeVideoId;
      node.muted = isMuted;
      if (!isActive) {
        node.pause();
        return;
      }
      const playAttempt = node.play?.();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(() => {});
      }
    });
  }, [activeVideoId, isMuted, playSession]);

  useEffect(() => {
    maybePrefetchMore(activeReelIndex);
  }, [activeReelIndex, maybePrefetchMore]);

  const retryEmbed = (videoId) => {
    setFailedEmbeds((prev) => {
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
    setLoadingEmbeds((prev) => ({ ...prev, [videoId]: true }));
    setPlaySession((value) => value + 1);
  };

  // On mobile (and desktop) allow muted autoplay without a gesture; browsers permit muted autoplay.
  useEffect(() => {
    if (mutedAutoplayStartedRef.current) return;
    if (videos.length < 1) return;
    mutedAutoplayStartedRef.current = true;
    hasUserGestureRef.current = true; // allows autoplay retries
    setShowSwipeHint(false);
    queueAutoplayRetry(0);
  }, [queueAutoplayRetry, videos.length]);

  const toggleMute = useCallback(() => {
    startPlayback();
    setShowAutoplayPrompt(false);
    setShowMobileHint(false);
    setIsMuted((prev) => {
      const next = !prev;
      const node = activeVideoId ? directVideoRefs.current[activeVideoId] : null;
      if (node) {
        node.muted = next;
        if (!next && node.volume === 0) {
          node.volume = 1;
        }
        const playAttempt = node.play?.();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          playAttempt.catch(() => {});
        }
      }
      return next;
    });
    queueAutoplayRetry(0);
  }, [activeVideoId, queueAutoplayRetry, startPlayback]);

  const renderVideoEmbed = (video, { isActive = false, shouldRenderIframe = true, isMuted: muted = true } = {}) => {
    const shouldUseDirectPlayer = Boolean(video.directUrl && (isTouchDevice || !video.facebookUrl));

    if (!shouldRenderIframe) {
      return <div className="h-full w-full bg-black" aria-hidden="true" />;
    }

    // Touch + directUrl: use native video player for smoother phone playback controls.
    if (shouldUseDirectPlayer) {
      return (
        <video
          className="h-full w-full object-contain bg-black"
          src={video.directUrl}
          autoPlay={isActive}
          muted={muted}
          playsInline
          loop
          controls
          preload={isActive ? 'metadata' : 'none'}
          ref={(node) => {
            if (node) {
              directVideoRefs.current[video.id] = node;
            } else {
              delete directVideoRefs.current[video.id];
            }
          }}
          onLoadedData={() => setLoadingEmbeds((prev) => ({ ...prev, [video.id]: false }))}
          onError={() => {
            setFailedEmbeds((prev) => (prev[video.id] ? prev : { ...prev, [video.id]: true }));
            setLoadingEmbeds((prev) => ({ ...prev, [video.id]: false }));
          }}
          onPlay={startPlayback}
        />
      );
    }

    const embedConfig = buildFacebookEmbedConfig(video.facebookUrl, {
      forceReel: true,
      autoplay: isActive,
      mute: muted,
      cacheKey: isTouchDevice
        ? `${video.id}-${isActive ? 'active' : 'idle'}`
        : (isActive ? `${video.id}-${playSession}` : `${video.id}-idle`),
    });
    const isFailed = Boolean(failedEmbeds[video.id]);
    const isLoading = loadingEmbeds[video.id] !== false;

    if (!embedConfig || isFailed) {
      return (
        <div className="h-full w-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center p-4 text-center">
          <div>
            <p className="text-sm text-dark-500">{translateText('This video cannot be embedded right now.')}</p>
            {video.sourceUrl && (
              <a
                href={video.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm link-primary"
              >
                {translateText(video.facebookUrl ? 'Open on Facebook' : 'Open video')} <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
            <div className="mt-3">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-dark-900 text-white px-3 py-1 text-xs border border-white/20 hover:bg-dark-800 transition-colors"
                onClick={() => retryEmbed(video.id)}
              >
                {translateText('Retry')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="relative h-full max-w-full aspect-[9/16]">
          <iframe
            key={isTouchDevice
              ? `${video.id}-${isActive ? 'active' : 'idle'}`
              : `${video.id}-${isActive ? `active-${playSession}` : 'idle'}`}
            title={video.title || 'Video'}
            src={embedConfig.src}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            loading={isActive ? 'eager' : 'lazy'}
            referrerPolicy="origin-when-cross-origin"
            onLoad={() => setLoadingEmbeds((prev) => ({ ...prev, [video.id]: false }))}
            onError={() => {
              setFailedEmbeds((prev) => (prev[video.id] ? prev : { ...prev, [video.id]: true }));
              setLoadingEmbeds((prev) => ({ ...prev, [video.id]: false }));
            }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-10 w-10 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet><title>{`${t('nav.video', 'Video')} - Bassac Post`}</title></Helmet>

      <div className="min-h-[100dvh] bg-black">
        {isLoading ? (
          <div className="mx-auto w-full max-w-[460px] h-[100dvh]">
            <div className="h-full w-full skeleton sm:rounded-2xl" />
          </div>
        ) : videos.length > 0 ? (
          <div className="mx-auto w-full max-w-[460px] h-[100dvh]">
	            <div
	              ref={reelsViewportRef}
	              onWheel={handleReelsWheel}
	              onTouchStart={isTouchDevice ? undefined : handleReelsTouchStart}
                onTouchStartCapture={handleViewportGestureCapture}
	              onTouchMove={isTouchDevice ? undefined : handleReelsTouchMove}
	              onTouchEnd={isTouchDevice ? undefined : handleReelsTouchEnd}
	              onScroll={handleReelsScroll}
	              onKeyDown={handleReelsKeyDown}
	              onTouchCancel={isTouchDevice ? undefined : () => { touchActiveRef.current = false; }}
	              tabIndex={0}
		              aria-label={translateText('Reels player')}
	              className="relative h-[100dvh] overflow-y-scroll no-scrollbar overscroll-y-none touch-pan-y snap-y snap-mandatory bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70 sm:rounded-2xl sm:border sm:border-dark-800 sm:shadow-xl"
	            >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-black/70 via-black/35 to-transparent"
                  aria-hidden="true"
                />
                <div className="pointer-events-none sticky top-0 z-30 h-0">
                  {!isTouchDevice && (
                    <div className="pointer-events-auto flex items-center justify-between p-3">
                      <Link
                        to="/"
                        data-reels-control="true"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md shadow-lg hover:bg-black/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
                      >
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        {translateText('Back')}
                      </Link>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-reels-control="true"
                          className="inline-flex items-center justify-center rounded-full border border-white/30 bg-black/55 h-8 w-8 text-white backdrop-blur-md shadow-lg hover:bg-black/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
                          onClick={toggleMute}
                          aria-label={translateText(isMuted ? 'Unmute video' : 'Mute video')}
                          title={translateText(isMuted ? 'Unmute video' : 'Mute video')}
                        >
                          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <Link
                          to="/articles"
                          data-reels-control="true"
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md shadow-lg hover:bg-black/75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
                        >
                          {translateText('News')}
                        </Link>
                      </div>
                    </div>
                  )}
	                  <div className={cn(
                      'pointer-events-none absolute inset-x-0 flex justify-center px-3',
                      isTouchDevice ? 'top-3' : 'top-14'
                    )}>
	                    <div
	                      className="rounded-full border border-white/25 bg-black/55 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] tabular-nums text-white/95 backdrop-blur-md shadow-md"
	                      aria-live="polite"
	                    >
	                      {`${activeReelIndex + 1} / ${videos.length}`}
	                    </div>
	                  </div>
	                </div>

		              {showSwipeHint && (
		                <div className={cn(
                      'pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-30 flex px-3 transition-opacity duration-300',
                      isTouchDevice ? 'justify-start pr-20' : 'justify-center'
                    )}>
		                  <div className="rounded-full border border-white/15 bg-black/65 text-white/95 text-xs font-medium tracking-[0.01em] px-3.5 py-1.5 shadow-lg backdrop-blur-md">
		                    {translateText('Swipe up for next, down for previous')}
		                  </div>
		                </div>
		              )}

		              {showAutoplayPrompt && (
		                <div className={cn(
                      'pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+2.75rem)] z-30 flex px-3 transition-opacity duration-300',
                      isTouchDevice ? 'justify-start pr-20' : 'justify-center'
                    )}>
		                  <div className="rounded-full border border-white/15 bg-black/70 text-white/95 text-xs font-medium tracking-[0.01em] px-3.5 py-1.5 shadow-lg backdrop-blur-md">
		                    {translateText(isMuted
		                      ? 'Tap the speaker to unmute'
	                      : 'Autoplay with sound is on')}
	                  </div>
	                </div>
	              )}

			              {showGestureOverlay && (
                    <div className={cn(
                      'pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+7rem)] z-40 flex px-4 transition-opacity duration-300',
                      isTouchDevice ? 'justify-end' : 'justify-center'
                    )}>
                      <button
                        type="button"
                        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md hover:bg-black/80 active:scale-95 transition-all duration-200"
                        onClick={startPlayback}
                        data-reels-control="true"
                        aria-label={translateText('Tap once to start')}
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px]">▶</span>
                        {translateText('Tap once to start')}
                      </button>
                    </div>
		              )}

		              {isTouchDevice && showMobileHint && !showGestureOverlay && (
		                <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+2.75rem)] flex justify-start pr-20 px-3 z-30">
		                  <div className="rounded-full border border-white/15 bg-black/70 text-white/95 text-xs font-medium tracking-[0.01em] px-3.5 py-1.5 shadow-lg backdrop-blur-md">
		                    {translateText('Tap play, then use Facebook controls for sound')}
		                  </div>
		                </div>
		              )}

                  {isTouchDevice && !showGestureOverlay && (
                    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] z-[70] flex justify-center px-3">
                      <div className="pointer-events-none w-full max-w-[460px] flex justify-end">
                        <div className="pointer-events-auto flex flex-col items-center gap-2">
                          <button
                            type="button"
                            data-reels-control="true"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white backdrop-blur-md shadow-lg hover:bg-black/85 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
                            onClick={() => handleThumbStep(-1)}
                            aria-label={translateText('Previous video')}
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            data-reels-control="true"
                            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/75 text-white backdrop-blur-md shadow-xl hover:bg-black/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
                            onClick={toggleMute}
                            aria-label={translateText(isMuted ? 'Unmute video' : 'Mute video')}
                            title={translateText(isMuted ? 'Unmute video' : 'Mute video')}
                          >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                          <button
                            type="button"
                            data-reels-control="true"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white backdrop-blur-md shadow-lg hover:bg-black/85 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
                            onClick={() => handleThumbStep(1)}
                            aria-label={translateText('Next video')}
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          <Link
                            to="/articles"
                            data-reels-control="true"
                            className="inline-flex items-center rounded-full border border-white/25 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md shadow-lg hover:bg-black/85 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
                          >
                            {translateText('News')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

              {videos.map((video, index) => (
                (() => {
                  const isActive = index === activeReelIndex;
                  const shouldRenderIframe = Math.abs(index - activeReelIndex) <= embedPreloadRadius;
                  const shouldRenderDetails = Math.abs(index - activeReelIndex) <= detailRenderRadius;
	                  return (
	                    <article
	                      key={video.id}
	                      className={cn(
                          'relative h-[100dvh] snap-start snap-always',
                          isActive ? 'opacity-100' : 'opacity-[0.98]'
                        )}
	                    >
	                      {shouldRenderDetails ? (
	                        <>
                          {!isTouchDevice && video.slug && (
                            <Link
                              to={`/article/${video.slug}`}
                              data-reels-control="true"
                              className="absolute inset-x-0 top-0 h-16 sm:h-20 z-30 bg-gradient-to-b from-black/30 via-black/5 to-transparent text-transparent"
                              aria-label={translateText('Open video details')}
                            />
                          )}

                          {!isTouchDevice && (
                            <div className="pointer-events-none absolute inset-y-0 right-3 z-20 flex flex-col justify-center gap-3">
	                              {video.slug && (
	                                <Link
	                                  to={`/article/${video.slug}`}
	                                  data-reels-control="true"
	                                  className="pointer-events-auto h-11 w-11 rounded-full bg-black/70 border border-white/25 flex items-center justify-center text-white backdrop-blur-md shadow-md hover:bg-black/85 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
	                                  aria-label={translateText('Open article details')}
	                                >
	                                  <ExternalLink className="w-5 h-5" />
                                </Link>
                              )}
                              {video.sourceUrl && (
                                <a
                                  href={video.sourceUrl}
	                                  target="_blank"
	                                  rel="noopener noreferrer"
	                                  data-reels-control="true"
	                                  className="pointer-events-auto h-11 w-11 rounded-full bg-black/70 border border-white/25 flex items-center justify-center text-white backdrop-blur-md shadow-md hover:bg-black/85 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
	                                  aria-label={translateText(video.facebookUrl ? 'Open on Facebook' : 'Open video')}
	                                >
	                                  <ArrowUpRight className="w-5 h-5" />
                                </a>
                              )}
                            </div>
                          )}

                          {renderVideoEmbed(video, {
                            isActive,
                            shouldRenderIframe,
                            isMuted,
                          })}

                          {!isTouchDevice && (
                            <>
                              <button
                                type="button"
                                className="absolute inset-y-0 left-0 w-16 bg-transparent"
                                onClick={(e) => { e.preventDefault(); moveReelByStep(-1); }}
                                aria-label={translateText('Previous video')}
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 w-16 bg-transparent"
                                onClick={(e) => { e.preventDefault(); moveReelByStep(1); }}
                                aria-label={translateText('Next video')}
                              />
                            </>
                          )}

	                          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
	                            <div
                                className={cn(
                                  'pointer-events-auto rounded-[1.35rem] bg-gradient-to-t from-black/90 via-black/70 to-black/30 border border-white/10 backdrop-blur-md px-4 pt-3 pb-3.5 shadow-2xl transition-all duration-300',
                                  isActive ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-90'
                                )}
                              >
	                              <div className="flex items-center justify-between gap-3 text-[11px] text-white/80">
	                                {video.category?.name && (
	                                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold tracking-[0.02em] bg-white/15 text-white">
	                                    {video.category.name}
	                                  </span>
	                                )}
	                                <span className="ml-auto">{formatRelativeTime(video.publishedAt)}</span>
	                              </div>
	                              {video.slug ? (
	                                <Link to={`/article/${video.slug}`} data-reels-control="true">
	                                  <h2 className="mt-2 text-[1.03rem] leading-[1.35rem] font-semibold text-white headline-hover line-clamp-2">
	                                    {video.title}
	                                  </h2>
	                                </Link>
	                              ) : (
	                                <h2 className="mt-2 text-[1.03rem] leading-[1.35rem] font-semibold text-white line-clamp-2">
	                                  {video.title}
	                                </h2>
	                              )}
	                              {video.excerpt && (
	                                <p className="mt-2 text-sm leading-relaxed text-white/80 line-clamp-2">{video.excerpt}</p>
	                              )}
	                              <div className="mt-3.5 flex items-center gap-2">
	                                {video.slug && (
	                                  <Link
	                                    to={`/article/${video.slug}`}
	                                    data-reels-control="true"
	                                    className="inline-flex items-center gap-2 rounded-full bg-white text-black px-3.5 py-1.5 text-xs font-semibold shadow hover:bg-white/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
	                                  >
	                                    {translateText('Read article')}
	                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                                {video.sourceUrl && (
                                  <a
                                    href={video.sourceUrl}
	                                    target="_blank"
	                                    rel="noopener noreferrer"
	                                    data-reels-control="true"
	                                    className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white px-3.5 py-1.5 text-xs font-semibold border border-white/15 hover:bg-white/15 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-all duration-200"
	                                  >
	                                    {translateText(video.facebookUrl ? 'Facebook' : 'Source')}
	                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full w-full bg-black" aria-hidden="true" />
                      )}
                    </article>
                  );
                })()
              ))}

	              {isFetchingNextPage && (
	                <div className="flex items-center justify-center py-4 text-[11px] font-medium tracking-[0.04em] text-white/80 bg-black/70 backdrop-blur-sm">
	                  {t('common.loadingMore', 'Loading more...')}
	                </div>
	              )}
            </div>
          </div>
        ) : (
          <div className="h-[100dvh] flex items-center justify-center px-6 text-center">
            <p className="text-white text-lg font-semibold">{translateText('No video posts yet')}</p>
          </div>
        )}
      </div>

    </>
  );
}

// ==================== CATEGORIES LIST PAGE (Mobile-friendly) ====================
export function CategoriesListPage() {
  const { t, translateText } = useLanguage();
  const { data: categories, isLoading } = useCategories();
  const { data: settings } = usePublicSettings();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular'); // popular | az

  const siteName = settings?.siteName || 'Bassac Post';
  const total = categories?.length || 0;

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = (categories || [])
    .filter((category) => {
      if (!normalizedQuery) return true;
      const haystack = `${category?.name || ''} ${category?.description || ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (sort === 'az') {
        return (a?.name || '').localeCompare(b?.name || '');
      }
      const aCount = Number(a?.articleCount || 0);
      const bCount = Number(b?.articleCount || 0);
      if (bCount !== aCount) return bCount - aCount;
      return (a?.name || '').localeCompare(b?.name || '');
    });

  const totalArticles = (categories || []).reduce((sum, category) => sum + Number(category?.articleCount || 0), 0);

  return (
    <>
      <Helmet>
        <title>{`${t('nav.categories', 'Categories')} - ${siteName}`}</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-dark-50 via-white to-white dark:from-dark-950 dark:via-dark-950 dark:to-dark-950">
        <div className="container-custom py-6 sm:py-10">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-dark-100 dark:border-dark-800 bg-white/80 dark:bg-dark-900/40 backdrop-blur p-5 sm:p-8">
            <div className="absolute -top-28 -right-28 h-64 w-64 rounded-full bg-primary-500/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.24em] text-dark-400 dark:text-dark-500">
                  {t('categories.browseByTopic', 'Browse by topic')}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mt-2">
                  {t('nav.categories', 'Categories')}
                </h1>
                <p className="text-sm sm:text-base text-dark-600 dark:text-dark-400 mt-2">
                  {translateText('Find stories faster with topic pages—search, sort, and jump into what you care about.')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link to="/articles">
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {t('search.allNews', 'All News')}
                  </Button>
                </Link>
                <div className="flex items-center gap-2 rounded-full border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 px-3 py-1.5 text-xs text-dark-600 dark:text-dark-300">
                  <span className="text-dark-400">{t('categories.topics', 'Topics')}</span>
                  <span className="font-semibold text-dark-900 dark:text-white">{total}</span>
                  <span className="mx-1 h-3 w-px bg-dark-200 dark:bg-dark-700" />
                  <span className="text-dark-400">{t('nav.news', 'News')}</span>
                  <span className="font-semibold text-dark-900 dark:text-white">{totalArticles}</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="relative mt-6 grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('categories.searchPlaceholder', 'Search categories (e.g., business, sports, tech)...')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="lg:col-span-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSort('popular')}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                    sort === 'popular'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                      : 'border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-800'
                  )}
                >
                  <TrendingUp className="w-4 h-4" /> {t('categories.popular', 'Popular')}
                </button>
                <button
                  type="button"
                  onClick={() => setSort('az')}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                    sort === 'az'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                      : 'border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 text-dark-700 dark:text-dark-200 hover:bg-dark-50 dark:hover:bg-dark-800'
                  )}
                >
                  A–Z
                </button>
              </div>
            </div>

            {!isLoading && (
              <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-dark-500 dark:text-dark-400">
                <p>
                  {t('categories.showingOf', 'Showing {{shown}} of {{total}} categories', {
                    shown: filtered.length,
                    total,
                  })}
                  {normalizedQuery ? (
                    <>
                      {' '}
                      for <span className="font-semibold text-dark-900 dark:text-white">“{query.trim()}”</span>
                    </>
                  ) : null}
                </p>
                {normalizedQuery && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {t('common.clear', 'Clear')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="mt-6 sm:mt-8">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 overflow-hidden">
                    <div className="aspect-[16/10] skeleton" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 skeleton rounded w-2/3" />
                      <div className="h-3 skeleton rounded w-1/3" />
                      <div className="h-3 skeleton rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((category) => {
                  const accent = category?.color || getCategoryAccent(category?.name);
                  const rawImage = category?.image || '';
                  const imageUrl = buildMediaUrl(rawImage);

                  const count = Number(category?.articleCount || 0);
                  const initial = (category?.name || '?').trim().charAt(0).toUpperCase();

                  return (
                    <Link
                      key={category._id}
                      to={`/category/${category.slug}`}
                      className="group relative overflow-hidden rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 shadow-sm hover:shadow-lg transition-all active:scale-[0.99]"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        {imageUrl ? (
                          <>
                            <img
                              loading="lazy"
                              src={imageUrl}
                              alt={category?.name || translateText('Category')}
                              className="h-full w-full object-cover transition-transform duration-500 transform-gpu group-hover:scale-[1.06]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 via-dark-950/20 to-transparent" />
                          </>
                        ) : (
                          <div
                            className="h-full w-full transition-transform duration-500 transform-gpu group-hover:scale-[1.06]"
                            style={{ background: `radial-gradient(1200px 400px at 10% 0%, ${accent}55, transparent), linear-gradient(135deg, ${accent}22, transparent)` }}
                          />
                        )}

                        <div className="absolute left-4 top-4">
                          <div
                            className="h-10 w-10 rounded-2xl grid place-items-center text-sm font-bold text-white shadow-sm"
                            style={{ backgroundColor: accent }}
                          >
                            {initial}
                          </div>
                        </div>

                        <div className="absolute right-4 top-4">
                          <Badge className="bg-white/90 text-dark-900 border border-white/60">
                            {count} {translateText('news')}
                          </Badge>
                        </div>

                        <div className="absolute left-4 right-4 bottom-4">
                          <h3 className="text-base font-semibold text-white leading-snug line-clamp-2 drop-shadow">
                            {category?.name}
                          </h3>
                        </div>
                      </div>

                      <div className="p-4">
                        {category?.description ? (
                          <p className="text-sm text-dark-600 dark:text-dark-400 line-clamp-3">
                            {category.description}
                          </p>
                        ) : (
                          <p className="text-sm text-dark-500 dark:text-dark-400">
                            {translateText('Explore the latest updates in')} <span className="font-semibold text-dark-900 dark:text-white">{category?.name}</span>.
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                            <span className="text-xs text-dark-500 dark:text-dark-400">{translateText('Topic page')}</span>
                          </div>
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {translateText('Explore')} <span aria-hidden>→</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-10 text-center">
                <p className="text-dark-900 dark:text-white font-semibold">{translateText('No categories found')}</p>
                <p className="text-dark-600 dark:text-dark-400 mt-2">
                  {translateText('Try a different search, or browse all news.')}
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  {normalizedQuery && (
                    <Button variant="outline" onClick={() => setQuery('')}>
                      {t('common.clearSearch', 'Clear search')}
                    </Button>
                  )}
                  <Link to="/articles">
                    <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                      {translateText('Browse News')}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== CATEGORY PAGE ====================
export function CategoryPage() {
    const { t, translateText, language } = useLanguage();
    const { slug } = useParams();
    const loadMoreRef = useRef(null);
    const limit = 12;
    const device = useDeviceType();
    const isNonDesktop = device !== 'desktop';
    const { mutate: trackAdEvent } = useTrackAdEvent();
    const sidebarStickyTop = useRightSidebarStickyTop();

    const {
        data: categoryPages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['category', 'infinite', { slug, limit, language }],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await articlesAPI.getByCategory(slug, {
                page: pageParam,
                limit,
                language,
            });
            return { ...response.data, __page: pageParam };
        },
        initialPageParam: 1,
        enabled: !!slug,
        getNextPageParam: (lastPage) => {
            const pagination = lastPage.pagination || lastPage.data?.pagination;
            if (pagination?.page && pagination?.pages) {
                return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
            }
            const page = lastPage.__page || 1;
            const items = lastPage.data?.articles || lastPage.data || lastPage.articles || [];
            return items.length >= limit ? page + 1 : undefined;
        },
    });

    const articles = categoryPages?.pages?.flatMap((page) => (
        page?.data?.articles || page?.data || page?.articles || []
    )) || [];
    const category = categoryPages?.pages?.[0]?.data?.category;
    const { data: categoryAds } = useSelectAds('in_category', {
        pageType: 'category',
        device,
        categoryId: category?._id,
        limit: 1,
        enabled: !!category?._id
    });
    const { data: sidebarAds } = useSelectAds('sidebar', {
        pageType: 'category',
        device,
        limit: 10
    });
    const { data: sidebarAdsDesktop } = useSelectAds('sidebar', {
        pageType: 'category',
        device: 'desktop',
        limit: 10,
        enabled: isNonDesktop
    });
    const { data: rightSidebarAds } = useSelectAds('custom', {
        pageType: 'category',
        device,
        placementId: 'right_sidebar',
        limit: 10
    });
    const { data: rightSidebarAdsDesktop } = useSelectAds('custom', {
        pageType: 'category',
        device: 'desktop',
        placementId: 'right_sidebar',
        limit: 10,
        enabled: isNonDesktop
    });
    const categoryAd = categoryAds?.[0];
    const resolvedSidebarAds = sidebarAds?.length ? sidebarAds : (isNonDesktop ? (sidebarAdsDesktop || []) : []);
    const resolvedRightSidebarAds = rightSidebarAds?.length ? rightSidebarAds : (isNonDesktop ? (rightSidebarAdsDesktop || []) : []);
    const sidebarStackAds = [...resolvedSidebarAds, ...resolvedRightSidebarAds]
      .filter((ad, index, arr) => ad?._id && arr.findIndex((item) => item?._id === ad._id) === index);
    const inlineSidebarAds = sidebarStackAds.slice(0, 2);
    const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
    const loadMoreLabel = isFetchingNextPage ? t('common.loadingMore', 'Loading more...') : t('common.loadMore', 'Load more');
    const trackCategoryAd = createAdTracker({
        trackAdEvent,
        pageType: 'category',
        pageUrl,
        device
    });
    const getCategoryGridColumns = () => {
        if (typeof window === 'undefined') return 3;
        const width = window.innerWidth;
        if (width >= 1024) return 3;
        if (width >= 640) return 2;
        return 1;
    };
    const [categoryGridColumns, setCategoryGridColumns] = useState(getCategoryGridColumns);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const update = () => setCategoryGridColumns(getCategoryGridColumns());
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage) return undefined;
        const target = loadMoreRef.current;
        if (!target) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    fetchNextPage();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    return (
        <>
            <Helmet>
                <title>{`${category?.name || translateText('Category')} - Bassac Post`}</title>
            </Helmet>

            <div className="container-custom py-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                    <div className="flex-1 min-w-0">
                        <div className="mb-8">
                            <Link to="/articles" className="inline-flex items-center gap-2 text-dark-500 hover:text-dark-700 mb-4">
                                ← {t('common.backToNews', 'Back to News')}
                            </Link>
                            <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-5 sm:p-6">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"
                                  style={{ color: category?.color || getCategoryAccent(category?.name || slug.replace(/-/g, ' ')) }}
                                >
                                  <span
                                    className="w-8 h-1 rounded-full"
                                    style={{ backgroundColor: category?.color || getCategoryAccent(category?.name || slug.replace(/-/g, ' ')) }}
                                  />
                                  {translateText('Category')}
                                </div>
                                <h1 className="font-display text-2xl font-bold text-dark-900 dark:text-white mt-2">
                                    {category?.name || slug.replace(/-/g, ' ')}
                                </h1>
                                {category?.description && (
                                    <p className="text-dark-500 mt-2">{category.description}</p>
                                )}
                            </div>
                        </div>

                        {isLoading ? (
                            <ArticleListSkeleton count={12} />
                        ) : articles.length > 0 ? (
                            <>
                                {categoryAd && (
                                    <div className="mb-8">
                                        <BodyAd
                                            ad={categoryAd}
                                            placementOverride="in_category"
                                            onImpression={(adData) => trackCategoryAd(adData, 'impression')}
                                            onClick={(adData, meta) => trackCategoryAd(adData, 'click', meta)}
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {articles.map((a, index) => (
                                        <Fragment key={a._id}>
                                            <div>
                                              <div className="sm:hidden">
                                                <ArticleCard article={a} variant="horizontal" />
                                              </div>
                                              <div className="hidden sm:block">
                                                <ArticleCard article={a} />
                                              </div>
                                            </div>
                                            {(() => {
                                                const renderedCount = index + 1;
                                                const itemsPerSection = categoryGridColumns * 2; // 2 rows per section
                                                if (renderedCount % itemsPerSection !== 0) return null;
                                                const sectionIndex = getSectionIndexAfterRows(renderedCount, categoryGridColumns);
                                                const shouldShowInlineSidebarAds = isNonDesktop && sectionIndex === 0 && inlineSidebarAds.length > 0;
                                                return (
                                                    <Fragment>
                                                        {shouldShowInlineSidebarAds && (
                                                            <div className="col-span-full">
                                                                <div className="mb-4">
                                                                    <InlineAdGroup
                                                                        ads={inlineSidebarAds}
                                                                        keyPrefix="category-sidebar-inline"
                                                                        onTrackAd={trackCategoryAd}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <BetweenSectionsSlot
                                                            pageType="category"
                                                            device={device}
                                                            sectionIndex={sectionIndex}
                                                            limit={2}
                                                            keyPrefix="category-between-sections"
                                                            onTrackAd={trackCategoryAd}
                                                            fixedHeight={100}
                                                            wrapperClassName="col-span-full"
                                                        />
                                                    </Fragment>
                                                );
                                            })()}
                                        </Fragment>
                                    ))}
                                </div>

                                {hasNextPage && (
                                    <div className="mt-10 flex items-center justify-center">
                                        <Button
                                            variant="secondary"
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                        >
                                            {loadMoreLabel}
                                        </Button>
                                    </div>
                                )}
                                <div ref={loadMoreRef} className="h-8" />
                            </>
                        ) : (
                            <p className="text-center py-20 text-dark-500">
                                {translateText('No news in this category')}
                            </p>
                        )}
                    </div>

                    <aside
                        className="hidden lg:block w-[300px] flex-shrink-0 lg:self-start lg:sticky"
                        style={{ top: `${sidebarStickyTop}px` }}
                    >
                        <SidebarAdSlot
                            ads={sidebarStackAds}
                            pageType="category"
                            pageUrl={pageUrl}
                            device={device}
                            trackAdEvent={trackAdEvent}
                        />
                    </aside>
                </div>
            </div>
        </>
    );
}
