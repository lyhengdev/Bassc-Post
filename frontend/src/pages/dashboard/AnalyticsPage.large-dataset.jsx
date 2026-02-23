import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, TrendingUp, Eye, FileText, Users, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { formatNumber } from '../../utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [viewsData, setViewsData] = useState(null);
  const [articlesData, setArticlesData] = useState(null);
  const [days, setDays] = useState(30);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout
      
      try {
        // Fetch all analytics data in parallel
        const [dashboardRes, viewsRes, articlesRes] = await Promise.all([
          api.get('/analytics/dashboard', { 
            signal: controller.signal,
            timeout: 30000 
          }),
          api.get(`/analytics/views?days=${days}`, { 
            signal: controller.signal,
            timeout: 30000  
          }),
          api.get(`/analytics/articles?days=${days}`, { 
            signal: controller.signal,
            timeout: 30000 
          })
        ]);

        clearTimeout(timeoutId);

        setDashboard(dashboardRes.data.data);
        setViewsData(viewsRes.data.data);
        setArticlesData(articlesRes.data.data);
        setRetryCount(0);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      
      let errorMessage = 'Failed to load analytics data';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - Your database might be very large. Try refreshing.';
      } else if (error.response?.status === 504) {
        errorMessage = 'Gateway timeout - Database query is taking too long. Cached data will load on retry.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error - Please try again in a moment.';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection';
      }
      
      setError({
        message: errorMessage,
        details: error.message,
        canRetry: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchAnalytics();
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-dark-600 dark:text-dark-400 text-lg font-medium">
            Loading analytics...
          </p>
          <p className="text-dark-500 text-sm mt-2">
            {retryCount > 0 && 'Retrying... '}
            This may take a moment for large datasets
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <>
        <Helmet><title>Analytics - Bassac Post</title></Helmet>
        
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-xl shadow-lg p-8 border border-red-200 dark:border-red-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-dark-900 dark:text-white">
                  Unable to Load Analytics
                </h2>
                <p className="text-sm text-dark-500">
                  {error.message}
                </p>
              </div>
            </div>
            
            {error.details && (
              <div className="bg-dark-50 dark:bg-dark-900 rounded-lg p-3 mb-4">
                <p className="text-xs text-dark-600 dark:text-dark-400 font-mono">
                  {error.details}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {error.canRetry && (
                <button
                  onClick={handleRetry}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again {retryCount > 0 && `(Attempt ${retryCount + 1})`}
                </button>
              )}
              
              <div className="text-sm text-dark-500 space-y-1">
                <p className="font-medium">💡 Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Refresh the page - cached data loads faster</li>
                  <li>Try a shorter date range (7 days)</li>
                  <li>Check if your backend is running</li>
                  <li>Large datasets (500K+ articles) may take time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const stats = dashboard?.stats || {};

  const statCards = [
    {
      label: 'Total Views',
      value: stats.totalViews || 0,
      icon: Eye,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600',
      change: viewsData?.averageDaily ? `${formatNumber(viewsData.averageDaily)}/day` : '0'
    },
    {
      label: 'Total News',
      value: stats.totalArticles || 0,
      icon: FileText,
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600',
      change: stats.publishedArticles ? `${formatNumber(stats.publishedArticles)} published` : '0'
    },
    {
      label: 'Total Users',
      value: stats.totalUsers || 0,
      icon: Users,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600',
      change: stats.totalCategories ? `${stats.totalCategories} categories` : '0'
    },
    {
      label: 'Pending Review',
      value: stats.pendingArticles || 0,
      icon: TrendingUp,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600',
      change: stats.pendingArticles > 0 ? 'Needs attention' : 'All clear'
    }
  ];

  return (
    <>
      <Helmet><title>Analytics - Bassac Post</title></Helmet>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-dark-500">
            Platform performance and insights
            {stats.totalArticles > 100000 && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-1 rounded">
                Large Dataset: {formatNumber(stats.totalArticles)} articles
              </span>
            )}
          </p>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetry}
            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5 text-dark-600 dark:text-dark-400" />
          </button>
          
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 border border-dark-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-dark-900 dark:text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-dark-900 dark:text-white mb-1">
              {formatNumber(stat.value)}
            </p>
            <p className="text-sm text-dark-500 mb-1">{stat.label}</p>
            <p className="text-xs text-emerald-600 font-medium">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Views Over Time Chart */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-dark-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Views Over Time
          </h2>
          <div className="text-sm text-dark-500">
            {viewsData?.period || `Last ${days} days`}
          </div>
        </div>
        
        {viewsData?.dailyData && viewsData.dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={viewsData.dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-dark-200 dark:stroke-dark-700" />
              <XAxis 
                dataKey="date" 
                className="text-dark-600 dark:text-dark-400"
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis className="text-dark-600 dark:text-dark-400" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgb(var(--color-dark-800))',
                  border: '1px solid rgb(var(--color-dark-700))',
                  borderRadius: '8px',
                  color: 'rgb(var(--color-dark-100))'
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                name="Page Views"
              />
              <Line 
                type="monotone" 
                dataKey="uniqueVisitors" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                name="Unique Visitors"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center bg-dark-50 dark:bg-dark-800 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-dark-400 mx-auto mb-2" />
              <p className="text-dark-500">No view data available for selected period</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top News */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top News by Views
          </h2>
          {articlesData?.topArticles && articlesData.topArticles.length > 0 ? (
            <div className="space-y-3">
              {articlesData.topArticles.slice(0, 5).map((article, index) => (
                <div
                  key={article._id}
                  className="flex items-center gap-3 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-dark-900 dark:text-white truncate">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-dark-500">
                      <span>{formatNumber(article.viewCount || 0)} views</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Category Distribution */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">
            News by Category
          </h2>
          {articlesData?.categoryBreakdown && articlesData.categoryBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={articlesData.categoryBreakdown.slice(0, 6)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {articlesData.categoryBreakdown.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-2 mt-4">
                {articlesData.categoryBreakdown.slice(0, 6).map((category, index) => (
                  <div key={category._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-dark-700 dark:text-dark-300">
                        {category.name}
                      </span>
                    </div>
                    <span className="font-medium text-dark-900 dark:text-white">
                      {formatNumber(category.count)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-dark-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Publishing Activity */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Publishing Activity
          </h2>
          {articlesData?.publishedOverTime && articlesData.publishedOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={articlesData.publishedOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id" 
                  tickFormatter={(date) => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="News" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-dark-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Top Authors */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">
            Top Writers
          </h2>
          {articlesData?.topAuthors && articlesData.topAuthors.length > 0 ? (
            <div className="space-y-3">
              {articlesData.topAuthors.slice(0, 5).map((author, index) => (
                <div
                  key={author._id}
                  className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-medium text-primary-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">
                        {author.name}
                      </p>
                      <p className="text-sm text-dark-500">
                        {formatNumber(author.count)} articles
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">
                    {formatNumber(author.views || 0)} views
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>
    </>
  );
}
