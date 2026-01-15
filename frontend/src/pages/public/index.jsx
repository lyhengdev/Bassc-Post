import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Zap, Calendar, Clock, Eye, Facebook, Twitter, Linkedin, ArrowLeft, Search, Eye as EyeIcon, EyeOff, TrendingUp, Star, Mail, MessageCircle, ThumbsUp, Reply, Send, Trash2, User, Camera } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFeaturedArticles, useLatestArticles, useCategories, useArticles, useArticleBySlug, useArticlesByCategory, useRelatedArticles, useLogin, useRegister, useSubmitContact, usePublicSettings, useArticleComments, useCreateComment, useLikeComment, useDeleteComment, useSubscribeNewsletter, useUpdateProfile } from '../../hooks/useApi';
import { useArticleAds, useHomepageAds, useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';
import { articlesAPI, usersAPI } from '../../services/api';
import { ArticleCard, FeaturedArticle, ArticleContent } from '../../components/article/index.jsx';
import { Button, Avatar, Badge, ContentLoader, ArticleListSkeleton, Input, Textarea, ConfirmModal, Modal } from '../../components/common/index.jsx';
import { BodyAd } from '../../components/ads/index.js';
import { formatDate, calculateReadTime, cn, formatRelativeTime, getCategoryAccent } from '../../utils';
import { useAuthStore } from '../../stores/authStore';

// Dynamic Section Components - Kiripost Style

// ==================== HERO SECTION (Main + Side Articles) ====================
function HeroSection({ settings }) {
    const { data: featured, isLoading } = useFeaturedArticles(settings?.limit || 3);
    const mainFeatured = featured?.[0];
    const sideFeatured = featured?.slice(1, 3) || [];

    if (isLoading) {
        return (
            <div className="grid grid-cols-12 gap-4 sm:gap-6">
                <div className="col-span-7">
                    <div className="aspect-[4/3] skeleton rounded-lg" />
                </div>
                <div className="col-span-5 space-y-4 sm:space-y-6">
                    <div className="aspect-[16/10] skeleton rounded-lg" />
                    <div className="aspect-[16/10] skeleton rounded-lg" />
                </div>
            </div>
        );
    }

    if (!mainFeatured) {
        return (
            <div className="h-[400px] rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                <div className="text-center text-white">
                    <h1 className="text-4xl font-bold mb-4">Welcome to Bassac Media</h1>
                    <p className="text-xl text-white/80">Your source for quality content</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-12 gap-4 sm:gap-6">
            {/* Main Featured Article */}
            <div className="col-span-7">
                <article>
                    <Link to={`/article/${mainFeatured.slug}`} className="block group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-2 sm:mb-3">
                            <img
                                src={mainFeatured.featuredImage || `https://picsum.photos/seed/${mainFeatured.slug}/800/600`}
                                alt={mainFeatured.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </Link>
                    <p className="text-dark-500 text-xs sm:text-sm mb-2 line-clamp-1 italic">
                        {mainFeatured.excerpt?.substring(0, 100)}...
                    </p>
                    {mainFeatured.category && (
                        <Link to={`/category/${mainFeatured.category.slug}`} className="text-dark-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider hover:text-primary-600">
                            {mainFeatured.category.name}
                        </Link>
                    )}
                    <Link to={`/article/${mainFeatured.slug}`}>
                        <h2 className="text-base sm:text-2xl lg:text-3xl font-bold text-dark-900 dark:text-white mt-1 mb-2 sm:mb-3 leading-tight hover:text-primary-600 transition-colors line-clamp-3">
                            {mainFeatured.title}
                        </h2>
                    </Link>
                    <p className="text-dark-600 dark:text-dark-400 text-xs sm:text-base leading-relaxed line-clamp-3 mb-2 sm:mb-3">
                        {mainFeatured.excerpt}
                    </p>
                    <span className="text-dark-400 text-xs sm:text-sm">{formatRelativeTime(mainFeatured.publishedAt)}</span>
                </article>
            </div>

            {/* Side Articles */}
            <div className="col-span-5 space-y-4 sm:space-y-6">
                {sideFeatured.map((article) => (
                    <article key={article._id}>
                        <Link to={`/article/${article.slug}`} className="block group">
                            <div className="aspect-[16/10] rounded-lg overflow-hidden mb-2">
                                <img
                                    src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/500/300`}
                                    alt={article.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                        </Link>
                        {article.category && (
                            <Link
                                to={`/category/${article.category.slug}`}
                                className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider hover:underline"
                                style={{ color: article.category.color || getCategoryAccent(article.category.name) }}
                            >
                                {article.category.name}
                            </Link>
                        )}
                        <Link to={`/article/${article.slug}`}>
                            <h3 className="font-semibold sm:font-bold text-sm sm:text-base text-dark-900 dark:text-white mt-1 mb-1 leading-snug hover:text-primary-600 transition-colors line-clamp-2">
                                {article.title}
                            </h3>
                        </Link>
                        <span className="text-dark-400 text-xs sm:text-sm">{formatRelativeTime(article.publishedAt)}</span>
                    </article>
                ))}
            </div>
        </div>
    );
}

// ==================== MIXED LEAD + LIST LAYOUT ====================
function MixedLeadList({ articles, isLoading, emptyMessage, listTitle }) {
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-7">
                        <div className="aspect-[16/10] skeleton rounded-lg" />
                    </div>
                    <div className="col-span-5 space-y-3">
                        <div className="h-3 skeleton rounded w-1/3" />
                        <div className="h-6 skeleton rounded" />
                        <div className="h-4 skeleton rounded w-5/6" />
                        <div className="h-4 skeleton rounded w-2/3" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
        return <p className="text-dark-500 text-center py-8">{emptyMessage || 'No articles available'}</p>;
    }

    const [lead, ...rest] = articles;

    return (
        <div className="space-y-6">
            <article className="grid grid-cols-12 gap-4">
                <Link to={`/article/${lead.slug}`} className="col-span-7 block group">
                    <div className="aspect-[16/10] rounded-lg overflow-hidden">
                        <img
                            src={lead.featuredImage || `https://picsum.photos/seed/${lead.slug}/800/500`}
                            alt={lead.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>
                </Link>
                <div className="col-span-5">
                    {lead.category && (
                        <Link
                            to={`/category/${lead.category.slug}`}
                            className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider hover:underline"
                            style={{ color: lead.category.color || '#6B7280' }}
                        >
                            {lead.category.name}
                        </Link>
                    )}
                    <Link to={`/article/${lead.slug}`}>
                        <h3 className="text-base sm:text-xl font-bold text-dark-900 dark:text-white mt-2 leading-snug hover:text-primary-600 transition-colors line-clamp-3">
                            {lead.title}
                        </h3>
                    </Link>
                    {lead.excerpt && (
                        <p className="text-dark-600 dark:text-dark-400 text-xs sm:text-sm mt-2 sm:mt-3 line-clamp-3">{lead.excerpt}</p>
                    )}
                    <span className="text-dark-400 text-xs sm:text-sm mt-2 sm:mt-3 block">{formatRelativeTime(lead.publishedAt)}</span>
                </div>
            </article>

            {listTitle && rest.length > 0 && (
                <div className="text-xs uppercase tracking-widest text-dark-500">{listTitle}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
                {rest.map((article) => (
                    <article key={article._id} className="flex gap-4 group">
                        <Link to={`/article/${article.slug}`} className="flex-shrink-0">
                            <img
                                src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/240/160`}
                                alt={article.title}
                                className="w-24 h-16 sm:w-[120px] sm:h-[80px] object-cover rounded-lg group-hover:opacity-90 transition-opacity"
                            />
                        </Link>
                        <div className="flex-1 min-w-0">
                            {article.category && (
                                <Link
                                    to={`/category/${article.category.slug}`}
                                    className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider hover:underline"
                                    style={{ color: article.category.color || '#6B7280' }}
                                >
                                    {article.category.name}
                                </Link>
                            )}
                            <Link to={`/article/${article.slug}`}>
                                <h4 className="font-semibold text-sm sm:text-base text-dark-900 dark:text-white leading-snug line-clamp-2 hover:text-primary-600 transition-colors mt-1">
                                    {article.title}
                                </h4>
                            </Link>
                            {article.excerpt && (
                                <p className="text-dark-500 text-[11px] sm:text-xs mt-1 line-clamp-2">{article.excerpt}</p>
                            )}
                            <span className="text-dark-400 text-[10px] sm:text-xs mt-1 block">{formatRelativeTime(article.publishedAt)}</span>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}

// ==================== FEATURED SECTION ====================
function FeaturedSection({ section }) {
    const { data: featured, isLoading } = useFeaturedArticles(section.settings?.limit || 4);

    return (
        <MixedLeadList
            articles={featured || []}
            isLoading={isLoading}
            emptyMessage="No featured articles. Mark articles as featured in the dashboard."
        />
    );
}

// ==================== BREAKING NEWS SECTION ====================
function BreakingNewsSection({ section }) {
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 4, isBreaking: true });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No breaking news in the dashboard."
        />
    );
}

// ==================== LATEST SECTION ====================
function LatestSection({ section }) {
    const { data: latest, isLoading } = useLatestArticles(section.settings?.limit || 8);

    return (
        <MixedLeadList
            articles={latest || []}
            isLoading={isLoading}
            emptyMessage="No articles published yet"
        />
    );
}

// ==================== CATEGORY GRID SECTION ====================
function CategoryGridSection({ section }) {
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 6 });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No articles published yet"
        />
    );
}

// ==================== TRENDING SECTION ====================
function TrendingSection({ section }) {
    const { data, isLoading } = useArticles({ page: 1, limit: section.settings?.limit || 6, sort: '-viewCount' });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No trending articles"
        />
    );
}

// ==================== NEWS LIST SECTION ====================
function NewsListSection({ section }) {
    const { data, isLoading } = useArticles({ 
        page: 1, 
        limit: section.settings?.limit || 8,
        category: section.settings?.category || undefined
    });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No articles published yet"
        />
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
            emptyMessage="No articles published yet"
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
            emptyMessage="No articles published yet"
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
        category: categories[activeTab]?._id || undefined
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
                emptyMessage="No articles published yet"
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
                    onImpression={(adData) => trackAdEvent({
                        adId: adData._id,
                        type: 'impression',
                        pageType: 'homepage',
                        pageUrl,
                        device,
                        placement: adData.placement
                    })}
                    onClick={(adData) => trackAdEvent({
                        adId: adData._id,
                        type: 'click',
                        pageType: 'homepage',
                        pageUrl,
                        device,
                        placement: adData.placement
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
            <img 
                src={fallbackImage} 
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
        limit: section.settings?.limit || 3,
        isFeatured: true
    });
    const articles = data?.data?.articles || [];

    return (
        <MixedLeadList
            articles={articles}
            isLoading={isLoading}
            emptyMessage="No editor picks available"
        />
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
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">{section.title || 'Subscribe to Our Newsletter'}</h2>
        <p className="text-white/80 mb-6">{section.subtitle || 'Get the latest articles delivered to your inbox'}</p>
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

  return (
    <MixedLeadList
      articles={articles}
      isLoading={isLoading}
      emptyMessage="No articles in this category yet"
    />
  );
}

// Render dynamic section based on type
function DynamicSection({ section }) {
  // Section header component - Kiripost style
  const SectionHeader = ({ title, subtitle, link, linkText = 'More' }) => (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-xl font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
          {title}
        </h2>
        {subtitle && <p className="text-dark-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="text-dark-400 hover:text-primary-600 text-sm font-medium flex items-center gap-1">
          {linkText} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );

  switch (section.type) {
    case 'hero':
      return <HeroSection settings={section.settings} />;
      
    case 'featured_articles':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} link="/articles" />}
          <FeaturedSection section={section} />
        </div>
      );
      
    case 'latest_articles':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} link="/articles" />}
          <LatestSection section={section} />
        </div>
      );
      
    case 'category_grid':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} link="/categories" />}
          <CategoryGridSection section={section} />
        </div>
      );
      
    case 'trending':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} />}
          <TrendingSection section={section} />
        </div>
      );
      
    case 'newsletter_signup':
      return <NewsletterSection section={section} />;
      
    case 'custom_html':
      return <CustomHtmlSection section={section} />;
      
    case 'breaking_news':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} />}
          <BreakingNewsSection section={section} />
        </div>
      );
      
    case 'news_list':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} link="/articles" />}
          <NewsListSection section={section} />
        </div>
      );
      
    case 'grid_with_sidebar':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} link="/articles" />}
          <GridWithSidebarSection section={section} />
        </div>
      );
      
    case 'magazine_layout':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} link="/articles" />}
          <MagazineLayoutSection section={section} />
        </div>
      );
      
    case 'category_tabs':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} />}
          <CategoryTabsSection section={section} />
        </div>
      );
      
    case 'ad_banner':
      return <AdBannerSection section={section} />;
      
    case 'video':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} />}
          <VideoSection section={section} />
        </div>
      );
      
    case 'editor_picks':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} />}
          <EditorPicksSection section={section} />
        </div>
      );
      
    case 'category_spotlight':
      return (
        <div className="mb-2">
          {section.title && <SectionHeader title={section.title} subtitle={section.subtitle} link={section.settings?.categoryId ? `/category/${section.settings.categoryId}` : '/articles'} />}
          <CategorySpotlightSection section={section} />
        </div>
      );
      
    default:
      return null;
  }
}

const SidebarAdSlot = ({ ad, pageType, pageUrl, device, trackAdEvent }) => (
  <>
    <div className="text-[10px] text-dark-400 mb-1">Ad</div>
    <div className="bg-dark-100 dark:bg-dark-800 rounded-lg overflow-hidden">
      {ad ? (
        <div className="p-2">
          <BodyAd
            ad={ad}
            onImpression={(adData) => trackAdEvent({
              adId: adData._id,
              type: 'impression',
              pageType,
              pageUrl,
              device,
              placement: adData.placement
            })}
            onClick={(adData) => trackAdEvent({
              adId: adData._id,
              type: 'click',
              pageType,
              pageUrl,
              device,
              placement: adData.placement
            })}
          />
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
  </>
);

// ==================== HOME PAGE ====================
export function HomePage() {
  const { data: publicSettings } = usePublicSettings();
  const { data: featured, isLoading: featuredLoading } = useFeaturedArticles(4);
  const { data: latest, isLoading: latestLoading } = useLatestArticles(8);
  const { data: trending, isLoading: trendingLoading } = useArticles({ page: 1, limit: 6, sort: '-viewCount' });
  const { data: categories } = useCategories();
  const device = useDeviceType();
  const { data: homepageAds } = useHomepageAds(device);
  const { data: popupAds } = useSelectAds('popup', {
    pageType: 'homepage',
    device,
    limit: 1
  });
  const { data: rightHeroAds } = useSelectAds('custom', {
    pageType: 'homepage',
    device,
    placementId: 'right_hero',
    limit: 1
  });
  const { mutate: trackAdEvent } = useTrackAdEvent();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const trendingArticles = trending?.data?.articles || [];
  const mainFeatured = featured?.[0];
  const sideFeatured = featured?.slice(1, 3) || [];
  const latestNews = latest || [];
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  const afterHeroAds = homepageAds?.after_hero || [];
  const betweenSectionsAds = homepageAds?.between_sections || {};
  const rightHeroAd = rightHeroAds?.[0];
  const popupAd = popupAds?.[0];
  const isDev = import.meta?.env?.DEV;
  const betweenSectionsSummary = Object.keys(betweenSectionsAds || {})
    .map((key) => `${key}:${betweenSectionsAds[key]?.length || 0}`)
    .join(', ') || 'none';

  useEffect(() => {
    if (popupAd) {
      setIsPopupOpen(true);
    }
  }, [popupAd]);

  const renderAdGroup = (ads) => {
    if (!ads?.length) return null;
    return (
      <div className="my-8 space-y-6">
        {ads.map((ad) => (
          <BodyAd
            key={ad._id}
            ad={ad}
            onImpression={(adData) => trackAdEvent({
              adId: adData._id,
              type: 'impression',
              pageType: 'homepage',
              pageUrl,
              device,
              placement: adData.placement
            })}
            onClick={(adData) => trackAdEvent({
              adId: adData._id,
              type: 'click',
              pageType: 'homepage',
              pageUrl,
              device,
              placement: adData.placement
            })}
          />
        ))}
      </div>
    );
  };

  // Get homepage sections from settings
  const homepageSections = publicSettings?.homepageSections || [];

  // If custom sections defined, render them dynamically with sidebar
  if (homepageSections.length > 0) {
    return (
      <>
        <Helmet>
          <title>{publicSettings?.seo?.metaTitle || publicSettings?.siteName || 'Bassac Media'}</title>
        </Helmet>

        <PopupAdModal
          ad={popupAd}
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onImpression={(adData) => trackAdEvent({
            adId: adData._id,
            type: 'impression',
            pageType: 'homepage',
            pageUrl,
            device,
            placement: adData.placement
          })}
          onClick={(adData) => trackAdEvent({
            adId: adData._id,
            type: 'click',
            pageType: 'homepage',
            pageUrl,
            device,
            placement: adData.placement
          })}
        />
        
        <div className="container-custom py-6 lg:py-8">
          <div className="flex gap-6 lg:gap-8">
            {/* Main Content - Dynamic Sections */}
            <div className="flex-1 min-w-0">
              {homepageSections
                .filter(s => s.enabled)
                .sort((a, b) => a.order - b.order)
                .map((section, index) => (
                  <div key={section.id} className="mb-10">
                    <DynamicSection section={section} />
                    {section.type === 'hero' && renderAdGroup(afterHeroAds)}
                    {renderAdGroup(betweenSectionsAds[index])}
                  </div>
                ))
              }
            </div>

            {/* Right Sidebar - Ad */}
            <aside className="hidden lg:block w-[300px] flex-shrink-0">
              <div className="sticky top-24">
                <SidebarAdSlot
                  ad={rightHeroAd}
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
        {isDev && (
          <div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg bg-black/80 text-white text-xs px-3 py-2">
            <div className="font-semibold mb-1">Ads debug</div>
            <div>right_hero: {rightHeroAd?._id || 'none'}</div>
            <div>after_hero: {afterHeroAds?.length || 0}</div>
            <div>between_sections: {betweenSectionsSummary}</div>
          </div>
        )}
      </>
    );
  }

  // Default Kiripost-style layout if no custom sections defined
  return (
    <>
      <Helmet>
        <title>{publicSettings?.siteName || 'Bassac Media'} - Latest News & Updates</title>
      </Helmet>

      <PopupAdModal
        ad={popupAd}
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onImpression={(adData) => trackAdEvent({
          adId: adData._id,
          type: 'impression',
          pageType: 'homepage',
          pageUrl,
          device,
          placement: adData.placement
        })}
        onClick={(adData) => trackAdEvent({
          adId: adData._id,
          type: 'click',
          pageType: 'homepage',
          pageUrl,
          device,
          placement: adData.placement
        })}
      />

      <div className="container-custom py-6 lg:py-8">
        <div className="flex gap-6 lg:gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            
            {/* Hero Section */}
            <section className="mb-10">
              <div className="grid grid-cols-12 gap-4 sm:gap-6">
                {/* Main Featured Article */}
                <div className="col-span-7">
                  {featuredLoading ? (
                    <div className="space-y-3">
                      <div className="aspect-[4/3] skeleton rounded-lg" />
                      <div className="h-4 skeleton rounded w-3/4" />
                      <div className="h-8 skeleton rounded" />
                    </div>
                  ) : mainFeatured ? (
                    <article>
                      <Link to={`/article/${mainFeatured.slug}`} className="block group">
                        <div className="aspect-[4/3] rounded-lg overflow-hidden mb-3">
                          <img
                            src={mainFeatured.featuredImage || `https://picsum.photos/seed/${mainFeatured.slug}/800/600`}
                            alt={mainFeatured.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      </Link>
                      <p className="text-dark-500 text-xs sm:text-sm mb-2 line-clamp-1 italic">
                        {mainFeatured.excerpt?.substring(0, 100)}...
                      </p>
                      {mainFeatured.category && (
                        <Link to={`/category/${mainFeatured.category.slug}`} className="text-dark-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider hover:text-primary-600">
                          {mainFeatured.category.name}
                        </Link>
                      )}
                      <Link to={`/article/${mainFeatured.slug}`}>
                        <h2 className="text-base sm:text-2xl lg:text-3xl font-bold text-dark-900 dark:text-white mt-1 mb-2 sm:mb-3 leading-tight hover:text-primary-600 transition-colors line-clamp-3">
                          {mainFeatured.title}
                        </h2>
                      </Link>
                      <p className="text-dark-600 dark:text-dark-400 text-xs sm:text-base leading-relaxed line-clamp-3 mb-2 sm:mb-3">
                        {mainFeatured.excerpt}
                      </p>
                      <span className="text-dark-400 text-xs sm:text-sm">{formatRelativeTime(mainFeatured.publishedAt)}</span>
                    </article>
                  ) : (
                    <div className="aspect-[4/3] rounded-lg bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
                      <p className="text-dark-500">No featured articles yet</p>
                    </div>
                  )}
                </div>

                {/* Side Articles */}
                <div className="col-span-5 space-y-4 sm:space-y-6">
                  {featuredLoading ? (
                    [...Array(2)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-[16/10] skeleton rounded-lg" />
                        <div className="h-5 skeleton rounded" />
                      </div>
                    ))
                  ) : sideFeatured.map((article) => (
                    <article key={article._id}>
                      <Link to={`/article/${article.slug}`} className="block group">
                        <div className="aspect-[16/10] rounded-lg overflow-hidden mb-2">
                          <img
                            src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/500/300`}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </Link>
                      {article.category && (
                        <Link
                          to={`/category/${article.category.slug}`}
                          className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider hover:underline"
                          style={{ color: article.category.color || getCategoryAccent(article.category.name) }}
                        >
                          {article.category.name}
                        </Link>
                      )}
                      <Link to={`/article/${article.slug}`}>
                        <h3 className="font-semibold sm:font-bold text-sm sm:text-base text-dark-900 dark:text-white mt-1 mb-1 leading-snug hover:text-primary-600 transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                      </Link>
                      <span className="text-dark-400 text-xs sm:text-sm">{formatRelativeTime(article.publishedAt)}</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {renderAdGroup(afterHeroAds)}
            {renderAdGroup(betweenSectionsAds[0])}

            {/* Trending Section */}
            {(trendingLoading || trendingArticles.length > 0) && (
              <section className="mb-10">
                <h2 className="text-xl font-bold text-primary-600 mb-5 uppercase tracking-wide">Trending</h2>
                <MixedLeadList
                  articles={trendingArticles}
                  isLoading={trendingLoading}
                  emptyMessage="No trending articles"
                />
              </section>
            )}

            {renderAdGroup(betweenSectionsAds[1])}

            {/* Latest News Section */}
            <section className="mb-10">
              <h2 className="text-xl font-bold text-primary-600 mb-5 uppercase tracking-wide">Latest News</h2>
              <MixedLeadList
                articles={latestNews}
                isLoading={latestLoading}
                emptyMessage="No articles published yet"
              />
              <div className="text-center mt-8">
                <Link to="/articles" className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-primary-600 text-primary-600 font-medium rounded-lg hover:bg-primary-600 hover:text-white transition-colors">
                  View All News <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>

            {renderAdGroup(betweenSectionsAds[2])}

            {/* Category Sections */}
            {categories?.slice(0, 2).map((category) => (
              <HomeCategorySection key={category._id} category={category} />
            ))}
          </div>

          {/* Right Sidebar - Ad */}
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="sticky top-24">
              <SidebarAdSlot
                ad={rightHeroAd}
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
      {isDev && (
        <div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg bg-black/80 text-white text-xs px-3 py-2">
          <div className="font-semibold mb-1">Ads debug</div>
          <div>right_hero: {rightHeroAd?._id || 'none'}</div>
          <div>after_hero: {afterHeroAds?.length || 0}</div>
          <div>between_sections: {betweenSectionsSummary}</div>
        </div>
      )}
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
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide" style={{ color: category.color || getCategoryAccent(category.name) }}>
            {category.name}
          </h2>
        </div>
        <Link to={`/category/${category.slug}`} className="text-dark-400 hover:text-primary-600 text-sm font-medium flex items-center gap-1">
          More <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <MixedLeadList
        articles={articles}
        isLoading={isLoading}
        emptyMessage={`No articles in ${category.name} yet`}
      />
    </section>
  );
}

// Article Card Component - News Style (like Kiripost)
function ArticleCardNews({ article }) {
  return (
    <article className="bg-white dark:bg-dark-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group">
      {/* Image */}
      <Link to={`/article/${article.slug}`} className="block">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/600/375`}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="p-5">
        {/* Category Badge */}
        {article.category && (
          <Link to={`/category/${article.category.slug}`}>
            <span 
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-3"
              style={{ 
                backgroundColor: `${article.category.color || getCategoryAccent(article.category.name)}15`, 
                color: article.category.color || getCategoryAccent(article.category.name)
              }}
            >
              {article.category.name}
            </span>
          </Link>
        )}

        {/* Title */}
        <Link to={`/article/${article.slug}`}>
          <h3 className="font-bold text-lg text-dark-900 dark:text-white leading-snug mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {article.title}
          </h3>
        </Link>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-dark-500 text-sm line-clamp-2 mb-4">
            {article.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-dark-400 text-sm">
          {article.author && (
            <div className="flex items-center gap-1.5">
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
    return <p className="text-dark-500 text-sm">{emptyMessage || 'No articles found'}</p>;
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <article key={article._id} className="flex gap-3 group">
          <Link to={`/article/${article.slug}`} className="flex-shrink-0">
            <img
              src={article.featuredImage || `https://picsum.photos/seed/${article.slug}/240/160`}
              alt={article.title}
              className={`${imageClassName} object-cover rounded-lg group-hover:opacity-90 transition-opacity`}
            />
          </Link>
          <div className="flex-1 min-w-0">
            {article.category && (
              <Link
                to={`/category/${article.category.slug}`}
                className="text-[10px] font-semibold uppercase tracking-wider hover:underline"
                style={{ color: article.category.color || '#6B7280' }}
              >
                {article.category.name}
              </Link>
            )}
            <Link to={`/article/${article.slug}`}>
              <h4 className={`font-semibold text-dark-900 dark:text-white leading-snug line-clamp-2 hover:text-primary-600 transition-colors mt-1 ${titleClassName}`}>
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

function PopupAdModal({ ad, isOpen, onClose, onImpression, onClick }) {
  if (!ad) return null;
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (!ad.autoCloseSeconds || ad.autoCloseSeconds <= 0) return undefined;

    setRemaining(ad.autoCloseSeconds);
    const intervalId = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [ad.autoCloseSeconds, isOpen, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!isOpen}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md sm:max-w-lg mx-4">
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {typeof remaining === 'number' && remaining > 0 && (
            <span className="rounded-full bg-white/90 text-dark-900 text-xs font-semibold px-3 py-1 shadow">
              Closing in {remaining}s
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/90 text-dark-900 text-xs font-semibold px-3 py-1 shadow hover:bg-white"
          >
            Close
          </button>
        </div>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-dark-900">
          <BodyAd ad={ad} onImpression={onImpression} onClick={onClick} />
        </div>
      </div>
    </div>
  );
}

// ==================== ARTICLES PAGE ====================
export function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const page = parseInt(searchParams.get('page') || '1');
  const categorySlug = searchParams.get('category') || '';
  const searchQuery = searchParams.get('q') || '';

  const { data, isLoading } = useArticles({
    page,
    limit: 12,
    category: categorySlug || undefined,
    q: searchQuery || undefined
  });
  const { data: categories } = useCategories();
  const device = useDeviceType();
  const { data: searchAds } = useSelectAds('in_search', {
    pageType: 'search',
    device,
    limit: 1,
    enabled: !!searchQuery
  });
  const { data: rightSidebarAds } = useSelectAds('custom', {
    pageType: 'articles',
    device,
    placementId: 'right_sidebar',
    limit: 1
  });
  const { mutate: trackAdEvent } = useTrackAdEvent();
  const rightSidebarAd = rightSidebarAds?.[0];
  const searchAd = searchAds?.[0];
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';

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
      <Helmet><title>Articles - Bassac Media</title></Helmet>
      
      <div className="container-custom py-6 lg:py-8">
        {/* Main Layout: Content + Sidebar Ad */}
        <div className="flex gap-6 lg:gap-8">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-bold text-dark-900 dark:text-white mb-2">Articles</h1>
              <p className="text-dark-500">Browse our collection of articles</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input 
                  type="text" 
                  placeholder="Search articles..." 
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
                  onImpression={(adData) => trackAdEvent({
                    adId: adData._id,
                    type: 'impression',
                    pageType: 'search',
                    pageUrl,
                    device,
                    placement: adData.placement
                  })}
                  onClick={(adData) => trackAdEvent({
                    adId: adData._id,
                    type: 'click',
                    pageType: 'search',
                    pageUrl,
                    device,
                    placement: adData.placement
                  })}
                />
              </div>
            )}

            {/* Articles Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
            ) : data?.data?.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {data.data.map((article) => (
                    <ArticleCardNews key={article._id} article={article} />
                  ))}
                </div>
                
                {/* Pagination */}
                {data.pagination?.pages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12">
                    <button 
                      disabled={page <= 1} 
                      onClick={() => { 
                        const p = new URLSearchParams(searchParams); 
                        p.set('page', String(page - 1)); 
                        setSearchParams(p); 
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-dark-600 dark:text-dark-400">
                      Page {page} of {data.pagination.pages}
                    </span>
                    <button 
                      disabled={page >= data.pagination.pages} 
                      onClick={() => { 
                        const p = new URLSearchParams(searchParams); 
                        p.set('page', String(page + 1)); 
                        setSearchParams(p);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 rounded-lg bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-dark-500 text-lg">No articles found</p>
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
            <div className="sticky top-24">
              <SidebarAdSlot
                ad={rightSidebarAd}
                pageType="articles"
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

  return (
    <>
      <Helmet>
        <title>Categories - Bassac Media</title>
      </Helmet>

      <div className="min-h-screen bg-dark-50 dark:bg-dark-950">
        <div className="container-custom py-6 sm:py-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mb-6">
            Categories
          </h1>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 skeleton rounded-2xl" />
              ))}
            </div>
          ) : categories?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  to={`/category/${category.slug}`}
                  className="group rounded-2xl bg-white dark:bg-dark-900 shadow-sm hover:shadow-lg transition-all active:scale-[0.98] border border-dark-100 dark:border-dark-800"
                >
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: category.color || getCategoryAccent(category.name) }}
                  />
                  <div className="p-4 sm:p-5">
                    <h3 className="font-semibold text-dark-900 dark:text-white text-sm sm:text-base mb-1">
                      {category.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-dark-500">
                      {category.articleCount || 0} articles
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-dark-500">No categories yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ==================== CATEGORY PAGE ====================
export function CategoryPage() {
    const { slug } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Number(searchParams.get('page') || 1);
    const device = useDeviceType();
    const { mutate: trackAdEvent } = useTrackAdEvent();

    const { data, isLoading } = useArticlesByCategory(slug, {
        page,
        limit: 12,
    });

    const articles = data?.data?.articles || [];
    const category = data?.data?.category;
    const pagination = data?.pagination;
    const { data: categoryAds } = useSelectAds('in_category', {
        pageType: 'category',
        device,
        categoryId: category?._id,
        limit: 1,
        enabled: !!category?._id
    });
    const categoryAd = categoryAds?.[0];
    const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';

    const handlePageChange = (newPage) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', String(newPage));
        setSearchParams(params);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            <Helmet>
                <title>{category?.name || 'Category'} - Bassac Media Center</title>
            </Helmet>

            <div className="container-custom py-8">
                <div className="mb-8">
                    <Link to="/articles" className="inline-flex items-center gap-2 text-dark-500 hover:text-dark-700 mb-4">
                        ← Back to Articles
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
                        <h1 className="font-display text-3xl font-bold text-dark-900 dark:text-white mt-2">
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
                                    onImpression={(adData) => trackAdEvent({
                                        adId: adData._id,
                                        type: 'impression',
                                        pageType: 'category',
                                        pageUrl,
                                        device,
                                        placement: adData.placement
                                    })}
                                    onClick={(adData) => trackAdEvent({
                                        adId: adData._id,
                                        type: 'click',
                                        pageType: 'category',
                                        pageUrl,
                                        device,
                                        placement: adData.placement
                                    })}
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                            {articles.map((a) => (
                                <ArticleCard key={a._id} article={a} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.pages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-12">
                                <Button
                                    variant="secondary"
                                    disabled={page <= 1}
                                    onClick={() => handlePageChange(page - 1)}
                                >
                                    Previous
                                </Button>
                                <span className="px-4 py-2 text-dark-600 dark:text-dark-400">
                                    Page {page} of {pagination.pages}
                                </span>
                                <Button
                                    variant="secondary"
                                    disabled={page >= pagination.pages}
                                    onClick={() => handlePageChange(page + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-center py-20 text-dark-500">
                        No articles in this category
                    </p>
                )}
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
          src={comment.author?.avatar} 
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
                  ? 'hover:text-primary-600 cursor-pointer' 
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
                className="flex items-center gap-1 text-xs text-dark-500 hover:text-primary-600 transition-colors"
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
        <div className="grid grid-cols-2 gap-3 mt-2">
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
  const { data, isLoading } = useArticleComments(articleId);
  const { mutate: createComment, isPending: isSubmitting } = useCreateComment();
  const { mutate: likeComment } = useLikeComment();
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment();
  
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);

  const comments = data?.data?.comments || [];

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
      <h3 className="flex items-center gap-2 text-xl font-bold text-dark-900 dark:text-white mb-6">
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
          <div className="grid grid-cols-2 gap-3 mb-3">
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
  const { data: related, isLoading: isLoadingRelated } = useRelatedArticles(article?._id, 3);
  const { data: moreNews, isLoading: isLoadingMoreNews } = useLatestArticles(6);
  const { data: settings } = usePublicSettings();
  const device = useDeviceType();
  const { mutate: trackAdEvent } = useTrackAdEvent();
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

  if (isLoading) return <ContentLoader className="min-h-screen" />;

  if (error || !article) {
    return (
      <div className="container-custom py-20 text-center">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">Article Not Found</h1>
        <p className="text-dark-500 mb-6">The article you're looking for doesn't exist.</p>
        <Link to="/articles"><Button>Browse Articles</Button></Link>
      </div>
    );
  }

  const { title, excerpt, content, featuredImage, category, author, publishedAt, viewCount, wordCount, tags } = article;
  // featuredImage is a string URL, not an object
  const imageUrl = featuredImage || `https://picsum.photos/seed/${slug}/1200/600`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const moreNewsArticles = (moreNews || []).filter((item) => item._id !== article._id);
  
  const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  const trackAd = (adData, type) => trackAdEvent({
    adId: adData._id,
    type,
    pageType: 'articles',
    pageUrl,
    device,
    placement: adData.placement
  });
  
  // SEO data
  const authorName = author ? `${author.firstName} ${author.lastName}` : '';
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : '';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

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
        
        {/* Article specific Open Graph */}
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
                'url': `${siteUrl}/logo.png`,
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
        <header className="relative">
          <div className="aspect-[21/9] lg:aspect-[3/1]">
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="container-custom py-8 lg:py-12">
              <div className="max-w-4xl">
                <Link to="/articles" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back to Articles
                </Link>
                {category && (
                  <Link to={`/category/${category.slug}`}>
                    <span className="inline-flex items-center mb-4 rounded-full bg-white/20 text-white px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      {category.name}
                    </span>
                  </Link>
                )}
                <h1 className="font-display text-3xl lg:text-5xl font-bold text-white mb-4">{title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                  {author && (
                    <div className="flex items-center gap-2">
                      <Avatar src={author.avatar} name={author.fullName} size="sm" />
                      <span>{author.fullName || `${author.firstName} ${author.lastName}`}</span>
                    </div>
                  )}
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(publishedAt)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{calculateReadTime(wordCount || 0)}</span>
                  <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{viewCount || 0} views</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container-custom py-12">
          <div className="grid grid-cols-12 gap-12">
            <div className="col-span-7 lg:col-span-8">
              {excerpt && <p className="text-xl text-dark-600 dark:text-dark-300 mb-8 leading-relaxed">{excerpt}</p>}
              <ArticleContent
                content={content}
                inArticleAds={articleAds?.in_article}
                onAdImpression={(adData) => trackAd(adData, 'impression')}
                onAdClick={(adData) => trackAd(adData, 'click')}
              />

              {articleAds?.after_article?.length > 0 && (
                <div className="my-10 space-y-6">
                  {articleAds.after_article.map((ad) => (
                    <BodyAd
                      key={ad._id}
                      ad={ad}
                      onImpression={(adData) => trackAd(adData, 'impression')}
                      onClick={(adData) => trackAd(adData, 'click')}
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
              </div>

              {articleAds?.before_comments?.length > 0 && (
                <div className="my-10 space-y-6">
                  {articleAds.before_comments.map((ad) => (
                    <BodyAd
                      key={ad._id}
                      ad={ad}
                      onImpression={(adData) => trackAd(adData, 'impression')}
                      onClick={(adData) => trackAd(adData, 'click')}
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
                  <Link to="/articles" className="text-dark-400 hover:text-primary-600 text-sm font-medium flex items-center gap-1">
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <NewsListWithExcerpt
                  articles={moreNewsArticles}
                  isLoading={isLoadingMoreNews}
                  emptyMessage="No additional news available"
                />
              </section>
            </div>

            <aside className="col-span-5 lg:col-span-4">
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

              {/* Related Articles */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-dark-500 uppercase mb-4">Related Articles</h3>
                <NewsListWithExcerpt
                  articles={related || []}
                  isLoading={isLoadingRelated}
                  emptyMessage="No related articles found"
                  imageSize="sm"
                />
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
              <span className="text-white font-display font-bold text-xl">B</span>
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
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">Forgot password?</Link>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isPending}>Sign In</Button>
            </form>

            <p className="mt-6 text-center text-dark-500">
              Don't have an account? <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">Sign up</Link>
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
              <span className="text-white font-display font-bold text-xl">B</span>
            </div>
            <span className="font-display font-bold text-2xl text-dark-900 dark:text-white">Bassac Media</span>
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white text-center mb-6">Create Account</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              Already have an account? <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
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
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-dark-900 dark:text-white mb-4 text-center">Contact Us</h1>
          <p className="text-dark-500 text-center mb-8">Have a question? We'd love to hear from you.</p>

          <form onSubmit={handleSubmit} className="card p-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
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
  return (
    <>
      <Helmet><title>About - Bassac Media Center</title></Helmet>
      <div className="container-custom py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl font-bold text-dark-900 dark:text-white mb-8 text-center">About Bassac Media</h1>
          <div className="article-content">
            <p>Bassac Media Center is a digital publishing platform dedicated to delivering quality news, insightful articles, and in-depth coverage of stories that matter.</p>
            <h2>Our Mission</h2>
            <p>We believe in the power of quality journalism and storytelling. Our mission is to provide a platform where writers can share their perspectives and readers can discover content that informs, inspires, and entertains.</p>
            <h2>Our Team</h2>
            <p>We're a diverse team of journalists, editors, and technologists passionate about creating the best possible experience for both writers and readers.</p>
            <h2>Join Us</h2>
            <p>Whether you're a writer looking to share your stories or a reader seeking quality content, we welcome you to the Bassac Media community.</p>
          </div>
          <div className="mt-8 text-center">
            <Link to="/register"><Button size="lg">Become a Writer</Button></Link>
          </div>
        </div>
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
          <div className="grid grid-cols-2 gap-6">
            <div className="card p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar
                  src={avatarPreview || user?.avatar}
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

              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">{user?.fullName}</h2>
              <p className="text-dark-500">{user?.email}</p>
              <p className="text-sm text-primary-600 capitalize mt-1">{user?.role}</p>
            </div>
            <div className="card p-6">
              <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Edit Profile</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
  const imageUrl = featuredImage || 'https://picsum.photos/seed/preview/1200/600';

  return (
    <div className="min-h-screen bg-white dark:bg-dark-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-amber-900 py-2 px-4 text-center font-medium">
        <span>📝 Preview Mode - This is how your article will look when published</span>
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
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="container-custom py-8 lg:py-12">
              <div className="max-w-4xl">
                <h1 className="font-display text-3xl lg:text-5xl font-bold text-white mb-4">
                  {title || 'Untitled Article'}
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
              <p className="text-xl text-dark-600 dark:text-dark-300 mb-8 leading-relaxed">
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
        const response = await fetch('/api/auth/verify-email', {
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
      const response = await fetch('/api/auth/forgot-password', {
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
      const response = await fetch('/api/auth/reset-password', {
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

// ==================== Dynamic Page (for custom pages) ====================
export function DynamicPage() {
  const { slug } = useParams();
  const { data: page, isLoading, error } = usePageBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 py-12">
        <div className="container-custom">
          <ContentLoader />
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 py-12">
        <div className="container-custom">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-dark-900 dark:text-white mb-4">Page Not Found</h1>
            <p className="text-dark-500 mb-6">The page you're looking for doesn't exist or has been removed.</p>
            <Link to="/" className="btn btn-primary">Go Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Render content from Editor.js blocks
  const renderContent = (content) => {
    if (!content?.blocks || content.blocks.length === 0) {
      return <p className="text-dark-500">No content yet.</p>;
    }

    return content.blocks.map((block, index) => {
      switch (block.type) {
        case 'header':
          const HeadingTag = `h${block.data.level || 2}`;
          return (
            <HeadingTag 
              key={index} 
              className={cn(
                'font-bold text-dark-900 dark:text-white',
                block.data.level === 1 && 'text-3xl mb-6',
                block.data.level === 2 && 'text-2xl mb-4 mt-8',
                block.data.level === 3 && 'text-xl mb-3 mt-6',
                block.data.level === 4 && 'text-lg mb-2 mt-4',
              )}
              dangerouslySetInnerHTML={{ __html: block.data.text }}
            />
          );
        
        case 'paragraph':
          return (
            <p 
              key={index} 
              className="text-dark-600 dark:text-dark-300 mb-4 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: block.data.text }}
            />
          );
        
        case 'list':
          const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
          return (
            <ListTag 
              key={index} 
              className={cn(
                'mb-4 pl-6 space-y-2 text-dark-600 dark:text-dark-300',
                block.data.style === 'ordered' ? 'list-decimal' : 'list-disc'
              )}
            >
              {block.data.items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ListTag>
          );
        
        case 'image':
          return (
            <figure key={index} className="my-8">
              <img 
                src={block.data.file?.url || block.data.url} 
                alt={block.data.caption || ''} 
                className="w-full rounded-lg shadow-lg"
              />
              {block.data.caption && (
                <figcaption className="text-center text-sm text-dark-500 mt-2">
                  {block.data.caption}
                </figcaption>
              )}
            </figure>
          );
        
        case 'quote':
          return (
            <blockquote key={index} className="border-l-4 border-primary-500 pl-4 my-6 italic text-dark-700 dark:text-dark-300">
              <p dangerouslySetInnerHTML={{ __html: block.data.text }} />
              {block.data.caption && (
                <cite className="block mt-2 text-sm text-dark-500">— {block.data.caption}</cite>
              )}
            </blockquote>
          );
        
        case 'code':
          return (
            <pre key={index} className="bg-dark-900 text-white p-4 rounded-lg overflow-x-auto my-4">
              <code>{block.data.code}</code>
            </pre>
          );
        
        case 'delimiter':
          return <hr key={index} className="my-8 border-dark-200 dark:border-dark-700" />;
        
        case 'raw':
          return (
            <div 
              key={index} 
              className="my-4"
              dangerouslySetInnerHTML={{ __html: block.data.html }}
            />
          );
        
        default:
          return null;
      }
    });
  };

  // Template-based layout
  const getLayoutClasses = () => {
    switch (page.template) {
      case 'full-width':
        return 'max-w-none px-4 sm:px-6 lg:px-8';
      case 'landing':
        return 'max-w-none';
      case 'blank':
        return 'max-w-none p-0';
      case 'sidebar-left':
      case 'sidebar-right':
        return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
      default:
        return 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8';
    }
  };

  return (
    <>
      <Helmet>
        <title>{page.metaTitle || page.title} - Bassac Media</title>
        {page.metaDescription && <meta name="description" content={page.metaDescription} />}
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-dark-950">
        {/* Hero/Header */}
        {page.template !== 'blank' && (
          <div className={cn(
            'py-12 bg-dark-50 dark:bg-dark-900/50',
            page.featuredImage && 'relative'
          )}>
            {page.featuredImage && (
              <div className="absolute inset-0">
                <img 
                  src={page.featuredImage} 
                  alt={page.title} 
                  className="w-full h-full object-cover opacity-20"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-dark-950" />
              </div>
            )}
            <div className={cn('relative', getLayoutClasses())}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-dark-900 dark:text-white mb-4">
                {page.title}
              </h1>
              {page.excerpt && (
                <p className="text-lg text-dark-600 dark:text-dark-400 max-w-3xl">
                  {page.excerpt}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={cn('py-12', getLayoutClasses())}>
          {page.template === 'sidebar-left' || page.template === 'sidebar-right' ? (
            <div className={cn(
              'grid grid-cols-12 gap-8',
              page.template === 'sidebar-left' && 'lg:flex-row-reverse'
            )}>
              <div className={cn(
                'col-span-8 lg:col-span-3',
                page.template === 'sidebar-left' && 'lg:order-2'
              )}>
                <div className="prose dark:prose-invert max-w-none">
                  {renderContent(page.content)}
                </div>
              </div>
              <aside className={cn(
                'col-span-4 lg:col-span-1',
                page.template === 'sidebar-left' && 'lg:order-1'
              )}>
                <div className="sticky top-24 space-y-6">
                  {/* Sidebar content can go here */}
                  <div className="card p-6">
                    <h3 className="font-semibold text-dark-900 dark:text-white mb-4">Quick Links</h3>
                    <nav className="space-y-2">
                      <Link to="/" className="block text-dark-600 dark:text-dark-400 hover:text-primary-600">Home</Link>
                      <Link to="/articles" className="block text-dark-600 dark:text-dark-400 hover:text-primary-600">Articles</Link>
                      <Link to="/contact" className="block text-dark-600 dark:text-dark-400 hover:text-primary-600">Contact</Link>
                    </nav>
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              {renderContent(page.content)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Add usePageBySlug hook usage
function usePageBySlug(slug) {
  return useQuery({
    queryKey: ['page', 'slug', slug],
    queryFn: async () => {
      const response = await fetch(`/api/pages/slug/${slug}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.data.page;
    },
    enabled: !!slug,
  });
}
