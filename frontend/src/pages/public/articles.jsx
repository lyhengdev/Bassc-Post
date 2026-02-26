import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Clock, Eye, Search, X, TrendingUp, User, ArrowUpRight } from 'lucide-react';
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
  const { data: categories } = useCategories();
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

  const handleCategoryClick = (slug) => {
    const params = new URLSearchParams(searchParams);
    if (slug === categorySlug) {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
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
  const reelsViewportRef = useRef(null);
  const transitionFrameRef = useRef(null);
  const queuedAdvanceIndexRef = useRef(null);
  const wheelLockRef = useRef(false);
  const touchStartYRef = useRef(0);
  const touchActiveRef = useRef(false);
  const touchLockRef = useRef(false);
  const WHEEL_LOCK_MS = 50;
  const TOUCH_LOCK_MS = 50;
  const SWIPE_THRESHOLD_PX = 14;
  const PREFETCH_BUFFER = 3;
  const STEP_ANIMATION_MS = 80;
  const limit = 8;
  const [failedEmbeds, setFailedEmbeds] = useState({});
  const [activeReelIndex, setActiveReelIndex] = useState(0);

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

  const allArticles = videosPages?.pages?.flatMap((page) => (
    page?.data?.articles || page?.data || page?.articles || []
  )) || [];
  const videos = allArticles
    .map((article, index) => {
      const facebookUrl = normalizeFacebookCandidateUrl(article?.videoUrl || '');
      return {
        id: article?._id || article?.slug || `video-${index}`,
        facebookUrl,
        title: article?.title || '',
        excerpt: article?.excerpt || '',
        slug: article?.slug || '',
        publishedAt: article?.publishedAt || article?.createdAt || '',
        category: article?.category || null,
      };
    })
    .filter((item) => item.facebookUrl);
  const resetKey = videos.map((video) => `${video.id}:${video.facebookUrl}`).join('|');

  useEffect(() => {
    setFailedEmbeds({});
    setActiveReelIndex(0);
  }, [resetKey]);

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
    };
  }, []);

  const jumpToReel = (index, { animate = true } = {}) => {
    const viewport = reelsViewportRef.current;
    if (!viewport) return;
    const itemHeight = viewport.clientHeight || 1;
    const boundedIndex = Math.max(0, Math.min(videos.length - 1, index));
    setActiveReelIndex(boundedIndex);
    const targetTop = boundedIndex * itemHeight;

    if (!animate) {
      viewport.scrollTop = targetTop;
      return;
    }

    if (transitionFrameRef.current) {
      window.cancelAnimationFrame(transitionFrameRef.current);
    }

    const startTop = viewport.scrollTop;
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 1) {
      viewport.scrollTop = targetTop;
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
      }
    };

    transitionFrameRef.current = window.requestAnimationFrame(step);
  };

  useEffect(() => {
    const queuedIndex = queuedAdvanceIndexRef.current;
    if (queuedIndex == null) return;
    if (queuedIndex <= videos.length - 1) {
      jumpToReel(queuedIndex);
      queuedAdvanceIndexRef.current = null;
    }
  }, [videos.length]);

  const moveReelByStep = (direction) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 2) return;

    const itemHeight = viewport.clientHeight || 1;
    const currentIndex = Math.round(viewport.scrollTop / itemHeight);
    const nextIndex = Math.max(0, Math.min(videos.length - 1, currentIndex + direction));

    if (nextIndex === currentIndex) {
      if (direction > 0 && hasNextPage && !isFetchingNextPage) {
        queuedAdvanceIndexRef.current = currentIndex + 1;
        fetchNextPage();
      }
      return;
    }

    jumpToReel(nextIndex);

    if (direction > 0 && hasNextPage && !isFetchingNextPage) {
      const remainingAfterNext = videos.length - 1 - nextIndex;
      if (remainingAfterNext <= PREFETCH_BUFFER) {
        fetchNextPage();
      }
    }
  };

  const handleReelsWheel = (event) => {
    const viewport = reelsViewportRef.current;
    if (!viewport || videos.length < 2) return;
    if (isControlTarget(event.target)) return;
    if (Math.abs(event.deltaY) < 4) return;

    event.preventDefault();
    if (wheelLockRef.current) return;

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
    if (!event.touches?.length) return;
    if (isControlTarget(event.target)) {
      touchActiveRef.current = false;
      return;
    }

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
    const itemHeight = viewport.clientHeight || 1;
    const nextIndex = Math.max(0, Math.min(videos.length - 1, Math.round(viewport.scrollTop / itemHeight)));
    setActiveReelIndex(nextIndex);
  };

  const renderVideoEmbed = (video, { isActive = false } = {}) => {
    const embedConfig = buildFacebookEmbedConfig(video.facebookUrl, {
      forceReel: true,
      autoplay: isActive,
      mute: isActive,
    });
    const isFailed = Boolean(failedEmbeds[video.id]);

    if (!embedConfig || isFailed) {
      return (
        <div className="h-full w-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center p-4 text-center">
          <div>
            <p className="text-sm text-dark-500">{translateText('This video cannot be embedded right now.')}</p>
            <a
              href={video.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm link-primary"
            >
              {translateText('Open on Facebook')} <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="h-full max-w-full aspect-[9/16]">
          <iframe
            title={video.title || 'Video'}
            src={embedConfig.src}
            className="w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            loading={isActive ? 'eager' : 'lazy'}
            referrerPolicy="origin-when-cross-origin"
            onError={() => setFailedEmbeds((prev) => (prev[video.id] ? prev : { ...prev, [video.id]: true }))}
          />
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
              onTouchStart={handleReelsTouchStart}
              onTouchMove={handleReelsTouchMove}
              onTouchEnd={handleReelsTouchEnd}
              onScroll={handleReelsScroll}
              onTouchCancel={() => { touchActiveRef.current = false; }}
              className="relative h-[100dvh] overflow-y-scroll no-scrollbar overscroll-y-none touch-pan-y snap-y snap-mandatory bg-black sm:rounded-2xl sm:border sm:border-dark-800 sm:shadow-xl"
            >
              <div className="pointer-events-none sticky top-0 z-30 h-0">
                <div className="pointer-events-auto flex items-center justify-between p-3">
                  <Link
                    to="/"
                    data-reels-control="true"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/70 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    {translateText('Back')}
                  </Link>
                  <Link
                    to="/articles"
                    data-reels-control="true"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/70 transition-colors"
                  >
                    {translateText('News')}
                  </Link>
                </div>
              </div>

              {videos.map((video) => (
                <article
                  key={video.id}
                  className="relative h-[100dvh] snap-start snap-always"
                >
                  {renderVideoEmbed(video, { isActive: videos[activeReelIndex]?.id === video.id })}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-4 pt-10 text-white">
                    {video.category?.name && (
                      <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-white/15 text-white backdrop-blur">
                        {video.category.name}
                      </span>
                    )}
                    {video.slug ? (
                      <Link to={`/article/${video.slug}`} data-reels-control="true">
                        <h2 className="mt-2 text-base font-semibold text-white headline-hover">
                          {video.title}
                        </h2>
                      </Link>
                    ) : (
                      <h2 className="mt-2 text-base font-semibold text-white">
                        {video.title}
                      </h2>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/75">
                      <a
                        href={video.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-reels-control="true"
                        className="inline-flex items-center gap-1 text-primary-300 hover:text-primary-200"
                      >
                        {translateText('Open on Facebook')} <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <span>{formatRelativeTime(video.publishedAt)}</span>
                    </div>
                  </div>
                </article>
              ))}

              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4 text-xs text-white/80 bg-black/70">
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
    const isMobile = device === 'mobile';
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
