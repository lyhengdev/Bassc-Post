import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  getDefaultAvatarByGender,
  isAvatarMissing,
  isDefaultAvatar,
  normalizeGender,
} from '../utils/userProfile.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'writer', 'user'],
      default: 'user',
    },
    googleId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: 'male',
    },
    birthday: {
      type: Date,
      default: null,
      validate: {
        validator: (value) => !value || value <= new Date(),
        message: 'Birthday cannot be in the future',
      },
    },
    avatar: {
      type: String,
      default: function () {
        return getDefaultAvatarByGender(this.gender);
      },
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    profileNeedsCompletion: {
      type: Boolean,
      default: false,
    },
    profileMissingFields: {
      type: [{
        type: String,
        enum: ['gender', 'birthday'],
      }],
      default: [],
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        if (isAvatarMissing(ret.avatar)) {
          ret.avatar = getDefaultAvatarByGender(ret.gender);
        }
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Index for faster queries (email index is auto-created by unique: true)
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// Ensure normalized gender and default avatar are always persisted
userSchema.pre('validate', function (next) {
  this.gender = normalizeGender(this.gender);

  if (isAvatarMissing(this.avatar) || (this.isModified('gender') && isDefaultAvatar(this.avatar))) {
    this.avatar = getDefaultAvatarByGender(this.gender);
  }

  next();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user can perform action based on role
userSchema.methods.hasRole = function (...roles) {
  return roles.includes(this.role);
};

// Static method to find active users
userSchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

const User = mongoose.model('User', userSchema);

export default User;
