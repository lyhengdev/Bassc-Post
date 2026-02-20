import elasticsearchService from './elasticsearchService.js';

/**
 * Article Search Service
 * 
 * Handles all article indexing and searching operations
 * with advanced features like typo tolerance, faceted search, autocomplete
 */

const ARTICLES_INDEX = 'articles';

// Index mappings
const ARTICLES_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        // Custom analyzer for article content
        article_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'article_synonym', 'article_stop'],
        },
        // Autocomplete analyzer
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'autocomplete_tokenizer',
          filter: ['lowercase', 'asciifolding'],
        },
        autocomplete_search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
      },
      tokenizer: {
        autocomplete_tokenizer: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20,
          token_chars: ['letter', 'digit'],
        },
      },
      filter: {
        article_synonym: {
          type: 'synonym',
          synonyms: [
            'breaking, urgent, important',
            'sports, sport, athletics',
            'technology, tech, innovation',
          ],
        },
        article_stop: {
          type: 'stop',
          stopwords: '_english_',
        },
      },
    },
  },
  mappings: {
    properties: {
      title: {
        type: 'text',
        analyzer: 'article_analyzer',
        fields: {
          raw: { type: 'keyword' },
          autocomplete: {
            type: 'text',
            analyzer: 'autocomplete_analyzer',
            search_analyzer: 'autocomplete_search_analyzer',
          },
        },
      },
      slug: {
        type: 'keyword',
      },
      excerpt: {
        type: 'text',
        analyzer: 'article_analyzer',
      },
      content: {
        type: 'text',
        analyzer: 'article_analyzer',
      },
      author: {
        type: 'object',
        properties: {
          _id: { type: 'keyword' },
          firstName: { type: 'text' },
          lastName: { type: 'text' },
          fullName: { type: 'text' },
        },
      },
      category: {
        type: 'object',
        properties: {
          _id: { type: 'keyword' },
          name: { type: 'text' },
          slug: { type: 'keyword' },
        },
      },
      tags: {
        type: 'keyword',
      },
      status: {
        type: 'keyword',
      },
      isFeatured: {
        type: 'boolean',
      },
      isBreaking: {
        type: 'boolean',
      },
      publishedAt: {
        type: 'date',
      },
      viewCount: {
        type: 'integer',
      },
      readTime: {
        type: 'integer',
      },
      language: {
        type: 'keyword',
      },
      createdAt: {
        type: 'date',
      },
      updatedAt: {
        type: 'date',
      },
    },
  },
};

class ArticleSearchService {
  /**
   * Initialize index
   */
  async initializeIndex() {
    try {
      await elasticsearchService.createIndex(ARTICLES_INDEX, ARTICLES_MAPPING);
      console.log('✅ Articles search index initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize articles index:', error.message);
      throw error;
    }
  }

