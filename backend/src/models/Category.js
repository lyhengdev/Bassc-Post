import mongoose from 'mongoose';
import slugify from 'slugify';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    image: {
      type: String,
      default: null,
    },
    color: {
      type: String,
      default: '#3B82F6', // Default blue color
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    articleCount: {
      type: Number,
      default: 0,
    },
    metaTitle: {
      type: String,
      maxlength: [70, 'Meta title cannot exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (slug and name unique indexes are auto-created)
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1, order: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

// Pre-save middleware to generate slug
categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }
  next();
});

// Static method to find active categories
categorySchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ order: 1 });
};

// Static method to get category tree
categorySchema.statics.getTree = async function () {
  const categories = await this.find({ isActive: true, parent: null })
    .sort({ order: 1 })
    .populate({
      path: 'subcategories',
      match: { isActive: true },
      options: { sort: { order: 1 } },
    });
  return categories;
};

// Method to update article count
categorySchema.methods.updateArticleCount = async function () {
  const Article = mongoose.model('Article');
  const count = await Article.countDocuments({
    category: this._id,
    status: 'published',
  });
  this.articleCount = count;
  await this.save();
};

const Category = mongoose.model('Category', categorySchema);

export default Category;
