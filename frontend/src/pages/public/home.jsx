import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight } from 'lucide-react';
import { keepPreviousData } from '@tanstack/react-query';
import { useFeaturedArticles, useLatestArticles, useCategories, useArticles, useArticlesByCategory, usePublicSettings } from '../../hooks/useApi';
import { useHomepageAds, useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';
import { Button } from '../../components/common/index.jsx';
import { BodyAd } from '../../components/ads/index.js';
import { BetweenSectionsSlot } from '../../components/ads/BetweenSectionsSlot.jsx';
import { buildMediaUrl, cn, formatRelativeTime, getCategoryAccent } from '../../utils';
import { buildFacebookEmbedConfig, detectFacebookContentType, normalizeExternalUrl, normalizeFacebookCandidateUrl } from '../../utils/facebookEmbed';
import { SidebarAdSlot, useRightSidebarStickyTop } from './shared/rightSidebarAds.jsx';
import useLanguage from '../../hooks/useLanguage';

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

function formatVideoDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const SectionHeader = ({ eyebrow, title, subtitle, link, linkText = 'View all' }) => (
    <SectionHeaderInner eyebrow={eyebrow} title={title} subtitle={subtitle} link={link} linkText={linkText} />
);

function SectionHeaderInner({ eyebrow, title, subtitle, link, linkText = 'View all' }) {
  const { t, translateText } = useLanguage();

  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <p className={HOME_TYPE.eyebrow}>{eyebrow || translateText('Section')}</p>
        <h2 className={`${HOME_TYPE.sectionTitle} mt-1 leading-tight`}>
          {title}
        </h2>
        {subtitle && <p className={`${HOME_TYPE.sectionSubtitle} mt-1 max-w-xl`}>{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="text-sm font-medium flex items-center gap-1 link-muted">
          {linkText ? translateText(linkText) : t('common.viewAll', 'View all')} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// ==================== MIXED LEAD + LIST LAYOUT ====================
function MixedLeadList({
  articles,
  isLoading,
  emptyMessage,
  listTitle,
  leadAspectClass = 'aspect-[16/10]',
  showCategory = true,
}) {
    const { translateText } = useLanguage();
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
        return <p className="text-dark-500 text-center py-8">{emptyMessage || translateText('No news available')}</p>;
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
                <div className="text-xs uppercase tracking-widest text-dark-500">{translateText(listTitle)}</div>
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
    const { translateText } = useLanguage();
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
        return <p className="text-dark-500 text-center py-8">{translateText('No featured news. Mark news as featured in the dashboard.')}</p>;
    }

    if (!lead) {
        return <p className="text-dark-500 text-center py-8">{translateText('No additional featured news available.')}</p>;
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
                        <p className="text-xs uppercase tracking-[0.24em] text-dark-400">{translateText('Featured')}</p>
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
                            <p className="text-xs uppercase tracking-[0.24em] text-dark-400">{translateText('Highlight')}</p>
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
                            <p className="text-xs uppercase tracking-[0.24em] text-dark-400">{translateText('More Featured')}</p>
                            <span className="text-xs text-dark-400">{moreItems.length} {translateText('more')}</span>
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
  const { translateText } = useLanguage();
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
    return <p className="text-dark-500 text-center py-8">{translateText('No breaking news in the dashboard.')}</p>;
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        <span className="font-bold uppercase tracking-widest text-xs">{translateText('Breaking')}</span>
        <div className="flex flex-wrap gap-3 text-dark-700">
          {tickerItems.map((item) => (
            <Link key={item._id} to={`/article/${item.slug}`} className="hover:text-red-600 line-clamp-2">
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
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600 hidden md:display">{translateText('Alert')}</p>
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
    const { translateText } = useLanguage();
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
                <p className="text-dark-500">{translateText('No breaking news yet')}</p>
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
                            <div className="absolute bottom-0 left-0 right-0 p-4 pb-0 sm:p-6 h-full flex flex-col justify-between  ">
                                <p className="text-xs uppercase tracking-[0.24em] text-white/70">{translateText('Breaking')}</p>
                               <div> <div className="flex flex-wrap items-center gap-2 mt-2">
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
                                 <p className="hidden mt-2 max-w-2xl text-sm sm:text-base text-white/85 sm:line-clamp-2">
                                   {mainBreaking.excerpt}
                                 </p>
                               </div>
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
                        <p className="text-xs uppercase tracking-[0.24em] text-white/70">{translateText('Quick Update')}</p>
                        <p className="text-sm mt-2 text-white/90">{translateText('Fresh headlines drop every hour. Stay ahead with real-time coverage.')}</p>
                    </div>
                </div>
            </div>

            <BreakingNewsSection section={section} excludeArticles={[mainBreaking, ...sideBreaking]} />
        </div>
    );
}

// ==================== LATEST SECTION ====================
function LatestSection({ section, excludeArticleIds = [], onArticlesResolved }) {
    const { translateText } = useLanguage();
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
        return <p className="text-dark-500 text-center py-8">{translateText('No news published yet')}</p>;
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
                        className="px-3 py-1.5 text-sm rounded-lg sm:px-5 sm:py-2.5 sm:text-base sm:rounded-xl"
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                        {translateText('See more')}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ==================== CATEGORY GRID SECTION ====================
function CategoryGridSection({ section }) {
    const { translateText } = useLanguage();
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
        return <p className="text-dark-500 text-center py-8">{translateText('No news published yet')}</p>;
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
                            {block.category?.name || translateText('Uncategorized')}
                        </span>
                        {block.category?.slug && (
                            <Link to={`/category/${block.category.slug}`} className="text-xs sm:text-sm link-muted">
                                {translateText('View')} →
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
    const { translateText } = useLanguage();
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
        return <p className="text-dark-500 text-center py-8">{translateText('No trending news')}</p>;
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
                            <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary-600">#1 {translateText('Trending')}</p>
                            <h3 className={HOME_TYPE.bigTitle}>
                                {lead.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-dark-400 mt-2">{lead.viewCount || 0} {translateText('views')}</p>
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
                            <p className="text-xs sm:text-sm text-dark-400">{article.viewCount || 0} {translateText('views')}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

// ==================== NEWS LIST SECTION ====================
function NewsListSection({ section, excludeArticleIds = [], onArticlesResolved }){
    const { translateText } = useLanguage();
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
                emptyMessage={translateText('No news published yet')}
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
                        className="px-3 py-1.5 text-sm rounded-lg sm:px-5 sm:py-2.5 sm:text-base sm:rounded-xl"
                    >
                        {translateText('See more')}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ==================== GRID WITH SIDEBAR SECTION ====================
function GridWithSidebarSection({ section }) {
    const { translateText } = useLanguage();
    const { data, isLoading } = useArticles({
        page: 1,
        limit: section.settings?.limit || 7
    });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage={translateText('No news published yet')}
            listTitle={section.settings?.sidebarTitle || translateText('More Stories')}
        />
    );
}

// ==================== FEATURED + LIST SECTION (Magazine Layout) ====================
function MagazineLayoutSection({ section }) {
    const { translateText } = useLanguage();
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 5 });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage={translateText('No news published yet')}
        />
    );
}

// ==================== CATEGORY TABS SECTION ====================
function CategoryTabsSection({ section }) {
    const { translateText } = useLanguage();
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
                emptyMessage={translateText('No news published yet')}
            />
        </div>
    );
}

// ==================== OPINION/EDITORS PICK SECTION ====================
function EditorPicksSection({ section }) {
    const { translateText } = useLanguage();
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
        return <p className="text-dark-500 text-center py-8">{translateText('No editor picks available')}</p>;
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

function CustomHtmlSection({ section }) {
  if (!section.settings?.customHtml) return null;

  return (
    <div dangerouslySetInnerHTML={{ __html: section.settings.customHtml }} />
  );
}

// ==================== CATEGORY SPOTLIGHT SECTION ====================
function CategorySpotlightSection({ section }) {
  const { translateText } = useLanguage();
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
    return <p className="text-dark-500 text-center py-8">{translateText('No news in this category yet')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900 p-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-dark-400 mb-1">{translateText('Spotlight')}</p>
          <h3 className="text-lg font-bold text-dark-900 dark:text-white">
            {category?.name || translateText('Category')}
          </h3>
          <p className="text-sm text-dark-500">{translateText('Power, policy, and people shaping the week.')}</p>
        </div>
        {categorySlug && (
          <Link to={`/category/${categorySlug}`} className="text-sm link-primary">
            {translateText('More')} →
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

function VideoSection({ section }) {
  const { translateText } = useLanguage();
  const [failedEmbeds, setFailedEmbeds] = useState({});
  const rawLimit = Number(section?.settings?.limit);
  const displayLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 4;
  const { data: videoData, isLoading: isVideoLoading } = useArticles({
    page: 1,
    limit: displayLimit,
    postType: 'video',
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  }, { placeholderData: keepPreviousData });
  const videoArticles = videoData?.data?.articles || [];
  const normalizedVideos = videoArticles
    .map((article, index) => {
      const facebookUrl = normalizeFacebookCandidateUrl(article?.videoUrl || '');
      const contentType = detectFacebookContentType(facebookUrl);
      const defaultHeadline = contentType === 'reel'
        ? translateText('Facebook Reel')
        : contentType === 'post'
          ? translateText('Facebook Post')
          : translateText('Facebook Video');
      const headline = String(article?.title || '').trim();

      return {
        id: article?._id || article?.slug || `${section?.id || 'video'}-${index}`,
        facebookUrl,
        headline: headline || `${defaultHeadline} ${index + 1}`,
        description: String(article?.excerpt || '').trim(),
        publishedAt: article?.publishedAt || article?.createdAt || '',
        display: 'auto',
      };
    })
    .filter((item) => item.facebookUrl)
    .slice(0, displayLimit);
  const resetKey = normalizedVideos.map((item) => `${item.id}:${item.facebookUrl}:${item.display}`).join('|');

  useEffect(() => {
    setFailedEmbeds({});
  }, [resetKey]);

  const featuredIndex = normalizedVideos.findIndex((item) => {
    const embedConfig = buildFacebookEmbedConfig(item.facebookUrl, { display: item.display });
    return embedConfig?.aspectClass !== 'aspect-[9/16]';
  });
  const resolvedFeaturedIndex = featuredIndex >= 0 ? featuredIndex : 0;
  const featuredVideo = normalizedVideos[resolvedFeaturedIndex];
  const moreVideos = normalizedVideos.filter((_, index) => index !== resolvedFeaturedIndex);
  const showHeader = section?.showTitle !== false;
  const resolvedTitle = section?.title || translateText('Latest Videos');
  const resolvedSubtitle = section?.subtitle || translateText('Facebook posts, videos, and reels in one place');
  const viewAllUrl = normalizeExternalUrl(section?.settings?.viewAllUrl || '');
  const viewAllLabel = (section?.settings?.viewAllLabel || '').trim() || translateText('View all');

  const renderVideoEmbed = (video, { eager = false } = {}) => {
    const embedConfig = buildFacebookEmbedConfig(video.facebookUrl, { display: video.display });
    const isFailed = Boolean(failedEmbeds[video.id]);
    if (!embedConfig || isFailed) {
      const fallbackAspectClass = embedConfig?.aspectClass || (video.display === 'reel' ? 'aspect-[9/16]' : 'aspect-[16/9]');
      return (
        <div className={`${fallbackAspectClass} bg-dark-100 dark:bg-dark-800 flex items-center justify-center p-4 text-center`}>
          <div>
            <p className="text-sm text-dark-500">{translateText('This video cannot be embedded right now.')}</p>
            <a
              href={video.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm link-primary"
            >
              {translateText('Open on Facebook')} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className={`${embedConfig.aspectClass} bg-black`}>
        <iframe
          title={video.headline}
          src={embedConfig.src}
          className="w-full h-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading={eager ? 'eager' : 'lazy'}
          referrerPolicy="origin-when-cross-origin"
          onError={() => {
            setFailedEmbeds((prev) => (prev[video.id] ? prev : { ...prev, [video.id]: true }));
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className={HOME_TYPE.eyebrow}>{translateText('Videos')}</p>
            <h2 className={`${HOME_TYPE.sectionTitle} mt-1 leading-tight`}>
              {resolvedTitle}
            </h2>
            {resolvedSubtitle && (
              <p className={`${HOME_TYPE.sectionSubtitle} mt-1 max-w-xl`}>{resolvedSubtitle}</p>
            )}
          </div>
          {viewAllUrl ? (
            <a
              href={viewAllUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium flex items-center gap-1 link-muted"
            >
              {viewAllLabel} <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <Link to="/videos" className="text-sm font-medium flex items-center gap-1 link-muted">
              {viewAllLabel} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}

      {isVideoLoading && normalizedVideos.length === 0 ? (
        <p className="text-dark-500 text-center py-8">{translateText('Loading more...')}</p>
      ) : !normalizedVideos.length ? (
        <p className="text-dark-500 text-center py-8">{translateText('No video posts yet')}</p>
      ) : (
        <>
          <article className="rounded-2xl overflow-hidden border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900">
            {renderVideoEmbed(featuredVideo, { eager: true })}
            <div className="p-4 sm:p-5">
              <a href={featuredVideo.facebookUrl} target="_blank" rel="noopener noreferrer">
                <h3 className={HOME_TYPE.bigTitle}>{featuredVideo.headline}</h3>
              </a>
              {featuredVideo.description && (
                <p className={`${HOME_TYPE.body} mt-2 line-clamp-3`}>{featuredVideo.description}</p>
              )}
              <div className="mt-3 flex items-center gap-3 text-xs text-dark-400">
                <a href={featuredVideo.facebookUrl} target="_blank" rel="noopener noreferrer" className="link-primary">
                  {translateText('View on Facebook')}
                </a>
                {formatVideoDate(featuredVideo.publishedAt) && (
                  <span>{formatVideoDate(featuredVideo.publishedAt)}</span>
                )}
              </div>
            </div>
          </article>

          {moreVideos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {moreVideos.map((video) => (
                <article
                  key={video.id}
                  className="rounded-2xl overflow-hidden border border-dark-100 dark:border-dark-800 bg-white dark:bg-dark-900"
                >
                  {renderVideoEmbed(video)}
                  <div className="p-4">
                    <a href={video.facebookUrl} target="_blank" rel="noopener noreferrer">
                      <h4 className={HOME_TYPE.cardTitleAll}>{video.headline}</h4>
                    </a>
                    {video.description && (
                      <p className="text-sm text-dark-500 mt-2 line-clamp-2">{video.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-dark-400">
                      <a href={video.facebookUrl} target="_blank" rel="noopener noreferrer" className="link-primary">
                        {translateText('View on Facebook')}
                      </a>
                      {formatVideoDate(video.publishedAt) && (
                        <span>{formatVideoDate(video.publishedAt)}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Render dynamic section based on type
function DynamicSection({ section, excludeArticleIds = [], onArticlesResolved }) {
  const { translateText } = useLanguage();
  switch (section.type) {
    case 'hero':
      return null;

    case 'featured_articles':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Featured')} title={section.title} subtitle={section.subtitle} link="/articles" />}
          <FeaturedSection section={section} />
        </div>
      );

    case 'latest_articles':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Latest')} title={section.title} subtitle={section.subtitle} link="/articles" />}
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
          {section.title && <SectionHeader eyebrow={translateText('Categories')} title={section.title} subtitle={section.subtitle} link="/categories" />}
          <CategoryGridSection section={section} />
        </div>
      );

    case 'trending':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Trending')} title={section.title} subtitle={section.subtitle} />}
          <TrendingSection section={section} />
        </div>
      );

    case 'newsletter_signup':
    case 'ad_banner':
      return null;

    case 'video':
    case 'video_section':
      return (
        <div className="mb-2">
          <VideoSection section={section} />
        </div>
      );

    case 'custom_html':
      return <CustomHtmlSection section={section} />;

    case 'breaking_news':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Breaking')} title={section.title} subtitle={section.subtitle} />}
          <BreakingHeroSection section={section} />
        </div>
      );

    case 'news_list':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('News')} title={section.title} subtitle={section.subtitle} link="/articles" />}
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
          {section.title && <SectionHeader eyebrow={translateText('Stories')} title={section.title} subtitle={section.subtitle} link="/articles" />}
          <GridWithSidebarSection section={section} />
        </div>
      );

    case 'magazine_layout':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Magazine')} title={section.title} subtitle={section.subtitle} link="/articles" />}
          <MagazineLayoutSection section={section} />
        </div>
      );

    case 'category_tabs':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Categories')} title={section.title} subtitle={section.subtitle} />}
          <CategoryTabsSection section={section} />
        </div>
      );

    case 'editor_picks':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Editors')} title={section.title} subtitle={section.subtitle} />}
          <EditorPicksSection section={section} />
        </div>
      );

    case 'category_spotlight':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader eyebrow={translateText('Spotlight')} title={section.title} subtitle={section.subtitle} link={section.settings?.categorySlug ? `/category/${section.settings.categorySlug}` : '/articles'} />}
          <CategorySpotlightSection section={section} />
        </div>
      );

    default:
      return null;
  }
}

// ==================== HOME PAGE ====================
export function HomePage() {
  const { t, translateText } = useLanguage();
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
  const sidebarStickyTop = useRightSidebarStickyTop();

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
          <title>{publicSettings?.seo?.metaTitle || publicSettings?.siteName || 'Bassac Post'}</title>
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
            <aside
              className="hidden lg:block w-[300px] flex-shrink-0 lg:self-start lg:sticky"
              style={{ top: `${sidebarStickyTop}px` }}
            >
              <div>
                <SidebarAdSlot
                  ads={sidebarStackAds}
                  pageType="homepage"
                  pageUrl={pageUrl}
                  device={device}
                  trackAdEvent={trackAdEvent}
                />

	                {/* Newsletter */}
	                <div className="mt-6 bg-primary-600 rounded-lg p-5 text-white">
	                  <h3 className="font-bold mb-2">{t('common.stayUpdated', 'Stay Updated')}</h3>
	                  <p className="text-primary-100 text-sm mb-4">{t('common.latestNewsInbox', 'Get the latest news delivered to your inbox.')}</p>
	                  <input
	                    type="email"
	                    placeholder={t('common.yourEmail', 'Your email')}
	                    className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
	                  />
	                  <button className="w-full py-2 bg-white text-primary-600 text-sm font-medium rounded hover:bg-primary-50 transition-colors">
	                    {t('common.subscribe', 'Subscribe')}
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
        <title>{`${publicSettings?.siteName || 'Bassac Post'} - ${translateText('Latest News & Updates')}`}</title>
      </Helmet>

      <div className="container-custom py-6 lg:py-8 text-[15px] sm:text-base">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
	            {/* Breaking News Section */}
	            <section className="mb-10">
	              <SectionHeader
                  eyebrow={translateText('Breaking')}
                  title={translateText('Breaking News')}
                  subtitle={translateText('Latest alerts and urgent updates')}
                />
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
	                <h2 className="text-2xl font-bold text-primary-600 mb-5 uppercase tracking-wide">{translateText('Trending')}</h2>
	                <MixedLeadList
	                  articles={trendingArticles}
	                  isLoading={trendingLoading}
	                  emptyMessage={translateText('No trending news')}
	                  leadAspectClass="aspect-[16/7]"
	                />
	              </section>
	            )}

            {renderAdGroup(betweenSectionsAds[1], 'between_sections', { fixedHeight: 100 })}

	            {/* Latest News Section */}
	            <section className="mb-10">
	              <h2 className="text-2xl font-bold text-primary-600 mb-5 uppercase tracking-wide">{translateText('Latest News')}</h2>
	              <MixedLeadList
	                articles={latestNews}
	                isLoading={latestLoading}
	                emptyMessage={translateText('No news published yet')}
	              />
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
	                {latestNews.length >= latestLimit && (
		                  <Button
		                    variant="outline"
		                    onClick={() => navigate('/articles')}
		                    isLoading={isFetchingLatest}
                        className="px-3 py-1.5 text-sm rounded-lg sm:px-5 sm:py-2.5 sm:text-base sm:rounded-xl"
		                    rightIcon={<ArrowRight className="w-4 h-4" />}
			                  >
			                    {translateText('See more')}
			                  </Button>
		                )}
	                <Link to="/articles" className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-primary-600 text-primary-600 font-medium rounded-lg hover:bg-primary-600 hover:text-white transition-colors">
	                  {translateText('View All News')} <ArrowRight className="w-4 h-4" />
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
          <aside
            className="hidden lg:block w-[300px] flex-shrink-0 lg:self-start lg:sticky"
            style={{ top: `${sidebarStickyTop}px` }}
          >
            <div>
              <SidebarAdSlot
                ads={sidebarStackAds}
                pageType="homepage"
                pageUrl={pageUrl}
                device={device}
                trackAdEvent={trackAdEvent}
              />

	              <div className="mt-6 bg-primary-600 rounded-lg p-5 text-white">
	                <h3 className="font-bold mb-2">{t('common.stayUpdated', 'Stay Updated')}</h3>
	                <p className="text-primary-100 text-sm mb-4">{t('common.latestNewsInbox', 'Get the latest news delivered to your inbox.')}</p>
	                <input
	                  type="email"
	                  placeholder={t('common.yourEmail', 'Your email')}
	                  className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
	                />
	                <button className="w-full py-2 bg-white text-primary-600 text-sm font-medium rounded hover:bg-primary-50 transition-colors">
	                  {t('common.subscribe', 'Subscribe')}
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
  const { translateText } = useLanguage();
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
          {translateText('More')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <MixedLeadList
        articles={articles}
        isLoading={isLoading}
        emptyMessage={`${translateText('No news in this category yet')}: ${category.name}`}
      />
    </section>
  );
}
