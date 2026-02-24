import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Calendar, Eye, Facebook, Twitter, Linkedin, ArrowLeft, Mail, MessageCircle, ThumbsUp, Reply, Send, Trash2, CheckCircle, Link2 } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLatestArticles, useResolvedArticleBySlug, useRelatedArticles, usePublicSettings, useCreateComment, useLikeComment, useDeleteComment } from '../../hooks/useApi';
import { useArticleAds, useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';
import { articlesAPI, commentsAPI } from '../../services/api';
import { ArticleContent } from '../../components/article/index.jsx';
import { Button, Avatar, Badge, ArticleDetailSkeleton, Input, Textarea, ConfirmModal } from '../../components/common/index.jsx';
import { BodyAd } from '../../components/ads/index.js';
import { BetweenSectionsSlot } from '../../components/ads/BetweenSectionsSlot.jsx';
import { InlineAdGroup } from '../../components/ads/inlineAds.jsx';
import { buildMediaUrl, formatDate, cn, formatRelativeTime } from '../../utils';
import { useAuthStore } from '../../stores/authStore';
import { SidebarAdSlot } from './shared/rightSidebarAds.jsx';
import useLanguage from '../../hooks/useLanguage';


function NewsListWithExcerpt({ articles, isLoading, emptyMessage, imageSize = 'md' }) {
  const { translateText } = useLanguage();
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
    return <p className="text-dark-500 text-sm">{emptyMessage || translateText('No news found')}</p>;
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

function CommentItem({ comment, isReply = false, onLike, onDelete, onReplyClick, replyTo, user, isAuthenticated }) {
  const { translateText } = useLanguage();
  const authorName = comment.author
    ? `${comment.author.firstName} ${comment.author.lastName}`
    : comment.guestName || translateText('Anonymous');
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
              <span className="text-xs text-dark-400">({translateText('edited')})</span>
            )}
            {comment.status === 'pending' && (
              <Badge className="badge-warning text-xs">{translateText('Pending')}</Badge>
            )}
            {comment.status === 'approved' && (
              <span
                className="inline-flex items-center text-emerald-600"
                title={translateText('Approved')}
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
                {translateText('Reply')}
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
  const { translateText } = useLanguage();
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
        placeholder={translateText('Write a reply...')}
        className="text-sm min-h-[80px]"
      />
      {!isAuthenticated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder={translateText('Your name')}
            className="text-sm"
            required
          />
          <Input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder={translateText('Your email')}
            className="text-sm"
            required
          />
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Button type="submit" size="sm" disabled={isSubmitting || !content.trim()}>
          <Send className="w-3.5 h-3.5 mr-1" />
          {translateText('Reply')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          {translateText('Cancel')}
        </Button>
      </div>
    </form>
  );
}

// ==================== COMMENTS SECTION COMPONENT ====================
function CommentsSection({ articleId }) {
  const { t, translateText } = useLanguage();
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
        {translateText('Comments')} {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isAuthenticated ? translateText('Share your thoughts...') : translateText('Write a comment...')}
          className="mb-3"
        />
        {!isAuthenticated && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={translateText('Your name *')}
              required
            />
            <Input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder={translateText('Your email *')}
              required
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-dark-500">
            {isAuthenticated
              ? `Commenting as ${user?.firstName}`
              : translateText('Comments are moderated before appearing')}
          </p>
          <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? translateText('Posting...') : translateText('Post Comment')}
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
          <p className="text-dark-500">{translateText('No comments yet. Be the first to share your thoughts!')}</p>
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? t('common.loading', 'Loading...') : translateText('Load more comments')}
          </Button>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title={translateText('Delete Comment')}
        message={translateText('Are you sure you want to delete this comment?')}
        confirmText={translateText('Delete')}
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </div>
  );
}

// ==================== ARTICLE DETAIL PAGE ====================
export function ArticlePage() {
  const { t, translateText, language } = useLanguage();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { data: resolvedArticlePayload, isLoading, error } = useResolvedArticleBySlug(slug, language);
  const article = resolvedArticlePayload?.article;
  const articleLanguage = resolvedArticlePayload?.language;
  const missingSelectedLanguage = Boolean(
    articleLanguage?.requested &&
    articleLanguage?.usedFallback &&
    articleLanguage?.resolved &&
    articleLanguage.requested !== articleLanguage.resolved
  );
  const backToNewsRef = useRef(null);
  const [relatedLimit, setRelatedLimit] = useState(5);
  const [moreNewsLimit, setMoreNewsLimit] = useState(5);
  const [copied, setCopied] = useState(false);
  const [siteHeaderHeight, setSiteHeaderHeight] = useState(112);
  const [backToNewsHeight, setBackToNewsHeight] = useState(48);
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const stickyHeader = document.querySelector('header.sticky.top-0.z-40.shadow-sm');
    const backToNewsBar = backToNewsRef.current;
    if (!stickyHeader) return;

    const updateStickyOffset = () => {
      const nextHeaderHeight = Math.round(stickyHeader.getBoundingClientRect().height);
      const nextBackToNewsHeight = Math.round(backToNewsBar?.getBoundingClientRect().height || 0);

      if (nextHeaderHeight > 0) {
        setSiteHeaderHeight(nextHeaderHeight);
      }
      if (nextBackToNewsHeight > 0) {
        setBackToNewsHeight(nextBackToNewsHeight);
      }
    };

    updateStickyOffset();
    window.addEventListener('resize', updateStickyOffset);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateStickyOffset);
      observer.observe(stickyHeader);
      if (backToNewsBar) {
        observer.observe(backToNewsBar);
      }
    }

    return () => {
      window.removeEventListener('resize', updateStickyOffset);
      observer?.disconnect();
    };
  }, [settings?.headerSettings?.showCategories, settings?.headerSettings?.sticky]);

  useEffect(() => {
    const resolvedSlug = articleLanguage?.resolvedSlug || article?.slug;
    if (!resolvedSlug || !slug || resolvedSlug === slug) return;
    navigate(`/article/${resolvedSlug}`, { replace: true });
  }, [article?.slug, articleLanguage?.resolvedSlug, navigate, slug]);

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
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">{translateText('News Not Found')}</h1>
        <p className="text-dark-500 mb-6">{translateText("The news you're looking for doesn't exist.")}</p>
        <Link to="/articles"><Button>{translateText('Browse News')}</Button></Link>
      </div>
    );
  }

  const { title, excerpt, content, featuredImage, category, author, publishedAt, viewCount, wordCount, tags } = article;
  const articleSlug = article?.slug || slug;
  // featuredImage is a string URL, not an object
  const imageUrl = buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${articleSlug}/1200/600`;
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const normalizeShareBase = (value = '') =>
    String(value)
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/share(?:\/:slug)?$/i, '')
      .replace(/\/api$/i, '');

  const resolveAbsoluteOrigin = (value = '') => {
    const input = String(value || '').trim();
    if (!/^https?:\/\//i.test(input)) return '';
    try {
      return new URL(input).origin;
    } catch {
      return '';
    }
  };

  // Always prefer backend origin for share links so social crawlers hit server-rendered /share/:slug HTML.
  const backendShareBase =
    resolveAbsoluteOrigin(import.meta.env.VITE_API_URL || '') ||
    resolveAbsoluteOrigin(import.meta.env.VITE_SOCKET_URL || '') ||
    resolveAbsoluteOrigin(normalizeShareBase(import.meta.env.VITE_SHARE_URL_BASE || ''));
  const shareBaseUrl = backendShareBase || siteUrl;
  const shareUrl = shareBaseUrl ? `${shareBaseUrl}/share/${encodeURIComponent(articleSlug)}` : '';
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
  const sidebarStickyTop = siteHeaderHeight + backToNewsHeight;

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{article.metaTitle || title} | Bassac Post</title>
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
        <meta property="og:site_name" content={settings?.siteName || 'Bassac Post'} />
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
              'name': settings?.siteName || 'Bassac Post',
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
        <div
          ref={backToNewsRef}
          className="sticky z-30 bg-white/90 dark:bg-dark-900/90 backdrop-blur border-b border-dark-100 dark:border-dark-800"
          style={{ top: `${siteHeaderHeight}px` }}
        >
          <div className="container-custom py-3">
            <Link to="/articles" className="inline-flex items-center gap-2 text-dark-600 dark:text-dark-300 headline-hover">
              <ArrowLeft className="w-4 h-4" /> {t('common.backToNews', 'Back to News')}
            </Link>
          </div>
        </div>
        <div className="container-custom pt-0 pb-12">
          <div className="flex flex-col gap-12 lg:flex-row">
            <div className="flex-1 min-w-0">
              <section className="border-b border-dark-100 dark:border-dark-800 mb-10">
                <div className="py-5 lg:py-8">
                  <div className="max-w-4xl">
                    {missingSelectedLanguage && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                        {translateText('This article is not available in the selected language yet. Showing English version.')}
                      </div>
                    )}
                    <h1 className="font-display text-2xl lg:text-3xl font-bold text-dark-900 dark:text-dark-100 mb-4">{title}</h1>
                    {excerpt && (
                      <p className="text-base text-dark-600 dark:text-dark-300 leading-relaxed">
                        {excerpt}
                      </p>
                    )}
                    <div className="mt-6 overflow-hidden rounded-2xl border border-dark-200 dark:border-dark-700">
                      <div className="aspect-[16/9] lg:aspect-[2/1]">
                        <img loading="lazy" src={imageUrl} alt={title} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-dark-600 dark:text-dark-300">
                      {category && (
                        <Link to={`/category/${category.slug}`}>
                          <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-3 py-1 text-xs font-semibold">
                            {category.name}
                          </span>
                        </Link>
                      )}
                      {author && (
                        <div className="flex items-center gap-2">
                          <Avatar src={author.avatar} name={author.fullName} size="sm" />
                          <span>{author.fullName || `${author.firstName} ${author.lastName}`}</span>
                        </div>
                      )}
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(publishedAt)}</span>
                      <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{viewCount || 0} {translateText('views')}</span>
                    </div>
                  </div>
                </div>
              </section>

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
                <span className="text-sm font-medium text-dark-500">{t('common.share', 'Share:')}</span>
                <a href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Facebook className="w-5 h-5 text-[#1877F2]" /></a>
                {/*<a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Twitter className="w-5 h-5 text-[#1DA1F2]" /></a>*/}
                <a href={`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Linkedin className="w-5 h-5 text-[#0A66C2]" /></a>
                {/*<a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><MessageCircle className="w-5 h-5 text-[#25D366]" /></a>*/}
                <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Send className="w-5 h-5 text-[#229ED9]" /></a>
                <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${shareUrl}`)}`} className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800"><Mail className="w-5 h-5 text-[#6B7280]" /></a>
                <button type="button" onClick={handleCopyLink} className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800">
                  <Link2 className={`w-5 h-5 ${copied ? 'text-primary-600' : 'text-dark-500'}`} />
                </button>
                {copied && <span className="text-xs text-primary-600">{t('common.copied', 'Copied')}</span>}
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
                  <h3 className="text-lg font-semibold text-dark-900 dark:text-white">{translateText('More News')}</h3>
                  <Link to="/articles" className="text-sm font-medium flex items-center gap-1 link-muted">
                    {t('common.viewAll', 'View all')} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <NewsListWithExcerpt
                  articles={moreNewsArticles}
                  isLoading={isLoadingMoreNews}
                  emptyMessage={translateText('No additional news available')}
                />
                {moreNews?.length >= moreNewsLimit && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => setMoreNewsLimit((prev) => prev + 5)}
                      isLoading={isFetchingMoreNews}
                      className="px-3 py-1.5 text-sm rounded-lg sm:px-5 sm:py-2.5 sm:text-base sm:rounded-xl"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {t('common.seeMore', 'See more')}
                    </Button>
                  </div>
                )}
              </section>
            </div>

            <aside
              className="w-full lg:w-[300px] lg:flex-shrink-0 lg:self-start lg:sticky"
              style={{ top: `${sidebarStickyTop}px` }}
            >
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
              <div className="card p-6 mt-0">
                <h3 className="text-sm font-semibold text-dark-500 uppercase mb-4">{translateText('Related News')}</h3>
                <NewsListWithExcerpt
                  articles={related || []}
                  isLoading={isLoadingRelated}
                  emptyMessage={translateText('No related news found')}
                  imageSize="sm"
                />
                {related?.length > 0 && (
                  <div className="mt-4 flex justify-center">
                    <Button size="sm" onClick={() => setRelatedLimit((prev) => prev + 5)}>
                      {t('common.loadMore', 'Load more')}
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
