import { Media } from '../models/index.js';
import storageService from '../services/storageService.js';
import { parsePaginationParams } from '../utils/helpers.js';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  notFoundResponse,
  badRequestResponse,
} from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Upload single file
 * POST /api/uploads
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return badRequestResponse(res, 'No file uploaded');
  }

  const errors = storageService.validateFile(req.file);
  if (errors.length > 0) {
    return badRequestResponse(res, errors[0]);
  }

  const folder = req.body.folder || 'general';
  const result = await storageService.upload(req.file, { folder });

  const media = await Media.create({
    filename: result.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: result.path,
    url: result.url,
    storageProvider: result.storageProvider,
    storageKey: result.storageKey,
    width: result.width,
    height: result.height,
    thumbnails: result.thumbnails,
    uploadedBy: req.user._id,
    alt: req.body.alt || '',
    caption: req.body.caption || '',
  });

  return createdResponse(res, { media }, 'File uploaded successfully');
});

/**
 * Upload multiple files
 * POST /api/uploads/multiple
 */
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return badRequestResponse(res, 'No files uploaded');
  }

  const folder = req.body.folder || 'general';
  const uploaded = [];
  const errors = [];

  for (const file of req.files) {
    try {
      const validationErrors = storageService.validateFile(file);
      if (validationErrors.length > 0) {
        errors.push({ file: file.originalname, error: validationErrors[0] });
        continue;
      }

      const result = await storageService.upload(file, { folder });

      const media = await Media.create({
        filename: result.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: result.path,
        url: result.url,
        storageProvider: result.storageProvider,
        storageKey: result.storageKey,
        width: result.width,
        height: result.height,
        thumbnails: result.thumbnails,
        uploadedBy: req.user._id,
      });

      uploaded.push(media);
    } catch (error) {
      errors.push({ file: file.originalname, error: error.message });
    }
  }

  return createdResponse(res, {
    uploaded,
    errors: errors.length > 0 ? errors : undefined,
  }, `${uploaded.length} file(s) uploaded`);
});

/**
 * Get all media (with pagination)
 * GET /api/uploads
 */
export const getMedia = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);
  const { type, search } = req.query;

  const filter = {};

  if (!['admin', 'editor'].includes(req.user.role)) {
    filter.uploadedBy = req.user._id;
  }

  if (type === 'image') {
    filter.mimeType = { $regex: /^image\// };
  } else if (type === 'document') {
    filter.mimeType = 'application/pdf';
  }

  if (search) {
    filter.originalName = { $regex: search, $options: 'i' };
  }

  const [media, total] = await Promise.all([
    Media.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Media.countDocuments(filter),
  ]);

  return paginatedResponse(res, media, { page, limit, total });
});

/**
 * Get media by ID
 * GET /api/uploads/:id
 */
export const getMediaById = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id)
    .populate('uploadedBy', 'firstName lastName');

  if (!media) {
    return notFoundResponse(res, 'Media not found');
  }

  return successResponse(res, { media });
});

/**
 * Update media metadata
 * PUT /api/uploads/:id
 */
export const updateMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (!media) {
    return notFoundResponse(res, 'Media not found');
  }

  const isOwner = media.uploadedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return badRequestResponse(res, 'You do not have permission to update this media');
  }

  const { alt, caption, tags } = req.body;

  if (alt !== undefined) media.alt = alt;
  if (caption !== undefined) media.caption = caption;
  if (tags !== undefined) media.tags = tags;

  await media.save();

  return successResponse(res, { media }, 'Media updated successfully');
});

/**
 * Delete media
 * DELETE /api/uploads/:id
 */
export const deleteMedia = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);

  if (!media) {
    return notFoundResponse(res, 'Media not found');
  }

  const isOwner = media.uploadedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return badRequestResponse(res, 'You do not have permission to delete this media');
  }

  try {
    await storageService.delete(media.storageKey);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
  }

  await media.deleteOne();

  return successResponse(res, null, 'Media deleted successfully');
});

/**
 * Get my uploads
 * GET /api/uploads/my
 */
export const getMyUploads = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query);

  const [media, total] = await Promise.all([
    Media.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Media.countDocuments({ uploadedBy: req.user._id }),
  ]);

  return paginatedResponse(res, media, { page, limit, total });
});

export default {
  uploadFile,
  uploadMultipleFiles,
  getMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  getMyUploads,
};
