import mongoose from 'mongoose';

/**
 * CategoryTranslation Model
 * 
 * Stores translations for categories in different languages
 */

const categoryTranslationSchema = new mongoose.Schema(
    {
        // Reference to original category
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
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
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, 'Category name cannot exceed 100 characters'],
        },

        slug: {
            type: String,
            required: true,
            lowercase: true,
        },

        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
            default: '',
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

        // Translation metadata
        translatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        translationStatus: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
categoryTranslationSchema.index({ categoryId: 1, language: 1 }, { unique: true });
categoryTranslationSchema.index({ slug: 1, language: 1 }, { unique: true });
categoryTranslationSchema.index({ language: 1 });

// Virtual: Get original category
categoryTranslationSchema.virtual('category', {
    ref: 'Category',
    localField: 'categoryId',
    foreignField: '_id',
    justOne: true,
});

// Static: Get translation by category and language
categoryTranslationSchema.statics.getByCategoryAndLanguage = async function(categoryId, language) {
    return await this.findOne({ categoryId, language });
};

// Static: Get all translations for a category
categoryTranslationSchema.statics.getAllByCategory = async function(categoryId) {
    return await this.find({ categoryId }).sort({ language: 1 });
};

// Static: Get all categories in a specific language
categoryTranslationSchema.statics.getAllByLanguage = async function(language) {
    return await this.find({ language, translationStatus: 'published' })
        .populate('categoryId')
        .sort({ name: 1 });
};

const CategoryTranslation = mongoose.model('CategoryTranslation', categoryTranslationSchema);

export default CategoryTranslation;
