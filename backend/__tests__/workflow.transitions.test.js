import { jest } from '@jest/globals';

const mockArticleFindById = jest.fn();
const mockCategoryFindById = jest.fn();
const mockUserFind = jest.fn();
const mockUserFindById = jest.fn();
const mockTranslationGetByArticleAndLanguage = jest.fn();

const mockNotifyArticleSubmitted = jest.fn();
const mockNotifyTranslationSubmitted = jest.fn();
const mockNotifyArticlePublished = jest.fn();
const mockTelegramWorkflowUpdate = jest.fn();

jest.unstable_mockModule('../src/models/index.js', () => ({
  Article: {
    findById: (...args) => mockArticleFindById(...args),
  },
  ArticleTranslation: {
    getByArticleAndLanguage: (...args) => mockTranslationGetByArticleAndLanguage(...args),
  },
  Category: {
    findById: (...args) => mockCategoryFindById(...args),
  },
  Media: {},
  User: {
    find: (...args) => mockUserFind(...args),
    findById: (...args) => mockUserFindById(...args),
  },
}));

jest.unstable_mockModule('../src/models/Analytics.js', () => ({
  analyticsHelpers: {
    recordPageView: jest.fn().mockResolvedValue(undefined),
  },
  PageView: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/utils/helpers.js', () => ({
  sanitizeEditorContent: (value) => value,
  parsePaginationParams: () => ({ page: 1, limit: 20, skip: 0 }),
  generateHash: () => 'mock-hash',
  getClientIp: () => '127.0.0.1',
}));

