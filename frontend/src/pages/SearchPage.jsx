import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Filter, X, Clock, TrendingUp, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [facets, setFacets] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    sortBy: searchParams.get('sort') || 'relevance',
  });
  
  const searchInputRef = useRef(null);
  const autocompleteTimerRef = useRef(null);

  // Perform search
  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, page, filters]);

  // Autocomplete on typing
  useEffect(() => {
    if (query.length >= 2) {
      // Debounce autocomplete
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current);
      }

      autocompleteTimerRef.current = setTimeout(() => {
        fetchAutocomplete();
      }, 300);
    } else {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
    }

    return () => {
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current);
      }
    };
  }, [query]);

  const performSearch = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        q: query,
        page,
        limit: 20,
        sortBy: filters.sortBy,
      });

      if (filters.category) {
        params.append('category', filters.category);
      }

      const response = await api.get(`/search?${params.toString()}`);
      
      setResults(response.data.results || []);
      setTotal(response.data.total || 0);
      setFacets(response.data.facets || null);
      setSuggestions(response.data.suggestions || []);
      
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutocomplete = async () => {
    try {
      const response = await api.get(`/search/autocomplete?q=${encodeURIComponent(query)}`);
      setAutocompleteResults(response.data.suggestions || []);
      setShowAutocomplete(true);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowAutocomplete(false);
      setPage(1);
      
      const params = new URLSearchParams({ q: query });
      if (filters.category) params.append('category', filters.category);
      if (filters.sortBy !== 'relevance') params.append('sort', filters.sortBy);
      
      setSearchParams(params);
    }
  };

  const handleAutocompleteSelect = (suggestion) => {
    setQuery(suggestion.title);
    setShowAutocomplete(false);
    performSearch();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ category: '', sortBy: 'relevance' });
    setPage(1);
  };

  const highlightText = (text) => {
    if (!text) return '';
    return { __html: text };
  };

  return (
    <>
      <Helmet>
        <title>Search{query ? ` - ${query}` : ''} - Bassac Post</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Search Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => autocompleteResults.length > 0 && setShowAutocomplete(true)}
                  placeholder="Search news..."
                  className="w-full pl-12 pr-12 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      setShowAutocomplete(false);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
                  {autocompleteResults.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleAutocompleteSelect(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {suggestion.title}
                        </div>
                        {suggestion.category && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {suggestion.category.name}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Filters Bar */}
            <div className="flex items-center gap-4 mt-4">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
              >
                <option value="relevance">Most Relevant</option>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="popular">Most Popular</option>
              </select>

              {(filters.category || filters.sortBy !== 'relevance') && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Sidebar - Faceted Filters */}
            {facets && (
              <aside className="w-64 flex-shrink-0 hidden lg:block">
                <div className="sticky top-24 space-y-6">
                  {/* Categories Facet */}
                  {facets.categories?.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Categories
                      </h3>
                      <div className="space-y-2">
                        {facets.categories.slice(0, 10).map((cat) => (
                          <button
                            key={cat.key}
                            onClick={() => handleFilterChange('category', cat.key)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              filters.category === cat.key
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{cat.key}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {cat.doc_count}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags Facet */}
                  {facets.tags?.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Popular Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {facets.tags.slice(0, 15).map((tag) => (
                          <span
                            key={tag.key}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
                          >
                            {tag.key}
                            <span className="text-gray-500 dark:text-gray-400">
                              ({tag.doc_count})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {/* Search Info */}
              {query && (
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Search Results for "{query}"
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {loading ? 'Searching...' : `Found ${total.toLocaleString()} results`}
                  </p>

                  {/* "Did you mean..." Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600 dark:text-gray-400">Did you mean:</span>
                      {suggestions.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(suggestion);
                            setPage(1);
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {!loading && results.length > 0 && (
                <div className="space-y-4">
                  {results.map((article) => (
                    <article
                      key={article._id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/articles/${article.slug}`)}
                    >
                      <h2
                        className="text-2xl font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400"
                        dangerouslySetInnerHTML={highlightText(article.highlight?.title?.[0] || article.title)}
                      />
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {article.category && (
                          <span className="inline-flex items-center gap-1">
                            {article.category.name}
                          </span>
                        )}
                        {article.author && (
                          <span>
                            by {article.author.fullName || 'Unknown'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {article.readTime} min read
                        </span>
                      </div>

                      {article.highlight?.excerpt?.[0] ? (
                        <p
                          className="text-gray-700 dark:text-gray-300 line-clamp-2"
                          dangerouslySetInnerHTML={highlightText(article.highlight.excerpt[0])}
                        />
                      ) : article.highlight?.content?.[0] ? (
                        <p
                          className="text-gray-700 dark:text-gray-300 line-clamp-2"
                          dangerouslySetInnerHTML={highlightText(article.highlight.content[0])}
                        />
                      ) : (
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {/* No Results */}
              {!loading && query && results.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try different keywords or remove filters
                  </p>
                </div>
              )}

              {/* Pagination */}
              {!loading && total > 20 && (
                <div className="mt-8 flex justify-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Page {page} of {Math.ceil(total / 20)}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(total / 20)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
