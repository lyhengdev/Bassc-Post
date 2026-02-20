/**
 * Advanced Analytics Tracker
 * 
 * Client-side tracking script for comprehensive analytics
 * Tracks: page views, scroll depth, reading time, clicks, etc.
 */
import { buildApiUrl } from '.';

class AnalyticsTracker {
  constructor(apiUrl) {
    this.apiUrl = apiUrl || buildApiUrl('/analytics/track');
    this.sessionId = this.getOrCreateSessionId();
    this.userId = null;
    this.pageStartTime = Date.now();
    this.lastScrollDepth = 0;
    this.scrollTimer = null;
    this.readingTimer = null;
    this.isReading = false;
    
    this.init();
  }

  /**
   * Initialize tracking
   */
  init() {
    // Track page view
    this.trackPageView();

    // Track scroll depth
    this.setupScrollTracking();

    // Track reading time
    this.setupReadingTimeTracking();

    // Track clicks
    this.setupClickTracking();

    // Track page exit
    this.setupExitTracking();

    // Get user location
    this.getUserLocation();
  }

  /**
   * Get or create session ID
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('analyticsSessionId');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('analyticsSessionId', sessionId);
    }

    return sessionId;
  }

  /**
   * Set user ID (when user is authenticated)
   */
  setUserId(userId) {
    this.userId = userId;
  }

