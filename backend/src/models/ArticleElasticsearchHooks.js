/**
 * Elasticsearch Article Hooks
 * 
 * Automatically sync articles with Elasticsearch on:
 * - Create
 * - Update
 * - Delete
 * 
 * Add this to Article.js model at the bottom before export
 */

// Import at top of Article.js:
// import articleSearchService from '../services/articleSearchService.js';

// Add these hooks before: export default Article;

// ====================  ELASTICSEARCH HOOKS ====================

// Hook: After save (create or update)
articleSchema.post('save', async function(doc) {
  try {
    // Only index published articles
    if (doc.status === 'published') {
      // Populate references before indexing
      await doc.populate([
        { path: 'author', select: 'firstName lastName' },
        { path: 'category', select: 'name slug' },
      ]);
      
      // Check if articleSearchService is available
      const { default: articleSearchService } = await import('../services/articleSearchService.js');
      
      if (articleSearchService) {
        await articleSearchService.updateArticle(doc);
        console.log(`📇 Indexed article: ${doc.title}`);
      }
    } else {
      // If not published, remove from index
      const { default: articleSearchService } = await import('../services/articleSearchService.js');
      
      if (articleSearchService) {
        await articleSearchService.deleteArticle(doc._id);
        console.log(`🗑️  Removed article from index: ${doc.title}`);
      }
    }
  } catch (error) {
    console.error('Elasticsearch indexing error:', error.message);
    // Don't throw error - we don't want to block article save if ES fails
  }
});

// Hook: After delete
articleSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  try {
    const { default: articleSearchService } = await import('../services/articleSearchService.js');
    
    if (articleSearchService) {
      await articleSearchService.deleteArticle(doc._id);
      console.log(`🗑️  Removed deleted article from index: ${doc.title}`);
    }
  } catch (error) {
    console.error('Elasticsearch delete error:', error.message);
    // Don't throw error
  }
});

// Hook: After findOneAndDelete
articleSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc) {
      const { default: articleSearchService } = await import('../services/articleSearchService.js');
      
      if (articleSearchService) {
        await articleSearchService.deleteArticle(doc._id);
        console.log(`🗑️  Removed deleted article from index: ${doc.title}`);
      }
    }
  } catch (error) {
    console.error('Elasticsearch delete error:', error.message);
    // Don't throw error
  }
});

// INSTRUCTIONS:
// 1. Copy the import statement to the top of Article.js
// 2. Copy these hooks to the bottom of Article.js, just before: export default Article;
// 3. That's it! Articles will automatically sync with Elasticsearch
