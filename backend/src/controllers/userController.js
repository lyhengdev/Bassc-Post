import { User, Article } from '../models/index.js';
import { parsePaginationParams } from '../utils/helpers.js';
import { getDefaultAvatarByGender, isDefaultAvatar } from '../utils/userProfile.js';
import storageService from '../services/storageService.js';
import {
  successResponse,
  paginatedResponse,
  notFoundResponse,
  conflictResponse,
  badRequestResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const extractCloudinaryPublicId = (url) => {
  try {
    const { pathname } = new URL(url);
    const uploadSegment = '/upload/';
    const uploadIndex = pathname.indexOf(uploadSegment);
    if (uploadIndex === -1) return null;

    let publicIdWithExt = pathname.slice(uploadIndex + uploadSegment.length);
    publicIdWithExt = publicIdWithExt.replace(/^v\d+\//, '');
    return publicIdWithExt.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
};

const deleteAvatarFromStorage = async (avatarUrl) => {
  if (!avatarUrl) return;
  if (isDefaultAvatar(avatarUrl)) return;

  if (avatarUrl.includes('cloudinary.com')) {
    const publicId = extractCloudinaryPublicId(avatarUrl);
    if (publicId) {
      await storageService.delete(publicId, 'cloudinary');
    }
    return;
  }

  const uploadsSegment = '/uploads/';
  const localIndex = avatarUrl.indexOf(uploadsSegment);
  if (localIndex !== -1) {
    const storageKey = avatarUrl.slice(localIndex + uploadsSegment.length);
    if (storageKey) {
      await storageService.delete(storageKey, 'local');
    }
  }
};

/**
 * Get all users (admin)
 * GET /api/users
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const { role, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const filter = {};

  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-password -refreshToken'),
    User.countDocuments(filter),
  ]);

  return paginatedResponse(res, users, { page, limit, total });
});

/**
 * Get user by ID (admin)
 * GET /api/users/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken');

  if (!user) {
    return notFoundResponse(res, 'User not found');
  }

  // Get user statistics
  const articleCount = await Article.countDocuments({ author: user._id });
  const publishedCount = await Article.countDocuments({ author: user._id, status: 'published' });

  return successResponse(res, {
    user,
    stats: {
      totalArticles: articleCount,
      publishedArticles: publishedCount,
    },
  });
});

/**
 * Update user (admin)
 * PUT /api/users/:id
 */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return notFoundResponse(res, 'User not found');
  }

  const {
    firstName,
    lastName,
    bio,
    role,
    status,
    gender,
    birthday,
  } = req.body;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (bio !== undefined) user.bio = bio;
  if (role) user.role = role;
  if (status) user.status = status;
  if (gender) user.gender = gender;
  if (birthday !== undefined) user.birthday = birthday || null;

  if (user.profileNeedsCompletion || (Array.isArray(user.profileMissingFields) && user.profileMissingFields.length > 0)) {
    const missing = new Set(Array.isArray(user.profileMissingFields) ? user.profileMissingFields : []);
    if (gender) missing.delete('gender');
    if (birthday) missing.delete('birthday');
    user.profileMissingFields = Array.from(missing);
    user.profileNeedsCompletion = user.profileMissingFields.length > 0;
  }

  await user.save();

  return successResponse(res, { user }, 'User updated successfully');
});

/**
 * Delete user (admin)
 * DELETE /api/users/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return notFoundResponse(res, 'User not found');
  }

  // Prevent self-deletion
  if (user._id.toString() === req.user._id.toString()) {
    return badRequestResponse(res, 'You cannot delete your own account');
  }

  // Check if user has published articles
  const publishedArticles = await Article.countDocuments({
    author: user._id,
    status: 'published',
  });

  if (publishedArticles > 0) {
    return badRequestResponse(
      res,
      `Cannot delete user with ${publishedArticles} published articles. Please reassign or archive them first.`
    );
  }

  // Delete user's draft articles
  await Article.deleteMany({ author: user._id, status: { $in: ['draft', 'rejected'] } });

  await user.deleteOne();

  return successResponse(res, null, 'User deleted successfully');
});

/**
 * Update own profile
 * PUT /api/users/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const { firstName, lastName, bio, gender, birthday } = req.body;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (bio !== undefined) user.bio = bio;
  if (gender) user.gender = gender;
  if (birthday !== undefined) user.birthday = birthday || null;

  if (user.profileNeedsCompletion || (Array.isArray(user.profileMissingFields) && user.profileMissingFields.length > 0)) {
    const missing = new Set(Array.isArray(user.profileMissingFields) ? user.profileMissingFields : []);
    if (gender) missing.delete('gender');
    if (birthday) missing.delete('birthday');
    user.profileMissingFields = Array.from(missing);
    user.profileNeedsCompletion = user.profileMissingFields.length > 0;
  }

  await user.save();

  return successResponse(res, { user }, 'Profile updated successfully');
});

/**
 * Upload avatar
 * POST /api/users/avatar
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return badRequestResponse(res, 'No file uploaded');
  }

  const user = await User.findById(req.user._id);

  // Delete old avatar if exists
  if (user.avatar) {
    try {
      await deleteAvatarFromStorage(user.avatar);
    } catch (error) {
      console.error('Error deleting old avatar:', error);
    }
  }

  // Upload new avatar
  const result = await storageService.upload(req.file, {
    folder: 'avatars',
    generateThumbnails: true,
  });

  user.avatar = result.url;
  await user.save();

  return successResponse(res, {
    avatar: result.url,
    thumbnails: result.thumbnails,
  }, 'Avatar uploaded successfully');
});

/**
 * Delete avatar
 * DELETE /api/users/avatar
 */
export const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const defaultAvatar = getDefaultAvatarByGender(user.gender);

  try {
    await deleteAvatarFromStorage(user.avatar);
  } catch (error) {
    console.error('Error deleting avatar:', error);
  }

  user.avatar = defaultAvatar;
  await user.save();

  return successResponse(
    res,
    { avatar: defaultAvatar },
    'Avatar reset to default successfully'
  );
});

/**
 * Get user's public profile
 * GET /api/users/profile/:id
 */
export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('firstName lastName avatar bio createdAt');

  if (!user) {
    return notFoundResponse(res, 'User not found');
  }

  // Get published articles count
  const articleCount = await Article.countDocuments({
    author: user._id,
    status: 'published',
  });

  // Get recent articles
  const recentArticles = await Article.find({
    author: user._id,
    status: 'published',
  })
    .sort({ publishedAt: -1 })
    .limit(5)
    .select('title slug publishedAt category')
    .populate('category', 'name slug');

  return successResponse(res, {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
      memberSince: user.createdAt,
    },
    stats: {
      articles: articleCount,
    },
    recentArticles,
  });
});

/**
 * Get user stats for dashboard (admin)
 * GET /api/users/stats
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const [totalUsers, roleBreakdown, statusBreakdown, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email role createdAt'),
  ]);

  return successResponse(res, {
    total: totalUsers,
    byRole: Object.fromEntries(roleBreakdown.map((r) => [r._id, r.count])),
    byStatus: Object.fromEntries(statusBreakdown.map((s) => [s._id, s.count])),
    recentUsers,
  });
});

export default {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getPublicProfile,
  getUserStats,
};