  /**
   * Prepare article document for indexing
   */
  prepareDocument(article) {
    // Extract text content from EditorJS blocks
    let textContent = '';
    if (article.content?.blocks) {
      textContent = article.content.blocks
        .filter(block => block.type === 'paragraph' || block.type === 'header')
        .map(block => block.data.text || '')
        .join(' ');
    }

    return {
      _id: article._id.toString(),
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
      content: textContent,
      author: article.author ? {
        _id: article.author._id?.toString() || article.author.toString(),
        firstName: article.author.firstName || '',
        lastName: article.author.lastName || '',
        fullName: article.author.firstName && article.author.lastName
          ? `${article.author.firstName} ${article.author.lastName}`
          : '',
      } : null,
      category: article.category ? {
        _id: article.category._id?.toString() || article.category.toString(),
        name: article.category.name || '',
        slug: article.category.slug || '',
      } : null,
      tags: article.tags || [],
      status: article.status,
      isFeatured: article.isFeatured || false,
      isBreaking: article.isBreaking || false,
      publishedAt: article.publishedAt,
      viewCount: article.viewCount || 0,
      readTime: article.readTime || 0,
      language: article.language || 'en',
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }

  /**
   * Index article
   */
  async indexArticle(article) {
    try {
      const doc = this.prepareDocument(article);
      await elasticsearchService.indexDocument(ARTICLES_INDEX, article._id, doc);
      console.log(`✅ Indexed article: ${article.title}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to index article ${article._id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update article in index
   */
  async updateArticle(article) {
    try {
      const doc = this.prepareDocument(article);
      await elasticsearchService.updateDocument(ARTICLES_INDEX, article._id, doc);
      console.log(`✅ Updated article: ${article.title}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update article ${article._id}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete article from index
   */
  async deleteArticle(articleId) {
    try {
      await elasticsearchService.deleteDocument(ARTICLES_INDEX, articleId);
      console.log(`✅ Deleted article from index: ${articleId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete article ${articleId}:`, error.message);
      throw error;
    }
  }

  /**
   * Bulk index articles
   */
  async bulkIndexArticles(articles) {
    try {
      const documents = articles.map(article => this.prepareDocument(article));
      await elasticsearchService.bulkIndex(ARTICLES_INDEX, documents);
      console.log(`✅ Bulk indexed ${articles.length} articles`);
      return true;
    } catch (error) {
      console.error('❌ Bulk index failed:', error.message);
      throw error;
    }
  }

  /**
   * Advanced search with all features
   */
  async search(options = {}) {
    const {
      query = '',
      page = 1,
      limit = 20,
      filters = {},
      sortBy = 'relevance',
      language = 'en',
    } = options;

    const from = (page - 1) * limit;

    // Build query
    const must = [];
    const filter = [];

    // Main search query
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: [
            'title^3',           // Title boost x3
            'title.autocomplete^2', // Autocomplete boost x2
            'excerpt^2',         // Excerpt boost x2
            'content',           // Content normal weight
            'author.fullName',
            'tags',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',   // Typo tolerance
          prefix_length: 2,
          operator: 'or',
        },
      });
    } else {
      // No query = match all
      must.push({ match_all: {} });
    }

    // Status filter (always published)
    filter.push({ term: { status: 'published' } });

    // Language filter
    if (language) {
      filter.push({ term: { language } });
    }

    // Category filter
    if (filters.category) {
      filter.push({ term: { 'category._id': filters.category } });
    }

    // Author filter
    if (filters.author) {
      filter.push({ term: { 'author._id': filters.author } });
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filter.push({ terms: { tags: filters.tags } });
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const dateRange = {};
      if (filters.dateFrom) dateRange.gte = filters.dateFrom;
      if (filters.dateTo) dateRange.lte = filters.dateTo;
      filter.push({ range: { publishedAt: dateRange } });
    }

    // Featured filter
    if (filters.isFeatured) {
      filter.push({ term: { isFeatured: true } });
    }

    // Breaking filter
    if (filters.isBreaking) {
      filter.push({ term: { isBreaking: true } });
    }

    // Sort
    let sort;
    switch (sortBy) {
      case 'date_desc':
        sort = [{ publishedAt: 'desc' }];
        break;
      case 'date_asc':
        sort = [{ publishedAt: 'asc' }];
        break;
      case 'popular':
        sort = [{ viewCount: 'desc' }];
        break;
      case 'relevance':
      default:
        sort = ['_score', { publishedAt: 'desc' }];
    }

    // Build Elasticsearch query
    const searchQuery = {
      from,
      size: limit,
      query: {
        bool: {
          must,
          filter,
        },
      },
      sort,
      highlight: {
        fields: {
          title: { number_of_fragments: 0 },
          excerpt: { number_of_fragments: 1 },
          content: { number_of_fragments: 2 },
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
      },
      aggs: {
        // Aggregations for faceted search
        categories: {
          terms: {
            field: 'category._id',
            size: 20,
          },
        },
        authors: {
          terms: {
            field: 'author._id',
            size: 20,
          },
        },
        tags: {
          terms: {
            field: 'tags',
            size: 50,
          },
        },
        date_histogram: {
          date_histogram: {
            field: 'publishedAt',
            calendar_interval: 'month',
          },
        },
      },
      suggest: query ? {
        // "Did you mean..." suggestions
        text: query,
        title_suggestion: {
          term: {
            field: 'title',
            suggest_mode: 'popular',
            min_word_length: 3,
          },
        },
      } : undefined,
    };

    try {
      const result = await elasticsearchService.search(ARTICLES_INDEX, searchQuery);

      return {
        hits: result.hits.hits.map(hit => ({
          _id: hit._id,
          _score: hit._score,
          ...hit._source,
          highlight: hit.highlight,
        })),
        total: result.hits.total.value,
        page,
        limit,
        pages: Math.ceil(result.hits.total.value / limit),
        aggregations: result.aggregations,
        suggestions: result.suggest?.title_suggestion?.[0]?.options || [],
      };
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      throw error;
    }
  }

  /**
   * Autocomplete search
   */
  async autocomplete(query, limit = 10) {
    if (!query || query.length < 2) {
      return [];
    }

    const searchQuery = {
      size: limit,
      query: {
        bool: {
          must: [
            {
              match: {
                'title.autocomplete': {
                  query,
                  operator: 'and',
                },
              },
            },
          ],
          filter: [
            { term: { status: 'published' } },
          ],
        },
      },
      _source: ['title', 'slug', 'category'],
    };

    try {
      const result = await elasticsearchService.search(ARTICLES_INDEX, searchQuery);

      return result.hits.hits.map(hit => ({
        _id: hit._id,
        title: hit._source.title,
        slug: hit._source.slug,
        category: hit._source.category,
      }));
    } catch (error) {
      console.error('❌ Autocomplete failed:', error.message);
      throw error;
    }
  }

  /**
   * Get similar articles
   */
  async getSimilar(articleId, limit = 5) {
    try {
      // Get the article
      const article = await elasticsearchService.getDocument(ARTICLES_INDEX, articleId);

      if (!article) {
        return [];
      }

      // Find similar articles using More Like This query
      const searchQuery = {
        size: limit,
        query: {
          bool: {
            must: [
              {
                more_like_this: {
                  fields: ['title', 'excerpt', 'content', 'tags'],
                  like: [
                    {
                      _index: ARTICLES_INDEX,
                      _id: articleId,
                    },
                  ],
                  min_term_freq: 1,
                  max_query_terms: 12,
                },
              },
            ],
            filter: [
              { term: { status: 'published' } },
            ],
            must_not: [
              { term: { _id: articleId } }, // Exclude current article
            ],
          },
        },
        _source: ['title', 'slug', 'excerpt', 'category', 'author', 'publishedAt', 'featuredImage'],
      };

      const result = await elasticsearchService.search(ARTICLES_INDEX, searchQuery);

      return result.hits.hits.map(hit => ({
        _id: hit._id,
        _score: hit._score,
        ...hit._source,
      }));
    } catch (error) {
      console.error('❌ Get similar failed:', error.message);
      throw error;
    }
  }

  /**
   * Get trending articles
   */
  async getTrending(limit = 10, hours = 24) {
    const dateFrom = new Date();
    dateFrom.setHours(dateFrom.getHours() - hours);

    const searchQuery = {
      size: limit,
      query: {
        bool: {
          must: [{ match_all: {} }],
          filter: [
            { term: { status: 'published' } },
            { range: { publishedAt: { gte: dateFrom } } },
          ],
        },
      },
      sort: [
        { viewCount: 'desc' },
        { publishedAt: 'desc' },
      ],
      _source: ['title', 'slug', 'excerpt', 'category', 'author', 'publishedAt', 'viewCount', 'featuredImage'],
    };

    try {
      const result = await elasticsearchService.search(ARTICLES_INDEX, searchQuery);

      return result.hits.hits.map(hit => ({
        _id: hit._id,
        ...hit._source,
      }));
    } catch (error) {
      console.error('❌ Get trending failed:', error.message);
      throw error;
    }
  }

  /**
   * Reindex all articles
   */
  async reindexAll(Article) {
    try {
      console.log('🔄 Starting full reindex...');

      // Get all published articles
      const articles = await Article.find({ status: 'published' })
        .populate('author', 'firstName lastName')
        .populate('category', 'name slug')
        .lean();

      console.log(`📊 Found ${articles.length} articles to reindex`);

      if (articles.length === 0) {
        console.log('✅ No articles to reindex');
        return true;
      }

      // Bulk index
      await this.bulkIndexArticles(articles);

      console.log('✅ Reindex complete');
      return true;
    } catch (error) {
      console.error('❌ Reindex failed:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const articleSearchService = new ArticleSearchService();

export default articleSearchService;
