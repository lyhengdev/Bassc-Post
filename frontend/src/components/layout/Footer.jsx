import {Link, useLocation} from 'react-router-dom';
import {Facebook, Twitter, Instagram, Youtube, Linkedin, Github, Mail, MapPin, Phone, Send, MessageCircle, Hash} from 'lucide-react';
import { useCategories, usePublicSettings } from '../../hooks/useApi';
import useLanguage from '../../hooks/useLanguage';
import { BodyAd } from '../ads/index.js';
import { useSelectAds, useTrackAdEvent, useDeviceType } from '../../hooks/useAds';
import { buildMediaUrl } from '../../utils';

const SOCIAL_ICONS = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  github: Github,
  telegram: Send,
  discord: MessageCircle,
  tiktok: Hash,
};

export default function Footer() {
    const { t, translateText } = useLanguage();
    const { data: settings } = usePublicSettings();
    const { data: categories } = useCategories();
    const location = useLocation();
    const device = useDeviceType();
    const { mutate: trackAdEvent } = useTrackAdEvent();
    const currentYear = new Date().getFullYear();

    const links = {
        company: [
            {label: t('footer.aboutUs', 'About Us'), href: '/about'},
            {label: t('nav.contact', 'Contact'), href: '/contact'},
        ],
        resources: [
            {label: t('nav.news', 'News'), href: '/articles'},
        ],
        legal: [
            {label: t('footer.privacy', 'Privacy Policy'), href: '/privacy'},
            {label: t('footer.terms', 'Terms of Service'), href: '/terms'},
        ],
    };

    // Get social links from settings or use defaults
    const socialLinks = settings?.socialLinks?.length > 0 
      ? settings.socialLinks.filter(s => s.enabled).map(s => ({
          icon: SOCIAL_ICONS[s.platform] || Facebook,
          href: s.url,
          label: s.platform,
        }))
      : [
          {icon: Facebook, href: '#', label: 'Facebook'},
          {icon: Twitter, href: '#', label: 'Twitter'},
          {icon: Instagram, href: '#', label: 'Instagram'},
          {icon: Youtube, href: '#', label: 'YouTube'},
        ];

    const siteName = settings?.siteName || 'Bassac Post';
    const siteDescription = settings?.siteDescription || translateText('Your trusted source for quality news, insightful articles, and in-depth coverage of the stories that matter.');
    const siteLogo = settings?.siteLogo;
    const siteEmail = settings?.siteEmail || 'hello@bassacmedia.com';
    const sitePhone = settings?.sitePhone || '+855 12 345 678';
    const siteAddress = settings?.siteAddress || translateText('Phnom Penh, Cambodia');
    const footerSettings = settings?.footerSettings || {};
    const searchParams = new URLSearchParams(location.search);
    const pageType = location.pathname === '/'
      ? 'homepage'
      : location.pathname.startsWith('/article')
        ? 'article'
        : location.pathname.startsWith('/category')
          ? 'category'
          : location.pathname.startsWith('/articles') && searchParams.get('q')
            ? 'search'
          : location.pathname.startsWith('/articles')
            ? 'article'
            : 'other';
    const pageUrl = location.pathname;
    const { data: footerAds } = useSelectAds('footer', {
      pageType,
      device,
      pageUrl,
      limit: 1
    });
    const footerAd = footerAds?.[0];

    const categorySlugById = new Map();
    (categories || []).forEach((cat) => {
      categorySlugById.set(cat._id, cat.slug);
    });

    const getMenuHref = (item) => {
      if (!item) return '/';
      if (item.type === 'category') {
        const slug = item.categorySlug || categorySlugById.get(item.categoryId);
        return slug ? `/category/${slug}` : '/categories';
      }
      if (item.type === 'page') {
        return item.url || '/';
      }
      return item.url || item.href || '/';
    };

    const renderMenuLink = (item) => {
      const href = item.href || getMenuHref(item);
      const isExternal = /^https?:\/\//.test(href);
      const target = item.target || '_self';
      const className = 'text-sm hover:text-white transition-colors';
      const normalizedHref = String(href || '').split('#')[0].split('?')[0];
      const normalizedLabel = String(item.label || '').trim().toLowerCase();
      let localizedLabel = item.label || 'Link';

      if (normalizedHref === '/articles' || normalizedLabel === 'news') localizedLabel = t('nav.news', localizedLabel);
      if (normalizedHref === '/categories' || normalizedLabel === 'categories') localizedLabel = t('nav.categories', localizedLabel);
      if (normalizedHref === '/about' || normalizedLabel === 'about' || normalizedLabel === 'about us') localizedLabel = t('footer.aboutUs', localizedLabel);
      if (normalizedHref === '/contact' || normalizedLabel === 'contact') localizedLabel = t('nav.contact', localizedLabel);
      if (normalizedHref === '/privacy' || normalizedLabel === 'privacy policy') localizedLabel = t('footer.privacy', localizedLabel);
      if (normalizedHref === '/terms' || normalizedLabel === 'terms of service') localizedLabel = t('footer.terms', localizedLabel);
      localizedLabel = translateText(localizedLabel);
      if (isExternal) {
        return (
          <a
            href={href}
            target={target}
            rel={target === '_blank' ? 'noopener noreferrer' : undefined}
            className={className}
          >
            {localizedLabel}
          </a>
        );
      }
      return (
        <Link
          to={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          className={className}
        >
          {localizedLabel}
        </Link>
      );
    };

    const footerMenu = Array.isArray(settings?.menus?.footer) && settings.menus.footer.length > 0
      ? [...settings.menus.footer].sort((a, b) => (a.order || 0) - (b.order || 0))
      : [];

    const hasFooterGroups = footerMenu.some((item) => Array.isArray(item.children) && item.children.length > 0);
    const footerColumns = hasFooterGroups
      ? footerMenu.map((item) => ({
          title: item.label,
          items: item.children,
        }))
      : footerMenu.length > 0
        ? [{ title: t('footer.links', 'Links'), items: footerMenu }]
        : [
            { title: t('footer.company', 'Company'), items: links.company },
            { title: t('footer.resources', 'Resources'), items: links.resources },
            { title: t('footer.legal', 'Legal'), items: links.legal },
          ];

    const copyrightTemplate = footerSettings.copyrightText || '© {year} {siteName}. All rights reserved.';
    const copyrightText = translateText(copyrightTemplate)
      .replace('{year}', String(currentYear))
      .replace('{siteName}', siteName);

    return (
        <footer className="bg-dark-900 text-dark-300 mt-auto">
            {footerAd && (
              <div className="border-b border-dark-800">
                <div className="container-custom py-4">
                  <BodyAd
                    ad={footerAd}
                    placementOverride="footer"
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
                </div>
              </div>
            )}
            <div className="container-custom py-12 lg:py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-2">
                        <Link to="/" className="flex items-center gap-2 pb-5">
                            {(() => {
                                const stripUrl = (value) => String(value || '').split('#')[0].split('?')[0];
                                const strippedLogo = stripUrl(siteLogo);
                                const shouldUseDefaultLogo = !siteLogo
                                  || strippedLogo.endsWith('/LogoV1_white.png')
                                  || strippedLogo.endsWith('/logo_v1.png')
                                  || strippedLogo.endsWith('LogoV1.png')
                                  || strippedLogo.endsWith('logo_v1.png');

                                if (!shouldUseDefaultLogo) {
                                    return <img loading="lazy" src={buildMediaUrl(siteLogo)} alt={siteName} className="h-10 w-auto" />;
                                }

                                return (
                                  <img
                                    loading="lazy"
                                    src="/LogoV1_white.png"
                                    alt={siteName}
                                    className="h-10 w-auto"
                                  />
                                );
                            })()}
                        </Link>
                        <p className="text-dark-400 mb-6 max-w-sm text-sm lg:text-base">
                            {siteDescription}
                        </p>
                        <div className="space-y-3 text-sm">
                            {siteAddress && (
                              <div className="flex items-center gap-3">
                                  <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0"/>
                                  <span>{siteAddress}</span>
                              </div>
                            )}
                            {siteEmail && (
                              <div className="flex items-center gap-3">
                                  <Mail className="w-4 h-4 text-primary-500 flex-shrink-0"/>
                                  <a
                                      href={`mailto:${siteEmail}`}
                                      className="hover:text-white transition-colors break-all"
                                  >
                                      {siteEmail}
                                  </a>
                              </div>
                            )}
                            {sitePhone && (
                              <div className="flex items-center gap-3">
                                  <Phone className="w-4 h-4 text-primary-500 flex-shrink-0"/>
                                  <a
                                      href={`tel:${sitePhone.replace(/\s/g, '')}`}
                                      className="hover:text-white transition-colors"
                                  >
                                      {sitePhone}
                                  </a>
                              </div>
                            )}
                        </div>
                    </div>

                    {footerColumns.map((column) => (
                      <div key={column.title}>
                        <h3 className="font-semibold text-white mb-4">{translateText(column.title)}</h3>
                        <ul className="space-y-3">
                          {column.items.map((item) => {
                            return (
                              <li key={item.id || item.url || item.href || item.label}>
                                {renderMenuLink(item)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-dark-800">
                <div className="container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-dark-500 text-center sm:text-left">
                        {copyrightText}
                    </p>
                    {footerSettings.showSocialLinks !== false && (
                      <div className="flex items-center gap-3">
                        {socialLinks.map((social, index) => (
                          <a
                            key={index}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={translateText(social.label)}
                            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                          >
                            <social.icon className="w-5 h-5"/>
                          </a>
                        ))}
                      </div>
                    )}
                </div>
            </div>
        </footer>
    );
}
