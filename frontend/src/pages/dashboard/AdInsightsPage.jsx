import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button, ContentLoader } from '../../components/common/index.jsx';
import { useAdStats, useAdminAd } from '../../hooks/useAds';

export function AdInsightsPage() {
  const { id } = useParams();
  const { data: ad, isLoading: isLoadingAd } = useAdminAd(id);
  const { data: statsResponse, isLoading: isLoadingStats } = useAdStats(id, { breakdown: true });

  const stats = statsResponse?.data?.stats || { impressions: 0, clicks: 0, ctr: 0 };
  const daily = statsResponse?.data?.daily || [];
  const chartData = daily.slice(-14);
  const maxValue = Math.max(
    ...chartData.map((day) => Math.max(day.impressions || 0, day.clicks || 0)),
    1
  );

  return (
    <>
      <Helmet>
        <title>Ad Insights - Bassac Media Center</title>
      </Helmet>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/ads">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Ad Insights</h1>
            <p className="text-sm text-dark-500">
              {ad?.name || 'Ad performance'} {ad?.placement ? `• ${ad.placement}` : ''}
            </p>
          </div>
        </div>
        <BarChart3 className="w-6 h-6 text-dark-400" />
      </div>

      {(isLoadingAd || isLoadingStats) && <ContentLoader />}

      {!isLoadingAd && !isLoadingStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-sm text-dark-500">Impressions</p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-white">
                {stats.impressions?.toLocaleString() || 0}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-dark-500">Clicks</p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-white">
                {stats.clicks?.toLocaleString() || 0}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-dark-500">CTR</p>
              <p className="text-2xl font-semibold text-dark-900 dark:text-white">
                {stats.ctr ? `${stats.ctr}%` : '0%'}
              </p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Daily Trend</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-dark-500">No daily data yet.</p>
            ) : (
              <div className="flex items-end gap-3 h-40">
                {chartData.map((day) => {
                  const impressionHeight = Math.round(((day.impressions || 0) / maxValue) * 100);
                  const clickHeight = Math.round(((day.clicks || 0) / maxValue) * 100);
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-2 w-10">
                      <div className="flex items-end gap-1 h-28 w-full">
                        <div
                          className="bg-primary-500 rounded-sm w-1/2"
                          style={{ height: `${impressionHeight}%` }}
                          title={`Impressions: ${day.impressions || 0}`}
                        />
                        <div
                          className="bg-emerald-500 rounded-sm w-1/2"
                          style={{ height: `${clickHeight}%` }}
                          title={`Clicks: ${day.clicks || 0}`}
                        />
                      </div>
                      <span className="text-xs text-dark-400">
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
                      <th className="py-2 pr-4">Impressions</th>
                      <th className="py-2 pr-4">Clicks</th>
                      <th className="py-2 pr-4">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((day) => (
                      <tr key={day.date} className="border-t border-dark-100 dark:border-dark-800">
                        <td className="py-2 pr-4">{new Date(day.date).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{day.impressions || 0}</td>
                        <td className="py-2 pr-4">{day.clicks || 0}</td>
                        <td className="py-2 pr-4">{day.ctr ? `${day.ctr}%` : '0%'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
