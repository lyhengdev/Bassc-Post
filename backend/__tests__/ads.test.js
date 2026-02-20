import { jest } from '@jest/globals';
import mongoose from 'mongoose';

jest.unstable_mockModule('isomorphic-dompurify', () => ({
  default: {
    sanitize: (input) => input,
  },
}));

describe('Ads system', () => {
  let adSelectionService;
  let AdEvent;
  let Ad;
  let AdCollection;
  let cacheService;
  let trackEvent;
  let createAd;

  beforeAll(async () => {
    ({ default: adSelectionService } = await import('../src/services/adSelectionService.js'));
    ({ default: AdEvent } = await import('../src/models/AdEvent.js'));
    ({ default: Ad } = await import('../src/models/Ad.js'));
    ({ default: AdCollection } = await import('../src/models/AdCollection.js'));
    ({ default: cacheService } = await import('../src/services/cacheService.js'));
    const adsController = await import('../src/controllers/adsControllerComplete.js');
    trackEvent = adsController.trackEvent;
    createAd = adsController.createAd;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('normalizes pageType to article and sets session cookie when tracking events', async () => {
    const adId = '507f191e810c19729de860ea';
    const incrementImpression = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Ad, 'findById').mockResolvedValue({
      _id: adId,
      collectionId: '507f191e810c19729de860ef',
      status: 'active',
      incrementImpression,
      incrementClick: jest.fn(),
    });
    const logSpy = jest.spyOn(AdEvent, 'logEvent').mockResolvedValue({ _id: 'event-1' });

    const req = {
      body: {
        adId,
        type: 'impression',
        pageType: 'articles',
        pageUrl: '/article/test',
        device: 'desktop',
      },
      cookies: {},
      headers: {},
      user: { _id: '507f191e810c19729de860eb' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };

    await trackEvent(req, res);

    expect(res.cookie).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
      pageType: 'article',
      adId,
    }));
    expect(incrementImpression).toHaveBeenCalled();
  });

  it('skips ads that reached global max impressions during selection', async () => {
    const ads = [
      { _id: '507f191e810c19729de860ec', frequency: { type: 'unlimited', maxImpressions: 1, maxClicks: 0 } },
    ];
    jest.spyOn(AdEvent, 'find').mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    }));
    jest.spyOn(AdEvent, 'aggregate').mockResolvedValue([
      { _id: { adId: new mongoose.Types.ObjectId('507f191e810c19729de860ec'), type: 'impression' }, count: 1 },
    ]);

    const filtered = await adSelectionService.applyFrequencyControl(
      ads,
      { sessionId: 'session-123' },
      'article:/page'
    );

    expect(filtered).toHaveLength(0);
  });

  it('enforces once_per_page using pageKey', async () => {
    const ads = [{ _id: '507f191e810c19729de860ed', frequency: { type: 'once_per_page' } }];
    jest.spyOn(AdEvent, 'find').mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve([
          { adId: ads[0]._id, type: 'impression', pageKey: 'article:/page-1', createdAt: new Date() },
        ]),
      }),
    }));
    jest.spyOn(AdEvent, 'aggregate').mockResolvedValue([]);

    const filteredSamePage = await adSelectionService.applyFrequencyControl(
      ads,
      { sessionId: 'session-1' },
      'article:/page-1'
    );
    expect(filteredSamePage).toHaveLength(0);

    const filteredOtherPage = await adSelectionService.applyFrequencyControl(
      ads,
      { sessionId: 'session-1' },
      'article:/page-2'
    );
    expect(filteredOtherPage).toHaveLength(1);
  });

  it('filters ads in selectAds and logs served impressions', async () => {
    const ads = [
      { _id: '507f191e810c19729de860aa', frequency: { type: 'unlimited', maxImpressions: 1, maxClicks: 0 } },
      { _id: '507f191e810c19729de860ab', frequency: { type: 'unlimited', maxImpressions: 0, maxClicks: 0 } },
    ];
    jest.spyOn(cacheService, 'get').mockResolvedValue(null);
    jest.spyOn(cacheService, 'set').mockResolvedValue(true);
    jest.spyOn(Ad, 'find').mockReturnValue({
      sort: () => ({
        limit: () => ({
          lean: async () => ads,
        }),
      }),
    });
    jest.spyOn(AdEvent, 'find').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    jest.spyOn(AdEvent, 'aggregate').mockResolvedValue([
      { _id: { adId: new mongoose.Types.ObjectId(ads[0]._id), type: 'impression' }, count: 1 },
    ]);
    const trackImpressionSpy = jest
      .spyOn(adSelectionService, 'trackImpression')
      .mockResolvedValue(null);

    const selected = await adSelectionService.selectAds({
      placement: 'between_sections',
      pageType: 'article',
      device: 'desktop',
      sessionId: 'session-1',
      pageUrl: '/article/test',
      limit: 2,
    });

    expect(selected).toHaveLength(1);
    expect(selected[0]._id).toBe(ads[1]._id);
    expect(trackImpressionSpy).toHaveBeenCalled();
  });

  it('returns recorded=false when event dedupe blocks tracking', async () => {
    const adId = '507f191e810c19729de860ea';
    jest.spyOn(Ad, 'findById').mockResolvedValue({
      _id: adId,
      collectionId: '507f191e810c19729de860ef',
      status: 'active',
      incrementImpression: jest.fn(),
      incrementClick: jest.fn(),
    });
    jest.spyOn(AdEvent, 'logEvent').mockResolvedValue(null);

    const req = {
      body: {
        adId,
        type: 'impression',
        pageType: 'article',
        pageUrl: '/p',
      },
      cookies: {},
      headers: {},
      user: null,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
    };

    await trackEvent(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      recorded: false,
    }));
  });

  it('returns ad payload on createAd', async () => {
    const mockAd = { _id: '507f191e810c19729de860ff', name: 'Response Test' };
    jest.spyOn(AdCollection, 'findById').mockResolvedValue({ _id: '507f191e810c19729de86010' });
    jest.spyOn(Ad, 'create').mockResolvedValue(mockAd);

    const req = {
      params: { collectionId: '507f191e810c19729de86010' },
      body: {
        name: 'Response Test',
        type: 'image',
        imageUrl: 'https://example.com/ad.jpg',
      },
      user: { _id: '507f191e810c19729de860aa' },
    };

    const jsonMock = jest.fn();
    const res = {
      status: jest.fn(() => ({ json: jsonMock })),
      json: jsonMock,
    };

    await createAd(req, res);

    expect(jsonMock).toHaveBeenCalled();
    const payload = jsonMock.mock.calls[0][0];
    expect(payload.ad).toEqual(mockAd);
  });

  it('matches between_sections collections by sectionIndex', () => {
    const collection = new AdCollection({
      name: 'Homepage Section 2',
      placement: 'between_sections',
      sectionIndex: 1,
      targetPages: ['homepage'],
      targetDevices: ['mobile', 'desktop'],
      targetUserTypes: ['all'],
      targetCountries: ['all'],
    });

    expect(collection.matchesContext({
      pageType: 'homepage',
      device: 'mobile',
      sectionIndex: 1,
      isLoggedIn: false,
      country: 'all',
    })).toBe(true);

    expect(collection.matchesContext({
      pageType: 'homepage',
      device: 'mobile',
      sectionIndex: 0,
      isLoggedIn: false,
      country: 'all',
    })).toBe(false);
  });
});
