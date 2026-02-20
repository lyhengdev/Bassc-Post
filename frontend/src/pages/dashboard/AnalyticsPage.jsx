import { Helmet } from 'react-helmet-async';
import { BarChart3, TrendingUp, Eye, FileText, Users, Calendar } from 'lucide-react';
import { useAnalytics } from '../../hooks/useApi';
import { ContentLoader } from '../../components/common/index.jsx';
import { formatNumber, formatRelativeTime } from '../../utils';

export function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  if (isLoading) return <ContentLoader />;

  const analytics = data?.data || {};
  const stats = [
    {
      label: 'Total Views',
      value: analytics.totalViews || 0,
      icon: Eye,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600',
      change: '+12.5%'
    },
    {
      label: 'Total News',
      value: analytics.totalArticles || 0,
      icon: FileText,
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600',
      change: '+8.2%'
    },
    {
      label: 'Total Users',
      value: analytics.totalUsers || 0,
      icon: Users,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600',
      change: '+15.3%'
    },
    {
      label: 'Avg. Views/News',
      value: analytics.avgViewsPerArticle || 0,
      icon: TrendingUp,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600',
      change: '+5.7%'
    }
  ];

  return (
    <>
      <Helmet><title>Analytics - Bassac Media Center</title></Helmet>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Analytics</h1>
        <p className="text-dark-500">Platform performance and insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <span className="text-sm font-medium text-emerald-600">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-dark-900 dark:text-white mb-1">
              {formatNumber(stat.value)}
            </p>
            <p className="text-sm text-dark-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Top News */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Top News by Views
          </h2>
          {analytics.topArticles?.length > 0 ? (
            <div className="space-y-3">
              {analytics.topArticles.map((article, index) => (
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
                    <p className="text-sm text-dark-500">
                      {formatNumber(article.viewCount || 0)} views
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activity
          </h2>
          {analytics.recentActivity?.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border-b border-dark-100 dark:border-dark-800 last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary-600 mt-2" />
                  <div className="flex-1">
                    <p className="text-dark-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p className="text-sm text-dark-500">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-8">No recent activity</p>
          )}
        </div>

        {/* Views Over Time Chart Placeholder */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Views Over Time
          </h2>
          <div className="h-64 flex items-center justify-center bg-dark-50 dark:bg-dark-800 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-dark-400 mx-auto mb-2" />
              <p className="text-dark-500">Chart visualization coming soon</p>
              <p className="text-sm text-dark-400">
                Integrate with a charting library like Recharts or Chart.js
              </p>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">
            News by Category
          </h2>
          {analytics.categoryDistribution?.length > 0 ? (
            <div className="space-y-3">
              {analytics.categoryDistribution.map((category) => (
                <div key={category._id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-700 dark:text-dark-300">
                      {category.name}
                    </span>
                    <span className="font-medium text-dark-900 dark:text-white">
                      {category.count}
                    </span>
                  </div>
                  <div className="w-full bg-dark-100 dark:bg-dark-800 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          (category.count / analytics.totalArticles) * 100
                        }%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* User Activity */}
        <div className="card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">
            Active Writers
          </h2>
          {analytics.topWriters?.length > 0 ? (
            <div className="space-y-3">
              {analytics.topWriters.map((writer) => (
                <div
                  key={writer._id}
                  className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-medium text-primary-600">
                      {writer.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-dark-900 dark:text-white">
                        {writer.name}
                      </p>
                      <p className="text-sm text-dark-500">
                        {writer.articleCount} articles
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">
                    {formatNumber(writer.totalViews || 0)} views
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
