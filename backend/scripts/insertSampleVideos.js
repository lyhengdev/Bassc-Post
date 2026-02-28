import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slugify from 'slugify';

import User from '../src/models/User.js';
import Category from '../src/models/Category.js';
import Article from '../src/models/Article.js';

dotenv.config();
process.env.SKIP_ELASTICSEARCH_SYNC = 'true';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required in backend/.env');
  process.exit(1);
}

const argv = process.argv.slice(2);
const countArg = argv.find((arg) => arg.startsWith('--count='));
const targetCount = Number.parseInt((countArg || '--count=50').split('=')[1], 10) || 50;
const SEED_TAG = 'sample-video-seed-v1';

const VIDEO_POOL = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

const CATEGORY_NAMES = ['News', 'Entertainment', 'Lifestyle', 'Technology', 'Sports', 'Business'];

function buildVideoContent(title, url) {
  return {
    time: Date.now(),
    blocks: [
      {
        id: `seed-video-title-${Math.random().toString(36).slice(2, 9)}`,
        type: 'header',
        data: {
          text: title,
          level: 2,
        },
      },
      {
        id: `seed-video-summary-${Math.random().toString(36).slice(2, 9)}`,
        type: 'paragraph',
        data: {
          text: 'Sample video content for mobile reels UX/flow testing.',
        },
      },
      {
        id: `seed-video-link-${Math.random().toString(36).slice(2, 9)}`,
        type: 'paragraph',
        data: {
          text: `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
        },
      },
    ],
    version: '2.28.2',
  };
}

function buildSlug(title, sequence) {
  const base = slugify(title, { lower: true, strict: true, trim: true }) || 'sample-video';
  return `${base}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

async function ensureAuthor() {
  let author = await User.findOne({ email: 'video-seeder@bassac.media' });
  if (author) return author;

  author = await User.create({
    email: 'video-seeder@bassac.media',
    password: 'Seeder@123',
    firstName: 'Video',
    lastName: 'Seeder',
    role: 'writer',
    status: 'active',
    isEmailVerified: true,
    bio: 'Seeder account for sample video reels.',
  });
  return author;
}

async function ensureCategories() {
  const allCategories = await Category.find({ name: { $in: CATEGORY_NAMES } });
  const byName = new Map(allCategories.map((c) => [c.name, c]));
  return CATEGORY_NAMES.map((name) => byName.get(name)).filter(Boolean);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected');

  const [author, categories] = await Promise.all([ensureAuthor(), ensureCategories()]);
  if (categories.length === 0) {
    throw new Error('No categories found. Please seed categories first.');
  }

  const existingCount = await Article.countDocuments({
    postType: 'video',
    tags: SEED_TAG,
  });

  if (existingCount >= targetCount) {
    console.log(`Already have ${existingCount} seeded video posts (target ${targetCount}). No insert needed.`);
    return;
  }

  const toCreate = targetCount - existingCount;
  const now = Date.now();
  const docs = Array.from({ length: toCreate }, (_, index) => {
    const sequence = existingCount + index + 1;
    const videoUrl = VIDEO_POOL[index % VIDEO_POOL.length];
    const category = categories[index % categories.length];
    const title = `Sample Mobile Video ${String(sequence).padStart(2, '0')}`;
    return {
      title,
      slug: buildSlug(title, sequence),
      excerpt: `Demo reel ${sequence} for mobile controls and swipe testing.`,
      content: buildVideoContent(title, videoUrl),
      postType: 'video',
      videoUrl,
      category: category._id,
      author: author._id,
      status: 'published',
      publishedAt: new Date(now - sequence * 60000),
      isFeatured: sequence <= 6,
      tags: [SEED_TAG, 'video', 'mobile-test'],
    };
  });

  const inserted = await Article.insertMany(docs, { ordered: false });
  console.log(`Inserted ${inserted.length} sample video posts.`);

  await Promise.all(categories.map((category) => category.updateArticleCount()));
  console.log('Category counters updated.');
}

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Failed to insert sample videos:', error.message || error);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
