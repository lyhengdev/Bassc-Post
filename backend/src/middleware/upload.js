import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

/**
 * Memory storage for processing files before saving
 * This allows us to process images before storage
 */
const memoryStorage = multer.memoryStorage();

/**
 * Disk storage for direct file saving
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.path);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter for images
 */
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`), false);
  }
};

/**
 * File filter for documents
 */
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type: ${file.mimetype}. Allowed: images and PDFs.`),
      false
    );
  }
};

/**
 * Upload configuration for images (using memory storage for processing)
 */
export const uploadImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: imageFilter,
});

/**
 * Upload configuration for documents
 */
export const uploadDocument = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: documentFilter,
});

/**
 * Upload configuration for any file (with size limit)
 */
export const uploadAny = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

/**
 * Single image upload
 */
export const singleImage = uploadImage.single('image');

/**
 * Multiple images upload
 */
export const multipleImages = uploadImage.array('images', 10);

/**
 * Single file upload
 */
export const singleFile = uploadDocument.single('file');

/**
 * Avatar upload
 */
export const avatarUpload = uploadImage.single('avatar');

/**
 * Featured image upload
 */
export const featuredImageUpload = uploadImage.single('featuredImage');

/**
 * Handle multer errors
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${config.upload.maxFileSize / 1024 / 1024}MB`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

export default {
  uploadImage,
  uploadDocument,
  uploadAny,
  singleImage,
  multipleImages,
  singleFile,
  avatarUpload,
  featuredImageUpload,
  handleUploadError,
};
