import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    path: {
      type: String,
      required: [true, 'File path is required'],
    },
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    // For cloud storage
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'cloudinary'],
      default: 'local',
    },
    storageKey: {
      type: String, // External storage key/ID
      default: null,
    },
    // Image-specific metadata
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    // Thumbnails for images
    thumbnails: {
      small: String, // 150x150
      medium: String, // 300x300
      large: String, // 600x600
    },
    alt: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedIn: [
      {
        model: {
          type: String,
          enum: ['Article', 'Category', 'User'],
        },
        documentId: mongoose.Schema.Types.ObjectId,
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ mimeType: 1 });
mediaSchema.index({ storageProvider: 1 });
mediaSchema.index({ tags: 1 });

// Virtual for checking if it's an image
mediaSchema.virtual('isImage').get(function () {
  return this.mimeType.startsWith('image/');
});

// Virtual for file extension
mediaSchema.virtual('extension').get(function () {
  return this.originalName.split('.').pop().toLowerCase();
});

// Pre-remove middleware to handle cleanup
mediaSchema.pre('deleteOne', { document: true }, async function () {
  // Storage cleanup will be handled by the storage service
  console.log(`Media ${this._id} scheduled for deletion`);
});

// Static method to find by uploader
mediaSchema.statics.findByUploader = function (userId, options = {}) {
  const query = this.find({ uploadedBy: userId });
  if (options.type === 'image') {
    query.where('mimeType').regex(/^image\//);
  }
  return query.sort({ createdAt: -1 });
};

// Static method to find unused media
mediaSchema.statics.findUnused = function () {
  return this.find({ usedIn: { $size: 0 } });
};

// Method to track usage
mediaSchema.methods.trackUsage = async function (model, documentId) {
  const exists = this.usedIn.some(
    (usage) => usage.model === model && usage.documentId.equals(documentId)
  );
  if (!exists) {
    this.usedIn.push({ model, documentId });
    await this.save();
  }
};

// Method to remove usage tracking
mediaSchema.methods.removeUsage = async function (model, documentId) {
  this.usedIn = this.usedIn.filter(
    (usage) => !(usage.model === model && usage.documentId.equals(documentId))
  );
  await this.save();
};

const Media = mongoose.model('Media', mediaSchema);

export default Media;
