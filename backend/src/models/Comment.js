import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      required: [true, 'Article reference is required'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for guest comments
    },
    // Guest commenter info (when author is null)
    guestName: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null, // null for top-level comments
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'spam'],
      default: 'pending',
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    // Moderation
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    moderationNote: {
      type: String,
      default: '',
    },
    // For tracking IP and preventing abuse
    ipAddress: {
      type: String,
      select: false,
    },
    userAgent: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
commentSchema.index({ article: 1, status: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parent: 1 });
commentSchema.index({ status: 1 });

// Virtual for replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parent',
});

// Virtual for commenter name
commentSchema.virtual('commenterName').get(function () {
  if (this.author && this.author.firstName) {
    return `${this.author.firstName} ${this.author.lastName}`;
  }
  return this.guestName || 'Anonymous';
});

// Static method to find approved comments for an article
commentSchema.statics.findByArticle = function (articleId, includeReplies = true) {
  const query = this.find({
    article: articleId,
    status: 'approved',
    parent: null, // Top-level comments only
  })
    .populate('author', 'firstName lastName avatar')
    .sort({ createdAt: -1 });

  if (includeReplies) {
    query.populate({
      path: 'replies',
      match: { status: 'approved' },
      populate: { path: 'author', select: 'firstName lastName avatar' },
      options: { sort: { createdAt: 1 } },
    });
  }

  return query;
};

// Static method to get pending comments count
commentSchema.statics.getPendingCount = function () {
  return this.countDocuments({ status: 'pending' });
};

// Method to toggle like
commentSchema.methods.toggleLike = async function (userId) {
  const userIndex = this.likedBy.findIndex((id) => id.equals(userId));
  if (userIndex > -1) {
    this.likedBy.splice(userIndex, 1);
    this.likes = Math.max(0, this.likes - 1);
  } else {
    this.likedBy.push(userId);
    this.likes += 1;
  }
  await this.save();
  return userIndex === -1; // Returns true if liked, false if unliked
};

// Method to check if user has liked
commentSchema.methods.isLikedBy = function (userId) {
  return this.likedBy.some((id) => id.equals(userId));
};

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
