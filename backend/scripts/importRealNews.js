import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
const maxArticles = Number.parseInt((countArg || '--count=200').split('=')[1], 10) || 200;

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'News', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entertainment', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'Technology', source: 'BBC' },
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', category: 'Lifestyle', source: 'BBC' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'News', source: 'NYTimes' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', category: 'Business', source: 'NYTimes' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'Technology', source: 'NYTimes' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', category: 'Sports', source: 'NYTimes' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml', category: 'Entertainment', source: 'NYTimes' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'News', source: 'Al Jazeera' },
  { url: 'https://www.theguardian.com/world/rss', category: 'News', source: 'The Guardian' },
  { url: 'https://www.theguardian.com/business/rss', category: 'Business', source: 'The Guardian' },
  { url: 'https://www.theguardian.com/uk/technology/rss', category: 'Technology', source: 'The Guardian' },
  { url: 'https://www.theguardian.com/uk/sport/rss', category: 'Sports', source: 'The Guardian' },
];

const CATEGORY_COLORS = {
  News: '#EF4444',
  Technology: '#3B82F6',
  Business: '#10B981',
  Entertainment: '#8B5CF6',
  Sports: '#F59E0B',
  Lifestyle: '#EC4899',
};

function decodeEntities(input = '') {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(input = '') {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickTag(block, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(re);
  if (!match) return '';
  return stripHtml(decodeEntities(match[1] || ''));
}

function pickAttr(block, tagName, attrName) {
  const re = new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]+)"[^>]*\\/?>`, 'i');
  const match = block.match(re);
  return match ? decodeEntities(match[1]) : '';
}

function parseItems(xml) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.map((itemBlock) => {
    const title = pickTag(itemBlock, 'title').slice(0, 200);
    const description = pickTag(itemBlock, 'description');
    const link = decodeEntities(pickTag(itemBlock, 'link'));
    const pubDateRaw = pickTag(itemBlock, 'pubDate');
    const category = pickTag(itemBlock, 'category');
    const mediaThumbnail = pickAttr(itemBlock, 'media:thumbnail', 'url');
    const mediaContent = pickAttr(itemBlock, 'media:content', 'url');
    const enclosure = pickAttr(itemBlock, 'enclosure', 'url');
    const image = mediaThumbnail || mediaContent || enclosure || '';

    return {
      title,
      description,
      excerpt: description.slice(0, 500),
      link,
      pubDate: pubDateRaw ? new Date(pubDateRaw) : null,
      category,
      image,
    };
  });
}

function blockId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildEditorContent(item, sourceName) {
  const summary = item.description || 'No summary available from source feed.';
  return {
    time: Date.now(),
    blocks: [
      {
        id: blockId('h'),
        type: 'header',
        data: {
          text: item.title || 'Untitled',
          level: 2,
        },
      },
      {
        id: blockId('p1'),
        type: 'paragraph',
        data: {
          text: summary,
        },
      },
      {
        id: blockId('q'),
        type: 'quote',
        data: {
          text: 'This article was imported from an external RSS source for demo and newsroom testing.',
          caption: sourceName,
          alignment: 'left',
        },
      },
      {
        id: blockId('p2'),
        type: 'paragraph',
        data: {
          text: item.link ? `Original source: ${item.link}` : `Original source: ${sourceName}`,
        },
      },
    ],
    version: '2.28.2',
  };
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      'User-Agent': 'BassacPostImporter/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${feed.url}`);
  }

  const xml = await response.text();
  const items = parseItems(xml)
    .filter((item) => item.title && item.link)
    .map((item) => ({ ...item, source: feed.source, mappedCategory: feed.category }));

  return items;
}

async function ensureAuthor() {
  let author = await User.findOne({ email: 'rss-importer@bassac.media' });
  if (author) return author;

  author = await User.create({
    email: 'rss-importer@bassac.media',
    password: 'Importer@123',
    firstName: 'RSS',
    lastName: 'Importer',
    role: 'writer',
    status: 'active',
    isEmailVerified: true,
    bio: 'Automated importer for real-world RSS news feeds.',
  });

  return author;
}

