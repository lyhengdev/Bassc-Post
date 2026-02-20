import { Client } from '@elastic/elasticsearch';
import config from '../config/index.js';

/**
 * Elasticsearch Client Configuration
 * 
 * Provides connection to Elasticsearch cluster
 * with automatic retry and health checking
 */

class ElasticsearchService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Elasticsearch client
   */
  async connect() {
    try {
      // Create Elasticsearch client
      this.client = new Client({
        node: config.elasticsearch.node || 'http://localhost:9200',
        auth: config.elasticsearch.auth ? {
          username: config.elasticsearch.username,
          password: config.elasticsearch.password,
        } : undefined,
        maxRetries: 5,
        requestTimeout: 60000,
        sniffOnStart: true,
      });

      // Check connection
      const health = await this.client.cluster.health({});
      this.isConnected = true;
      
      console.log('✅ Elasticsearch connected:', health.cluster_name);
      console.log(`   Status: ${health.status}`);
      console.log(`   Nodes: ${health.number_of_nodes}`);

      return true;
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get client instance
   */
  getClient() {
    if (!this.isConnected) {
      throw new Error('Elasticsearch not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if connected
   */
  isHealthy() {
    return this.isConnected;
  }

  /**
   * Create index with mappings
   */
  async createIndex(indexName, mappings) {
    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (exists) {
        console.log(`ℹ️  Index "${indexName}" already exists`);
        return false;
      }

      await this.client.indices.create({
        index: indexName,
        body: mappings,
      });

      console.log(`✅ Created index: ${indexName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create index "${indexName}":`, error.message);
      throw error;
    }
  }

  /**
   * Delete index
   */
  async deleteIndex(indexName) {
    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (!exists) {
        console.log(`ℹ️  Index "${indexName}" does not exist`);
        return false;
      }

      await this.client.indices.delete({ index: indexName });
      console.log(`✅ Deleted index: ${indexName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete index "${indexName}":`, error.message);
      throw error;
    }
  }

  /**
   * Reindex (delete and recreate)
   */
  async reindex(indexName, mappings) {
    try {
      await this.deleteIndex(indexName);
      await this.createIndex(indexName, mappings);
      return true;
    } catch (error) {
      console.error(`❌ Failed to reindex "${indexName}":`, error.message);
      throw error;
    }
  }

  /**
   * Index document
   */
  async indexDocument(indexName, id, document) {
    try {
      const result = await this.client.index({
        index: indexName,
        id: id.toString(),
        document,
        refresh: true, // Make immediately searchable
      });

      return result;
    } catch (error) {
      console.error(`❌ Failed to index document ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDocument(indexName, id, document) {
    try {
      const result = await this.client.update({
        index: indexName,
        id: id.toString(),
        doc: document,
        refresh: true,
      });

      return result;
    } catch (error) {
      // If document doesn't exist, index it
      if (error.meta?.statusCode === 404) {
        return await this.indexDocument(indexName, id, document);
      }
      console.error(`❌ Failed to update document ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(indexName, id) {
    try {
      const result = await this.client.delete({
        index: indexName,
        id: id.toString(),
        refresh: true,
      });

      return result;
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        console.log(`ℹ️  Document ${id} not found in index`);
        return null;
      }
      console.error(`❌ Failed to delete document ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(indexName, documents) {
    try {
      const operations = documents.flatMap(doc => [
        { index: { _index: indexName, _id: doc._id.toString() } },
        doc,
      ]);

      const result = await this.client.bulk({
        refresh: true,
        operations,
      });

      if (result.errors) {
        const erroredDocuments = [];
        result.items.forEach((action, i) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              status: action[operation].status,
              error: action[operation].error,
              document: documents[i],
            });
          }
        });
        console.error(`❌ Bulk index errors:`, erroredDocuments);
      }

      console.log(`✅ Bulk indexed ${documents.length} documents`);
      return result;
    } catch (error) {
      console.error('❌ Bulk index failed:', error.message);
      throw error;
    }
  }

  /**
   * Search
   */
  async search(indexName, query) {
    try {
      const result = await this.client.search({
        index: indexName,
        ...query,
      });

      return result;
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      throw error;
    }
  }

  /**
   * Count documents
   */
  async count(indexName, query = {}) {
    try {
      const result = await this.client.count({
        index: indexName,
        ...query,
      });

      return result.count;
    } catch (error) {
      console.error('❌ Count failed:', error.message);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(indexName, id) {
    try {
      const result = await this.client.get({
        index: indexName,
        id: id.toString(),
      });

      return result._source;
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      console.error(`❌ Failed to get document ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Close connection
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('👋 Elasticsearch connection closed');
    }
  }
}

// Create singleton instance
const elasticsearchService = new ElasticsearchService();

export default elasticsearchService;
