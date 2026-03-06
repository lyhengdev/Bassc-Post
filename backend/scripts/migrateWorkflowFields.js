import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import Article from '../src/models/Article.js';
import ArticleTranslation from '../src/models/ArticleTranslation.js';

const BATCH_SIZE = 500;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const toArticleId = (value) => (value ? String(value) : '');

const mapTranslationStatusToWorkflowState = (translationStatus) => {
  switch (translationStatus) {
    case 'published':
      return 'approved';
    case 'review':
      return 'submitted';
    case 'in_progress':
      return 'in_progress';
    case 'draft':
    default:
      return 'draft';
  }
};

const deriveArticleTranslationState = (statuses = []) => {
  const set = new Set(Array.isArray(statuses) ? statuses : []);
  if (set.has('published')) return 'approved';
  if (set.has('review')) return 'submitted';
  if (set.has('in_progress') || set.has('draft')) return 'in_translation';
  return 'not_required';
};

const buildArticleWorkflow = (article, translationSummary) => {
  const base = {
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
    sourceReviewNotes: article.reviewNotes || '',
    translationReviewNotes: '',
    adminReviewNotes: '',
  };

  const status = String(article.status || 'draft').trim().toLowerCase();
  const translationStatuses = translationSummary?.statuses || [];
  const derivedTranslationState = deriveArticleTranslationState(translationStatuses);

  if (status === 'pending') {
    base.sourceReviewState = 'submitted';
    base.timestamps.sourceSubmittedAt = article.updatedAt || article.createdAt || null;
  } else if (status === 'published') {
    base.sourceReviewState = 'approved';
    base.translationState = derivedTranslationState;
    base.adminApprovalState = 'approved';
    base.timestamps.sourceReviewedAt = article.reviewedAt || article.publishedAt || article.updatedAt || null;
    base.timestamps.adminReviewedAt = article.publishedAt || article.reviewedAt || article.updatedAt || null;
    base.reviewedBy.sourceReviewer = article.reviewedBy || null;
    base.reviewedBy.adminReviewer = article.reviewedBy || null;
  } else if (status === 'rejected') {
    base.sourceReviewState = 'changes_requested';
    base.translationState = translationStatuses.length ? 'changes_requested' : 'not_required';
    base.timestamps.sourceReviewedAt = article.reviewedAt || article.updatedAt || null;
    base.reviewedBy.sourceReviewer = article.reviewedBy || null;
  } else if (status === 'archived') {
    const wasReviewed = Boolean(article.reviewedAt || article.publishedAt);
    base.sourceReviewState = wasReviewed ? 'approved' : 'draft';
    base.translationState = derivedTranslationState;
    base.adminApprovalState = article.publishedAt ? 'approved' : 'not_ready';
    base.timestamps.sourceReviewedAt = article.reviewedAt || null;
    base.timestamps.adminReviewedAt = article.publishedAt || null;
    base.reviewedBy.sourceReviewer = article.reviewedBy || null;
    base.reviewedBy.adminReviewer = article.reviewedBy || null;
  } else {
    base.translationState = derivedTranslationState;
  }

  if (translationSummary?.latestSubmittedAt) {
    base.timestamps.translationSubmittedAt = translationSummary.latestSubmittedAt;
  }
  if (translationSummary?.latestReviewedAt) {
    base.timestamps.translationReviewedAt = translationSummary.latestReviewedAt;
  }

  return base;
};

const buildTranslationWorkflow = (translation) => {
  const workflowState = mapTranslationStatusToWorkflowState(translation.translationStatus);
  const isApproved = workflowState === 'approved';
  const isSubmitted = workflowState === 'submitted' || isApproved;

  return {
    translationState: workflowState,
    timestamps: {
      submittedAt: isSubmitted ? (translation.updatedAt || translation.createdAt || null) : null,
      reviewedAt: isApproved ? (translation.lastReviewedAt || translation.updatedAt || null) : null,
    },
    reviewedBy: {
      submittedBy: translation.translatedBy || null,
      reviewer: isApproved ? (translation.reviewedBy || null) : null,
    },
    reviewNotes: '',
  };
};

const flushBulkOps = async (model, ops, label) => {
  if (!ops.length) return 0;
  if (dryRun) return ops.length;

  const result = await model.bulkWrite(ops, { ordered: false });
  return result.modifiedCount || 0;
};

const run = async () => {
  await connectDB();

  try {
    console.log(`Starting workflow backfill${dryRun ? ' (dry-run)' : ''}...`);

    const translationSummaries = await ArticleTranslation.aggregate([
      {
        $group: {
          _id: '$articleId',
          statuses: { $addToSet: '$translationStatus' },
          latestSubmittedAt: { $max: '$updatedAt' },
          latestReviewedAt: { $max: '$lastReviewedAt' },
        },
      },
    ]);

    const translationSummaryMap = new Map(
      translationSummaries.map((entry) => [toArticleId(entry._id), entry])
    );

    let articleScanned = 0;
    let articleUpdated = 0;
    let articleOps = [];

    const articleCursor = Article.find({})
      .select('_id status reviewedBy reviewedAt reviewNotes publishedAt createdAt updatedAt')
      .cursor();

    for await (const article of articleCursor) {
      articleScanned += 1;
      const summary = translationSummaryMap.get(toArticleId(article._id));
      const workflow = buildArticleWorkflow(article, summary);
      articleOps.push({
        updateOne: {
          filter: { _id: article._id },
          update: { $set: { workflow } },
        },
      });

      if (articleOps.length >= BATCH_SIZE) {
        articleUpdated += await flushBulkOps(Article, articleOps, 'articles');
        articleOps = [];
      }
    }

    articleUpdated += await flushBulkOps(Article, articleOps, 'articles');

    let translationScanned = 0;
    let translationUpdated = 0;
    let translationOps = [];

    const translationCursor = ArticleTranslation.find({})
      .select('_id translationStatus translatedBy reviewedBy lastReviewedAt createdAt updatedAt')
      .cursor();

    for await (const translation of translationCursor) {
      translationScanned += 1;
      const workflow = buildTranslationWorkflow(translation);
      translationOps.push({
        updateOne: {
          filter: { _id: translation._id },
          update: { $set: { workflow } },
        },
      });

      if (translationOps.length >= BATCH_SIZE) {
        translationUpdated += await flushBulkOps(ArticleTranslation, translationOps, 'translations');
        translationOps = [];
      }
    }

    translationUpdated += await flushBulkOps(ArticleTranslation, translationOps, 'translations');

    console.log(
      JSON.stringify(
        {
          dryRun,
          articles: { scanned: articleScanned, updated: articleUpdated },
          translations: { scanned: translationScanned, updated: translationUpdated },
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

run().catch(async (error) => {
  console.error('Workflow backfill failed:', error);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore close errors
  }
  process.exit(1);
});