async function ensureCategories() {
  const result = {};
  for (const name of Object.keys(CATEGORY_COLORS)) {
    let category = await Category.findOne({ name });
    if (!category) {
      category = await Category.create({
        name,
        description: `${name} news imported from trusted RSS feeds`,
        color: CATEGORY_COLORS[name],
        isActive: true,
      });
    }
    result[name] = category;
  }
  return result;
}

async function run() {
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected');

  const author = await ensureAuthor();
  const categories = await ensureCategories();

  console.log(`Fetching RSS feeds (${FEEDS.length})...`);
  const feedResults = await Promise.allSettled(FEEDS.map((feed) => fetchFeed(feed)));

  const items = [];
  let failedFeeds = 0;
  for (let i = 0; i < feedResults.length; i += 1) {
    const result = feedResults[i];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
      console.log(`  OK: ${FEEDS[i].url} -> ${result.value.length} items`);
    } else {
      failedFeeds += 1;
      console.warn(`  FAIL: ${FEEDS[i].url} -> ${result.reason?.message || result.reason}`);
    }
  }

  if (items.length === 0) {
    throw new Error('No RSS items fetched. Nothing to import.');
  }

  // De-duplicate by URL/title within fetched set.
  const seen = new Set();
  const uniqueItems = [];
  for (const item of items) {
    const key = `${item.link}::${item.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  // De-duplicate against existing DB by title (keeps script idempotent enough for repeated runs).
  const existingTitles = new Set(
    await Article.find(
      { title: { $in: uniqueItems.map((n) => n.title).slice(0, 5000) } },
      { title: 1 }
    ).lean().then((rows) => rows.map((row) => row.title))
  );

  const sorted = uniqueItems
    .filter((item) => !existingTitles.has(item.title))
    .sort((a, b) => {
      const aTime = a.pubDate instanceof Date && !Number.isNaN(a.pubDate.getTime()) ? a.pubDate.getTime() : 0;
      const bTime = b.pubDate instanceof Date && !Number.isNaN(b.pubDate.getTime()) ? b.pubDate.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, maxArticles);

  const docs = sorted.map((item, idx) => {
    const catName = categories[item.mappedCategory] ? item.mappedCategory : 'News';
    const publishedAt =
      item.pubDate instanceof Date && !Number.isNaN(item.pubDate.getTime()) ? item.pubDate : new Date();

    const feedTag = item.category ? item.category.toLowerCase().slice(0, 30) : null;
    const tags = [
      item.source.toLowerCase().replace(/\s+/g, '-'),
      catName.toLowerCase(),
      feedTag,
      'rss-import',
    ].filter(Boolean);

    return {
      title: item.title,
      excerpt: item.excerpt || item.title,
      content: buildEditorContent(item, item.source),
      featuredImage: item.image || null,
      featuredImageAlt: item.title,
      category: categories[catName]._id,
      author: author._id,
      status: 'published',
      publishedAt,
      isFeatured: idx < 10,
      isBreaking: idx < 5,
      tags,
      metaTitle: item.title.slice(0, 70),
      metaDescription: (item.excerpt || item.title).slice(0, 160),
      metaKeywords: tags,
      language: 'en',
      availableLanguages: ['en'],
    };
  });

  if (docs.length === 0) {
    console.log('No new unique articles to insert.');
    await mongoose.disconnect();
    return;
  }

  let insertedCount = 0;
  for (const doc of docs) {
    try {
      await Article.create(doc);
      insertedCount += 1;
    } catch (error) {
      // Skip rare collisions/validation edge cases and continue importing.
      if (error?.code === 11000) {
        continue;
      }
      throw error;
    }
  }

  // Update category counters
  const categoryRows = await Category.find({ name: { $in: Object.keys(categories) } });
  for (const category of categoryRows) {
    await category.updateArticleCount();
  }

  console.log('\nImport complete');
  console.log(`Requested: ${maxArticles}`);
  console.log(`Fetched items: ${items.length}`);
  console.log(`Unique feed items: ${uniqueItems.length}`);
  console.log(`Inserted: ${insertedCount}`);
  console.log(`Failed feeds: ${failedFeeds}`);

  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Import failed:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
    process.exit(1);
  });