  /**
   * Get device info
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    
    let deviceType = 'desktop';
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    // Simple browser detection
    let browser = 'unknown';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    // Simple OS detection
    let os = 'unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    return {
      type: deviceType,
      browser,
      os,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    if (!window.performance || !window.performance.timing) {
      return {};
    }

    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    return {
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      domComplete: timing.domComplete - timing.navigationStart,
    };
  }

  /**
   * Get user location (from IP)
   */
  async getUserLocation() {
    try {
      // You can use a geolocation API or get from server
      // For now, just get timezone
      this.location = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch (error) {
      console.error('Location error:', error);
    }
  }

  /**
   * Get traffic source
   */
  getTrafficSource() {
    const referrer = document.referrer;
    const url = new URL(window.location.href);
    
    // Get UTM parameters
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign');
    const utmTerm = url.searchParams.get('utm_term');
    const utmContent = url.searchParams.get('utm_content');

    // Determine source type
    let sourceType = 'direct';
    
    if (referrer) {
      const referrerDomain = new URL(referrer).hostname;
      const currentDomain = window.location.hostname;

      if (referrerDomain !== currentDomain) {
        // Check if social media
        if (/facebook|twitter|linkedin|instagram|pinterest/i.test(referrer)) {
          sourceType = 'social';
        }
        // Check if search engine
        else if (/google|bing|yahoo|duckduckgo/i.test(referrer)) {
          sourceType = 'organic';
        }
        // Other referrer
        else {
          sourceType = 'referral';
        }
      }
    }

    if (utmMedium === 'cpc' || utmMedium === 'ppc') {
      sourceType = 'paid';
    } else if (utmMedium === 'email') {
      sourceType = 'email';
    }

    return {
      type: sourceType,
      medium: utmMedium,
      campaign: utmCampaign,
      source: utmSource,
      term: utmTerm,
      content: utmContent,
      referrer: referrer || null,
    };
  }

  /**
   * Track event
   */
  async track(eventType, properties = {}) {
    const event = {
      eventType,
      properties: {
        page: {
          url: window.location.href,
          path: window.location.pathname,
          title: document.title,
          referrer: document.referrer,
          language: navigator.language,
        },
        ...properties,
      },
      userId: this.userId,
      sessionId: this.sessionId,
      device: this.getDeviceInfo(),
      location: this.location || {},
      source: this.getTrafficSource(),
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        isNewUser: !localStorage.getItem('returningUser'),
        isReturningUser: !!localStorage.getItem('returningUser'),
      },
    };

    // Mark as returning user
    localStorage.setItem('returningUser', 'true');

    try {
      await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  /**
   * Track page view
   */
  trackPageView() {
    const performance = this.getPerformanceMetrics();
    
    this.track('page_view', {
      performance,
    });
  }

  /**
   * Setup scroll tracking
   */
  setupScrollTracking() {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollDepth = Math.round((scrollTop / scrollHeight) * 100);

          // Track at 25%, 50%, 75%, 100%
          if (scrollDepth >= 25 && this.lastScrollDepth < 25) {
            this.track('scroll_depth', {
              engagement: { scrollDepth: 25 },
            });
            this.lastScrollDepth = 25;
          } else if (scrollDepth >= 50 && this.lastScrollDepth < 50) {
            this.track('scroll_depth', {
              engagement: { scrollDepth: 50 },
            });
            this.lastScrollDepth = 50;
          } else if (scrollDepth >= 75 && this.lastScrollDepth < 75) {
            this.track('scroll_depth', {
              engagement: { scrollDepth: 75 },
            });
            this.lastScrollDepth = 75;
          } else if (scrollDepth >= 95 && this.lastScrollDepth < 95) {
            this.track('scroll_depth', {
              engagement: { scrollDepth: 100 },
            });
            this.lastScrollDepth = 100;
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * Setup reading time tracking
   */
  setupReadingTimeTracking() {
    let startTime = Date.now();
    let activeTime = 0;
    let lastActivity = Date.now();

    // Track when user is active
    const resetActivity = () => {
      const now = Date.now();
      if (now - lastActivity < 5000) {
        // Active within last 5 seconds
        activeTime += now - lastActivity;
      }
      lastActivity = now;
    };

    ['scroll', 'mousemove', 'keydown', 'click', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetActivity, { passive: true });
    });

    // Track reading time every 30 seconds
    this.readingTimer = setInterval(() => {
      const readingTime = Math.round(activeTime / 1000);
      if (readingTime > 5) {
        // Only track if user read for at least 5 seconds
        this.track('reading_time', {
          engagement: {
            readingTime,
            timeOnPage: Math.round((Date.now() - startTime) / 1000),
          },
        });
      }
    }, 30000);
  }

  /**
   * Setup click tracking
   */
  setupClickTracking() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (target) {
        const href = target.getAttribute('href');
        const text = target.textContent?.trim().substring(0, 100);
        
        this.track('click', {
          custom: {
            elementType: target.tagName.toLowerCase(),
            href,
            text,
            className: target.className,
          },
        });
      }
    });
  }

  /**
   * Setup exit tracking
   */
  setupExitTracking() {
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.round((Date.now() - this.pageStartTime) / 1000);
      
      // Use sendBeacon for guaranteed delivery
      const data = JSON.stringify({
        eventType: 'page_exit',
        properties: {
          engagement: {
            timeOnPage,
            scrollDepth: this.lastScrollDepth,
          },
        },
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
      });

      navigator.sendBeacon(this.apiUrl, data);
    });
  }

  /**
   * Track article view
   */
  trackArticleView(article) {
    this.track('article_view', {
      article: {
        _id: article._id,
        slug: article.slug,
        title: article.title,
        category: article.category,
        author: article.author,
        tags: article.tags,
      },
    });
  }

  /**
   * Track article read (when user finishes reading)
   */
  trackArticleRead(article, readingTime) {
    this.track('article_read', {
      article: {
        _id: article._id,
        slug: article.slug,
        title: article.title,
      },
      engagement: {
        readingTime,
      },
    });
  }

  /**
   * Track search
   */
  trackSearch(query, resultsCount) {
    this.track('search', {
      search: {
        query,
        resultsCount,
      },
    });
  }

  /**
   * Track search result click
   */
  trackSearchResultClick(query, resultId, position) {
    this.track('search_result_click', {
      search: {
        query,
        resultClicked: resultId,
        position,
      },
    });
  }

  /**
   * Track campaign view
   */
  trackCampaignView(campaign) {
    this.track('campaign_view', {
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        placement: campaign.placement,
        adId: campaign.adId,
      },
    });
  }

  /**
   * Track campaign click
   */
  trackCampaignClick(campaign) {
    this.track('campaign_click', {
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        placement: campaign.placement,
        adId: campaign.adId,
      },
    });
  }
}

// Create global instance
window.analytics = new AnalyticsTracker();

export default AnalyticsTracker;
