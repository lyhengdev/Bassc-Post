import api from './api';

/**
 * Translation API Service
 * Handles all translation-related API calls
 */

// ==================== SUPPORTED LANGUAGES ====================

export const translationAPI = {
  /**
   * Get all supported languages
   * GET /api/translations/languages
   */
  getSupportedLanguages: () => api.get('/translations/languages'),

  // ==================== ARTICLE TRANSLATIONS ====================

  /**
   * Get all translations for an article
   * GET /api/translations/articles/:articleId
   */
  getArticleTranslations: (articleId) => 
    api.get(`/translations/articles/${articleId}`),

  /**
   * Get article translation by language
   * GET /api/translations/articles/:articleId/:language
   */
  getArticleTranslation: (articleId, language) => 
    api.get(`/translations/articles/${articleId}/${language}`),

  /**
   * Create article translation
   * POST /api/translations/articles/:articleId
   */
  createArticleTranslation: (articleId, data) => 
    api.post(`/translations/articles/${articleId}`, data),

  /**
   * Update article translation
   * PUT /api/translations/articles/:articleId/:language
   */
  updateArticleTranslation: (articleId, language, data) => 
    api.put(`/translations/articles/${articleId}/${language}`, data),

  /**
   * Delete article translation
   * DELETE /api/translations/articles/:articleId/:language
   */
  deleteArticleTranslation: (articleId, language) => 
    api.delete(`/translations/articles/${articleId}/${language}`),

  /**
   * Publish article translation
   * POST /api/translations/articles/:articleId/:language/publish
   */
  publishArticleTranslation: (articleId, language) => 
    api.post(`/translations/articles/${articleId}/${language}/publish`),

  // ==================== CATEGORY TRANSLATIONS ====================

  /**
   * Get all translations for a category
   * GET /api/translations/categories/:categoryId
   */
  getCategoryTranslations: (categoryId) => 
    api.get(`/translations/categories/${categoryId}`),

  /**
   * Get category translation by language
   * GET /api/translations/categories/:categoryId/:language
   */
  getCategoryTranslation: (categoryId, language) => 
    api.get(`/translations/categories/${categoryId}/${language}`),

  /**
   * Create category translation
   * POST /api/translations/categories/:categoryId
   */
  createCategoryTranslation: (categoryId, data) => 
    api.post(`/translations/categories/${categoryId}`, data),

  /**
   * Update category translation
   * PUT /api/translations/categories/:categoryId/:language
   */
  updateCategoryTranslation: (categoryId, language, data) => 
    api.put(`/translations/categories/${categoryId}/${language}`, data),

  /**
   * Delete category translation
   * DELETE /api/translations/categories/:categoryId/:language
   */
  deleteCategoryTranslation: (categoryId, language) => 
    api.delete(`/translations/categories/${categoryId}/${language}`),

  /**
   * Publish category translation
   * POST /api/translations/categories/:categoryId/:language/publish
   */
  publishCategoryTranslation: (categoryId, language) => 
    api.post(`/translations/categories/${categoryId}/${language}/publish`),
};

export default translationAPI;
