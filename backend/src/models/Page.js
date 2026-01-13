import mongoose from 'mongoose';
import slugify from 'slugify';

// Editor.js block schema (same as Article)
const editorBlockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'paragraph', 'header', 'list', 'image', 'quote', 'code',
      'delimiter', 'table', 'embed', 'raw', 'checklist', 'warning',
      'linkTool', 'attaches', 'columns', 'button', 'alert', 'toggle'
    ]
  },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const editorContentSchema = new mongoose.Schema({
  time: { type: Number, default: () => Date.now() },
  blocks: [editorBlockSchema],
  version: { type: String, default: '2.28.2' }
}, { _id: false });

const pageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Page title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: editorContentSchema,
    default: { blocks: [] }
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    default: ''
  },
  featuredImage: {
    type: String,
    default: null
  },
  template: {
    type: String,
    enum: ['default', 'full-width', 'sidebar-left', 'sidebar-right', 'landing', 'blank'],
    default: 'default'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'private'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // SEO
  metaTitle: { type: String, maxlength: 70 },
  metaDescription: { type: String, maxlength: 160 },
  metaKeywords: [String],
  // Navigation
  showInMenu: { type: Boolean, default: false },
  menuOrder: { type: Number, default: 0 },
  parentPage: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', default: null },
  // Settings
  allowComments: { type: Boolean, default: false },
  password: { type: String, default: '' }, // Password protected page
  publishedAt: { type: Date, default: null },
  // Versioning
  version: { type: Number, default: 1 },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (slug unique index is defined in schema)
pageSchema.index({ status: 1 });
pageSchema.index({ showInMenu: 1, menuOrder: 1 });

// Generate slug if not provided
pageSchema.pre('save', async function(next) {
  // Generate slug from title if not provided
  if (!this.slug && this.title) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    
    // Check for duplicate slugs using this.constructor (the Page model)
    let slug = baseSlug;
    let counter = 1;
    const PageModel = this.constructor;
    while (await PageModel.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
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

// Virtual for child pages
pageSchema.virtual('children', {
  ref: 'Page',
  localField: '_id',
  foreignField: 'parentPage'
});

const Page = mongoose.model('Page', pageSchema);

export default Page;
