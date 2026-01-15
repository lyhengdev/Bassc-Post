import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button, ContentLoader } from '../../components/common/index.jsx';
import { useArticleInsights } from '../../hooks/useApi';

export function ArticleInsightsPage() {
  const { id } = useParams();
  const { data: insightsResponse, isLoading } = useArticleInsights(id);
  const article = insightsResponse?.data?.article;
  const stats = insightsResponse?.data?.stats || { views: 0, uniqueVisitors: 0, trackedViews: 0 };
  const daily = insightsResponse?.data?.daily || [];
  const chartData = daily.slice(-14);
  const maxViews = Math.max(...chartData.map((day) => day.views || 0), 1);
  const views = stats.views || 0;
  const todayLabel = new Date().toDateString();
  const todayEntry = daily.find((day) => new Date(day.date).toDateString() === todayLabel);
  const viewsToday = todayEntry?.views || 0;

  return (
    <>
      <Helmet>
        <title>Article Insights - Bassac Media Center</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/articles">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Article Insights</h1>
            <p className="text-sm text-dark-500">{article?.title || 'Article performance'}</p>
          </div>
        </div>
        <BarChart3 className="w-6 h-6 text-dark-400" />
      </div>

      {isLoading && <ContentLoader />}

      {!isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-dark-500">Total Views</p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-white">
                {views.toLocaleString()}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-dark-500">Views Today</p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-white capitalize">
                {viewsToday.toLocaleString()}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-dark-500">Unique Visitors</p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-white">
                {stats.uniqueVisitors?.toLocaleString() || 0}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-dark-500">Tracked Views</p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-white capitalize">
                {stats.trackedViews?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Daily Views</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-dark-500">No daily data yet.</p>
            ) : (
              <div className="flex items-end gap-3 h-40">
                {chartData.map((day) => {
                  const height = Math.round(((day.views || 0) / maxViews) * 100);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-2 w-10">
                      <div className="flex items-end h-28 w-full">
                        <div
                          className="bg-primary-500 rounded-sm w-full"
                          style={{ height: `${height}%` }}
                          title={`Views: ${day.views || 0}`}
                        />
                      </div>
                      <span className="text-[10px] text-dark-400">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Daily Table</h2>
            {daily.length === 0 ? (
              <p className="text-sm text-dark-500">No daily data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-dark-500">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Views</th>
                      <th className="py-2 pr-4">Unique Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((day) => (
                      <tr key={day.date} className="border-t border-dark-100 dark:border-dark-800">
                        <td className="py-2 pr-4">{new Date(day.date).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{day.views || 0}</td>
                        <td className="py-2 pr-4">{day.uniqueVisitors || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Article Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-dark-500">
                  <tr>
                    <th className="py-2 pr-4">Metric</th>
                    <th className="py-2 pr-4">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Views</td>
                    <td className="py-2 pr-4">{views.toLocaleString()}</td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Unique Visitors</td>
                    <td className="py-2 pr-4">{stats.uniqueVisitors?.toLocaleString() || 0}</td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Tracked Views</td>
                    <td className="py-2 pr-4">{stats.trackedViews?.toLocaleString() || 0}</td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Status</td>
                    <td className="py-2 pr-4 capitalize">{article?.status || '-'}</td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Created</td>
                    <td className="py-2 pr-4">
                      {article?.createdAt ? new Date(article.createdAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Updated</td>
                    <td className="py-2 pr-4">
                      {article?.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Author</td>
                    <td className="py-2 pr-4">
                      {article?.author ? `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim() : '-'}
                    </td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Slug</td>
                    <td className="py-2 pr-4">{article?.slug || '-'}</td>
                  </tr>
                  <tr className="border-t border-dark-100 dark:border-dark-800">
                    <td className="py-2 pr-4">Published</td>
                    <td className="py-2 pr-4">
                      {article?.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
