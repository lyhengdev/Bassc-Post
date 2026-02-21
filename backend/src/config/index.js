import dotenv from 'dotenv';

dotenv.config({quiet : true});

// Security: Validate JWT secrets in production
const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-me';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-me';

const weakSecrets = ['default-secret-change-me', 'refresh-secret-change-me', 'your-super-secret-jwt-key-change-in-production', 'your-refresh-token-secret-change-in-production'];

if (isProduction) {
  if (weakSecrets.includes(jwtSecret) || jwtSecret.length < 32) {
    throw new Error('SECURITY ERROR: JWT_SECRET must be a strong secret (min 32 characters) in production!');
  }
  if (weakSecrets.includes(jwtRefreshSecret) || jwtRefreshSecret.length < 32) {
    throw new Error('SECURITY ERROR: JWT_REFRESH_SECRET must be a strong secret (min 32 characters) in production!');
  }
} else {
  // Development warning
  if (weakSecrets.includes(jwtSecret) || weakSecrets.includes(jwtRefreshSecret)) {
    console.warn('⚠️  WARNING: Using weak JWT secrets. Change JWT_SECRET and JWT_REFRESH_SECRET before deploying to production!');
  }
}

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8888,
  
  // Site Info (for SEO & Open Graph)
  siteUrl: process.env.SITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  siteName: process.env.SITE_NAME || 'Bassac Post',
  siteDescription: process.env.SITE_DESCRIPTION || 'Quality News & Articles',
  
  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bassac_media_center',
  
  // Redis Cache (CRITICAL for 1M+ articles - use in production)
  redisUrl: process.env.REDIS_URL || null,
  
  // Elasticsearch (for advanced search)
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    auth: process.env.ELASTICSEARCH_AUTH === 'true',
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },
  
  // JWT
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: jwtRefreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM ,
  },
  
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    path: process.env.UPLOAD_PATH || './uploads',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
  },
  
  // Storage Provider (for cloud-ready design)
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      bucketName: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION,
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  
  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8888',
  
  // Cache TTL Settings (in seconds)
  cache: {
    articleTTL: 600,      // 10 min for individual articles
    listTTL: 180,         // 3 min for article lists  
    featuredTTL: 300,     // 5 min for featured articles
    categoryTTL: 1800,    // 30 min for categories
    settingsTTL: 600,     // 10 min for site settings
    homepageTTL: 120,     // 2 min for homepage data
  },
  
  // Pagination (for 1M+ articles)
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  
  // Image Settings
  images: {
    quality: 80,
    maxWidth: 1920,
    thumbnailWidth: 400,
    ogImageWidth: 1200,
    ogImageHeight: 630,
  },
};

export default config;