jest.unstable_mockModule('../src/services/emailService.js', () => ({
  default: {
    sendArticleRejectedEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.unstable_mockModule('../src/services/cacheService.js', () => ({
  default: {
    invalidateArticleLists: jest.fn().mockResolvedValue(undefined),
    bufferViewCount: jest.fn().mockResolvedValue(1),
  },
}));

jest.unstable_mockModule('../src/services/notificationService.js', () => ({
  default: {
    notifyArticleSubmitted: (...args) => mockNotifyArticleSubmitted(...args),
    notifyArticlePublished: (...args) => mockNotifyArticlePublished(...args),
    notifySourceApproved: jest.fn().mockResolvedValue(undefined),
    notifyTranslationAssigned: jest.fn().mockResolvedValue(undefined),
    notifyTranslationSubmitted: (...args) => mockNotifyTranslationSubmitted(...args),
    notifyAdminReviewPending: jest.fn().mockResolvedValue(undefined),
    notifyArticleRejected: jest.fn().mockResolvedValue(undefined),
    notify: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: {
    frontendUrl: 'http://localhost:5173',
    siteUrl: 'http://localhost:5173',
    telegram: {
      enabled: false,
      botToken: '',
      chatIds: { editor: [], translator: [], admin: [] },
    },
  },
}));

jest.unstable_mockModule('../src/services/telegramService.js', () => ({
  default: {
    sendWorkflowUpdateNonBlocking: (...args) => mockTelegramWorkflowUpdate(...args),
  },
}));

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const createArticleDoc = ({
  id = 'article-1',
  authorId = 'writer-1',
  status = 'draft',
  title = 'Workflow Article',
  workflow = {},
} = {}) => ({
  _id: id,
  title,
  language: 'en',
  category: 'category-1',
  author: {
    _id: authorId,
    firstName: 'Writer',
    lastName: 'User',
  },
  status,
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: '',
  rejectionReason: '',
  publishedAt: null,
  workflow: {
    sourceReviewState: 'draft',
    translationState: 'not_required',
    adminApprovalState: 'not_ready',
    assignedTranslator: null,
    timestamps: {
      sourceSubmittedAt: null,
      sourceReviewedAt: null,
      translationSubmittedAt: null,
      translationReviewedAt: null,
      adminReviewedAt: null,
    },
    reviewedBy: {
      sourceReviewer: null,
      translationReviewer: null,
      adminReviewer: null,
    },
    sourceReviewNotes: '',
    translationReviewNotes: '',
    adminReviewNotes: '',
    auditTrail: [],
    ...workflow,
  },
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
});

const createTranslationDoc = ({
  workflow = {},
} = {}) => ({
  _id: 'translation-1',
  workflow: {
    translationState: 'draft',
    timestamps: {
      submittedAt: null,
      reviewedAt: null,
    },
    reviewedBy: {
      submittedBy: null,
      reviewer: null,
    },
    reviewNotes: '',
    ...workflow,
  },
  translatedBy: null,
  translationStatus: 'draft',
  lastReviewedAt: null,
  reviewedBy: null,
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
});

let articleController;

beforeAll(async () => {
  ({ default: articleController } = await import('../src/controllers/articleController.js'));
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFind.mockReturnValue({
    select: jest.fn().mockResolvedValue([]),
  });
  mockUserFindById.mockResolvedValue(null);
  mockTranslationGetByArticleAndLanguage.mockResolvedValue(null);
  mockCategoryFindById.mockResolvedValue({
    updateArticleCount: jest.fn().mockResolvedValue(undefined),
  });
});

describe('workflow transitions', () => {
  it('submits source from draft to submitted state', async () => {
    const article = createArticleDoc({
      status: 'draft',
      workflow: { sourceReviewState: 'draft' },
    });
    mockArticleFindById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(article),
    });
    mockUserFind.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'editor-1' }]),
    });

    const req = {
      params: { id: article._id },
      user: { _id: 'writer-1', role: 'writer' },
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await articleController.submitSourceForWorkflow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(article.save).toHaveBeenCalledTimes(1);
    expect(article.status).toBe('pending');
    expect(article.workflow.sourceReviewState).toBe('submitted');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockNotifyArticleSubmitted).toHaveBeenCalled();
    expect(mockTelegramWorkflowUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRole: 'editor',
        stage: 'SOURCE SUBMITTED',
      })
    );
  });

  it('blocks source submit when state is not draft/changes_requested', async () => {
    const article = createArticleDoc({
      status: 'pending',
      workflow: { sourceReviewState: 'approved' },
    });
    mockArticleFindById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(article),
    });

    const req = {
      params: { id: article._id },
      user: { _id: 'writer-1', role: 'writer' },
      body: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await articleController.submitSourceForWorkflow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(article.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Source cannot be submitted from this state'),
      })
    );
  });

  it('gates final publish when translation is not editor-approved', async () => {
    const article = createArticleDoc({
      status: 'pending',
      workflow: {
        sourceReviewState: 'approved',
        translationState: 'submitted',
        adminApprovalState: 'pending_final_review',
      },
    });
    mockArticleFindById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(article),
    });

    const req = {
      params: { id: article._id },
      user: { _id: 'admin-1', role: 'admin' },
      body: { notes: 'ok' },
    };
    const res = createMockRes();
    const next = jest.fn();

    await articleController.finalApproveForWorkflow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(article.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Final approval requires editor-approved translation'),
      })
    );
  });

  it('submits translation to editor review (writer flow)', async () => {
    const article = createArticleDoc({
      status: 'pending',
      workflow: {
        sourceReviewState: 'approved',
        translationState: 'in_translation',
        adminApprovalState: 'not_ready',
        assignedTranslator: null,
      },
    });
    const translation = createTranslationDoc();

    mockArticleFindById.mockResolvedValue(article);
    mockTranslationGetByArticleAndLanguage.mockResolvedValue(translation);
    mockUserFind.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'editor-1' }]),
    });
    mockNotifyTranslationSubmitted.mockResolvedValue(undefined);

    const req = {
      params: { id: article._id },
      user: { _id: 'writer-1', role: 'writer' },
      body: { language: 'km' },
    };
    const res = createMockRes();
    const next = jest.fn();

    await articleController.submitTranslationForWorkflow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(translation.save).toHaveBeenCalledTimes(1);
    expect(article.save).toHaveBeenCalledTimes(1);
    expect(translation.workflow.translationState).toBe('submitted');
    expect(translation.translationStatus).toBe('review');
    expect(article.workflow.translationState).toBe('submitted');
    expect(article.workflow.adminApprovalState).toBe('not_ready');
    expect(article.workflow.reviewedBy.translationReviewer).toBeNull();
    expect(article.workflow.assignedTranslator).toBe('writer-1');
    expect(mockNotifyTranslationSubmitted).toHaveBeenCalledWith(
      article,
      ['editor-1'],
      'km'
    );
    expect(mockTelegramWorkflowUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRole: 'editor',
        stage: 'TRANSLATION SUBMITTED',
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('blocks writer from submitting translation on non-owned unassigned article', async () => {
    const article = createArticleDoc({
      status: 'pending',
      authorId: 'writer-2',
      workflow: {
        sourceReviewState: 'approved',
        translationState: 'in_translation',
        adminApprovalState: 'not_ready',
        assignedTranslator: null,
      },
    });

    mockArticleFindById.mockResolvedValue(article);

    const req = {
      params: { id: article._id },
      user: { _id: 'writer-1', role: 'writer' },
      body: { language: 'km' },
    };
    const res = createMockRes();
    const next = jest.fn();

    await articleController.submitTranslationForWorkflow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(article.save).not.toHaveBeenCalled();
    expect(mockTranslationGetByArticleAndLanguage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Writers can only submit translation'),
      })
    );
  });

  it('publishes only when final approval prerequisites are satisfied', async () => {
    const article = createArticleDoc({
      status: 'pending',
      workflow: {
        sourceReviewState: 'approved',
        translationState: 'approved',
        adminApprovalState: 'pending_final_review',
      },
    });
    mockArticleFindById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(article),
    });

    const req = {
      params: { id: article._id },
      user: { _id: 'admin-1', role: 'admin' },
      body: { notes: 'publish now' },
    };
    const res = createMockRes();
    const next = jest.fn();

    await articleController.finalApproveForWorkflow(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(article.save).toHaveBeenCalledTimes(1);
    expect(article.status).toBe('published');
    expect(article.workflow.adminApprovalState).toBe('approved');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockNotifyArticlePublished).toHaveBeenCalled();
    expect(mockTelegramWorkflowUpdate).toHaveBeenCalledTimes(3);
    expect(mockTelegramWorkflowUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ targetRole: 'editor', stage: 'PUBLISHED' })
    );
    expect(mockTelegramWorkflowUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ targetRole: 'translator', stage: 'PUBLISHED' })
    );
    expect(mockTelegramWorkflowUpdate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ targetRole: 'admin', stage: 'PUBLISHED' })
    );
  });
});
