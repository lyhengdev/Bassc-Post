import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import config from '../config/index.js';

class StorageService {
    constructor() {
        this.provider = process.env.STORAGE_PROVIDER || 'local';

        if (this.provider === 'cloudinary') {
            this.initCloudinary();
        }
    }

    initCloudinary() {
        try {
            // Validate credentials exist
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (!cloudName || !apiKey || !apiSecret) {
                console.warn('⚠️ Cloudinary credentials incomplete, falling back to local storage');
                console.warn('   Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
                this.provider = 'local';
                return;
            }

            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
            console.log('✅ Cloudinary storage initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Cloudinary:', error.message);
            this.provider = 'local';
        }
    }

    async upload(file, options = {}) {
        const { folder = 'general' } = options;
        const filename = `${uuidv4()}${path.extname(file.originalname)}`;

        if (this.provider === 'cloudinary') {
            return this.uploadToCloudinary(file, filename, folder);
        }

        return this.uploadToLocal(file, filename, folder);
    }

    async uploadToCloudinary(file, filename, folder) {
        try {
            // Process image if needed
            let buffer = file.buffer;
            let width, height;

            if (file.mimetype.startsWith('image/')) {
                const image = sharp(file.buffer);
                const metadata = await image.metadata();
                width = metadata.width;
                height = metadata.height;

                // Resize if too large
                if (width > 1920 || height > 1080) {
                    buffer = await image
                        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 85 })
                        .toBuffer();

                    const newMetadata = await sharp(buffer).metadata();
                    width = newMetadata.width;
                    height = newMetadata.height;
                }
            }

            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.
                upload_stream(
                    {
                        folder: `bassac-media/${folder}`,
                        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
                        resource_type: 'auto',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                const stream = Readable.from(buffer);
                stream.pipe(uploadStream);
            });

            return {
                filename,
                path: result.public_id,
                url: result.secure_url,
                storageProvider: 'cloudinary',
                storageKey: result.public_id,
                width: result.width,
                height: result.height,
                thumbnails: {
                    small: cloudinary.url(result.public_id, { width: 150, height: 150, crop: 'fill' }),
                    medium: cloudinary.url(result.public_id, { width: 300, height: 300, crop: 'fill' }),
                },
            };
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw new Error('Failed to upload to Cloudinary');
        }
    }

    async uploadToLocal(file, filename, folder) {
        const uploadDir = path.join(config.upload.path, folder);

        // Create directory if not exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filepath = path.join(uploadDir, filename);
        let width, height;

        // Process image
        if (file.mimetype.startsWith('image/')) {
            const image = sharp(file.buffer);
            const metadata = await image.metadata();
            width = metadata.width;
            height = metadata.height;

            // Resize if too large
            if (width > 1920 || height > 1080) {
                await image
                    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toFile(filepath);
            } else {
                await fs.promises.writeFile(filepath, file.buffer);
            }
        } else {
            await fs.promises.writeFile(filepath, file.buffer);
        }

        const relativePath = `/${folder}/${filename}`;
        const url = `/uploads${relativePath}`;

        return {
            filename,
            path: relativePath,
            url,
            storageProvider: 'local',
            storageKey: relativePath,
            width,
            height,
            thumbnails: {},
        };
    }

    async delete(storageKey) {
        if (!storageKey) return;

        if (this.provider === 'cloudinary' && !storageKey.startsWith('/')) {
            try {
                await cloudinary.uploader.destroy(storageKey);
            } catch (error) {
                console.error('Error deleting from Cloudinary:', error);
            }
        } else {
            // Local delete
            const normalizedKey = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
            const filepath = path.join(config.upload.path, normalizedKey);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
        }
    }

    validateFile(file) {
        const errors = [];
        const allowedTypes = config.upload.allowedMimeTypes || [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
        ];
        const maxSize = config.upload.maxFileSize || 10 * 1024 * 1024;

        if (!allowedTypes.includes(file.mimetype)) {
            errors.push(`File type ${file.mimetype} is not allowed`);
        }

        if (file.size > maxSize) {
            errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
        }

        return errors;
    }

    getProvider() {
        return this.provider;
    }
}

const storageService = new StorageService();

export default storageService;
