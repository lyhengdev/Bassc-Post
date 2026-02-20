import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import User from '../models/User.js';
import Category from '../models/Category.js';
import Article from '../models/Article.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bassac_media_center';

// Seed data
const users = [
  {
    email: 'admin@bassacmedia.com',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
    isEmailVerified: true,
    bio: 'Platform administrator',
  },
  {
    email: 'editor@bassacmedia.com',
    password: 'Editor@123',
    firstName: 'Editor',
    lastName: 'User',
    role: 'editor',
    status: 'active',
    isEmailVerified: true,
    bio: 'Senior content editor',
  },
  {
    email: 'writer@bassacmedia.com',
    password: 'Writer@123',
    firstName: 'Writer',
    lastName: 'User',
    role: 'writer',
    status: 'active',
    isEmailVerified: true,
    bio: 'Content writer and journalist',
  },
];

const categories = [
  {
    name: 'News',
    description: 'Latest news and current events',
    color: '#EF4444',
    order: 1,
  },
  {
    name: 'Technology',
    description: 'Technology trends and innovations',
    color: '#3B82F6',
    order: 2,
  },
  {
    name: 'Business',
    description: 'Business news and market analysis',
    color: '#10B981',
    order: 3,
  },
  {
    name: 'Entertainment',
    description: 'Entertainment, movies, and culture',
    color: '#8B5CF6',
    order: 4,
  },
  {
    name: 'Sports',
    description: 'Sports news and updates',
    color: '#F59E0B',
    order: 5,
  },
  {
    name: 'Lifestyle',
    description: 'Lifestyle, health, and wellness',
    color: '#EC4899',
    order: 6,
  },
];

const sampleArticleContent = {
  time: Date.now(),
  blocks: [
    {
      id: 'header1',
      type: 'header',
      data: {
        text: 'Introduction',
        level: 2,
      },
    },
    {
      id: 'para1',
      type: 'paragraph',
      data: {
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
      },
    },
    {
      id: 'para2',
      type: 'paragraph',
      data: {
        text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      },
    },
    {
      id: 'header2',
      type: 'header',
      data: {
        text: 'Key Points',
        level: 2,
      },
    },
    {
      id: 'list1',
      type: 'list',
      data: {
        style: 'unordered',
        items: [
          'First important point about the topic',
          'Second key insight to consider',
          'Third aspect worth mentioning',
          'Final thoughts and conclusions',
        ],
      },
    },
    {
      id: 'quote1',
      type: 'quote',
      data: {
        text: 'The future belongs to those who believe in the beauty of their dreams.',
        caption: 'Eleanor Roosevelt',
        alignment: 'left',
      },
    },
    {
      id: 'para3',
      type: 'paragraph',
      data: {
        text: 'In conclusion, this article has explored various aspects of the topic at hand. We hope this information proves valuable to our readers as they navigate these complex issues.',
      },
    },
  ],
  version: '2.28.2',
};

const seed = async () => {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Article.deleteMany({}),
    ]);

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.create(users);
    console.log(`   Created ${createdUsers.length} users`);

    // Create categories
    console.log('📁 Creating categories...');
    const createdCategories = await Category.create(categories);
    console.log(`   Created ${createdCategories.length} categories`);

    // Create sample articles
    console.log('📝 Creating sample articles...');
    const writer = createdUsers.find((u) => u.role === 'writer');
    const editor = createdUsers.find((u) => u.role === 'editor');

    const sampleArticles = [
      {
        title: 'Breaking: Major Tech Company Announces Revolutionary AI Platform',
        excerpt: 'In a groundbreaking announcement today, a leading technology company unveiled their latest artificial intelligence platform that promises to transform industries worldwide.',
        content: sampleArticleContent,
        category: createdCategories.find((c) => c.name === 'Technology')._id,
        author: writer._id,
        status: 'published',
        publishedAt: new Date(),
        isFeatured: true,
        tags: ['technology', 'ai', 'innovation'],
      },
      {
        title: 'Economic Outlook: Experts Predict Strong Growth in Q4',
        excerpt: 'Financial analysts are optimistic about the economic outlook for the remainder of the year, citing improved consumer confidence and robust employment figures.',
        content: sampleArticleContent,
        category: createdCategories.find((c) => c.name === 'Business')._id,
        author: writer._id,
        status: 'published',
        publishedAt: new Date(Date.now() - 86400000),
        isFeatured: true,
        tags: ['business', 'economy', 'finance'],
      },
      {
        title: 'Championship Finals: Historic Match Delivers Unforgettable Moments',
        excerpt: 'Last night\'s championship game will go down in history as one of the most thrilling matches ever played, with dramatic twists until the final whistle.',
        content: sampleArticleContent,
        category: createdCategories.find((c) => c.name === 'Sports')._id,
        author: writer._id,
        status: 'published',
        publishedAt: new Date(Date.now() - 172800000),
        isFeatured: false,
        tags: ['sports', 'championship', 'finals'],
      },
      {
        title: 'Draft Article: Upcoming Entertainment Trends for 2025',
        excerpt: 'A look at what\'s coming in the entertainment industry next year.',
        content: sampleArticleContent,
        category: createdCategories.find((c) => c.name === 'Entertainment')._id,
        author: writer._id,
        status: 'draft',
        tags: ['entertainment', 'trends'],
      },
      {
        title: 'Pending Review: Health and Wellness in the Modern Age',
        excerpt: 'Exploring the latest trends in health, fitness, and mental wellness.',
        content: sampleArticleContent,
        category: createdCategories.find((c) => c.name === 'Lifestyle')._id,
        author: writer._id,
        status: 'pending',
        tags: ['lifestyle', 'health', 'wellness'],
      },
    ];

    const createdArticles = await Article.create(sampleArticles);
    console.log(`   Created ${createdArticles.length} articles`);

    // Update category article counts
    console.log('📊 Updating category statistics...');
    for (const category of createdCategories) {
      await category.updateArticleCount();
    }

    console.log('\n✅ Database seeded successfully!\n');
    console.log('📧 Login credentials:');
    console.log('─────────────────────────────────────────');
    console.log('Admin:  admin@bassacmedia.com  / Admin@123');
    console.log('Editor: editor@bassacmedia.com / Editor@123');
    console.log('Writer: writer@bassacmedia.com / Writer@123');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seed();
