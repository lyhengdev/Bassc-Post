#!/usr/bin/env node

/**
 * Elasticsearch Initialization Script
 * 
 * This script:
 * 1. Connects to Elasticsearch
 * 2. Creates the articles index
 * 3. Reindexes all published articles
 * 
 * Usage:
 *   node scripts/initElasticsearch.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

async function init() {
  console.log('\n🚀 Elasticsearch Initialization\n');

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bassac-cms';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected\n');

    // Import services
    const elasticsearchService = (await import('../src/services/elasticsearchService.js')).default;
    const articleSearchService = (await import('../src/services/articleSearchService.js')).default;
    const Article = (await import('../src/models/Article.js')).default;

    // Connect to Elasticsearch
    console.log('🔌 Connecting to Elasticsearch...');
    const connected = await elasticsearchService.connect();
    
    if (!connected) {
      console.error('\n❌ Failed to connect to Elasticsearch');
      console.log('   Make sure Elasticsearch is running at:', process.env.ELASTICSEARCH_NODE || 'http://localhost:9200');
      console.log('\n   Quick start with Docker:');
      console.log('   docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:8.11.0\n');
      process.exit(1);
    }

    console.log('✅ Elasticsearch connected\n');

    // Initialize index
    console.log('📇 Initializing articles index...');
    try {
      await articleSearchService.initializeIndex();
      console.log('✅ Index initialized\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Index already exists\n');
      } else {
        throw error;
      }
    }

    // Reindex all articles
    console.log('🔄 Reindexing all published articles...');
    
    const articles = await Article.find({ status: 'published' })
      .populate('author', 'firstName lastName')
      .populate('category', 'name slug')
      .lean();

    console.log(`📊 Found ${articles.length} published articles\n`);

    if (articles.length === 0) {
      console.log('⚠️  No published articles to index');
      console.log('✅ Setup complete!\n');
      process.exit(0);
    }

    // Bulk index in batches of 100
    const batchSize = 100;
    let indexed = 0;

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      await articleSearchService.bulkIndexArticles(batch);
      indexed += batch.length;
      console.log(`   Progress: ${indexed}/${articles.length} articles indexed`);
    }

    console.log('\n✅ All articles indexed successfully!\n');

    // Get stats
    const client = elasticsearchService.getClient();
    const stats = await client.indices.stats({ index: 'articles' });
    const docCount = stats.indices.articles?.total?.docs?.count || 0;

    console.log('📊 Elasticsearch Stats:');
    console.log(`   Documents: ${docCount}`);
    console.log(`   Index size: ${stats.indices.articles?.total?.store?.size || '0b'}`);

    console.log('\n🎉 Elasticsearch setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Articles will now auto-sync with Elasticsearch');
    console.log('   2. Test search at: http://localhost:8888/api/search?q=test');
    console.log('   3. Add search UI to your frontend\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run initialization
init().catch(console.error);
