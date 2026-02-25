import mongoose from 'mongoose';
import slugify from 'slugify';

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

const articleSchema = new mongoose.Schema(
    {
        // Language support (default/original language)
        language: {
            type: String,
            default: 'en',
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
            index: true,
        },

        // Available translations
        availableLanguages: [{
            type: String,
            lowercase: true,
        }],

        title: {
            type: String,
            required: [true, 'Article title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
        },
        excerpt: {
            type: String,
            maxlength: [500, 'Excerpt cannot exceed 500 characters'],
            default: '',
        },
        postType: {
            type: String,
            enum: ['news', 'video'],
            default: 'news',
            index: true,
        },
        videoUrl: {
            type: String,
            default: '',
            maxlength: [1200, 'Video URL cannot exceed 1200 characters'],
        },
        content: {
            type: editorContentSchema,
            required: [true, 'Article content is required'],
        },
        featuredImage: {
            type: String,
            default: null,
        },
        featuredImagePosition: {
            type: String,
            enum: ['top', 'center', 'bottom', 'custom'],
            default: 'center',
        },
        featuredImagePositionY: {
            type: Number,
            min: 0,
            max: 100,
            default: 50, // 50% = center
        },
        featuredImageAlt: {
            type: String,
            default: '',
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
        },
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true,
            },
        ],
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Author is required'],
        },
        status: {
            type: String,
            enum: ['draft', 'pending', 'published', 'rejected', 'archived'],
            default: 'draft',
        },
        publishedAt: {
            type: Date,
            default: null,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isBreaking: {
            type: Boolean,
            default: false,
        },
        viewCount: {
            type: Number,
            default: 0,
        },
        readTime: {
            type: Number, // in minutes
            default: 1,
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
        // Editorial workflow
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        reviewNotes: {
            type: String,
            default: '',
        },
        rejectionReason: {
            type: String,
            default: '',
        },
        // Version control
        version: {
            type: Number,
            default: 1,
        },
        lastEditedBy: {
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

// Indexes for performance at SCALE (1M+ articles)
// Compound indexes for common query patterns
// Note: slug unique index is auto-created by unique: true in schema

// Main listing queries
articleSchema.index({ status: 1, publishedAt: -1 }); // Published articles sorted by date
articleSchema.index({ status: 1, isFeatured: 1, publishedAt: -1 }); // Featured articles
articleSchema.index({ status: 1, isBreaking: 1, publishedAt: -1 }); // Breaking news
articleSchema.index({ status: 1, postType: 1, publishedAt: -1 }); // News vs video

// Category + status + date (category pages)
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });

// Author queries (my articles page)
articleSchema.index({ author: 1, status: 1, createdAt: -1 });

// Tag queries
articleSchema.index({ tags: 1, status: 1, publishedAt: -1 });

// View count for trending/popular
articleSchema.index({ status: 1, viewCount: -1 });

// Pending articles for review (editors)
articleSchema.index({ status: 1, createdAt: -1 });

// Full-text search with weights
articleSchema.index(
    { title: 'text', excerpt: 'text', tags: 'text' },
    { 
        weights: { title: 10, excerpt: 5, tags: 3 },
        name: 'article_text_search'
    }
);

// TTL index for auto-cleanup of old drafts (optional - uncomment if needed)
// articleSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: 'draft' } });

// Pre-save middleware
articleSchema.pre('save', function (next) {
    // Generate slug from title
    if (this.isModified('title')) {
        const baseSlug = slugify(this.title, {
            lower: true,
            strict: true,
            trim: true,
        });
        // Add timestamp to ensure uniqueness
        this.slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    // Calculate read time based on content
    if (this.isModified('content')) {
        const wordCount = this.calculateWordCount();
        this.readTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
    }

    // Set publishedAt when status changes to published
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }

    // Increment version on content changes
    if (this.isModified('content') && !this.isNew) {
        this.version += 1;
    }

    next();
});

// Method to calculate word count from Editor.js blocks
articleSchema.methods.calculateWordCount = function () {
    if (!this.content || !this.content.blocks) return 0;

    let text = '';
    this.content.blocks.forEach((block) => {
        switch (block.type) {
            case 'paragraph':
            case 'header':
            case 'quote':
                text += ` ${block.data.text || ''}`;
                break;
            case 'list':
                if (block.data.items) {
                    text += ` ${block.data.items.join(' ')}`;
                }
                break;
            case 'checklist':
                if (block.data.items) {
                    text += ` ${block.data.items.map((item) => item.text).join(' ')}`;
                }
                break;
            case 'table':
                if (block.data.content) {
                    block.data.content.forEach((row) => {
                        text += ` ${row.join(' ')}`;
                    });
                }
                break;
        }
    });

    // Strip HTML tags and count words
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    return plainText.split(/\s+/).filter(Boolean).length;
};

// Method to extract plain text from content
articleSchema.methods.getPlainText = function () {
    if (!this.content || !this.content.blocks) return '';

    let text = '';
    this.content.blocks.forEach((block) => {
        switch (block.type) {
            case 'paragraph':
            case 'header':
                text += `${block.data.text || ''}\n`;
                break;
            case 'quote':
                text += `"${block.data.text || ''}"\n`;
                break;
            case 'list':
                if (block.data.items) {
                    block.data.items.forEach((item) => {
                        text += `• ${item}\n`;
                    });
                }
                break;
        }
    });

    return text.replace(/<[^>]*>/g, '').trim();
};

// Static method to find published articles
articleSchema.statics.findPublished = function (options = {}) {
    const query = this.find({ status: 'published' });
    if (options.populate) {
        query.populate('author', 'firstName lastName avatar');
        query.populate('category', 'name slug color');
    }
    return query.sort({ publishedAt: -1 });
};

// Static method to find featured articles
articleSchema.statics.findFeatured = function (limit = 5) {
    return this.find({ status: 'published', isFeatured: true })
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug color')
        .sort({ publishedAt: -1 })
        .limit(limit);
};

// Static method to find related articles
articleSchema.statics.findRelated = async function (articleId, limit = 4) {
    const article = await this.findById(articleId);
    if (!article) return [];

    return this.find({
        _id: { $ne: articleId },
        status: 'published',
        $or: [{ category: article.category }, { tags: { $in: article.tags } }],
    })
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug color')
        .sort({ publishedAt: -1 })
        .limit(limit);
};

// Method to increment view count
articleSchema.methods.incrementViews = async function () {
    this.viewCount += 1;
    await this.save();
};

// ==================== ELASTICSEARCH HOOKS ====================

// Lazy load search service to avoid circular dependency
let articleSearchService;
const getSearchService = async () => {
    if (!articleSearchService) {
        try {
            articleSearchService = (await import('../services/articleSearchService.js')).default;
        } catch (error) {
            console.log('ℹ️  Elasticsearch service not available');
            return null;
        }
    }
    return articleSearchService;
};

// Hook: After save (create or update)
articleSchema.post('save', async function(doc) {
    try {
        if (process.env.SKIP_ELASTICSEARCH_SYNC === 'true') return;

        const searchService = await getSearchService();
        if (!searchService) return;

        // Only index published articles
        if (doc.status === 'published') {
            // Populate references before indexing
            await doc.populate([
                { path: 'author', select: 'firstName lastName' },
                { path: 'category', select: 'name slug' },
            ]);
            
            await searchService.updateArticle(doc);
            console.log(`📇 Indexed article: ${doc.title}`);
        } else {
            // If not published, remove from index
            await searchService.deleteArticle(doc._id);
        }
    } catch (error) {
        console.error('Elasticsearch indexing error:', error.message);
        // Don't throw - we don't want to block article save if ES fails
    }
});

// Hook: After delete
articleSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
    try {
        if (process.env.SKIP_ELASTICSEARCH_SYNC === 'true') return;

        const searchService = await getSearchService();
        if (!searchService) return;
        
        await searchService.deleteArticle(doc._id);
        console.log(`🗑️  Removed article from index: ${doc.title}`);
    } catch (error) {
        console.error('Elasticsearch delete error:', error.message);
    }
});

// Hook: After findOneAndDelete
articleSchema.post('findOneAndDelete', async function(doc) {
    try {
        if (process.env.SKIP_ELASTICSEARCH_SYNC === 'true') return;

        if (!doc) return;
        
        const searchService = await getSearchService();
        if (!searchService) return;
        
        await searchService.deleteArticle(doc._id);
        console.log(`🗑️  Removed deleted article from index: ${doc.title}`);
    } catch (error) {
        console.error('Elasticsearch delete error:', error.message);
    }
});

const Article = mongoose.model('Article', articleSchema);

export default Article;
