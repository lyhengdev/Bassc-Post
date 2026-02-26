import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Zap, Calendar, Clock, Facebook, Twitter, Linkedin, Search, TrendingUp, Star, Mail, MessageCircle, Send, CheckCircle, Link2, Globe2, ShieldCheck, Target, Users2, PenSquare, Newspaper, MapPin, Phone, ArrowUpRight } from 'lucide-react';
import { useLatestArticles, useArticleById, useSubmitContact, usePublicSettings } from '../../hooks/useApi';
import { ArticleContent } from '../../components/article/index.jsx';
import { Button, ArticleDetailSkeleton, Input, Textarea } from '../../components/common/index.jsx';
import { BetweenSectionsSlot } from '../../components/ads/BetweenSectionsSlot.jsx';
import { buildMediaUrl, formatDate, cn, formatRelativeTime } from '../../utils';
import { buildFacebookEmbedConfig, normalizeFacebookUrl } from '../../utils/facebookEmbed';
import useLanguage from '../../hooks/useLanguage';

export function ContactPage() {
  const { translateText } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const { mutate: submit, isPending } = useSubmitContact();

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(form, { onSuccess: () => setForm({ name: '', email: '', subject: '', message: '' }) });
  };

  return (
    <>
      <Helmet><title>{`${translateText('Contact')} - Bassac Post`}</title></Helmet>
      <div className="container-custom py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl lg:text-2xl font-bold text-dark-900 dark:text-white mb-4 text-center">{translateText('Contact Us')}</h1>
          <p className="text-dark-500 text-center mb-8">{translateText("Have a question? We'd love to hear from you.")}</p>

          <form onSubmit={handleSubmit} className="card p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Name" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Input label="Subject" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            <Textarea label="Message" placeholder="Your message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="min-h-[150px]" />
            <Button type="submit" className="w-full" size="lg" isLoading={isPending}>{translateText('Send Message')}</Button>
          </form>
        </div>
      </div>
    </>
  );
}

