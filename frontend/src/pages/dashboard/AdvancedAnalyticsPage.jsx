import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Eye, Clock, MousePointer, Search,
  Activity, Globe, Smartphone, Calendar
} from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdvancedAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // Last 30 days
  const [overview, setOverview] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [contentPerformance, setContentPerformance] = useState([]);
  const [realtime, setRealtime] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    
    // Refresh real-time stats every 10 seconds
    const interval = setInterval(fetchRealtime, 10000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const [overviewRes, timeSeriesRes, contentRes, realtimeRes] = await Promise.all([
        api.get(`/analytics/overview?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        api.get(`/analytics/timeseries?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&interval=day`),
        api.get(`/analytics/content-performance?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=10`),
        api.get('/analytics/realtime'),
      ]);

      setOverview(overviewRes.data.overview);
      setTimeSeries(timeSeriesRes.data.timeSeries);
      setContentPerformance(contentRes.data.articles);
      setRealtime(realtimeRes.data.stats);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealtime = async () => {
    try {
      const res = await api.get('/analytics/realtime');
      setRealtime(res.data.stats);
    } catch (error) {
      console.error('Failed to fetch realtime stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Advanced Analytics - Bassac CMS</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Advanced Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Comprehensive insights & performance metrics
              </p>
            </div>

            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          {/* Real-Time Stats Banner */}
          {realtime && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 animate-pulse" />
                <h2 className="text-lg font-semibold">Real-Time Activity</h2>
                <span className="text-sm opacity-75">(Last 24 hours)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard title="Active Now" value={realtime.activeUsers} icon={Users} />
                <StatCard title="Total Events" value={realtime.totalEvents.toLocaleString()} icon={Activity} />
                <StatCard title="Page Views" value={realtime.pageViews.toLocaleString()} icon={Eye} />
                <StatCard title="Sessions" value={realtime.uniqueSessions} icon={MousePointer} />
                <StatCard title="Users" value={realtime.uniqueUsers} icon={Users} />
              </div>
            </div>
          )}

          {/* Overview Stats */}
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Views"
                value={overview.totalViews.toLocaleString()}
                icon={Eye}
                color="blue"
                change="+12.5%"
              />
              <MetricCard
                title="Unique Users"
                value={overview.uniqueUsers.toLocaleString()}
                icon={Users}
                color="green"
                change="+8.2%"
              />
              <MetricCard
                title="Avg Session"
                value={`${Math.floor(overview.avgSessionDuration / 60)}m ${overview.avgSessionDuration % 60}s`}
                icon={Clock}
                color="purple"
                change="+5.3%"
              />
              <MetricCard
                title="Bounce Rate"
                value={`${overview.bounceRate}%`}
                icon={TrendingUp}
                color="orange"
                change="-2.1%"
                isNegativeGood
              />
            </div>
          )}

          {/* Time Series Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Traffic Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Total Events" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            {overview?.trafficSources && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Traffic Sources
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={overview.trafficSources}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {overview.trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Device Breakdown */}
            {overview?.deviceBreakdown && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Device Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={overview.deviceBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top News */}
          {contentPerformance.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing News
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">News</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Views</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Reads</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Read Rate</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Shares</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentPerformance.map((article, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {article.article?.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {article.article?.category}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-900 dark:text-white">
                          {article.views.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-900 dark:text-white">
                          {article.reads.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            article.readRate >= 50
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : article.readRate >= 25
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {article.readRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-900 dark:text-white">
                          {article.shares}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-900 dark:text-white">
                          {Math.round(article.engagementScore).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Sub-components

function MetricCard({ title, value, icon: Icon, color, change, isNegativeGood }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };

  const isPositive = isNegativeGood
    ? change && change.startsWith('-')
    : change && change.startsWith('+');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm opacity-75">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
