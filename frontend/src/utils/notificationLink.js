export function resolveNotificationLink(notification) {
  if (!notification) return null;

  const link = notification.link;
  const related = notification.relatedArticle;
  const relatedId = related?._id || related?.id;
  const relatedSlug = related?.slug;

  if (notification.type === 'article_rejected') {
    const id = notification._id || notification.id;
    return id ? `/dashboard/notifications?reject=${id}` : '/dashboard/notifications';
  }

  if (notification.type === 'article_approved' && relatedSlug) {
    return `/article/${relatedSlug}`;
  }

  if (notification.type === 'article_submitted') {
    return '/dashboard/pending';
  }

  if (link) {
    if (link.startsWith('/dashboard/articles/') && !link.includes('/edit') && !link.includes('/insights')) {
      const maybeId = link.split('/dashboard/articles/')[1];
      if (maybeId) return `/preview/${maybeId}`;
    }
    return link;
  }

  if (notification.type === 'article_published' && relatedSlug) {
    return `/article/${relatedSlug}`;
  }

  if ((notification.type === 'comment_received' || notification.type === 'comment_reply') && relatedSlug) {
    return `/article/${relatedSlug}`;
  }

  if (relatedId) {
    return `/preview/${relatedId}`;
  }

  return null;
}