// ==================== ABOUT PAGE ====================
export function AboutPage() {
  const { translateText } = useLanguage();
  const { data: settings } = usePublicSettings();
  const { data: latestArticles, isLoading: isLatestLoading } = useLatestArticles(3);

  const siteName = settings?.siteName || 'Bassac Post';
  const siteDescription = settings?.siteDescription || translateText('Your trusted source for quality news, insightful stories, and in-depth coverage of the issues that matter.');
  const siteEmail = settings?.siteEmail || 'hello@bassacmedia.com';
  const sitePhone = settings?.sitePhone || '+855 12 345 678';
  const siteAddress = settings?.siteAddress || translateText('Phnom Penh, Cambodia');
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
  const aboutLatestTitleClass = 'text-base sm:text-lg lg:text-lg font-semibold text-dark-900 dark:text-white mt-1 leading-snug headline-hover line-clamp-2';

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
                  {translateText('About Us')}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-dark-900 dark:text-white leading-tight">
                  {translateText('Building trust through clear, independent journalism.')}
                </h1>
                <p className="text-base sm:text-lg text-dark-600 dark:text-dark-300 max-w-2xl">
                  {siteDescription}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/articles">
                    <Button size="lg">{translateText('Explore News')}</Button>
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-dark-300 dark:border-dark-600 px-5 py-3 text-sm font-semibold text-dark-700 dark:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                  >
                    {translateText('Contact Team')} <ArrowUpRight className="w-4 h-4" />
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
                    <p className="text-xs text-dark-500 uppercase tracking-wider mt-1">{translateText('Updates')}</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-xl font-bold text-dark-900 dark:text-white">4K+</p>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mt-1">{translateText('Stories')}</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-xl font-bold text-dark-900 dark:text-white">100%</p>
                    <p className="text-xs text-dark-500 uppercase tracking-wider mt-1">{translateText('Independent')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-custom py-10 sm:py-12 lg:py-14">
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7 card p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">{translateText('Our Mission')}</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mt-2">
                {translateText('Inform clearly. Explain deeply. Serve the public.')}
              </h2>
              <p className="text-dark-600 dark:text-dark-300 mt-4 leading-relaxed">
                {translateText('We created')} {siteName} {translateText('to make journalism more useful for everyday readers. Our newsroom focuses on verified reporting, practical context, and responsible storytelling that values people over noise.')}
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                  <p className="text-sm text-dark-600 dark:text-dark-300">{translateText('Fact-checked stories with clear sources and context.')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                  <p className="text-sm text-dark-600 dark:text-dark-300">{translateText('Balanced coverage that avoids sensational framing.')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                  <p className="text-sm text-dark-600 dark:text-dark-300">{translateText('Continuous updates when facts evolve.')}</p>
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
                      <h3 className="font-semibold text-dark-900 dark:text-white">{translateText(value.title)}</h3>
                      <p className="text-sm text-dark-600 dark:text-dark-300 mt-1">{translateText(value.description)}</p>
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
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">{translateText('Newsroom Workflow')}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {workflow.map((step, idx) => (
                <article key={step.title} className="rounded-2xl border border-dark-100 dark:border-dark-800 p-4 sm:p-5 bg-white dark:bg-dark-900">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300">
                      {translateText('Step')} {idx + 1}
                    </span>
                    <step.icon className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                  </div>
                  <h3 className="font-semibold text-dark-900 dark:text-white">{translateText(step.title)}</h3>
                  <p className="text-sm text-dark-600 dark:text-dark-300 mt-1">{translateText(step.description)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container-custom pb-10 sm:pb-12 lg:pb-14">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">{translateText('Coverage')}</p>
              <h2 className="font-display text-2xl font-bold text-dark-900 dark:text-white mt-1">{translateText('What We Cover')}</h2>
            </div>
            <Link to="/categories" className="text-sm font-medium flex items-center gap-1 link-muted">
              {translateText('Browse Categories')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coveragePillars.map((pillar) => (
              <article key={pillar.title} className="card p-5">
                <pillar.icon className="w-5 h-5 text-primary-600 dark:text-primary-300 mb-3" />
                <h3 className="font-semibold text-dark-900 dark:text-white">{translateText(pillar.title)}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="container-custom pb-10 sm:pb-12 lg:pb-14">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-dark-400">{translateText('Latest')}</p>
              <h2 className="font-display text-2xl font-bold text-dark-900 dark:text-white mt-1">{translateText('From Our Newsroom')}</h2>
            </div>
            <Link to="/articles" className="text-sm font-medium flex items-center gap-1 link-muted">
              {translateText('View All News')} <ArrowRight className="w-4 h-4" />
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
                      <h3 className={cn(aboutLatestTitleClass, 'line-clamp-2')}>{article.title}</h3>
                      <div className="mt-2 flex items-center justify-between text-xs text-dark-400">
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatRelativeTime(article.publishedAt)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.readTime || `${article.wordCount ? Math.max(1, Math.round(article.wordCount / 200)) : 3} ${translateText('min')}`}</span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-dark-500">
              {translateText('No recent stories available right now.')}
            </div>
          )}
        </section>

        <section className="container-custom pb-14">
          <div className="rounded-3xl border border-dark-200 dark:border-dark-800 bg-dark-900 text-white overflow-hidden">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">{translateText('Join Our Community')}</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mt-2">
                  {translateText('Follow our reporting and be part of the conversation.')}
                </h2>
                <p className="text-white/80 mt-3 max-w-xl">
                  {translateText('Stay updated with our latest investigations, explainers, and local stories that shape public dialogue.')}
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    {translateText('Send Us a Message')} <MessageCircle className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 bg-white/5 border-t lg:border-t-0 lg:border-l border-white/10">
                <h3 className="font-semibold text-white mb-3">{translateText('Connect With')} {siteName}</h3>
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
                          <span className="capitalize">{translateText(social.platform || 'link')}</span>
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

export function PreviewPage() {
  const { translateText } = useLanguage();
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
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">{translateText('Preview Error')}</h1>
          <p className="text-dark-500 mb-6">{translateText(error)}</p>
          <button
            onClick={() => window.close()}
            className="btn btn-primary"
          >
            {translateText('Close Preview')}
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

  const { title, excerpt, content, featuredImage, tags, postType, videoUrl } = previewData;
  const imageUrl = buildMediaUrl(featuredImage) || 'https://picsum.photos/seed/preview/1200/600';
  const normalizedVideoUrl = postType === 'video' ? normalizeFacebookUrl(videoUrl) : '';
  const videoEmbed = postType === 'video' ? buildFacebookEmbedConfig(normalizedVideoUrl) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-amber-900 py-2 px-4 text-center font-medium">
        <span>{translateText('Preview Mode - This is how your news will look when published')}</span>
        <button
          onClick={() => window.close()}
          className="ml-4 px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
        >
          {translateText('Close Preview')}
        </button>
      </div>

      <Helmet><title>{`${title || translateText('Untitled')} - ${translateText('Preview')}`}</title></Helmet>

      <article>
        <section className="border-b border-dark-100 dark:border-dark-800">
          <div className="container-custom py-5 lg:py-8">
            <div className="max-w-4xl">
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-dark-900 dark:text-dark-100 mb-4">
                {title || translateText('Untitled News')}
              </h1>
              {excerpt && (
                <p className="text-base sm:text-2xl text-dark-600 dark:text-dark-300 leading-relaxed">
                  {excerpt}
                </p>
              )}
              <div className="mt-6 overflow-hidden rounded-2xl border border-dark-200 dark:border-dark-700">
                {videoEmbed ? (
                  <div className={videoEmbed.aspectClass}>
                    <iframe
                      title={title || 'Video preview'}
                      src={videoEmbed.src}
                      className="w-full h-full border-0"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="origin-when-cross-origin"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] lg:aspect-[2/1]">
                    <img loading="lazy" src={imageUrl} alt={title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-dark-600 dark:text-dark-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(new Date())}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {translateText('Draft')}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="container-custom py-12">
          <div className="max-w-4xl mx-auto">
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
  const { translateText } = useLanguage();
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
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">{translateText('News Not Found')}</h1>
          <p className="text-dark-500 mb-6">{translateText('This news is not available for preview.')}</p>
          <Link to="/dashboard/pending" className="btn btn-primary">{translateText('Back to Pending')}</Link>
        </div>
      </div>
    );
  }

  const { title, excerpt, content, featuredImage, author, createdAt, publishedAt, status, postType, videoUrl } = article;
  const imageUrl = buildMediaUrl(featuredImage) || `https://picsum.photos/seed/${id}/1200/600`;
  const normalizedVideoUrl = postType === 'video' ? normalizeFacebookUrl(videoUrl) : '';
  const videoEmbed = postType === 'video' ? buildFacebookEmbedConfig(normalizedVideoUrl) : null;
  const authorName = author?.fullName || `${author?.firstName || ''} ${author?.lastName || ''}`.trim() || 'Unknown';
  const displayDate = publishedAt || createdAt;

  return (
    <div className="min-h-screen bg-white dark:bg-dark-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-amber-900 py-2 px-4 text-center font-medium">
        <span>{translateText('Preview Mode')} - {status ? translateText(`${status.charAt(0).toUpperCase()}${status.slice(1)}`) : translateText('Draft')}</span>
        <Link to="/dashboard/pending" className="ml-4 px-3 py-1 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
          {translateText('Back to Pending')}
        </Link>
      </div>

      <Helmet><title>{`${title || translateText('Untitled')} - ${translateText('Preview')}`}</title></Helmet>

      <article>
        <section className="border-b border-dark-100 dark:border-dark-800">
          <div className="container-custom py-5 lg:py-8">
            <div className="max-w-4xl">
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-dark-900 dark:text-dark-100 mb-4">
                {title || translateText('Untitled News')}
              </h1>
              {excerpt && (
                <p className="text-base sm:text-2xl text-dark-600 dark:text-dark-300 leading-relaxed">
                  {excerpt}
                </p>
              )}
              <div className="mt-6 overflow-hidden rounded-2xl border border-dark-200 dark:border-dark-700">
                {videoEmbed ? (
                  <div className={videoEmbed.aspectClass}>
                    <iframe
                      title={title || 'Video preview'}
                      src={videoEmbed.src}
                      className="w-full h-full border-0"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="origin-when-cross-origin"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] lg:aspect-[2/1]">
                    <img loading="lazy" src={imageUrl} alt={title} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-dark-600 dark:text-dark-300">
                <span>{authorName}</span>
                {displayDate && <span>• {formatRelativeTime(displayDate)}</span>}
              </div>
            </div>
          </div>
        </section>

        <div className="container-custom py-10">
          <ArticleContent content={content} />
        </div>
      </article>
    </div>
  );
}
