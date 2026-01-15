import {Link} from 'react-router-dom';
import {Facebook, Twitter, Instagram, Youtube, Linkedin, Github, Mail, MapPin, Phone, Send, MessageCircle, Hash} from 'lucide-react';
import { usePublicSettings } from '../../hooks/useApi';

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
    const { data: settings } = usePublicSettings();
    const currentYear = new Date().getFullYear();

    const links = {
        company: [
            {label: 'About Us', href: '/about'},
            {label: 'Contact', href: '/contact'},
        ],
        resources: [
            {label: 'Articles', href: '/articles'},
        ],
        legal: [
            {label: 'Privacy Policy', href: '/privacy'},
            {label: 'Terms of Service', href: '/terms'},
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

    const siteName = settings?.siteName || 'Bassac Media Center';
    const siteDescription = settings?.siteDescription || 'Your trusted source for quality news, insightful articles, and in-depth coverage of the stories that matter.';
    const siteLogo = settings?.siteLogo;
    const siteEmail = settings?.siteEmail || 'hello@bassacmedia.com';
    const sitePhone = settings?.sitePhone || '+855 12 345 678';
    const siteAddress = settings?.siteAddress || 'Phnom Penh, Cambodia';

    return (
        <footer className="bg-dark-900 text-dark-300 mt-auto">
            <div className="container-custom py-12 lg:py-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-2">
                        <Link to="/" className="flex items-center gap-2 pb-5">
                            {siteLogo ? (
                              <img src={siteLogo} alt={siteName} className="h-10 w-auto" />
                            ) : (
                              <div className="w-36 rounded-xl bg-gradient-to-br flex items-center justify-center">
                                  <img src="./LogoV1_white.png" alt={siteName} />
                              </div>
                            )}
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

                    {/* Company Links */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Company</h3>
                        <ul className="space-y-3">
                            {links.company.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources Links */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Resources</h3>
                        <ul className="space-y-3">
                            {links.resources.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Legal</h3>
                        <ul className="space-y-3">
                            {links.legal.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        to={link.href}
                                        className="text-sm hover:text-white transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-dark-800">
                <div className="container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-dark-500 text-center sm:text-left">
                        © {currentYear} {siteName}. All rights reserved.
                    </p>
                    <div className="flex items-center gap-3">
                        {socialLinks.map((social, index) => (
                            <a
                                key={index}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                            >
                                <social.icon className="w-5 h-5"/>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
