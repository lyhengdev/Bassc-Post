import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Zap, Calendar, Clock, Eye, Facebook, Twitter, Linkedin, ArrowLeft, Search, Eye as EyeIcon, EyeOff, TrendingUp, Star, Mail, MessageCircle, ThumbsUp, Reply, Send, Trash2, User, Camera, CheckCircle, Link2, Globe2, ShieldCheck, Target, Users2, PenSquare, Newspaper, MapPin, Phone, ArrowUpRight } from 'lucide-react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useFeaturedArticles, useLatestArticles, useCategories, useArticles, useArticleBySlug, useArticleById, useArticlesByCategory, useRelatedArticles, useLogin, useRegister, useSubmitContact, usePublicSettings, useCreateComment, useLikeComment, useDeleteComment, useSubscribeNewsletter, useUpdateProfile } from '../../hooks/useApi';
import { useArticleAds, useHomepageAds, useBetweenSectionAds, useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';
import { articlesAPI, commentsAPI, usersAPI, newsletterAPI } from '../../services/api';
import { ArticleCard, ArticleContent } from '../../components/article/index.jsx';
import { Button, Avatar, Badge, ContentLoader, ArticleListSkeleton, ArticleDetailSkeleton, Input, Textarea, ConfirmModal } from '../../components/common/index.jsx';
import { BodyAd } from '../../components/ads/index.js';
import { BetweenSectionsSlot } from '../../components/ads/BetweenSectionsSlot.jsx';
import { InlineAdGroup, createAdTracker, getSectionIndexAfterRows } from '../../components/ads/inlineAds.jsx';
import { buildApiUrl, buildMediaUrl, formatDate, cn, formatRelativeTime, getCategoryAccent } from '../../utils';
import { useAuthStore } from '../../stores/authStore';

// Dynamic Section Components

const HOME_TYPE = {
    eyebrow: 'text-[11px] sm:text-xs uppercase tracking-[0.24em] text-dark-400',
    sectionTitle: 'text-xl sm:text-2xl lg:text-3xl font-bold text-dark-900 dark:text-white',
    sectionSubtitle: 'text-sm sm:text-base text-dark-500',
    bigTitle: 'text-2xl sm:text-2xl lg:text-2xl font-bold text-dark-900 dark:text-white mt-1 leading-snug headline-hover line-clamp-2',
    bigTitleOnDark: 'text-2xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 leading-snug line-clamp-2 drop-shadow',
    body: 'text-sm sm:text-base text-dark-600 dark:text-dark-400',
    meta: 'text-xs sm:text-sm text-dark-400',
    cardTitle: 'text-base sm:text-lg lg:text-xl font-semibold text-dark-900 dark:text-white',
    cardTitleAll: 'text-base sm:text-lg lg:text-lg font-semibold text-dark-900 dark:text-white mt-1 leading-snug headline-hover line-clamp-2',
};

const SectionHeader = ({ eyebrow, title, subtitle, link, linkText = 'View all' }) => (
    <div className="flex items-end justify-between mb-5">
        <div>
            <p className={HOME_TYPE.eyebrow}>{eyebrow || 'Section'}</p>
            <h2 className={`${HOME_TYPE.sectionTitle} mt-1 leading-tight`}>
              {title}
            </h2>
            {subtitle && <p className={`${HOME_TYPE.sectionSubtitle} mt-1 max-w-xl`}>{subtitle}</p>}
        </div>
        {link && (
            <Link to={link} className="text-sm font-medium flex items-center gap-1 link-muted">
                {linkText} <ArrowRight className="w-4 h-4" />
            </Link>
        )}
    </div>
);

// ==================== MIXED LEAD + LIST LAYOUT ====================
function MixedLeadList({
  articles,
  isLoading,
  emptyMessage,
  listTitle,
  leadAspectClass = 'aspect-[16/10]',
  showCategory = true,
}) {
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-7">
                        <div className={cn(leadAspectClass, 'skeleton rounded-lg')} />
                    </div>
                    <div className="col-span-5 space-y-3">
                        <div className="h-3 skeleton rounded w-1/3" />
                        <div className="h-6 skeleton rounded" />
                        <div className="h-4 skeleton rounded w-5/6" />
                        <div className="h-4 skeleton rounded w-2/3" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-[120px] h-[80px] skeleton rounded-lg flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 skeleton rounded w-1/3" />
                                <div className="h-4 skeleton rounded" />
                                <div className="h-3 skeleton rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!articles?.length) {
        return <p className="text-dark-500 text-center py-8">{emptyMessage || 'No news available'}</p>;
    }

    const [lead, ...rest] = articles;

    return (
        <div className="space-y-6">
            <article className="grid grid-cols-12 gap-4">
                <Link to={`/article/${lead.slug}`} className="col-span-7 block group">
                    <div className={cn(leadAspectClass, 'rounded-lg overflow-hidden')}>
                        <img loading="lazy"
                            src={buildMediaUrl(lead.featuredImage) || `https://picsum.photos/seed/${lead.slug}/800/500`}
                            alt={lead.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </Link>
                <div className="col-span-5">
                    {showCategory && lead.category && (
                        <Link
                            to={`/category/${lead.category.slug}`}
                            className="text-xs sm:text-xs font-semibold uppercase tracking-wider hover:underline"
                            style={{ color: lead.category.color || '#6B7280' }}
                        >
                            {lead.category.name}
                        </Link>
                    )}
                    <Link to={`/article/${lead.slug}`}>
                        <h3 className={HOME_TYPE.bigTitle}>
                            {lead.title}
                        </h3>
                    </Link>
                    {lead.excerpt && (
                        <p className={`${HOME_TYPE.body} mt-2 sm:mt-3 line-clamp-3`}>{lead.excerpt}</p>
                    )}
                    <span className={`${HOME_TYPE.meta} mt-2 sm:mt-3 block`}>{formatRelativeTime(lead.publishedAt)}</span>
                </div>
            </article>

            {listTitle && rest.length > 0 && (
                <div className="text-xs uppercase tracking-widest text-dark-500">{listTitle}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rest.map((article) => (
                    <article key={article._id} className="flex gap-4 group">
                        <Link to={`/article/${article.slug}`} className="flex-shrink-0">
                            <img loading="lazy"
                                src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/240/160`}
                                alt={article.title}
                                className="w-24 h-16 sm:w-[120px] sm:h-[80px] object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                            />
                        </Link>
                        <div className="flex-1 min-w-0">
                            {showCategory && article.category && (
                                <Link
                                    to={`/category/${article.category.slug}`}
                                    className="text-xs sm:text-xs font-semibold uppercase tracking-wider hover:underline"
                                    style={{ color: article.category.color || '#6B7280' }}
                                >
                                    {article.category.name}
                                </Link>
                            )}
                            <Link to={`/article/${article.slug}`}>
                                <h4 className={HOME_TYPE.cardTitleAll}>
                                    {article.title}
                                </h4>
                            </Link>
                            {article.excerpt && (
                                <p className="text-dark-500 text-xs sm:text-xs mt-1 line-clamp-2">{article.excerpt}</p>
                            )}
                            <span className={`${HOME_TYPE.meta} mt-1 block`}>{formatRelativeTime(article.publishedAt)}</span>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

// ==================== FEATURED SECTION ====================
function FeaturedSection({ section }) {
    const rawLimit = Number(section?.settings?.limit);
    const baseLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 8;
    const rawSkip = Number(section?.settings?.skip);
    const skip = Number.isFinite(rawSkip) ? Math.max(0, rawSkip) : 3;
    const rawVisibleCount = Number(section?.settings?.displayCount);
    const visibleCount = Number.isFinite(rawVisibleCount) && rawVisibleCount > 0
      ? Math.max(4, rawVisibleCount)
      : Math.min(Math.max(baseLimit, 6), 12);
    const queryLimit = Math.max(baseLimit, skip + visibleCount);

    const { data: featured, isLoading } = useFeaturedArticles(queryLimit);
    const articles = featured || [];
    const pool = articles.slice(skip);
    const desiredCount = Math.min(visibleCount, articles.length);
    const selectionBase = pool.length >= desiredCount ? pool : articles;
    const selection = selectionBase.slice(0, visibleCount);
    const lead = selection[0];
    const highlights = selection.slice(1, 3);
    const moreItems = selection.slice(3);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
                <div className="xl:col-span-7 rounded-3xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 sm:p-5 space-y-4">
                    <div className="aspect-[16/9] skeleton rounded-2xl" />
                    <div className="h-3 skeleton rounded w-24" />
                    <div className="h-8 skeleton rounded w-5/6" />
                    <div className="h-4 skeleton rounded w-full" />
                    <div className="h-4 skeleton rounded w-4/5" />
                </div>
                <div className="xl:col-span-5 space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-3 sm:p-4 flex gap-3">
                            <div className="w-24 h-20 sm:w-28 sm:h-24 skeleton rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 skeleton rounded w-24" />
                                <div className="h-5 skeleton rounded w-full" />
                                <div className="h-4 skeleton rounded w-4/5" />
                            </div>
                        </div>
                    ))}
                    <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-4 skeleton rounded w-full" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!articles.length) {
        return <p className="text-dark-500 text-center py-8">No featured news. Mark news as featured in the dashboard.</p>;
    }

    if (!lead) {
        return <p className="text-dark-500 text-center py-8">No additional featured news available.</p>;
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
            <article className="xl:col-span-7 rounded-3xl overflow-hidden border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900">
                <Link to={`/article/${lead.slug}`} className="block group">
                    <div className="aspect-[16/9] overflow-hidden">
                        <img
                            loading="lazy"
                            src={buildMediaUrl(lead.featuredImage) || `https://picsum.photos/seed/${lead.slug}/1200/700`}
                            alt={lead.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                    <div className="p-5 sm:p-6">
                        <p className="text-xs uppercase tracking-[0.24em] text-dark-400">Featured</p>
                        <h3 className={HOME_TYPE.bigTitle}>
                            {lead.title}
                        </h3>
                        {lead.excerpt && (
                            <p className="text-sm text-dark-600 dark:text-dark-400 mt-2 line-clamp-3">{lead.excerpt}</p>
                        )}
                        <span className="text-xs text-dark-400 mt-3 inline-block">
                          {formatRelativeTime(lead.publishedAt)}
                        </span>
                    </div>
                </Link>
            </article>

            <div className="xl:col-span-5 space-y-4">
                {highlights.map((article) => (
                    <Link
                        key={article._id}
                        to={`/article/${article.slug}`}
                        className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-3 sm:p-4 flex gap-3 hover:shadow-lg transition-shadow"
                    >
                        <img
                            loading="lazy"
                            src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/600/400`}
                            alt={article.title}
                            className="w-24 h-20 sm:w-28 sm:h-24 object-cover rounded-xl flex-shrink-0"
                        />
                        <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.24em] text-dark-400">Highlight</p>
                            <p className={cn(HOME_TYPE.cardTitleAll, 'mt-1 line-clamp-2')}>
                                {article.title}
                            </p>
                            <span className="text-xs text-dark-400 mt-1 inline-block">{formatRelativeTime(article.publishedAt)}</span>
                        </div>
                    </Link>
                ))}

                {moreItems.length > 0 && (
                    <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-dark-400">More Featured</p>
                            <span className="text-xs text-dark-400">{moreItems.length} more</span>
                        </div>
                        <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                            {moreItems.map((article) => (
                                <article key={article._id} className="flex items-start gap-3">
                                    <span className="text-xs text-dark-400 mt-1">•</span>
                                    <div className="min-w-0">
                                        <Link to={`/article/${article.slug}`}>
                                            <h4 className={cn(HOME_TYPE.cardTitleAll, 'line-clamp-2')}>{article.title}</h4>
                                        </Link>
                                        <span className="text-xs text-dark-400">{formatRelativeTime(article.publishedAt)}</span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==================== BREAKING NEWS SECTION ====================
function BreakingNewsSection({ section, extraArticles = [], excludeArticles = [], isHeroLoading = false }) {
  const desiredItems = 6;
  const fetchLimit = Math.max(section.settings?.limit || 6, desiredItems * 3);
  const {data, isLoading} = useArticles({page: 1, limit: fetchLimit, isBreaking: true});
  const breakingArticles = data?.data?.articles || [];
  const normalizeText = (value) => {
    const base = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return base.replace(/[\s\-:#]*\d+$/g, '').trim();
  };
  const getArticleKey = (article) => article?._id || article?.slug || normalizeText(article?.title);
  const getTitleKey = (article) => normalizeText(article?.title);
  const excludeIds = new Set(excludeArticles.map((article) => getArticleKey(article)).filter(Boolean));
  const excludeTitles = new Set(excludeArticles.map((article) => getTitleKey(article)).filter(Boolean));
  const filteredBreaking = breakingArticles.filter((article) => {
    const key = getArticleKey(article);
    const titleKey = getTitleKey(article);
    return key && !excludeIds.has(key) && !excludeTitles.has(titleKey);
  });
  const merged = [...extraArticles, ...filteredBreaking];
  const seenKeys = new Set();
  const seenTitles = new Set();
  const articles = merged.filter((article) => {
    if (!article) return false;
    const key = getArticleKey(article);
    const titleKey = getTitleKey(article);
    if (seenKeys.has(key) || seenTitles.has(titleKey)) {
      return false;
    }
    seenKeys.add(key);
    seenTitles.add(titleKey);
    return true;
  });
  const tickerItems = articles.slice(0, 3);
  const cards = articles.slice(3, 6);

  if (isLoading || isHeroLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 skeleton rounded-lg"/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 skeleton rounded-lg"/>
          ))}
        </div>
      </div>
    );
  }

  if (!articles.length) {
    return <p className="text-dark-500 text-center py-8">No breaking news in the dashboard.</p>;
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        <span className="font-bold uppercase tracking-widest text-xs">Breaking</span>
        <div className="flex flex-wrap gap-3 text-dark-700">
          {tickerItems.map((item) => (
            <Link key={item._id} to={`/article/${item.slug}`} className="hover:text-red-600">
              {item.title}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-col md:flex-none md:flex-row md:grid-cols-3 gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {cards.map((article) => (
          <Link
            key={article._id}
            to={`/article/${article.slug}`}
            className="rounded-xl border border-red-100 bg-white dark:bg-dark-900 p-4 hover:border-red-300 transition-colors flex  gap-3"
          >
            <div className="flex items-center gap-3 ">
              <img
                loading="lazy"
                src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/120/120`}
                alt={article.title}
                className="min-w-16 min-h-16 max-h-16 rounded-lg object-cover"
              />
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600 hidden md:display">Alert</p>
            </div> <div className="flex w-full gap-3 justify-between">
            <h3 className={HOME_TYPE.cardTitleAll}>
              {article.title}
            </h3>
            <p className="text-xs text-dark-500 mt-2">{formatRelativeTime(article.createdAt)}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );

}
// ==================== BREAKING HERO LAYOUT ====================
function BreakingHeroSection({ section }) {
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 6, isBreaking: true });
    const articles = data?.data?.articles || [];
    const mainBreaking = articles[0];
    const sideBreaking = articles.slice(1, 3);

    if (isLoading) {
        return (
            <div className="grid grid-cols-12 gap-4 sm:gap-6">
                <div className="col-span-7">
                    <div className="space-y-3">
                        <div className="aspect-[4/3] skeleton rounded-lg" />
                        <div className="h-4 skeleton rounded w-3/4" />
                        <div className="h-8 skeleton rounded" />
                    </div>
                </div>
                <div className="col-span-5 space-y-4 sm:space-y-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <div className="aspect-[16/10] skeleton rounded-lg" />
                            <div className="h-5 skeleton rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!mainBreaking) {
        return (
            <div className="aspect-[4/3] rounded-lg bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
                <p className="text-dark-500">No breaking news yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                <div className="xl:col-span-8 lg:col-span-7">
                    <article className="relative overflow-hidden rounded-3xl border border-dark-100 dark:border-dark-800 h-full w-full">
                        <Link to={`/article/${mainBreaking.slug}`} className="block group h-full w-full">
                            <div className="aspect-[16/9] overflow-hidden h-full w-full">
                                <img
                                    loading="lazy"
                                    src={buildMediaUrl(mainBreaking.featuredImage) || `https://picsum.photos/seed/${mainBreaking.slug}/1400/800`}
                                    alt={mainBreaking.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Breaking</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    {mainBreaking.category && (
                                        <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                                            {mainBreaking.category.name}
                                        </span>
                                    )}
                                    <span className="text-xs text-white/70">{formatRelativeTime(mainBreaking.publishedAt)}</span>
                                </div>
                                <h2 className={HOME_TYPE.bigTitleOnDark}>
                                    {mainBreaking.title}
                                </h2>
                                <p className="text-sm sm:text-base text-white/85 mt-2 line-clamp-2 max-w-2xl">
                                    {mainBreaking.excerpt}
                                </p>
                            </div>
                        </Link>
                    </article>
                </div>

                <div className="xl:col-span-4 lg:col-span-5 space-y-4">
                    {sideBreaking.map((article, index) => (
                        <article key={article._id} className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-3 flex gap-3 hover:shadow-lg transition-shadow">
                            <Link to={`/article/${article.slug}`} className="block flex-shrink-0">
                                <img
                                    loading="lazy"
                                    src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/240/240`}
                                    alt={article.title}
                                    className="w-20 h-20 object-cover rounded-xl"
                                />
                            </Link>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-dark-400">#{index + 2}</span>
                                    {article.category && (
                                        <span
                                            className="text-xs sm:text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: article.category.color || getCategoryAccent(article.category.name) }}
                                        >
                                            {article.category.name}
                                        </span>
                                    )}
                                </div>
                                <Link to={`/article/${article.slug}`}>
                                <h3 className={HOME_TYPE.cardTitleAll}>
                                    {article.title}
                                </h3>
                                </Link>
                                <span className={`${HOME_TYPE.meta}`}>{formatRelativeTime(article.publishedAt)}</span>
                            </div>
                        </article>
                    ))}
                    <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-gradient-to-br from-primary-600 to-primary-800 text-white p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-white/70">Quick Update</p>
                        <p className="text-sm mt-2 text-white/90">Fresh headlines drop every hour. Stay ahead with real-time coverage.</p>
                    </div>
                </div>
            </div>

            <BreakingNewsSection section={section} excludeArticles={[mainBreaking, ...sideBreaking]} />
        </div>
    );
}

// ==================== LATEST SECTION ====================
function LatestSection({ section, excludeArticleIds = [], onArticlesResolved }) {
    const navigate = useNavigate();
    const initialLimit = Number.isFinite(Number(section.settings?.limit))
        ? Math.max(1, Number(section.settings.limit))
        : 8;
    const [limit, setLimit] = useState(initialLimit);
    useEffect(() => setLimit(initialLimit), [initialLimit]);
    const fetchLimit = Math.min(
      Math.max(limit + (excludeArticleIds?.length || 0), limit),
      Math.max(limit * 4, 24)
    );
    const { data: latest, isLoading, isFetching } = useLatestArticles(fetchLimit);
    const allArticles = latest || [];
    const exclusionSet = new Set((excludeArticleIds || []).filter(Boolean));
    const filteredArticles = allArticles.filter((article) => article?._id && !exclusionSet.has(article._id));
    const articles = filteredArticles.slice(0, limit);
    const lead = articles[0];
    const list = articles.slice(1);

    useEffect(() => {
      if (!onArticlesResolved) return;
      onArticlesResolved(articles.map((article) => article?._id).filter(Boolean));
    }, [articles, onArticlesResolved]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="aspect-[16/9] skeleton rounded-lg mb-3" />
                    <div className="h-4 skeleton rounded w-2/3 mb-2" />
                    <div className="h-3 skeleton rounded w-5/6" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex gap-3">
                            <div className="w-20 h-14 skeleton rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 skeleton rounded w-5/6" />
                                <div className="h-3 skeleton rounded w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!articles.length) {
        return <p className="text-dark-500 text-center py-8">No news published yet</p>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <article className="lg:col-span-3">
                    <Link to={`/article/${lead.slug}`} className="block group">
                        <div className="aspect-[16/9] rounded-xl overflow-hidden mb-3">
                            <img
                                loading="lazy"
                                src={buildMediaUrl(lead.featuredImage) || `https://picsum.photos/seed/${lead.slug}/900/500`}
                                alt={lead.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </Link>
                    {lead.category && (
                        <Link
                            to={`/category/${lead.category.slug}`}
                            className="text-xs sm:text-xs font-semibold uppercase tracking-wider hover:underline"
                            style={{ color: lead.category.color || getCategoryAccent(lead.category.name) }}
                        >
                            {lead.category.name}
                        </Link>
                    )}
                    <Link to={`/article/${lead.slug}`}>
                        <h3 className={HOME_TYPE.bigTitle}>
                            {lead.title}
                        </h3>
                    </Link>
                    {lead.excerpt && (
                        <p className="text-dark-600 dark:text-dark-400 text-sm lg:text-base mt-2 line-clamp-3">{lead.excerpt}</p>
                    )}
                    <span className="text-dark-400 text-xs sm:text-sm mt-2 block">{formatRelativeTime(lead.publishedAt)}</span>
                </article>
                <div className="lg:col-span-2 flex flex-col gap-3 ">
                    {list.map((article) => (
                        <article key={article._id} className="flex gap-3">
                            <Link to={`/article/${article.slug}`} className="flex-shrink-0">
                                <img
                                    loading="lazy"
                                    src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/200/140`}
                                    alt={article.title}
                                    className="w-28 h-16 object-cover rounded-lg"
                                />
                            </Link>
                            <div className="min-w-0">
                                <Link to={`/article/${article.slug}`}>
                                    <h4 className="text-base sm:text-lg lg:text-lg font-semibold text-dark-900 dark:text-white mt-1 leading-snug headline-hover line-clamp-2">
                                        {article.title}
                                    </h4>
                                </Link>
                                <span className="text-xs sm:text-sm text-dark-400">{formatRelativeTime(article.publishedAt)}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
            {filteredArticles.length >= limit && (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/articles')}
                        isLoading={isFetching}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                        See more
                    </Button>
                </div>
            )}
        </div>
    );
}

// ==================== CATEGORY GRID SECTION ====================
function CategoryGridSection({ section }) {
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 18 });
    const articles = data?.data?.articles || [];
    const grouped = articles.reduce((acc, article) => {
        const key = article.category?._id || 'uncategorized';
        if (!acc[key]) {
            acc[key] = { category: article.category, items: [] };
        }
        if (acc[key].items.length < 2) acc[key].items.push(article);
        return acc;
    }, {});
    const blocks = Object.values(grouped).slice(0, 6);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-36 skeleton rounded-xl" />
                ))}
            </div>
        );
    }

    if (!blocks.length) {
        return <p className="text-dark-500 text-center py-8">No news published yet</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {blocks.map((block) => (
                <div
                    key={block.category?._id || block.items[0]?._id}
                    className="rounded-xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span
                            className="text-xs sm:text-sm font-semibold uppercase tracking-widest"
                            style={{ color: block.category?.color || '#6B7280' }}
                        >
                            {block.category?.name || 'Uncategorized'}
                        </span>
                        {block.category?.slug && (
                            <Link to={`/category/${block.category.slug}`} className="text-xs sm:text-sm link-muted">
                                View →
                            </Link>
                        )}
                    </div>
                    <div className="space-y-3">
                        {block.items.map((article, index) => (
                            <Link key={article._id} to={`/article/${article.slug}`} className="block">
                                <div className={`flex items-start gap-3 ${index === 0 ? '' : 'pl-1'}`}>
                                    {index === 0 && (
                                        <img
                                            loading="lazy"
                                            src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/120/120`}
                                            alt={article.title}
                                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                        />
                                    )}
                                    <p className={HOME_TYPE.cardTitleAll}>
                                        {article.title}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==================== TRENDING SECTION ====================
function TrendingSection({ section }) {
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 6, sort: '-viewCount' });
    const articles = data?.data?.articles || [];
    const lead = articles[0];
    const list = articles.slice(1);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="aspect-[16/7] skeleton rounded-xl" />
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-4 skeleton rounded w-5/6" />
                    ))}
                </div>
            </div>
        );
    }

    if (!articles.length) {
        return <p className="text-dark-500 text-center py-8">No trending news</p>;
    }

    return (
        <div className="space-y-5">
            {lead && (
                <article className="rounded-xl overflow-hidden border border-dark-100 dark:border-dark-800">
                    <Link to={`/article/${lead.slug}`} className="block group">
                        <div className="aspect-[16/7]">
                            <img
                                loading="lazy"
                                src={buildMediaUrl(lead.featuredImage) || `https://picsum.photos/seed/${lead.slug}/900/500`}
                                alt={lead.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-4">
                            <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary-600">#1 Trending</p>
                            <h3 className={HOME_TYPE.bigTitle}>
                                {lead.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-dark-400 mt-2">{lead.viewCount || 0} views</p>
                        </div>
                    </Link>
                </article>
            )}
            <div className="space-y-3">
                {list.map((article, index) => (
                    <Link key={article._id} to={`/article/${article.slug}`} className="flex items-start gap-3">
                        <span className="text-sm lg:text-base font-bold text-dark-400 w-6">#{index + 2}</span>
                        <img
                            loading="lazy"
                            src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/120/120`}
                            alt={article.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0"
                        />
                        <div>
                            <p className={HOME_TYPE.cardTitleAll}>
                                {article.title}
                            </p>
                            <p className="text-xs sm:text-sm text-dark-400">{article.viewCount || 0} views</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

// ==================== NEWS LIST SECTION ====================
function NewsListSection({ section, excludeArticleIds = [], onArticlesResolved }){
    const initialLimit = Number.isFinite(Number(section.settings?.limit))
        ? Math.max(1, Number(section.settings.limit))
        : 8;
    const [limit, setLimit] = useState(initialLimit);
    useEffect(() => setLimit(initialLimit), [initialLimit]);
    const fetchLimit = Math.min(
      Math.max(limit + (excludeArticleIds?.length || 0), limit),
      Math.max(limit * 4, 24)
    );
    const { data, isLoading, isFetching } = useArticles({
        page: 1,
        limit: fetchLimit,
        category: section.settings?.category || undefined
    }, { placeholderData: keepPreviousData });
    const allArticles = data?.data?.articles || [];
    const exclusionSet = new Set((excludeArticleIds || []).filter(Boolean));
    const filteredArticles = allArticles.filter((article) => article?._id && !exclusionSet.has(article._id));
    const articles = filteredArticles.slice(0, limit);
    const isLoadingMore = isFetching && !isLoading;

    useEffect(() => {
      if (!onArticlesResolved) return;
      onArticlesResolved(articles.map((article) => article?._id).filter(Boolean));
    }, [articles, onArticlesResolved]);

    return (
        <div className="space-y-6">
            <MixedLeadList
                articles={articles}
                isLoading={isLoading}
                emptyMessage="No news published yet"
                showCategory={false}
            />
            {isLoadingMore && (
                <div className="rounded-xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4 space-y-3">
                    {[1, 2, 3].map((idx) => (
                        <div key={idx} className="flex gap-3">
                            <div className="w-20 h-14 skeleton rounded-lg flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 skeleton rounded w-11/12" />
                                <div className="h-3 skeleton rounded w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {filteredArticles.length >= limit && (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => setLimit((prev) => prev + initialLimit)}
                        isLoading={isLoadingMore}
                    >
                        See more
                    </Button>
                </div>
            )}
        </div>
    );
}

// ==================== GRID WITH SIDEBAR SECTION ====================
function GridWithSidebarSection({ section }) {
    const { data, isLoading } = useArticles({
        page: 1,
        limit: section.settings?.limit || 7
    });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No news published yet"
            listTitle={section.settings?.sidebarTitle || 'More Stories'}
        />
    );
}

// ==================== FEATURED + LIST SECTION (Magazine Layout) ====================
function MagazineLayoutSection({ section }) {
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 5 });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No news published yet"
        />
    );
}

// ==================== CATEGORY TABS SECTION ====================
function CategoryTabsSection({ section }) {
    const { data: categoriesData } = useCategories();
    const categories = categoriesData?.slice(0, 5) || [];
    const [activeTab, setActiveTab] = useState(0);

    const { data, isLoading } = useArticles({
        page: 1,
        limit: section.settings?.limit || 4,
        category: categories[activeTab]?.slug || undefined
    });
    const articles = data?.data?.articles || [];

    if (!categories.length) return null;

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
                {categories.map((cat, i) => (
                    <button
                        key={cat._id}
                        onClick={() => setActiveTab(i)}
                        className={cn(
                            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                            activeTab === i
                                ? 'bg-primary-600 text-white'
                                : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400 hover:bg-dark-200 dark:hover:bg-dark-700'
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
            <MixedLeadList
                articles={articles}
                isLoading={isLoading}
                emptyMessage="No news published yet"
            />
        </div>
    );
}

// ==================== AD BANNER SECTION ====================
function AdBannerSection({ section }) {
    const device = useDeviceType();
    const { mutate: trackAdEvent } = useTrackAdEvent();
    const placement = section.settings?.placement || 'custom';
    const placementId = section.settings?.placementId || section.id;
    const adId = section.settings?.adId;
    const { data: ads } = useSelectAds(placement, {
        pageType: 'homepage',
        device,
        placementId: placement === 'custom' ? placementId : undefined,
        adId: adId || undefined,
        limit: 1,
    });

    const ad = ads?.[0];
    const fallbackImage = section.settings?.fallbackImageUrl;
    const fallbackLink = section.settings?.fallbackLinkUrl || '#';
    const showLabel = section.settings?.showLabel ?? true;
    const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';

    if (ad) {
        return (
            <div className="my-6">
                <BodyAd
                    ad={ad}
                    placementOverride={placement}
                    onImpression={(adData) => trackAdEvent({
                        adId: adData._id,
                        type: 'impression',
                        pageType: 'homepage',
                        pageUrl,
                        device,
                        placement: adData.placement
                    })}
                    onClick={(adData, meta) => trackAdEvent({
                        adId: adData._id,
                        type: 'click',
                        pageType: 'homepage',
                        pageUrl,
                        device,
                        placement: adData.placement,
                        eventTimestamp: meta?.eventTimestamp
                    })}
                />
            </div>
        );
    }

    if (!fallbackImage) {
        return (
            <div className="bg-dark-100 dark:bg-dark-800 rounded-xl flex items-center justify-center text-dark-400 text-sm h-24 sm:h-32">
                <span>{showLabel ? 'Advertisement' : 'Ad Slot'}</span>
            </div>
        );
    }

    return (
        <a href={fallbackLink} target="_blank" rel="noopener noreferrer sponsored" className="block">
            <img loading="lazy"
                src={buildMediaUrl(fallbackImage)}
                alt="Advertisement"
                className="w-full object-cover rounded-xl h-24 sm:h-32"
            />
        </a>
    );
}

// ==================== VIDEO SECTION ====================
function VideoSection({ section }) {
    const { data, isLoading } = useArticles({
        page: 1,
        limit: section.settings?.limit || 4,
        hasVideo: true
    });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No videos published yet"
        />
    );
}

// ==================== OPINION/EDITORS PICK SECTION ====================
function EditorPicksSection({ section }) {
    const { data, isLoading } = useArticles({
        page: 1,
        limit: section.settings?.limit || 4,
        isFeatured: true
    });
    const articles = data?.data?.articles || [];
    const lead = articles[0];
    const list = articles.slice(1, 4);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="aspect-[4/3] skeleton rounded-xl" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 skeleton rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (!articles.length) {
        return <p className="text-dark-500 text-center py-8">No editor picks available</p>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <article className="lg:col-span-2">
                <Link to={`/article/${lead.slug}`} className="block group">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3">
                        <img
                            loading="lazy"
                            src={buildMediaUrl(lead.featuredImage) || `https://picsum.photos/seed/${lead.slug}/900/700`}
                            alt={lead.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </Link>
                <h3 className={HOME_TYPE.bigTitle}>
                    {lead.title}
                </h3>
                {lead.excerpt && (
                    <p className="text-sm text-dark-600 dark:text-dark-400 mt-2 line-clamp-3">{lead.excerpt}</p>
                )}
            </article>
            <div className="space-y-4">
                {list.map((article) => (
                    <Link key={article._id} to={`/article/${article.slug}`} className="flex gap-3">
                        <img
                            loading="lazy"
                            src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/200/200`}
                            alt={article.title}
                            className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div>
                            <p className={HOME_TYPE.cardTitleAll}>
                                {article.title}
                            </p>
                            <span className="text-xs text-dark-400">{formatRelativeTime(article.publishedAt)}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function NewsletterSection({ section }) {
  const [email, setEmail] = useState('');
  const { mutate: subscribe, isPending, isSuccess } = useSubscribeNewsletter();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    subscribe({ email, source: 'website' }, {
      onSuccess: () => setEmail(''),
    });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 lg:p-12">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-xl mx-auto text-center">
        <Mail className="w-12 h-12 text-white/80 mx-auto mb-4" />
        <h2 className="font-display text-2xl sm:text-2xl font-bold text-white mb-4">{section.title || 'Subscribe to Our Newsletter'}</h2>
        <p className="text-white/80 mb-6">{section.subtitle || 'Get the latest news delivered to your inbox'}</p>
        {isSuccess ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <p className="text-white font-medium">Thank you for subscribing! Please check your email to confirm.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-xl text-dark-900"
              required
              disabled={isPending}
            />
            <Button type="submit" className="bg-white text-primary-600 hover:bg-dark-100" disabled={isPending}>
              {isPending ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function CustomHtmlSection({ section }) {
  if (!section.settings?.customHtml) return null;

  return (
    <div dangerouslySetInnerHTML={{ __html: section.settings.customHtml }} />
  );
}

// ==================== CATEGORY SPOTLIGHT SECTION ====================
function CategorySpotlightSection({ section }) {
  const categorySlug = section.settings?.categorySlug || '';
  const { data, isLoading } = useArticlesByCategory(categorySlug, { page: 1, limit: section.settings?.limit || 4 });
  const articles = data?.data?.articles || [];
  const category = articles[0]?.category;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 skeleton rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!articles.length) {
    return <p className="text-dark-500 text-center py-8">No news in this category yet</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-dark-400 mb-1">Spotlight</p>
          <h3 className="text-lg font-bold text-dark-900 dark:text-white">
            {category?.name || 'Category'}
          </h3>
          <p className="text-sm text-dark-500">Power, policy, and people shaping the week.</p>
        </div>
        {categorySlug && (
          <Link to={`/category/${categorySlug}`} className="text-sm link-primary">
            More →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {articles.slice(0, 4).map((article) => (
          <Link key={article._id} to={`/article/${article.slug}`} className="group">
            <div className="aspect-[16/10] rounded-xl overflow-hidden mb-2">
              <img
                loading="lazy"
                src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/600/400`}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <h4 className={HOME_TYPE.cardTitleAll}>
              {article.title}
            </h4>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Render dynamic section based on type
function DynamicSection({ section, excludeArticleIds = [], onArticlesResolved }) {
  switch (section.type) {
    case 'hero':
      return null;

    case 'featured_articles':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Featured" title={section.title} subtitle={section.subtitle} link="/articles" />}
          <FeaturedSection section={section} />
        </div>
      );

    case 'latest_articles':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Latest" title={section.title} subtitle={section.subtitle} link="/articles" />}
          <LatestSection
            section={section}
            excludeArticleIds={excludeArticleIds}
            onArticlesResolved={onArticlesResolved}
          />
        </div>
      );

    case 'category_grid':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Categories" title={section.title} subtitle={section.subtitle} link="/categories" />}
          <CategoryGridSection section={section} />
        </div>
      );

    case 'trending':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Trending" title={section.title} subtitle={section.subtitle} />}
          <TrendingSection section={section} />
        </div>
      );

    case 'newsletter_signup':
      return null;

    case 'custom_html':
      return <CustomHtmlSection section={section} />;

    case 'breaking_news':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Breaking" title={section.title} subtitle={section.subtitle} />}
          <BreakingHeroSection section={section} />
        </div>
      );

    case 'news_list':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="News" title={section.title} subtitle={section.subtitle} link="/articles" />}
          <NewsListSection
            section={section}
            excludeArticleIds={excludeArticleIds}
            onArticlesResolved={onArticlesResolved}
          />
        </div>
      );

    case 'grid_with_sidebar':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Stories" title={section.title} subtitle={section.subtitle} link="/articles" />}
          <GridWithSidebarSection section={section} />
        </div>
      );

    case 'magazine_layout':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Magazine" title={section.title} subtitle={section.subtitle} link="/articles" />}
          <MagazineLayoutSection section={section} />
        </div>
      );

    case 'category_tabs':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Categories" title={section.title} subtitle={section.subtitle} />}
          <CategoryTabsSection section={section} />
        </div>
      );

    case 'ad_banner':
      return null;

    case 'video':
      return null;

    case 'editor_picks':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Editors" title={section.title} subtitle={section.subtitle} />}
          <EditorPicksSection section={section} />
        </div>
      );

    case 'category_spotlight':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow="Spotlight" title={section.title} subtitle={section.subtitle} link={section.settings?.categorySlug ? `/category/${section.settings.categorySlug}` : '/articles'} />}
          <CategorySpotlightSection section={section} />
        </div>
      );

    default:
      return null;
  }
}

const SidebarAdSlot = ({ ads = [], ad, pageType, pageUrl, device, trackAdEvent }) => {
  const list = Array.isArray(ads) && ads.length ? ads : ad ? [ad] : [];
  return (
    <div className="pr-1">
      <div className="text-xs text-dark-400 mb-1">Ad</div>
      <div className="bg-dark-100 dark:bg-dark-800 rounded-lg overflow-hidden">
        {list.length ? (
          <div className="p-2 space-y-3">
            {list.map((item) => (
              <BodyAd
                key={item._id}
                ad={item}
                useNaturalHeight
                placementOverride={item.placementId || item.servedPlacement || item.placement}
                onImpression={(adData) => trackAdEvent({
                  adId: adData._id,
                  type: 'impression',
                  pageType,
                  pageUrl,
                  device,
                  placement: adData.placement
                })}
                onClick={(adData, meta) => trackAdEvent({
                  adId: adData._id,
                  type: 'click',
                  pageType,
                  pageUrl,
                  device,
                  placement: adData.placement,
                  eventTimestamp: meta?.eventTimestamp
                })}
              />
            ))}
          </div>
        ) : (
          <div className="aspect-[300/600] flex items-center justify-center text-dark-400 text-sm">
            <div className="text-center p-4">
              <p className="font-medium mb-2">Advertisement</p>
              <p className="text-xs">300 x 600</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== HOME PAGE ====================
export function HomePage() {
  const navigate = useNavigate();
  const { data: publicSettings } = usePublicSettings();
  const [latestLimit, setLatestLimit] = useState(8);
  const [sectionArticleRegistry, setSectionArticleRegistry] = useState({});
  const { data: latest, isLoading: latestLoading, isFetching: isFetchingLatest } = useLatestArticles(latestLimit);
  const { data: trending, isLoading: trendingLoading } = useArticles({ page: 1, limit: 6, sort: '-viewCount' });
  const { data: categories } = useCategories();
  const homepageSections = publicSettings?.homepageSections || [];
  const homepageRenderableSections = homepageSections
    .filter((section) => section.enabled)
    .filter((section) => section.type !== 'hero');
  const homepageSectionCount = homepageRenderableSections.length > 0
    ? homepageRenderableSections.length
    : 3;
  const device = useDeviceType();
  const { data: homepageAds } = useHomepageAds(device, homepageSectionCount);
  const { data: rightHeroAds } = useSelectAds('custom', {
    pageType: 'homepage',
    device,
    placementId: 'right_hero',
    limit: 3
  });
  const { data: rightHeroAdsDesktop } = useSelectAds('custom', {
    pageType: 'homepage',
    device: 'desktop',
    placementId: 'right_hero',
    limit: 3,
    enabled: true
  });
  const { data: sidebarAds } = useSelectAds('sidebar', {
    pageType: 'homepage',
    device,
    limit: 2
  });
  const { data: sidebarAdsDesktop } = useSelectAds('sidebar', {
    pageType: 'homepage',
    device: 'desktop',
    limit: 2,
    enabled: true
  });
  const { data: rightSidebarAds } = useSelectAds('custom', {
    pageType: 'homepage',
    device,
    placementId: 'right_sidebar',
    limit: 2
  });
  const { data: rightSidebarAdsDesktop } = useSelectAds('custom', {
    pageType: 'homepage',
    device: 'desktop',
    placementId: 'right_sidebar',
    limit: 2,
    enabled: true
  });
  const { mutate: trackAdEvent } = useTrackAdEvent();

  const trendingArticles = trending?.data?.articles || [];
  const latestNews = latest || [];
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  const afterHeroAds = homepageAds?.after_hero || [];
  const betweenSectionsAds = homepageAds?.between_sections || {};
  const dedupeAds = (ads = []) => ads.filter((ad, index, arr) => ad?._id && arr.findIndex((item) => item?._id === ad._id) === index);
  const resolvedSidebarAds = sidebarAds?.length ? sidebarAds : (sidebarAdsDesktop || []);
  const resolvedRightHeroAds = rightHeroAds?.length ? rightHeroAds : (rightHeroAdsDesktop || []);
  const resolvedRightSidebarAds = rightSidebarAds?.length ? rightSidebarAds : (rightSidebarAdsDesktop || []);
  const sidebarStackAds = dedupeAds([
    ...(resolvedSidebarAds || []),
    ...(resolvedRightHeroAds || []),
    ...(resolvedRightSidebarAds || []),
  ]);
  const inlineSidebarAds = sidebarStackAds.slice(0, 2);

  useEffect(() => {
    setSectionArticleRegistry((prev) => (Object.keys(prev).length ? {} : prev));
  }, [publicSettings?.homepageSections]);

  const registerSectionArticles = (sectionKey, articleIds) => {
    const normalizedIds = Array.from(new Set((articleIds || []).filter(Boolean)));
    setSectionArticleRegistry((prev) => {
      const existingIds = prev[sectionKey] || [];
      const unchanged = existingIds.length === normalizedIds.length && existingIds.every((id, index) => id === normalizedIds[index]);
      if (unchanged) return prev;
      return {
        ...prev,
        [sectionKey]: normalizedIds,
      };
    });
  };

  const renderAdGroup = (ads, placementOverride, options = {}) => {
    if (!ads?.length) return null;
    const { useNaturalHeight = false, fixedHeight } = options;
    return (
      <div className="my-8 space-y-6">
        {ads.map((ad) => (
          <BodyAd
            key={ad._id}
            ad={ad}
            useNaturalHeight={useNaturalHeight}
            fixedHeight={fixedHeight}
            placementOverride={placementOverride}
            onImpression={(adData) => trackAdEvent({
              adId: adData._id,
              type: 'impression',
              pageType: 'homepage',
              pageUrl,
              device,
              placement: adData.placement
            })}
            onClick={(adData, meta) => trackAdEvent({
              adId: adData._id,
              type: 'click',
              pageType: 'homepage',
              pageUrl,
              device,
              placement: adData.placement,
              eventTimestamp: meta?.eventTimestamp
            })}
          />
        ))}
      </div>
    );
  };

  // If custom sections defined, render them dynamically with sidebar
  if (homepageSections.length > 0) {
    let afterHeroPlaced = false;
    const orderedSections = homepageSections
      .filter((section) => section.enabled)
      .sort((a, b) => a.order - b.order);
    const renderSections = orderedSections.filter((section) => section.type !== 'hero');

    return (
      <>
        <Helmet>
          <title>{publicSettings?.seo?.metaTitle || publicSettings?.siteName || 'Bassac Media'}</title>
        </Helmet>

        <div className="container-custom py-6 lg:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Main Content - Dynamic Sections */}
            <div className="flex-1 min-w-0">
              {renderSections.map((section, index) => {
                  const sectionKey = section?.id || `${section.type}-${index}`;
                  const dedupeTypes = new Set(['latest_articles', 'news_list']);
                  const previousSharedIds = dedupeTypes.has(section.type)
                    ? Array.from(new Set(
                        renderSections
                          .slice(0, index)
                          .filter((prevSection) => dedupeTypes.has(prevSection.type))
                          .flatMap((prevSection, prevIndex) => {
                            const prevSectionKey = prevSection?.id || `${prevSection.type}-${prevIndex}`;
                            return sectionArticleRegistry[prevSectionKey] || [];
                          })
                      ))
                    : [];
                  const firstBreakingIndex = renderSections.findIndex((s) => s.type === 'breaking_news');
                  const afterIndex = firstBreakingIndex >= 0 ? firstBreakingIndex : 0;
                  const showAfterHeroAds = !afterHeroPlaced && index === afterIndex;
                  if (showAfterHeroAds) {
                    afterHeroPlaced = true;
                  }
                  return (
                    <div key={sectionKey} className="mb-10">
                      <DynamicSection
                        section={section}
                        excludeArticleIds={previousSharedIds}
                        onArticlesResolved={(articleIds) => registerSectionArticles(sectionKey, articleIds)}
                      />
                      {showAfterHeroAds && renderAdGroup(afterHeroAds, 'after_hero')}
                      {showAfterHeroAds && inlineSidebarAds?.length > 0 && (
                        <div className="lg:hidden">
                          {renderAdGroup(inlineSidebarAds, 'sidebar', { fixedHeight: 100 })}
                        </div>
                      )}
                      {renderAdGroup(betweenSectionsAds[index], 'between_sections', { fixedHeight: 100 })}
                    </div>
                  );
                })
              }
            </div>

            {/* Right Sidebar - Ad */}
            <aside className="hidden lg:block w-[300px] flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <SidebarAdSlot
                  ads={sidebarStackAds}
                  pageType="homepage"
                  pageUrl={pageUrl}
                  device={device}
                  trackAdEvent={trackAdEvent}
                />

                {/* Newsletter */}
                <div className="mt-6 bg-primary-600 rounded-lg p-5 text-white">
                  <h3 className="font-bold mb-2">Stay Updated</h3>
                  <p className="text-primary-100 text-sm mb-4">Get the latest news delivered to your inbox.</p>
                  <input
                    type="email"
                    placeholder="Your email"
                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
                  />
                  <button className="w-full py-2 bg-white text-primary-600 text-sm font-medium rounded hover:bg-primary-50 transition-colors">
                    Subscribe
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </>
    );
  }

  // Default Kiripost-style layout if no custom sections defined
  return (
    <>
      <Helmet>
        <title>{publicSettings?.siteName || 'Bassac Media'} - Latest News & Updates</title>
      </Helmet>

      <div className="container-custom py-6 lg:py-8 text-[15px] sm:text-base">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Breaking News Section */}
            <section className="mb-10">
              <SectionHeader eyebrow="Breaking" title="Breaking News" subtitle="Latest alerts and urgent updates" />
              <BreakingHeroSection section={{ settings: { limit: 6 } }} />
            </section>

            {inlineSidebarAds?.length > 0 && (
              <div className="lg:hidden">
                {renderAdGroup(inlineSidebarAds, 'sidebar', { fixedHeight: 100 })}
              </div>
            )}

            {renderAdGroup(betweenSectionsAds[0], 'between_sections', { fixedHeight: 100 })}

            {/* Trending Section */}
            {(trendingLoading || trendingArticles.length > 0) && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-primary-600 mb-5 uppercase tracking-wide">Trending</h2>
                <MixedLeadList
                  articles={trendingArticles}
                  isLoading={trendingLoading}
                  emptyMessage="No trending news"
                  leadAspectClass="aspect-[16/7]"
                />
              </section>
            )}

            {renderAdGroup(betweenSectionsAds[1], 'between_sections', { fixedHeight: 100 })}

            {/* Latest News Section */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-primary-600 mb-5 uppercase tracking-wide">Latest News</h2>
              <MixedLeadList
                articles={latestNews}
                isLoading={latestLoading}
                emptyMessage="No news published yet"
              />
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
	                {latestNews.length >= latestLimit && (
	                  <Button
	                    variant="outline"
	                    onClick={() => navigate('/articles')}
	                    isLoading={isFetchingLatest}
	                    rightIcon={<ArrowRight className="w-4 h-4" />}
	                  >
	                    See more
	                  </Button>
	                )}
                <Link to="/articles" className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-primary-600 text-primary-600 font-medium rounded-lg hover:bg-primary-600 hover:text-white transition-colors">
                  View All News <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>

            {renderAdGroup(betweenSectionsAds[2], 'between_sections', { fixedHeight: 100 })}

            {/* Category Sections */}
            {categories?.slice(0, 2).map((category) => (
              <HomeCategorySection key={category._id} category={category} />
            ))}
          </div>

          {/* Right Sidebar - Ad */}
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <SidebarAdSlot
                ads={sidebarStackAds}
                pageType="homepage"
                pageUrl={pageUrl}
                device={device}
                trackAdEvent={trackAdEvent}
              />

              <div className="mt-6 bg-primary-600 rounded-lg p-5 text-white">
                <h3 className="font-bold mb-2">Stay Updated</h3>
                <p className="text-primary-100 text-sm mb-4">Get the latest news delivered to your inbox.</p>
                <input
                  type="email"
                  placeholder="Your email"
                  className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
                />
                <button className="w-full py-2 bg-white text-primary-600 text-sm font-medium rounded hover:bg-primary-50 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

// Category Section for Homepage
function HomeCategorySection({ category }) {
  const { data, isLoading } = useArticlesByCategory(category.slug, { page: 1, limit: 4 });
  const articles = data?.data?.articles || [];

  return (
    <section className="mb-10 pt-8 border-t border-dark-200 dark:border-dark-700">
      <div className="flex items-center justify-between mb-5">
        <div className="inline-flex items-center gap-3 rounded-full border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 px-4 py-2 shadow-sm">
          <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-wide" style={{ color: category.color || getCategoryAccent(category.name) }}>
            {category.name}
          </h2>
        </div>
        <Link to={`/category/${category.slug}`} className="text-sm font-medium flex items-center gap-1 link-muted">
          More <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <MixedLeadList
        articles={articles}
        isLoading={isLoading}
        emptyMessage={`No news in ${category.name} yet`}
      />
    </section>
  );
}

// News Card Component
function ArticleCardNews({ article }) {
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
              <span>{article.author.fullName || 'Admin'}</span>
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

function NewsListWithExcerpt({ articles, isLoading, emptyMessage, imageSize = 'md' }) {
  const imageClassName = imageSize === 'sm'
    ? 'w-20 h-16'
    : 'w-28 h-20';
  const titleClassName = imageSize === 'sm' ? 'text-sm' : 'text-base';
  const excerptClassName = imageSize === 'sm' ? 'text-xs' : 'text-sm';

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className={`${imageClassName} skeleton rounded-lg flex-shrink-0`} />
            <div className="flex-1 space-y-2">
              <div className="h-3 skeleton rounded w-1/2" />
              <div className="h-4 skeleton rounded" />
              <div className="h-3 skeleton rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!articles?.length) {
    return <p className="text-dark-500 text-sm">{emptyMessage || 'No news found'}</p>;
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <article key={article._id} className="flex gap-3 group">
          <Link to={`/article/${article.slug}`} className="flex-shrink-0">
            <img loading="lazy"
              src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/240/160`}
              alt={article.title}
              className={`${imageClassName} object-cover rounded-lg group-hover:opacity-90 transition-opacity`}
            />
          </Link>
          <div className="flex-1 min-w-0">
            {article.category && (
              <Link
                to={`/category/${article.category.slug}`}
                className="text-xs font-semibold uppercase tracking-wider hover:underline"
                style={{ color: article.category.color || '#6B7280' }}
              >
                {article.category.name}
              </Link>
            )}
            <Link to={`/article/${article.slug}`}>
              <h4 className={`font-semibold text-dark-900 dark:text-white leading-snug line-clamp-2 headline-hover mt-1 ${titleClassName}`}>
                {article.title}
              </h4>
            </Link>
            {article.excerpt && (
              <p className={`text-dark-500 mt-1 line-clamp-2 ${excerptClassName}`}>
                {article.excerpt}
              </p>
            )}
            <span className="text-dark-400 text-xs mt-1 block">{formatRelativeTime(article.publishedAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

// ==================== ARTICLES PAGE ====================
export function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const categorySlug = searchParams.get('category') || '';
  const searchQuery = searchParams.get('q') || '';
  const loadMoreRef = useRef(null);
  const limit = 10;

  const {
    data: articlesPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['articles', 'infinite', { category: categorySlug, q: searchQuery, limit }],
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        page: pageParam,
        limit,
        ...(categorySlug ? { category: categorySlug } : {}),
        ...(searchQuery ? { q: searchQuery } : {}),
      };
      const response = searchQuery
        ? await articlesAPI.search(params)
        : await articlesAPI.getAll(params);
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
  const searchAd = searchAds?.[0];
  const resolvedSidebarAds = sidebarAds?.length ? sidebarAds : (isNonDesktop ? (sidebarAdsDesktop || []) : []);
  const resolvedRightSidebarAds = rightSidebarAds?.length ? rightSidebarAds : (isNonDesktop ? (rightSidebarAdsDesktop || []) : []);
  const sidebarStackAds = [...resolvedSidebarAds, ...resolvedRightSidebarAds]
    .filter((ad, index, arr) => ad?._id && arr.findIndex((item) => item?._id === ad._id) === index);
  const inlineSidebarAds = sidebarStackAds.slice(0, 2);
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  const articles = articlesPages?.pages?.flatMap((page) => (
    page?.data?.articles || page?.data || page?.articles || []
  )) || [];
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
    const params = new URLSearchParams();
    if (search) params.set('q', search);
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

  return (
    <>
      <Helmet><title>News - Bassac Media</title></Helmet>

      <div className="container-custom py-6 lg:py-8 text-[15px] sm:text-base">
        {/* Main Layout: Content + Sidebar Ad */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl lg:text-2xl font-bold text-dark-900 dark:text-white mb-2">News</h1>
              <p className="text-dark-500">Browse our collection of news</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search news..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-dark-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-dark-900 dark:text-white placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Category Filter Pills */}
            {categories?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  onClick={() => handleCategoryClick('')}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    !categorySlug
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                  )}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => handleCategoryClick(c.slug)}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: categorySlug === c.slug ? c.color : `${c.color}15`,
                      color: categorySlug === c.slug ? 'white' : c.color
                    }}
                  >
                    {c.name}
                  </button>
                ))}
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

            {/* News Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-dark-900 rounded-2xl overflow-hidden shadow-sm">
                    <div className="aspect-[16/10] skeleton" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 skeleton rounded w-20" />
                      <div className="h-6 skeleton rounded" />
                      <div className="h-4 skeleton rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : articles.length > 0 ? (
              <div>
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

                {hasNextPage && (
                  <div className="flex justify-center items-center mt-12">
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="px-6 py-2 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                    >
                      {isFetchingNextPage ? 'Loading more...' : 'Load more'}
                    </button>
                  </div>
                )}
                <div ref={loadMoreRef} className="h-1" />
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-dark-500 text-lg">No news found</p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setSearchParams(new URLSearchParams());
                    }}
                    className="mt-4 text-primary-600 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Ad */}
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <SidebarAdSlot
                ads={sidebarStackAds}
                pageType="article"
                pageUrl={pageUrl}
                device={device}
                trackAdEvent={trackAdEvent}
              />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

// ==================== CATEGORIES LIST PAGE (Mobile-friendly) ====================
export function CategoriesListPage() {
  const { data: categories, isLoading } = useCategories();
  const { data: settings } = usePublicSettings();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popular'); // popular | az

  const siteName = settings?.siteName || 'Bassac Media';
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
        <title>{`Categories - ${siteName}`}</title>
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
                  Browse by topic
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mt-2">
                  Categories
                </h1>
                <p className="text-sm sm:text-base text-dark-600 dark:text-dark-400 mt-2">
                  Find stories faster with topic pages—search, sort, and jump into what you care about.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link to="/articles">
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    All News
                  </Button>
                </Link>
                <div className="flex items-center gap-2 rounded-full border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-900 px-3 py-1.5 text-xs text-dark-600 dark:text-dark-300">
                  <span className="text-dark-400">Topics</span>
                  <span className="font-semibold text-dark-900 dark:text-white">{total}</span>
                  <span className="mx-1 h-3 w-px bg-dark-200 dark:bg-dark-700" />
                  <span className="text-dark-400">News</span>
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
                    placeholder="Search categories (e.g., business, sports, tech)..."
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
                  <TrendingUp className="w-4 h-4" /> Popular
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
                  Showing <span className="font-semibold text-dark-900 dark:text-white">{filtered.length}</span> of{' '}
                  <span className="font-semibold text-dark-900 dark:text-white">{total}</span> categories
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
                    Clear
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
                              alt={category?.name || 'Category'}
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
                            {count} news
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
                            Explore the latest updates in <span className="font-semibold text-dark-900 dark:text-white">{category?.name}</span>.
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                            <span className="text-xs text-dark-500 dark:text-dark-400">Topic page</span>
                          </div>
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            Explore <span aria-hidden>→</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-10 text-center">
                <p className="text-dark-900 dark:text-white font-semibold">No categories found</p>
                <p className="text-dark-600 dark:text-dark-400 mt-2">
                  Try a different search, or browse all news.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  {normalizedQuery && (
                    <Button variant="outline" onClick={() => setQuery('')}>
                      Clear search
                    </Button>
                  )}
                  <Link to="/articles">
                    <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Browse News
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
    const { slug } = useParams();
    const loadMoreRef = useRef(null);
    const limit = 12;
    const device = useDeviceType();
    const isMobile = device === 'mobile';
    const isNonDesktop = device !== 'desktop';
    const { mutate: trackAdEvent } = useTrackAdEvent();

    const {
        data: categoryPages,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['category', 'infinite', { slug, limit }],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await articlesAPI.getByCategory(slug, {
                page: pageParam,
                limit,
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
    const loadMoreLabel = isFetchingNextPage ? 'Loading more...' : 'Load more';
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
                <title>{category?.name || 'Category'} - Bassac Media Center</title>
            </Helmet>

            <div className="container-custom py-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                    <div className="flex-1 min-w-0">
                        <div className="mb-8">
                            <Link to="/articles" className="inline-flex items-center gap-2 text-dark-500 hover:text-dark-700 mb-4">
                                ← Back to News
                            </Link>
                            <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-5 sm:p-6">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"
                                  style={{ color: category?.color || getCategoryAccent(category?.name || slug.replace(/-/g, ' ')) }}
                                >
                                  <span
                                    className="w-8 h-1 rounded-full"
                                    style={{ backgroundColor: category?.color || getCategoryAccent(category?.name || slug.replace(/-/g, ' ')) }}
                                  />
                                  Category
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
                                No news in this category
                            </p>
                        )}
                    </div>

                    <aside className="hidden lg:block w-[300px] flex-shrink-0">
                        <div className="lg:sticky lg:top-24">
                            <SidebarAdSlot
                                ads={sidebarStackAds}
                                pageType="category"
                                pageUrl={pageUrl}
                                device={device}
                                trackAdEvent={trackAdEvent}
                            />
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

// ==================== COMMENT ITEM COMPONENT ====================
function CommentItem({ comment, isReply = false, onLike, onDelete, onReplyClick, replyTo, user, isAuthenticated }) {
  const authorName = comment.author
    ? `${comment.author.firstName} ${comment.author.lastName}`
    : comment.guestName || 'Anonymous';
  const canDelete = isAuthenticated && (
    comment.author?._id === user?._id ||
    ['admin', 'editor'].includes(user?.role)
  );

  return (
    <div className={cn('group', isReply && 'ml-8 sm:ml-12 mt-4')}>
      <div className="flex gap-3 sm:gap-4">
        <Avatar
          src={buildMediaUrl(comment.author?.avatar)}
          name={authorName}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-dark-900 dark:text-white text-sm">
              {authorName}
            </span>
            <span className="text-xs text-dark-400">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-dark-400">(edited)</span>
            )}
            {comment.status === 'pending' && (
              <Badge className="badge-warning text-xs">Pending</Badge>
            )}
            {comment.status === 'approved' && (
              <span
                className="inline-flex items-center text-emerald-600"
                title="Approved"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <p className="text-dark-700 dark:text-dark-300 text-sm leading-relaxed break-words">
            {comment.content}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onLike(comment._id)}
              className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                isAuthenticated
                  ? 'headline-hover cursor-pointer'
                  : 'cursor-not-allowed opacity-50',
                comment.likedBy?.some(id => id === user?._id || id?._id === user?._id) && 'text-primary-600'
              )}
              disabled={!isAuthenticated}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {comment.likes > 0 && comment.likes}
            </button>
            {!isReply && (
              <button
                onClick={() => onReplyClick(comment._id)}
                className="flex items-center gap-1 text-xs text-dark-500 headline-hover"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment._id)}
                className="flex items-center gap-1 text-xs text-dark-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Replies */}
          {comment.replies?.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  isReply
                  onLike={onLike}
                  onDelete={onDelete}
                  onReplyClick={onReplyClick}
                  replyTo={replyTo}
                  user={user}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== REPLY FORM COMPONENT ====================
function ReplyForm({ commentId, onSubmit, onCancel, isSubmitting, isAuthenticated, guestName, setGuestName, guestEmail, setGuestEmail }) {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(content, commentId);
    setContent('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 ml-8 sm:ml-12">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply..."
        className="text-sm min-h-[80px]"
      />
      {!isAuthenticated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            className="text-sm"
            required
          />
          <Input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="Your email"
            className="text-sm"
            required
          />
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Button type="submit" size="sm" disabled={isSubmitting || !content.trim()}>
          <Send className="w-3.5 h-3.5 mr-1" />
          Reply
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ==================== COMMENTS SECTION COMPONENT ====================
function CommentsSection({ articleId }) {
  const { user, isAuthenticated } = useAuthStore();
  const commentsLimit = 5;
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['comments', articleId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await commentsAPI.getByArticle(articleId, {
        page: pageParam,
        limit: commentsLimit,
      });
      return { ...response.data, __page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data?.pagination;
      if (!pagination) return undefined;
      return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
    },
    enabled: !!articleId,
  });
  const { mutate: createComment, isPending: isSubmitting } = useCreateComment();
  const { mutate: likeComment } = useLikeComment();
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment();

  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);

  const comments = data?.pages?.flatMap((page) => page?.data?.comments || []) || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentData = { content: newComment };
    if (!isAuthenticated) {
      if (!guestName.trim() || !guestEmail.trim()) {
        return;
      }
      commentData.guestName = guestName;
      commentData.guestEmail = guestEmail;
    }

    createComment(
      { articleId, data: commentData },
      {
        onSuccess: () => {
          setNewComment('');
          setGuestName('');
          setGuestEmail('');
        },
      }
    );
  };

  const handleReply = (content, parentId) => {
    const replyData = { content, parentId };
    if (!isAuthenticated) {
      if (!guestName.trim() || !guestEmail.trim()) {
        return;
      }
      replyData.guestName = guestName;
      replyData.guestEmail = guestEmail;
    }

    createComment(
      { articleId, data: replyData },
      {
        onSuccess: () => {
          setReplyTo(null);
        },
      }
    );
  };

  const handleLike = (commentId) => {
    if (!isAuthenticated) return;
    likeComment(commentId);
  };

  const handleDelete = () => {
    if (deleteModal) {
      deleteComment(deleteModal, {
        onSuccess: () => setDeleteModal(null)
      });
    }
  };

  const handleReplyClick = (commentId) => {
    setReplyTo(replyTo === commentId ? null : commentId);
  };

  return (
    <div className="mt-12 pt-8 border-t border-dark-200 dark:border-dark-800">
      <h3 className="flex items-center gap-2 text-2xl font-bold text-dark-900 dark:text-white mb-6">
        <MessageCircle className="w-5 h-5" />
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isAuthenticated ? "Share your thoughts..." : "Write a comment..."}
          className="mb-3"
        />
        {!isAuthenticated && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name *"
              required
            />
            <Input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Your email *"
              required
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-dark-500">
            {isAuthenticated
              ? `Commenting as ${user?.firstName}`
              : 'Comments are moderated before appearing'}
          </p>
          <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-dark-200 dark:bg-dark-700" />
              <div className="flex-1">
                <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-32 mb-2" />
                <div className="h-3 bg-dark-200 dark:bg-dark-700 rounded w-full mb-1" />
                <div className="h-3 bg-dark-200 dark:bg-dark-700 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment._id}>
              <CommentItem
                comment={comment}
                onLike={handleLike}
                onDelete={(commentId) => setDeleteModal(commentId)}
                onReplyClick={handleReplyClick}
                replyTo={replyTo}
                user={user}
                isAuthenticated={isAuthenticated}
              />
              {replyTo === comment._id && (
                <ReplyForm
                  commentId={comment._id}
                  onSubmit={handleReply}
                  onCancel={() => setReplyTo(null)}
                  isSubmitting={isSubmitting}
                  isAuthenticated={isAuthenticated}
                  guestName={guestName}
                  setGuestName={setGuestName}
                  guestEmail={guestEmail}
                  setGuestEmail={setGuestEmail}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-dark-300 mx-auto mb-3" />
          <p className="text-dark-500">No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more comments'}
          </Button>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </div>
  );
}

// ==================== ARTICLE DETAIL PAGE ====================
export function ArticlePage() {
  const { slug } = useParams();
  const { data: article, isLoading, error } = useArticleBySlug(slug);
  const [relatedLimit, setRelatedLimit] = useState(5);
  const [moreNewsLimit, setMoreNewsLimit] = useState(5);
  const [copied, setCopied] = useState(false);
  const { data: related, isLoading: isLoadingRelated } = useRelatedArticles(article?._id, relatedLimit);
  const { data: moreNews, isLoading: isLoadingMoreNews, isFetching: isFetchingMoreNews } = useLatestArticles(moreNewsLimit);
  const { data: settings } = usePublicSettings();
  const device = useDeviceType();
  const { mutate: trackAdEvent } = useTrackAdEvent();
  const { data: sidebarAds } = useSelectAds('sidebar', {
    pageType: 'article',
    device,
    limit: 10
  });
  const { data: rightSidebarAds } = useSelectAds('custom', {
    pageType: 'article',
    device,
    placementId: 'right_sidebar',
    limit: 10
  });
  const paragraphCount = article?.content?.blocks?.filter((block) => block.type === 'paragraph').length || 0;
  const { data: articleAds } = useArticleAds(article?._id, {
    device,
    categoryId: article?.category?._id,
    totalParagraphs: paragraphCount
  });

  useEffect(() => {
    if (article?._id) {
      articlesAPI.recordView(article._id).catch(() => {});
    }
  }, [article?._id]);

  if (isLoading) {
    return (
      <div className="container-custom py-8 sm:py-10">
        <ArticleDetailSkeleton />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container-custom py-20 text-center">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">News Not Found</h1>
        <p className="text-dark-500 mb-6">The news you're looking for doesn't exist.</p>
        <Link to="/articles"><Button>Browse News</Button></Link>
      </div>
    );
  }

  const { title, excerpt, content, featuredImage, category, author, publishedAt, viewCount, wordCount, tags } = article;
  // featuredImage is a string URL, not an object
  const imageUrl = buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${slug}/1200/600`;
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareBaseFromEnv = (import.meta.env.VITE_SHARE_URL_BASE || '').trim().replace(/\/+$/, '');
  let shareBaseUrl = shareBaseFromEnv;
  if (!shareBaseUrl) {
    const apiBase = (import.meta.env.VITE_API_URL || '').trim();
    if (/^https?:\/\//i.test(apiBase)) {
      try {
        shareBaseUrl = new URL(apiBase).origin;
      } catch {
        shareBaseUrl = '';
      }
    }
  }
  if (!shareBaseUrl) {
    shareBaseUrl = siteUrl;
  }
  const shareUrl = shareBaseUrl ? `${shareBaseUrl}/share/${encodeURIComponent(slug)}` : '';
  const moreNewsArticles = (moreNews || []).filter((item) => item._id !== article._id);

  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  const trackAd = (adData, type, meta) => trackAdEvent({
    adId: adData._id,
    type,
    pageType: 'article',
    pageUrl,
    device,
    placement: adData.placement,
    eventTimestamp: meta?.eventTimestamp
  });
  const sidebarStackAds = [...(sidebarAds || []), ...(rightSidebarAds || [])]
    .filter((ad, index, arr) => ad?._id && arr.findIndex((item) => item?._id === ad._id) === index);
  const inlineSidebarAds = sidebarStackAds.slice(0, 2);

  const handleCopyLink = async () => {
    if (!shareUrl || typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch (copyError) {
        console.error('Copy failed', copyError);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  // SEO data
  const authorName = author ? `${author.firstName} ${author.lastName}` : '';
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{article.metaTitle || title} | Bassac Media Center</title>
        <meta name="title" content={article.metaTitle || title} />
        <meta name="description" content={article.metaDescription || excerpt || ''} />
        <meta name="author" content={authorName} />
        {article.metaKeywords?.length > 0 && (
          <meta name="keywords" content={article.metaKeywords.join(', ')} />
        )}
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph / Facebook - CRITICAL for social sharing */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={article.metaTitle || title} />
        <meta property="og:description" content={article.metaDescription || excerpt || ''} />
        <meta property="og:image" content={imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={title} />
        <meta property="og:site_name" content={settings?.siteName || 'Bassac Media Center'} />
        <meta property="og:locale" content="en_US" />

        {/* News specific Open Graph */}
        <meta property="article:published_time" content={publishedAt} />
        {article.updatedAt && <meta property="article:modified_time" content={article.updatedAt} />}
        <meta property="article:author" content={authorName} />
        {category && <meta property="article:section" content={category.name} />}
        {tags?.map((tag, i) => (
          <meta key={i} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card - CRITICAL for Twitter sharing */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={article.metaTitle || title} />
        <meta name="twitter:description" content={article.metaDescription || excerpt || ''} />
        <meta name="twitter:image" content={imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`} />

        {/* JSON-LD Structured Data for Google */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            'headline': title,
            'description': article.metaDescription || excerpt,
            'image': [imageUrl.startsWith('http') ? imageUrl : `${siteUrl}${imageUrl}`],
            'datePublished': publishedAt,
            'dateModified': article.updatedAt || publishedAt,
            'author': {
              '@type': 'Person',
              'name': authorName,
            },
            'publisher': {
              '@type': 'Organization',
              'name': settings?.siteName || 'Bassac Media Center',
              'logo': {
                '@type': 'ImageObject',
                'url': `${siteUrl}/LogoV1.png`,
              },
            },
            'mainEntityOfPage': {
              '@type': 'WebPage',
              '@id': canonicalUrl,
            },
            'articleSection': category?.name,
            'keywords': tags?.join(', '),
            'wordCount': wordCount,
            'interactionStatistic': {
              '@type': 'InteractionCounter',
              'interactionType': 'https://schema.org/ReadAction',
              'userInteractionCount': viewCount || 0,
            },
          })}
        </script>
      </Helmet>

      <article>
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-dark-900/90 backdrop-blur border-b border-dark-100 dark:border-dark-800">
          <div className="container-custom py-3">
            <Link to="/articles" className="inline-flex items-center gap-2 text-dark-600 dark:text-dark-300 headline-hover">
              <ArrowLeft className="w-4 h-4" /> Back to News
            </Link>
          </div>
        </div>
        <header className="relative">
          <div className="aspect-[21/9] lg:aspect-[3/1]">
            <img loading="lazy" src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="container-custom py-4 lg:py-12">
              <div className="max-w-4xl">
                {category && (
                  <Link to={`/category/${category.slug}`}>
                    <span className="inline-flex items-center mb-4 rounded-full bg-white/20 text-white px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      {category.name}
                    </span>
                  </Link>
                )}
                <h1 className="font-display text-2xl lg:text-2xl font-bold text-white mb-4">{title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                  {author && (
                    <div className="flex items-center gap-2">
                      <Avatar src={author.avatar} name={author.fullName} size="sm" />
                      <span>{author.fullName || `${author.firstName} ${author.lastName}`}</span>
                    </div>
                  )}
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(publishedAt)}</span>
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{viewCount || 0} views</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container-custom py-12">
          <div className="flex flex-col gap-12 lg:flex-row">
            <div className="flex-1 min-w-0">
              {excerpt && <p className="text-2xl text-dark-600 dark:text-dark-300 mb-8 leading-relaxed">{excerpt}</p>}
              {device !== 'desktop' && inlineSidebarAds.length > 0 && (
                <div className="my-8">
                  <InlineAdGroup
                    ads={inlineSidebarAds}
                    keyPrefix="article-sidebar-inline"
                    onTrackAd={trackAd}
                  />
                </div>
              )}
              <ArticleContent
                content={content}
                inArticleAds={articleAds?.in_article}
                onAdImpression={(adData) => trackAd(adData, 'impression')}
                onAdClick={(adData, meta) => trackAd(adData, 'click', meta)}
              />

              {articleAds?.after_article?.length > 0 && (
                <div className="my-10 space-y-6">
                  {articleAds.after_article.map((ad) => (
                    <BodyAd
                      key={ad._id}
                      ad={ad}
                      placementOverride="after_article"
                      onImpression={(adData) => trackAd(adData, 'impression')}
                      onClick={(adData, meta) => trackAd(adData, 'click', meta)}
                    />
                  ))}
                </div>
              )}

              {tags?.length > 0 && (
                <div className="mt-10 pt-6 border-t border-dark-200 dark:border-dark-800 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Link key={tag} to={`/articles?tag=${tag}`} className="px-3 py-1 rounded-full text-sm bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700">
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-dark-200 dark:border-dark-800 flex items-center gap-4">
                <span className="text-sm font-medium text-dark-500">Share:</span>
                <a href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Facebook className="w-5 h-5 text-[#1877F2]" /></a>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Twitter className="w-5 h-5 text-[#1DA1F2]" /></a>
                <a href={`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Linkedin className="w-5 h-5 text-[#0A66C2]" /></a>
                <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><MessageCircle className="w-5 h-5 text-[#25D366]" /></a>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Send className="w-5 h-5 text-[#229ED9]" /></a>
                <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${shareUrl}`)}`} className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Mail className="w-5 h-5 text-[#6B7280]" /></a>
                <button type="button" onClick={handleCopyLink} className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800">
                  <Link2 className={`w-5 h-5 ${copied ? 'text-primary-600' : 'text-dark-500'}`} />
                </button>
                {copied && <span className="text-xs text-primary-600">Copied</span>}
              </div>

              {articleAds?.before_comments?.length > 0 && (
                <div className="my-10 space-y-6">
                  {articleAds.before_comments.map((ad) => (
                    <BodyAd
                      key={ad._id}
                      ad={ad}
                      placementOverride="before_comments"
                      onImpression={(adData) => trackAd(adData, 'impression')}
                      onClick={(adData, meta) => trackAd(adData, 'click', meta)}
                    />
                  ))}
                </div>
              )}

              {/* Comments Section */}
              <CommentsSection articleId={article._id} />

              {/* More News Section */}
              <section className="mt-10 pt-8 border-t border-dark-200 dark:border-dark-800">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-dark-900 dark:text-white">More News</h3>
                  <Link to="/articles" className="text-sm font-medium flex items-center gap-1 link-muted">
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <NewsListWithExcerpt
                  articles={moreNewsArticles}
                  isLoading={isLoadingMoreNews}
                  emptyMessage="No additional news available"
                />
                {moreNews?.length >= moreNewsLimit && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => setMoreNewsLimit((prev) => prev + 5)}
                      isLoading={isFetchingMoreNews}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      See more
                    </Button>
                  </div>
                )}
              </section>
            </div>

            <aside className="w-full lg:w-[300px] lg:flex-shrink-0">
              {author && (
                <div className="card p-6 mb-6">
                  <h3 className="text-sm font-semibold text-dark-500 uppercase mb-4">About the Author</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar src={author.avatar} name={author.fullName} size="lg" />
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">{author.fullName || `${author.firstName} ${author.lastName}`}</p>
                      <p className="text-sm text-dark-500 capitalize">{author.role}</p>
                    </div>
                  </div>
                  {author.bio && <p className="text-sm text-dark-600 dark:text-dark-400">{author.bio}</p>}
                </div>
              )}

              <div className="hidden lg:block">
                <SidebarAdSlot
                  ads={sidebarStackAds}
                  pageType="article"
                  pageUrl={pageUrl}
                  device={device}
                  trackAdEvent={trackAdEvent}
                />
              </div>

              {/* Related News */}
              <div className="card p-6 mt-6">
                <h3 className="text-sm font-semibold text-dark-500 uppercase mb-4">Related News</h3>
                <NewsListWithExcerpt
                  articles={related || []}
                  isLoading={isLoadingRelated}
                  emptyMessage="No related news found"
                  imageSize="sm"
                />
                {related?.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <Button size="sm" onClick={() => setRelatedLimit((prev) => prev + 5)}>
                      Load more
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}

// ==================== LOGIN PAGE ====================
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending } = useLogin();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    login({ email, password }, { onSuccess: () => navigate(from, { replace: true }) });
  };

  return (
    <>
      <Helmet><title>Sign In - Bassac Media Center</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Media</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-6">Sign In</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />

              <div className="relative">
                <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-600 dark:hover:text-dark-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500" />
                  <span className="text-sm text-dark-600 dark:text-dark-400">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm link-primary">Forgot password?</Link>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>Sign In</Button>
            </form>

            <p className="mt-6 text-center text-dark-500">
              Don't have an account? <Link to="/register" className="font-medium link-primary">Sign up</Link>
            </p>

            <div className="mt-6 p-4 bg-dark-100 dark:bg-dark-800 rounded-xl">
              <p className="text-sm font-medium text-dark-600 dark:text-dark-400 mb-2">Demo Accounts:</p>
              <div className="text-xs text-dark-500 space-y-1">
                <p>Admin: admin@bassacmedia.com / Admin@123</p>
                <p>Editor: editor@bassacmedia.com / Editor@123</p>
                <p>Writer: writer@bassacmedia.com / Writer@123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== REGISTER PAGE ====================
// Password strength calculator
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strengths = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Weak', color: 'bg-red-500' },
    { score: 2, label: 'Fair', color: 'bg-orange-500' },
    { score: 3, label: 'Good', color: 'bg-yellow-500' },
    { score: 4, label: 'Strong', color: 'bg-emerald-500' },
    { score: 5, label: 'Very Strong', color: 'bg-emerald-600' },
  ];

  return strengths[Math.min(score, 5)];
};

export function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const { mutate: register, isPending } = useRegister();

  const passwordStrength = getPasswordStrength(form.password);

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.firstName) newErrors.firstName = 'Required';
    if (!form.lastName) newErrors.lastName = 'Required';
    if (!form.email) newErrors.email = 'Required';
    if (!form.password) newErrors.password = 'Required';
    else if (form.password.length < 8) newErrors.password = 'Min 8 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password }, { onSuccess: () => navigate('/dashboard') });
  };

  return (
    <>
      <Helmet><title>Create Account - Bassac Media Center</title></Helmet>
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
              <span className="text-white font-display font-bold text-2xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Media</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-6">Create Account</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="First Name" placeholder="John" value={form.firstName} onChange={handleChange('firstName')} error={errors.firstName} required />
                <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={handleChange('lastName')} error={errors.lastName} required />
              </div>
              <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange('email')} error={errors.email} required />
              <div>
                <div className="relative">
                  <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={handleChange('password')} error={errors.password} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[38px] text-dark-400 hover:text-dark-600 dark:hover:text-dark-300">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.score ? passwordStrength.color : 'bg-dark-200 dark:bg-dark-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${passwordStrength.score >= 3 ? 'text-emerald-600' : 'text-dark-500'}`}>
                      Password strength: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>
              <Input label="Confirm Password" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange('confirmPassword')} error={errors.confirmPassword} required />
              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>Create Account</Button>
            </form>

            <p className="mt-6 text-center text-dark-500">
              Already have an account? <Link to="/login" className="font-medium link-primary">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== CONTACT PAGE ====================
export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const { mutate: submit, isPending } = useSubmitContact();

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(form, { onSuccess: () => setForm({ name: '', email: '', subject: '', message: '' }) });
  };

  return (
    <>
      <Helmet><title>Contact - Bassac Media Center</title></Helmet>
      <div className="container-custom py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl lg:text-2xl font-bold text-dark-900 dark:text-white mb-4 text-center">Contact Us</h1>
          <p className="text-dark-500 text-center mb-8">Have a question? We'd love to hear from you.</p>

          <form onSubmit={handleSubmit} className="card p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Name" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Input label="Subject" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            <Textarea label="Message" placeholder="Your message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="min-h-[150px]" />
            <Button type="submit" className="w-full" size="lg" isLoading={isPending}>Send Message</Button>
          </form>
        </div>
      </div>
    </>
  );
}

// ==================== ABOUT PAGE ====================
export function AboutPage() {
  const { data: settings } = usePublicSettings();
  const { data: latestArticles, isLoading: isLatestLoading } = useLatestArticles(3);

  const siteName = settings?.siteName || 'Bassac Media Center';
  const siteDescription = settings?.siteDescription || 'Your trusted source for quality news, insightful stories, and in-depth coverage of the issues that matter.';
  const siteEmail = settings?.siteEmail || 'hello@bassacmedia.com';
  const sitePhone = settings?.sitePhone || '+855 12 345 678';
  const siteAddress = settings?.siteAddress || 'Phnom Penh, Cambodia';
  const siteLogo = settings?.siteLogo;
  const stripUrl = (value) => String(value || '').split('#')[0].split('?')[0];
  const strippedLogo = stripUrl(siteLogo);
  const shouldUseDefaultLogo = !siteLogo
    || strippedLogo.endsWith('/LogoV1.png')
    || strippedLogo.endsWith('/logo_v1.png')
    || strippedLogo.endsWith('/LogoV1_white.png')
    || strippedLogo.endsWith('/logo_v1_white.png')
    || strippedLogo.endsWith('LogoV1.png')
    || strippedLogo.endsWith('logo_v1.png')
    || strippedLogo.endsWith('LogoV1_white.png')
    || strippedLogo.endsWith('logo_v1_white.png');

  const socialIconMap = {
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
  };

  const socialLinks = settings?.socialLinks?.length > 0
    ? settings.socialLinks
        .filter((item) => item?.enabled && item?.url)
        .slice(0, 5)
    : [
        { platform: 'facebook', url: '#' },
        { platform: 'twitter', url: '#' },
        { platform: 'linkedin', url: '#' },
      ];

  const values = [
    {
      title: 'Accuracy First',
      description: 'Every story is checked with multiple sources before publication.',
      icon: ShieldCheck,
    },
    {
      title: 'Public Value',
      description: 'We prioritize topics that help readers make better daily decisions.',
      icon: Target,
    },
    {
      title: 'Human Storytelling',
      description: 'Data and facts are paired with real voices and clear narrative context.',
      icon: Users2,
    },
  ];

  const workflow = [
    {
      title: 'Research & Verification',
      description: 'Reporters gather facts, context, and source confirmations before drafting.',
      icon: Search,
    },
    {
      title: 'Editorial Review',
      description: 'Editors refine structure, check claims, and enforce publishing standards.',
      icon: PenSquare,
    },
    {
      title: 'Publish & Follow-up',
      description: 'Stories go live with updates when new evidence or developments appear.',
      icon: Newspaper,
    },
  ];

  const coveragePillars = [
    { title: 'Politics & Public Affairs', icon: Globe2 },
    { title: 'Business & Economy', icon: TrendingUp },
    { title: 'Culture & Community', icon: Star },
    { title: 'Technology & Innovation', icon: Zap },
  ];

  const latest = latestArticles || [];

  return (
    <>
      <Helmet>
        <title>About - {siteName}</title>
        <meta name="description" content={siteDescription} />
      </Helmet>

      <div className="bg-dark-50/40 dark:bg-dark-950">
        <section className="relative overflow-hidden border-b border-dark-200 dark:border-dark-800 bg-gradient-to-br from-primary-50 via-white to-amber-50 dark:from-dark-900 dark:via-dark-900 dark:to-dark-950">
          <div className="absolute -top-16 -left-16 h-52 w-52 rounded-full bg-primary-500/15 blur-3xl" />
          <div className="absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />

          <div className="container-custom relative py-14 sm:py-16 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 space-y-5">
                <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                  About Us
                </span>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-dark-900 dark:text-white leading-tight">
                  Building trust through clear, independent journalism.
                </h1>
                <p className="text-base sm:text-lg text-dark-600 dark:text-dark-300 max-w-2xl">
                  {siteDescription}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/articles">
                    <Button size="lg">Explore News</Button>
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-dark-300 dark:border-dark-600 px-5 py-3 text-sm font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                  >
                    Contact Team <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 grid gap-4">
                <div className="card p-5 sm:p-6">
                  {!shouldUseDefaultLogo ? (
                    <img
                      loading="lazy"
                      src={buildMediaUrl(siteLogo)}
                      alt={siteName}
                      className="h-10 sm:h-12 w-auto mb-5"
                    />
                  ) : (
                    <>
                      <img
                        loading="lazy"
                        src="/LogoV1.png"
                        alt={siteName}
                        className="h-10 sm:h-12 w-auto mb-5 dark:hidden"
                      />
                      <img
                        loading="lazy"
                        src="/LogoV1_white.png"
                        alt={siteName}
                        className="h-10 sm:h-12 w-auto mb-5 hidden dark:block"
                      />
                    </>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-primary-600 mt-0.5" />
                      <span className="text-dark-600 dark:text-dark-300">{siteAddress}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Mail className="w-4 h-4 text-primary-600 mt-0.5" />
                      <a href={`mailto:${siteEmail}`} className="text-dark-600 dark:text-dark-300 hover:text-primary-600 transition-colors break-all">
                        {siteEmail}
                      </a>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Phone className="w-4 h-4 text-primary-600 mt-0.5" />
                      <a href={`tel:${sitePhone.replace(/\s/g, '')}`} className="text-dark-600 dark:text-dark-300 hover:text-primary-600 transition-colors">
                        {sitePhone}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-4 text-center">
                    <p className="text-xl font-bold text-dark-900 dark:text-white">24/7</p>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mt-1">Updates</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-xl font-bold text-dark-900 dark:text-white">4K+</p>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mt-1">Stories</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-xl font-bold text-dark-900 dark:text-white">100%</p>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mt-1">Independent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-custom py-10 sm:py-12 lg:py-14">
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7 card p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">Our Mission</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mt-2">
                Inform clearly. Explain deeply. Serve the public.
              </h2>
              <p className="text-dark-600 dark:text-dark-300 mt-4 leading-relaxed">
                We created {siteName} to make journalism more useful for everyday readers. Our newsroom focuses on
                verified reporting, practical context, and responsible storytelling that values people over noise.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                  <p className="text-sm text-dark-600 dark:text-dark-300">Fact-checked stories with clear sources and context.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                  <p className="text-sm text-dark-600 dark:text-dark-300">Balanced coverage that avoids sensational framing.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                  <p className="text-sm text-dark-600 dark:text-dark-300">Continuous updates when facts evolve.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 grid gap-4">
              {values.map((value) => (
                <article key={value.title} className="card p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                      <value.icon className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-dark-900 dark:text-white">{value.title}</h3>
                      <p className="text-sm text-dark-600 dark:text-dark-300 mt-1">{value.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container-custom pb-10 sm:pb-12 lg:pb-14">
          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-primary-600" />
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">Newsroom Workflow</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {workflow.map((step, idx) => (
                <article key={step.title} className="rounded-2xl border border-dark-100 dark:border-dark-800 p-4 sm:p-5 bg-white dark:bg-dark-900">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300">
                      Step {idx + 1}
                    </span>
                    <step.icon className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                  </div>
                  <h3 className="font-semibold text-dark-900 dark:text-white">{step.title}</h3>
                  <p className="text-sm text-dark-600 dark:text-dark-300 mt-1">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container-custom pb-10 sm:pb-12 lg:pb-14">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">Coverage</p>
              <h2 className="font-display text-2xl font-bold text-dark-900 dark:text-white mt-1">What We Cover</h2>
            </div>
            <Link to="/categories" className="text-sm font-medium flex items-center gap-1 link-muted">
              Browse Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coveragePillars.map((pillar) => (
              <article key={pillar.title} className="card p-5">
                <pillar.icon className="w-5 h-5 text-primary-600 dark:text-primary-300 mb-3" />
                <h3 className="font-semibold text-dark-900 dark:text-white">{pillar.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="container-custom pb-10 sm:pb-12 lg:pb-14">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">Latest</p>
              <h2 className="font-display text-2xl font-bold text-dark-900 dark:text-white mt-1">From Our Newsroom</h2>
            </div>
            <Link to="/articles" className="text-sm font-medium flex items-center gap-1 link-muted">
              View All News <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLatestLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="card p-4 space-y-3">
                  <div className="h-40 skeleton rounded-xl" />
                  <div className="h-4 skeleton rounded w-2/3" />
                  <div className="h-4 skeleton rounded w-full" />
                  <div className="h-4 skeleton rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : latest.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {latest.map((article) => (
                <article key={article._id} className="card overflow-hidden hover:shadow-md transition-shadow">
                  <Link to={`/article/${article.slug}`} className="block">
                    <img
                      loading="lazy"
                      src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/720/460`}
                      alt={article.title}
                      className="h-40 w-full object-cover"
                    />
                    <div className="p-4">
                      <h3 className={cn(HOME_TYPE.cardTitleAll, 'line-clamp-2')}>{article.title}</h3>
                      <div className="mt-2 flex items-center justify-between text-xs text-dark-400">
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatRelativeTime(article.publishedAt)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.readTime || `${article.wordCount ? Math.max(1, Math.round(article.wordCount / 200)) : 3} min`}</span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-dark-500">
              No recent stories available right now.
            </div>
          )}
        </section>

        <section className="container-custom pb-14">
          <div className="rounded-3xl border border-dark-200 dark:border-dark-800 bg-dark-900 text-white overflow-hidden">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Join Our Community</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2">
                  Follow our reporting and be part of the conversation.
                </h2>
                <p className="text-white/80 mt-3 max-w-xl">
                  Stay updated with our latest investigations, explainers, and local stories that shape public dialogue.
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    Send Us a Message <MessageCircle className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 bg-white/5 border-t lg:border-t-0 lg:border-l border-white/10">
                <h3 className="font-semibold text-white mb-3">Connect With {siteName}</h3>
                <div className="space-y-3">
                  <a href={`mailto:${siteEmail}`} className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors break-all">
                    <Mail className="w-4 h-4" /> {siteEmail}
                  </a>
                  <a href={`tel:${sitePhone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
                    <Phone className="w-4 h-4" /> {sitePhone}
                  </a>
                  <p className="flex items-start gap-2 text-sm text-white/80">
                    <MapPin className="w-4 h-4 mt-0.5" /> {siteAddress}
                  </p>
                </div>
                {socialLinks.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {socialLinks.map((social, index) => {
                      const SocialIcon = socialIconMap[social.platform] || Link2;
                      return (
                        <a
                          key={`${social.platform || 'social'}-${index}`}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition-colors"
                        >
                          <SocialIcon className="w-4 h-4" />
                          <span className="capitalize">{social.platform || 'link'}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// ==================== ACCOUNT PAGE (Public Layout) ====================
export function AccountPage() {
  const { user, setUser } = useAuthStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const response = await usersAPI.uploadAvatar(formData);
      const avatar = response?.data?.data?.avatar;
      if (avatar) {
        setUser({ ...user, avatar });
        setAvatarFile(null);
        setAvatarPreview(null);
        toast.success('Profile picture updated!');
      } else {
        toast.error('Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(form);
  };

  return (
    <>
      <Helmet><title>Account - Bassac Media Center</title></Helmet>
      <div className="container-custom py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-6">Account</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="card p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar
                  src={buildMediaUrl(avatarPreview || user?.avatar)}
                  name={user?.fullName}
                  size="xl"
                  className="mx-auto"
                />
                <label
                  htmlFor="account-avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full cursor-pointer transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="account-avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              {avatarFile && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-dark-500 truncate">{avatarFile.name}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={handleAvatarUpload}
                      isLoading={isUploadingAvatar}
                    >
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-semibold text-dark-900 dark:text-white">{user?.fullName}</h2>
              <p className="text-dark-500">{user?.email}</p>
              <p className="text-sm text-primary-600 capitalize mt-1">{user?.role}</p>
            </div>
            <div className="card p-6">
              <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Edit Profile</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <Textarea label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
                <Button type="submit" isLoading={isPending}>Save Changes</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== PREVIEW PAGE ====================
export function PreviewPage() {
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const data = sessionStorage.getItem('articlePreview');
      if (data) {
        setPreviewData(JSON.parse(data));
      } else {
        setError('No preview data found. Please go back to the editor.');
      }
    } catch (e) {
      setError('Failed to load preview data.');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">Preview Error</h1>
          <p className="text-dark-500 mb-6">{error}</p>
          <button
            onClick={() => window.close()}
            className="btn btn-primary"
          >
            Close Preview
          </button>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
      </div>
    );
  }

  const { title, excerpt, content, featuredImage, tags } = previewData;
  const imageUrl = buildMediaUrl(featuredImage) || 'https://picsum.photos/seed/preview/1200/600';

  return (
    <div className="min-h-screen bg-white dark:bg-dark-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-amber-900 py-2 px-4 text-center font-medium">
        <span>📝 Preview Mode - This is how your news will look when published</span>
        <button
          onClick={() => window.close()}
          className="ml-4 px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
        >
          Close Preview
        </button>
      </div>

      <Helmet><title>{title || 'Untitled'} - Preview</title></Helmet>

      <article>
        <header className="relative">
          <div className="aspect-[21/9] lg:aspect-[3/1]">
            <img loading="lazy" src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="container-custom py-4 lg:py-12">
              <div className="max-w-4xl">
                <h1 className="font-display text-2xl lg:text-2xl font-bold text-white mb-4">
                  {title || 'Untitled News'}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(new Date())}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Draft
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container-custom py-12">
          <div className="max-w-4xl mx-auto">
            {excerpt && (
              <p className="text-2xl text-dark-600 dark:text-dark-300 mb-8 leading-relaxed">
                {excerpt}
              </p>
            )}
            <ArticleContent content={content} />

            {tags?.length > 0 && (
              <div className="mt-10 pt-6 border-t border-dark-200 dark:border-dark-800 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-sm bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

// ==================== PREVIEW BY ID PAGE (Pending/Draft) ====================
export function PreviewByIdPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useArticleById(id);
  const article = data?.data?.article || data?.article;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-950">
        <div className="container-custom py-8 sm:py-10">
          <ArticleDetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">News Not Found</h1>
          <p className="text-dark-500 mb-6">This news is not available for preview.</p>
          <Link to="/dashboard/pending" className="btn btn-primary">Back to Pending</Link>
        </div>
      </div>
    );
  }

  const { title, excerpt, content, featuredImage, author, createdAt, publishedAt, status } = article;
  const imageUrl = buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${id}/1200/600`;
  const authorName = author?.fullName || `${author?.firstName || ''} ${author?.lastName || ''}`.trim() || 'Unknown';
  const displayDate = publishedAt || createdAt;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-amber-900 py-2 px-4 text-center font-medium">
        <span>📝 Preview Mode - {status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Draft'}</span>
        <Link to="/dashboard/pending" className="ml-4 px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
          Back to Pending
        </Link>
      </div>

      <Helmet><title>{title || 'Untitled'} - Preview</title></Helmet>

      <article>
        <header className="relative">
          <div className="aspect-[21/9] lg:aspect-[3/1]">
            <img loading="lazy" src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="container-custom py-4 lg:py-12">
              <div className="max-w-4xl">
                <h1 className="font-display text-2xl lg:text-2xl font-bold text-white mb-4">
                  {title || 'Untitled News'}
                </h1>
                {excerpt && (
                  <p className="text-white/90 text-lg mb-4 max-w-2xl">{excerpt}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-white/80 text-sm">
                  <span>{authorName}</span>
                  {displayDate && <span>• {formatRelativeTime(displayDate)}</span>}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container-custom py-10">
          <ArticleContent content={content} />
        </div>
      </article>
    </div>
  );
}

// ==================== Verify Email Page ====================
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new verification email.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(buildApiUrl('/auth/verify-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred. Please try again later.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>Verify Email - Bassac Media</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Verifying Email</h1>
              <p className="text-dark-500">Please wait while we verify your email address...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Email Verified!</h1>
              <p className="text-dark-500 mb-4">{message}</p>
              <p className="text-sm text-dark-400">Redirecting to login...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Verification Failed</h1>
              <p className="text-dark-500 mb-6">{message}</p>
              <Link to="/login" className="btn btn-primary">Go to Login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Newsletter Confirm Page ====================
export function NewsletterConfirmPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid confirmation link. Please subscribe again.');
      return;
    }

    const confirm = async () => {
      try {
        await newsletterAPI.confirm(token);
        setStatus('success');
        setMessage('Your subscription has been confirmed!');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Confirmation failed. The link may have expired.');
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>Confirm Subscription - Bassac Media</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Confirming Subscription</h1>
              <p className="text-dark-500">Please wait while we confirm your subscription...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Subscribed!</h1>
              <p className="text-dark-500 mb-4">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Confirmation Failed</h1>
              <p className="text-dark-500 mb-6">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Newsletter Unsubscribe Page ====================
export function NewsletterUnsubscribePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token && !email) {
      setStatus('error');
      setMessage('Invalid unsubscribe link.');
      return;
    }

    const unsubscribe = async () => {
      try {
        await newsletterAPI.unsubscribe({ token, email });
        setStatus('success');
        setMessage('You have been unsubscribed successfully.');
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Unsubscribe failed. Please try again later.');
      }
    };

    unsubscribe();
  }, [token, email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>Unsubscribe - Bassac Media</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Processing</h1>
              <p className="text-dark-500">Please wait while we update your subscription...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Unsubscribed</h1>
              <p className="text-dark-500 mb-4">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Unsubscribe Failed</h1>
              <p className="text-dark-500 mb-6">{message}</p>
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Forgot Password Page ====================
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch(buildApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('If an account exists with this email, you will receive a password reset link.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>Forgot Password - Bassac Media</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary-600">Bassac Media</h1>
          </Link>
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Forgot Password</h2>
          <p className="text-dark-500 mb-6">Enter your email and we'll send you a reset link.</p>

          {status === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-dark-600 dark:text-dark-300 mb-6">{message}</p>
              <Link to="/login" className="btn btn-primary">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                  {message}
                </div>
              )}
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <p className="text-center text-sm text-dark-500">
                Remember your password?{' '}
                <Link to="/login" className="text-primary-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Reset Password Page ====================
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setStatus('idle');

    try {
      const response = await fetch(buildApiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password }),
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Your password has been reset successfully!');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Reset failed. The link may have expired.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'error' && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
        <Helmet>
          <title>Reset Password - Bassac Media</title>
        </Helmet>
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Invalid Link</h1>
            <p className="text-dark-500 mb-6">{message}</p>
            <Link to="/forgot-password" className="btn btn-primary">Request New Link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <Helmet>
        <title>Reset Password - Bassac Media</title>
      </Helmet>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold text-primary-600">Bassac Media</h1>
          </Link>
        </div>
        <div className="card p-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Password Reset!</h2>
              <p className="text-dark-500 mb-4">{message}</p>
              <p className="text-sm text-dark-400">Redirecting to login...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">Reset Password</h2>
              <p className="text-dark-500 mb-6">Enter your new password below.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'error' && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                    {message}
                  </div>
                )}
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-dark-400 hover:text-dark-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
