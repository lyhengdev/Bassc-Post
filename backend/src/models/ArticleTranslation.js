import mongoose from 'mongoose';

/**
 * ArticleTranslation Model
 * 
 * Stores translations for articles in different languages
 * Each article can have multiple translations
 */

// Editor.js block schema - supports various block types
const editorBlockSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                'paragraph',
                'header',
                'list',
                'image',
                'quote',
                'code',
                'delimiter',
                'table',
                'embed',
                'raw',
                'checklist',
                'warning',
                'linkTool',
                'attaches',
            ],
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    { _id: false }
);

// Editor.js content schema
const editorContentSchema = new mongoose.Schema(
    {
        time: {
            type: Number,
            default: () => Date.now(),
        },
        blocks: [editorBlockSchema],
        version: {
            type: String,
            default: '2.28.2',
        },
    },
    { _id: false }
);

const articleTranslationSchema = new mongoose.Schema(
    {
        // Reference to original article
        articleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Article',
            required: true,
            index: true,
        },

        // Language code (ISO 639-1)
        language: {
            type: String,
            required: true,
            lowercase: true,
            enum: [
                'en', // English
                'km', // Khmer
                'zh', // Chinese
                'ja', // Japanese
                'ko', // Korean
                'th', // Thai
                'vi', // Vietnamese
                'fr', // French
                'de', // German
                'es', // Spanish
                'pt', // Portuguese
                'ru', // Russian
                'ar', // Arabic
                'hi', // Hindi
            ],
            // index: true, // Removed - covered by compound indexes below
        },

        // Translated content
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },

        slug: {
            type: String,
            required: true,
            lowercase: true,
        },

        excerpt: {
            type: String,
            maxlength: [500, 'Excerpt cannot exceed 500 characters'],
            default: '',
        },

        content: {
            type: editorContentSchema,
            required: true,
        },

        // SEO fields
        metaTitle: {
            type: String,
            maxlength: [70, 'Meta title cannot exceed 70 characters'],
        },

        metaDescription: {
            type: String,
            maxlength: [160, 'Meta description cannot exceed 160 characters'],
        },

        metaKeywords: [String],

        // Translation metadata
        translatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        translationStatus: {
            type: String,
            enum: ['draft', 'in_progress', 'review', 'published'],
            default: 'draft',
        },

        // Machine translation flag
        isMachineTranslated: {
            type: Boolean,
            default: false,
        },

        // Quality score (0-100)
        qualityScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },

        // Last review date
        lastReviewedAt: {
            type: Date,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
articleTranslationSchema.index({ articleId: 1, language: 1 }, { unique: true }); // One translation per language per article
articleTranslationSchema.index({ slug: 1, language: 1 }, { unique: true }); // Unique slug per language
articleTranslationSchema.index({ translationStatus: 1 });
articleTranslationSchema.index({ language: 1, translationStatus: 1 });

// Virtual: Get original article
articleTranslationSchema.virtual('article', {
    ref: 'Article',
    localField: 'articleId',
    foreignField: '_id',
    justOne: true,
});

// Static: Get translation by article and language
articleTranslationSchema.statics.getByArticleAndLanguage = async function(articleId, language) {
    return await this.findOne({ articleId, language });
};

// Static: Get all translations for an article
articleTranslationSchema.statics.getAllByArticle = async function(articleId) {
    return await this.find({ articleId }).sort({ language: 1 });
};

// Static: Get all articles in a specific language
articleTranslationSchema.statics.getAllByLanguage = async function(language, filters = {}) {
    const query = { language, ...filters };
    return await this.find(query)
        .populate('articleId')
        .sort({ createdAt: -1 });
};

// Instance: Mark as reviewed
articleTranslationSchema.methods.markAsReviewed = async function(reviewerId) {
    this.translationStatus = 'published';
    this.lastReviewedAt = new Date();
    this.reviewedBy = reviewerId;
    return await this.save();
};

const ArticleTranslation = mongoose.model('ArticleTranslation', articleTranslationSchema);

export default ArticleTranslation;
