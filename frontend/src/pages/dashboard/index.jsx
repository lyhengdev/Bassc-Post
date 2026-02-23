import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BarChart3, FileText, Eye, Clock, CheckCircle, PenTool, TrendingUp, Plus, Edit, Trash2, Camera, AlertCircle, ExternalLink, Users, Layers, Activity, RotateCcw } from 'lucide-react';
import { useDashboardSummary, useAnalyticsViews, useAnalyticsArticles, useAnalyticsAds, useMyArticles, useAdminArticles, usePendingArticles, useDeleteArticle, useApproveArticle, useRejectArticle, useUpdateProfile } from '../../hooks/useApi';
import { usersAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Button, ContentLoader, StatusBadge, Avatar, Modal, Input, Textarea, EmptyState, ConfirmModal, AlertModal, Skeleton } from '../../components/common/index.jsx';
import { formatNumber, formatRelativeTime, buildMediaUrl } from '../../utils';
import toast from 'react-hot-toast';

// Dashboard Loading Skeleton
function DashboardSkeleton({ role }) {
  const cardCount = role === 'admin' ? 6 : role === 'editor' ? 2 : 4;
  
  return (
    <>
      <Helmet><title>Dashboard - Bassac Post</title></Helmet>
      
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-gradient-to-br from-dark-100 to-dark-200 dark:from-dark-800 dark:to-dark-900 p-6 md:p-8 animate-pulse">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-4 w-24 bg-dark-200 dark:bg-dark-700" />
              <Skeleton className="h-8 w-64 bg-dark-200 dark:bg-dark-700" />
              <Skeleton className="h-4 w-48 bg-dark-200 dark:bg-dark-700" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-32 rounded-xl bg-dark-200 dark:bg-dark-700" />
              <Skeleton className="h-16 w-32 rounded-xl bg-dark-200 dark:bg-dark-700" />
            </div>
          </div>
          <Skeleton className="mt-6 h-24 w-full rounded-xl bg-dark-200 dark:bg-dark-700" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${cardCount} gap-6 mb-8`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="w-4 h-4" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Graphs Skeleton (admin only) */}
      {role === 'admin' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div className="card p-6 xl:col-span-2 animate-pulse">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-6" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          
          <div className="card p-6 animate-pulse">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-6" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
          
          <div className="card p-6 animate-pulse">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-6" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Recent Items Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="card p-6 animate-pulse">
            <Skeleton className="h-6 w-40 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 border-b border-dark-100 dark:border-dark-800">
                  <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="card p-6 animate-pulse">
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LineChart({ data, stroke, fill, valueLabel }) {
  // Guard against empty data
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-dark-400">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const width = 320;
  const height = 160;
  const padding = 24;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (point.value / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  });
  const areaPoints = `${points.join(' ')} ${width - padding},${height - padding} ${padding},${height - padding}`;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const value = Math.round((maxValue / (tickCount - 1)) * (tickCount - 1 - i));
    const y = padding + (i / (tickCount - 1)) * (height - padding * 2);
    return { value, y };
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {ticks.map((tick, index) => (
          <g key={index}>
            <line x1={padding} x2={width - padding} y1={tick.y} y2={tick.y} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={4} y={tick.y + 4} fontSize="10" fill="#94a3b8">
              {formatNumber(tick.value)}
            </text>
          </g>
        ))}
        <polyline points={areaPoints} fill={fill} stroke="none" />
        <polyline points={points.join(' ')} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex items-center justify-between text-xs text-dark-500">
        <span>{data[0]?.label || ''}</span>
        <span>{valueLabel}</span>
        <span>{data[data.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
}

function DualLineChart({ primary, secondary, primaryColor, secondaryColor }) {
  // Guard against empty data
  if (!primary || !secondary || primary.length === 0 || secondary.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-dark-400">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const width = 320;
  const height = 160;
  const padding = 24;
  const maxValue = Math.max(
    ...primary.map((d) => d.value),
    ...secondary.map((d) => d.value),
    1
  );
  const buildPoints = (series) =>
    series.map((point, index) => {
      const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - (point.value / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    });
  const primaryPoints = buildPoints(primary).join(' ');
  const secondaryPoints = buildPoints(secondary).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#e2e8f0" />
      <polyline points={primaryPoints} fill="none" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={secondaryPoints} fill="none" stroke={secondaryColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, color }) {
  // Guard against empty data
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-dark-400">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  const width = 320;
  const height = 160;
  const padding = 24;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (width - padding * 2) / data.length - 4;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        {data.map((point, index) => {
          const x = padding + index * (barWidth + 4);
          const barHeight = (point.value / maxValue) * (height - padding * 2);
          return (
            <rect
              key={point.key}
              x={x}
              y={height - padding - barHeight}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx="4"
            />
          );
        })}
      </svg>
      <div className="flex items-center justify-between text-xs text-dark-500">
        <span>{data[0]?.label || ''}</span>
        <span>{data[data.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
}

function DonutChart({ segments, total }) {
  // Guard against empty data or invalid total
  if (!segments || segments.length === 0 || !total || total === 0) {
    return (
      <svg width="96" height="96" viewBox="0 0 96 96" className="text-dark-400">
        <circle cx="48" cy="48" r="32" fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <text x="48" y="52" textAnchor="middle" fontSize="10" fill="currentColor">
          No data
        </text>
      </svg>
    );
  }

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="text-dark-900 dark:text-white">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      {segments.map((segment) => {
        const value = segment.value || 0;
        const dash = (value / total) * circumference;
        const strokeDasharray = `${dash} ${circumference - dash}`;
        const strokeDashoffset = -offset;
        offset += dash;
        return (
          <circle
            key={segment.label}
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="12"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 48 48)"
          />
        );
      })}
      <text x="48" y="52" textAnchor="middle" fontSize="14" fill="currentColor" fontWeight="700">
        {formatNumber(total)}
      </text>
    </svg>
  );
}

export function DashboardHome() {
  const { user } = useAuthStore();
  const isUserReady = !!user;
  const { data, isLoading } = useDashboardSummary({ enabled: isUserReady });

  // Always call hooks - React rule: hooks must be called in the same order
  const isAdmin = user?.role === 'admin';
  const { data: viewsAnalytics, isLoading: viewsLoading } = useAnalyticsViews(30, { enabled: isUserReady && isAdmin });
  const { data: articlesAnalytics, isLoading: articlesLoading } = useAnalyticsArticles(30, { enabled: isUserReady && isAdmin });
  const { data: adsAnalytics, isLoading: adsLoading } = useAnalyticsAds(30, { enabled: isUserReady && isAdmin });

  const stats = data?.stats || {};
  const role = user?.role;
  const recentItems = data?.recentArticles || data?.recentPending || [];
  const topArticles = data?.topArticles || [];
  const viewsDaily = viewsAnalytics?.dailyData || [];
  const publishedOverTime = articlesAnalytics?.publishedOverTime || [];
  const statusBreakdown = articlesAnalytics?.statusBreakdown || {};
  const categoryBreakdown = articlesAnalytics?.categoryBreakdown || [];
  const adsDaily = adsAnalytics?.dailyData || [];

  let statCards = [];
  if (role === 'admin') {
    statCards = [
      { label: 'Total News', value: stats.totalArticles || 0, icon: FileText, bgColor: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600' },
      { label: 'Published', value: stats.publishedArticles || 0, icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
      { label: 'Pending', value: stats.pendingArticles || 0, icon: Clock, bgColor: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
      { label: 'Total Views', value: stats.totalViews || 0, icon: Eye, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
      { label: 'Users', value: stats.totalUsers || 0, icon: Users, bgColor: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600' },
      { label: 'Categories', value: stats.totalCategories || 0, icon: Layers, bgColor: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600' },
    ];
  } else if (role === 'editor') {
    statCards = [
      { label: 'Pending Review', value: stats.pendingArticles || 0, icon: Clock, bgColor: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
      { label: 'Reviewed Today', value: stats.reviewedToday || 0, icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
    ];
  } else {
    statCards = [
      { label: 'My News', value: stats.totalArticles || 0, icon: FileText, bgColor: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600' },
      { label: 'Published', value: stats.publishedArticles || 0, icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
      { label: 'Drafts', value: stats.draftArticles || 0, icon: PenTool, bgColor: 'bg-dark-100 dark:bg-dark-800', iconColor: 'text-dark-600' },
      { label: 'Total Views', value: stats.totalViews || 0, icon: Eye, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
    ];
  }

  const buildDateSeries = (days, rawData, valueKey, dateKey = 'date') => {
    const today = new Date();
    const map = new Map();
    rawData.forEach((item) => {
      const raw = item?.[dateKey] || item?._id;
      if (!raw) return;
      const key = new Date(raw).toISOString().slice(0, 10);
      map.set(key, Number(item[valueKey] || 0));
    });
    const buckets = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: map.get(key) || 0,
      });
    }
    return buckets;
  };

  const activitySeries = useMemo(() => {
    const days = 7;
    const today = new Date();
    const buckets = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      buckets.push({ key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), value: 0 });
    }
    recentItems.forEach((item) => {
      if (!item?.createdAt) return;
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.value += 1;
    });
    return buckets;
  }, [recentItems]);

  const maxActivity = Math.max(...activitySeries.map((d) => d.value), 1);
  const sparkPoints = activitySeries
    .map((point, idx) => {
      const x = (idx / (activitySeries.length - 1)) * 180 + 10;
      const y = 50 - (point.value / maxActivity) * 32 + 10;
      return `${x},${y}`;
    })
    .join(' ');

  const viewsSeries = useMemo(() => buildDateSeries(30, viewsDaily, 'views', 'date'), [viewsDaily]);
  const publishedSeries = useMemo(() => buildDateSeries(30, publishedOverTime, 'count', '_id'), [publishedOverTime]);
  const adsImpressionsSeries = useMemo(() => buildDateSeries(30, adsDaily, 'impressions', 'date'), [adsDaily]);
  const adsClicksSeries = useMemo(() => buildDateSeries(30, adsDaily, 'clicks', 'date'), [adsDaily]);

  if (!isUserReady) {
    return <DashboardSkeleton />;
  }

  // Wait for all data to load
  if (isLoading || (isAdmin && (viewsLoading || articlesLoading || adsLoading))) {
    return <DashboardSkeleton role={user?.role} />;
  }

  const statusSegments = [
    { label: 'Published', value: statusBreakdown.published || 0, color: '#10b981' },
    { label: 'Pending', value: statusBreakdown.pending || 0, color: '#f59e0b' },
    { label: 'Draft', value: statusBreakdown.draft || 0, color: '#64748b' },
  ];
  const statusTotal = statusSegments.reduce((sum, item) => sum + item.value, 0) || 1;
  const categoryTop = [...categoryBreakdown]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 6);

  return (
    <>
      <Helmet><title>Dashboard - Bassac Post</title></Helmet>
      <div className="mb-8">
        <div className="rounded-2xl border border-dark-100 dark:border-dark-800 bg-gradient-to-br from-primary-600 via-blue-600 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm text-white/70">Dashboard</p>
              <h1 className="text-2xl md:text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
              <p className="text-white/80 mt-2">Track newsroom momentum and stay ahead.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-xs text-white/70">Last 7 days</p>
                <p className="text-lg font-semibold">{activitySeries.reduce((sum, d) => sum + d.value, 0)} items</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-xs text-white/70">Total views</p>
                <p className="text-lg font-semibold">{formatNumber(stats.totalViews || 0)}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-white/70 mb-2">
              <span className="uppercase tracking-wide">Activity</span>
              <span>{activitySeries.map((d) => d.label).join(' • ')}</span>
            </div>
            <svg width="100%" height="70" viewBox="0 0 200 70" className="overflow-visible">
              <polyline
                points={sparkPoints}
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
              <polyline
                points={`10,60 ${sparkPoints} 190,60`}
                fill="rgba(255,255,255,0.15)"
                stroke="none"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{formatNumber(stat.value)}</p>
            <p className="text-sm text-dark-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div className="card p-6 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-dark-900 dark:text-white">Views Over Time</h2>
                <p className="text-sm text-dark-500">Last 30 days of traffic</p>
              </div>
              <Eye className="w-5 h-5 text-primary-600" />
            </div>
            <LineChart
              data={viewsSeries}
              stroke="#2563eb"
              fill="rgba(37,99,235,0.18)"
              valueLabel="views"
            />
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-dark-900 dark:text-white">Published Per Day</h2>
                <p className="text-sm text-dark-500">Editorial output pace</p>
              </div>
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <BarChart data={publishedSeries} color="#10b981" />
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-dark-900 dark:text-white">Status Mix</h2>
                <p className="text-sm text-dark-500">Published vs pending vs draft</p>
              </div>
              <BarChart3 className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex items-center gap-6">
              <DonutChart segments={statusSegments} total={statusTotal} />
              <div className="space-y-2 text-sm">
                {statusSegments.map((segment) => (
                  <div key={segment.label} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                    <span className="text-dark-500">{segment.label}</span>
                    <span className="font-semibold text-dark-900 dark:text-white">{segment.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-6 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-dark-900 dark:text-white">Category Performance</h2>
                <p className="text-sm text-dark-500">Views by category</p>
              </div>
              <Layers className="w-5 h-5 text-indigo-500" />
            </div>
            {categoryTop.length > 0 ? (
              <div className="space-y-4">
                {categoryTop.map((cat) => {
                  const maxViews = Math.max(...categoryTop.map((item) => item.views || 0), 1);
                  const width = ((cat.views || 0) / maxViews) * 100;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-medium text-dark-900 dark:text-white">{cat.name}</p>
                        <span className="text-dark-500">{formatNumber(cat.views || 0)} views</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-dark-100 dark:bg-dark-800 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-dark-500 text-center py-4">No category data yet</p>
            )}
          </div>

          <div className="card p-6 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-dark-900 dark:text-white">Ad Reach & CTR</h2>
                <p className="text-sm text-dark-500">Impressions vs clicks (last 30 days)</p>
              </div>
              <Activity className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <DualLineChart
                  primary={adsImpressionsSeries}
                  secondary={adsClicksSeries}
                  primaryColor="#ef4444"
                  secondaryColor="#f97316"
                />
              </div>
              <div className="w-full lg:w-60 rounded-xl border border-dark-100 dark:border-dark-800 p-4">
                <p className="text-xs text-dark-500">Total CTR</p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">
                  {adsAnalytics?.totals?.ctr ? `${adsAnalytics.totals.ctr}%` : '0%'}
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500">Impressions</span>
                    <span className="font-semibold text-dark-900 dark:text-white">{formatNumber(adsAnalytics?.totals?.impressions || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500">Clicks</span>
                    <span className="font-semibold text-dark-900 dark:text-white">{formatNumber(adsAnalytics?.totals?.clicks || 0)}</span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-dark-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Impressions
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    Clicks
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-dark-900 dark:text-white">Content Momentum</h2>
              <Activity className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activitySeries.map((point) => (
                <div key={point.key} className="rounded-xl border border-dark-100 dark:border-dark-800 p-4">
                  <p className="text-xs text-dark-500">{point.label}</p>
                  <p className="text-lg font-semibold text-dark-900 dark:text-white">{point.value}</p>
                  <div className="mt-3 h-2 rounded-full bg-dark-100 dark:bg-dark-800 overflow-hidden">
                    <div
                      className="h-full bg-primary-600"
                      style={{ width: `${(point.value / maxActivity) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-dark-900 dark:text-white">Top Stories</h2>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            {topArticles.length > 0 ? (
              <div className="space-y-4">
                {topArticles.map((article) => {
                  const maxViews = Math.max(...topArticles.map((item) => item.viewCount || 0), 1);
                  const width = ((article.viewCount || 0) / maxViews) * 100;
                  return (
                    <div key={article._id}>
                      <div className="flex items-center justify-between text-sm">
                        <p className="font-medium text-dark-900 dark:text-white truncate">{article.title}</p>
                        <span className="text-dark-500">{formatNumber(article.viewCount || 0)} views</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-dark-100 dark:bg-dark-800 overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-dark-500 text-center py-4">No top news yet</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Recent News</h2>
            {recentItems.length > 0 ? (
              <div className="space-y-3">
                {recentItems.map((article) => (
                  <div key={article._id} className="flex items-center justify-between py-2 border-b border-dark-100 dark:border-dark-800 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-dark-900 dark:text-white truncate">{article.title}</p>
                      <p className="text-sm text-dark-500">{formatRelativeTime(article.createdAt)}</p>
                    </div>
                    {article.status ? <StatusBadge status={article.status} /> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500 text-center py-4">No recent news</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/dashboard/articles/new" className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors">
                <Plus className="w-5 h-5" />
                <span className="font-medium">Write New News</span>
              </Link>
              <Link to="/dashboard/articles" className="flex items-center gap-3 p-3 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors">
                <FileText className="w-5 h-5" />
                <span className="font-medium">View My News</span>
              </Link>
              {(role === 'editor' || role === 'admin') && (
                <Link to="/dashboard/pending" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Review Pending News</span>
                </Link>
              )}
              {role === 'admin' && (
                <Link to="/dashboard/ads" className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Ad Insights</span>
                </Link>
              )}
              {role === 'admin' && (
                <Link to="/dashboard/articles" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">News Insights</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function MyArticlesPage() {
  const { user } = useAuthStore();
  const isUserReady = !!user;
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({
    page,
    limit: 10,
    status: statusFilter || undefined,
    q: search || undefined,
  }), [page, statusFilter, search]);
  const isAdmin = user?.role === 'admin';
  // Always call both hooks - React rule: hooks must be called in the same order
  const adminQuery = useAdminArticles(params, { enabled: isUserReady && isAdmin });
  const myQuery = useMyArticles(params, { enabled: isUserReady && !isAdmin });
  const data = isAdmin ? adminQuery.data : myQuery.data;
  const isLoading = isAdmin ? adminQuery.isLoading : myQuery.isLoading;
  const { mutate: deleteArticle, isPending: isDeleting } = useDeleteArticle();
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState(null);

  const handleDelete = () => {
    if (deleteModal) {
      deleteArticle(deleteModal, {
        onSuccess: () => setDeleteModal(null)
      });
    }
  };

  if (!isUserReady || isLoading) return <ContentLoader />;
  const articles = data?.data || [];
  const pagination = data?.pagination;

  return (
    <>
      <Helmet><title>{isAdmin ? 'All News' : 'My News'} - Bassac Post</title></Helmet>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">{isAdmin ? 'All News' : 'My News'}</h1>
          <p className="text-dark-500 text-sm">
            {isAdmin ? 'Review and manage every news item across the newsroom.' : 'Drafts, submissions, and published stories in one place.'}
          </p>
        </div>
        <Link to="/dashboard/articles/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New News</Button>
        </Link>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title..."
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {articles.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-50 dark:bg-dark-800">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Title</th>
                    {isAdmin && <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Author</th>}
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Views</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-dark-500">Date</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                  {articles.map((article) => (
                    <tr key={article._id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}
                            className="block w-12 h-12 flex-shrink-0"
                          >
                            <img
                              src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/120/120`}
                              alt={article.title}
                              className="w-12 h-12 rounded-lg object-cover"
                              loading="lazy"
                            />
                          </Link>
                          <Link
                            to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}
                            className="font-medium text-dark-900 dark:text-white truncate max-w-xs block headline-hover"
                          >
                            {article.title}
                          </Link>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-sm text-dark-500">
                          {article.author?.fullName || `${article.author?.firstName || ''} ${article.author?.lastName || ''}`.trim() || 'Unknown'}
                        </td>
                      )}
                      <td className="px-6 py-4"><StatusBadge status={article.status} /></td>
                      <td className="px-6 py-4 text-dark-500">{article.viewCount || 0}</td>
                      <td className="px-6 py-4 text-dark-500">{formatRelativeTime(article.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}
                            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                            title="View news"
                          >
                            <ExternalLink className="w-4 h-4 text-dark-500" />
                          </Link>
                          <Link
                            to={`/dashboard/articles/${article._id}/insights`}
                            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                            title="Insights"
                          >
                            <BarChart3 className="w-4 h-4 text-dark-500" />
                          </Link>
                          <button onClick={() => navigate(`/dashboard/articles/${article._id}/edit`)} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"><Edit className="w-4 h-4 text-dark-500" /></button>
                          <button onClick={() => setDeleteModal(article._id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {articles.map((article) => (
              <div key={article._id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Link
                    to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}
                    className="flex items-start gap-3 flex-1"
                  >
                    <img
                      src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/120/120`}
                      alt={article.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                    <span className="font-medium text-dark-900 dark:text-white line-clamp-2 headline-hover">
                      {article.title}
                    </span>
                  </Link>
                  <StatusBadge status={article.status} />
                </div>
                {isAdmin && (
                  <p className="text-xs text-dark-500 mb-2">
                    {article.author?.fullName || `${article.author?.firstName || ''} ${article.author?.lastName || ''}`.trim() || 'Unknown'}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-dark-500">
                  <div className="flex items-center gap-4">
                    <span>{article.viewCount || 0} views</span>
                    <span>{formatRelativeTime(article.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}
                      className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      title="View news"
                    >
                      <ExternalLink className="w-4 h-4 text-dark-500" />
                    </Link>
                    <Link
                      to={`/dashboard/articles/${article._id}/insights`}
                      className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      title="Insights"
                    >
                      <BarChart3 className="w-4 h-4 text-dark-500" />
                    </Link>
                    <button onClick={() => navigate(`/dashboard/articles/${article._id}/edit`)} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"><Edit className="w-4 h-4 text-dark-500" /></button>
                    <button onClick={() => setDeleteModal(article._id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-sm">
              <span className="text-dark-500">
                Page {pagination.page} of {pagination.totalPages} • {pagination.total} news
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={FileText}
          title={isAdmin ? 'No news found' : 'No news yet'}
          description={isAdmin ? 'Try adjusting your filters or create the first news item.' : 'Start writing your first news item.'}
          action={<Link to="/dashboard/articles/new"><Button leftIcon={<Plus className="w-4 h-4" />}>New News</Button></Link>}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete News"
        message="Are you sure you want to delete this news? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        icon={Trash2}
      />
    </>
  );
}

export function PendingArticlesPage() {
  const { data, isLoading } = usePendingArticles();
  const { mutate: approveArticle, isPending: isApproving } = useApproveArticle();
  const { mutate: rejectArticle, isPending: isRejecting } = useRejectArticle();
  const [rejectModal, setRejectModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  const handleApprove = () => {
    if (approveModal) {
      approveArticle({ id: approveModal, notes: '' }, {
        onSuccess: () => setApproveModal(null)
      });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setAlertModal({ isOpen: true, message: 'Please provide a reason for rejection' });
      return;
    }
    rejectArticle({ id: rejectModal, reason: rejectReason }, {
      onSuccess: () => {
        setRejectModal(null);
        setRejectReason('');
      }
    });
  };

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet><title>Pending News - Bassac Post</title></Helmet>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Pending Review</h1>
        <p className="text-dark-500">News awaiting your approval</p>
      </div>
      {data?.data?.length > 0 ? (
        <div className="space-y-4">
              {data.data.map((article) => (
                <div key={article._id} className="card p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0 flex gap-4">
                      <Link
                        to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}
                        className="block w-16 h-16 flex-shrink-0"
                      >
                        <img
                          src={buildMediaUrl(article.featuredImage) || `https://picsum.photos/seed/${article.slug}/160/160`}
                          alt={article.title}
                          className="w-16 h-16 rounded-lg object-cover"
                          loading="lazy"
                        />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}
                          className="font-semibold text-dark-900 dark:text-white mb-1 truncate block headline-hover"
                        >
                          {article.title}
                        </Link>
                        <p className="text-dark-500 text-sm mb-2">
                          By {article.author?.fullName || 'Unknown'} • {formatRelativeTime(article.createdAt)}
                        </p>
                        <p className="text-dark-600 dark:text-dark-400 line-clamp-2">{article.excerpt}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link to={article.status === 'published' ? `/article/${article.slug}` : `/preview/${article._id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                      </Link>
                      <Button variant="secondary" size="sm" onClick={() => setApproveModal(article._id)}>Approve</Button>
                      <Button variant="danger" size="sm" onClick={() => setRejectModal(article._id)}>Reject</Button>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      ) : (
        <EmptyState icon={CheckCircle} title="All caught up!" description="No news pending review" />
      )}

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={!!approveModal}
        onClose={() => setApproveModal(null)}
        onConfirm={handleApprove}
        title="Approve News"
        message="Are you sure you want to approve this news for publication?"
        confirmText="Approve"
        variant="primary"
        isLoading={isApproving}
        icon={CheckCircle}
      />

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject News">
        <Textarea label="Rejection Reason" placeholder="Enter reason for rejection..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="mb-4" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} isLoading={isRejecting}>Reject News</Button>
        </div>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        title="Validation Error"
        message={alertModal.message}
        variant="warning"
        icon={AlertCircle}
      />
    </>
  );
}

const PROFILE_AVATAR_CROP_BOX_SIZE = 288;
const PROFILE_AVATAR_EXPORT_SIZE = 640;

const createProfileAvatarEditorState = () => ({
  isOpen: false,
  src: '',
  fileName: 'avatar.jpg',
  naturalWidth: 0,
  naturalHeight: 0,
  position: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
});

const loadProfileImageFromUrl = (src) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image'));
    image.src = src;
  });
};

const renderProfileAvatarBlob = async ({ src, position, zoom, rotation }) => {
  const image = await loadProfileImageFromUrl(src);
  const canvas = document.createElement('canvas');
  canvas.width = PROFILE_AVATAR_EXPORT_SIZE;
  canvas.height = PROFILE_AVATAR_EXPORT_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to process image');
  }

  const baseCoverScale = Math.max(
    PROFILE_AVATAR_CROP_BOX_SIZE / image.naturalWidth,
    PROFILE_AVATAR_CROP_BOX_SIZE / image.naturalHeight
  );
  const outputRatio = PROFILE_AVATAR_EXPORT_SIZE / PROFILE_AVATAR_CROP_BOX_SIZE;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    canvas.width / 2 + position.x * outputRatio,
    canvas.height / 2 + position.y * outputRatio
  );
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(baseCoverScale * zoom * outputRatio, baseCoverScale * zoom * outputRatio);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to process image'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.92);
  });
};

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    bio: '',
  });
  const [avatarEditor, setAvatarEditor] = useState(createProfileAvatarEditorState);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const dragStateRef = useRef({ active: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const cropPreviewImageStyle = useMemo(() => {
    if (!avatarEditor.naturalWidth || !avatarEditor.naturalHeight) {
      return {};
    }
    const coverScale = Math.max(
      PROFILE_AVATAR_CROP_BOX_SIZE / avatarEditor.naturalWidth,
      PROFILE_AVATAR_CROP_BOX_SIZE / avatarEditor.naturalHeight
    );
    return {
      width: `${avatarEditor.naturalWidth * coverScale}px`,
      height: `${avatarEditor.naturalHeight * coverScale}px`,
    };
  }, [avatarEditor.naturalHeight, avatarEditor.naturalWidth]);

  const closeAvatarEditor = () => {
    dragStateRef.current.active = false;
    setIsCropDragging(false);
    setAvatarEditor((prev) => {
      if (prev.src?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.src);
      }
      return createProfileAvatarEditorState();
    });
  };

  useEffect(() => {
    if (!avatarEditor.isOpen) return undefined;

    const updateDrag = (clientX, clientY) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;

      const deltaX = clientX - drag.lastX;
      const deltaY = clientY - drag.lastY;
      drag.lastX = clientX;
      drag.lastY = clientY;

      setAvatarEditor((prev) => ({
        ...prev,
        position: {
          x: prev.position.x + deltaX,
          y: prev.position.y + deltaY,
        },
      }));
    };

    const endDrag = () => {
      if (!dragStateRef.current.active) return;
      dragStateRef.current.active = false;
      setIsCropDragging(false);
    };

    const handleMouseMove = (event) => {
      updateDrag(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      if (!dragStateRef.current.active) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      event.preventDefault();
      updateDrag(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', endDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', endDrag);
    };
  }, [avatarEditor.isOpen]);

  useEffect(() => {
    return () => {
      if (avatarEditor.src?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarEditor.src);
      }
    };
  }, [avatarEditor.src]);

  if (!user) {
    return <ContentLoader />;
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    try {
      const image = await loadProfileImageFromUrl(previewUrl);
      setAvatarEditor((prev) => {
        if (prev.src?.startsWith('blob:')) {
          URL.revokeObjectURL(prev.src);
        }
        return {
          ...createProfileAvatarEditorState(),
          isOpen: true,
          src: previewUrl,
          fileName: file.name || 'avatar.jpg',
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        };
      });
    } catch {
      URL.revokeObjectURL(previewUrl);
      toast.error('Could not read this image');
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarEditor.src) return;
    
    setIsUploadingAvatar(true);
    try {
      const croppedBlob = await renderProfileAvatarBlob({
        src: avatarEditor.src,
        position: avatarEditor.position,
        zoom: avatarEditor.zoom,
        rotation: avatarEditor.rotation,
      });
      const safeName = (avatarEditor.fileName || 'avatar').replace(/\.[^/.]+$/, '');
      const croppedFile = new File([croppedBlob], `${safeName}-edited.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('avatar', croppedFile);
      const response = await usersAPI.uploadAvatar(formData);
      const avatar = response?.data?.data?.avatar;
      if (avatar) {
        setUser({ ...user, avatar });
        toast.success('Profile picture updated!');
        closeAvatarEditor();
      } else {
        toast.error('Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(form);
  };

  return (
    <>
      <Helmet><title>Profile - Bassac Post</title></Helmet>
      <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-6">Profile</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="relative inline-block mb-4">
            <Avatar 
              src={buildMediaUrl(user?.avatar)} 
              name={user?.fullName} 
              size="xl" 
              className="mx-auto"
            />
            <label 
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full cursor-pointer transition-colors shadow-lg"
            >
              <Camera className="w-4 h-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="mb-4 text-xs text-dark-500">Tap the camera icon to choose, crop, and update your photo.</p>
          
          <h2 className="text-2xl font-semibold text-dark-900 dark:text-white">{user?.fullName}</h2>
          <p className="text-dark-500">{user?.email}</p>
          <p className="text-sm text-primary-600 capitalize mt-1">{user?.role}</p>
        </div>
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-dark-900 dark:text-white mb-4">Edit Profile</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <Textarea label="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
            <Button type="submit" isLoading={isPending}>Save Changes</Button>
          </form>
        </div>
      </div>
      <Modal
        isOpen={avatarEditor.isOpen}
        onClose={() => {
          if (!isUploadingAvatar) {
            closeAvatarEditor();
          }
        }}
        title="Edit Profile Picture"
        size="lg"
      >
        <div className="space-y-6">
          <div className="mx-auto w-full max-w-sm">
            <div
              className={`relative mx-auto h-72 w-72 overflow-hidden rounded-full border-4 border-primary-200 dark:border-primary-900 bg-dark-100 dark:bg-dark-800 select-none touch-none ${
                isCropDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                dragStateRef.current = {
                  active: true,
                  lastX: event.clientX,
                  lastY: event.clientY,
                };
                setIsCropDragging(true);
              }}
              onTouchStart={(event) => {
                const touch = event.touches?.[0];
                if (!touch) return;
                dragStateRef.current = {
                  active: true,
                  lastX: touch.clientX,
                  lastY: touch.clientY,
                };
                setIsCropDragging(true);
              }}
            >
              {avatarEditor.src && (
                <img
                  src={avatarEditor.src}
                  alt="Avatar crop preview"
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                  style={{
                    ...cropPreviewImageStyle,
                    transform: `translate(calc(-50% + ${avatarEditor.position.x}px), calc(-50% + ${avatarEditor.position.y}px)) scale(${avatarEditor.zoom}) rotate(${avatarEditor.rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/70" />
            </div>
            <p className="mt-2 text-center text-xs text-dark-500">Drag image to reposition inside the circle</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-dark-600 dark:text-dark-300">
                <span>Zoom</span>
                <span>{avatarEditor.zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={avatarEditor.zoom}
                onChange={(event) => setAvatarEditor((prev) => ({ ...prev, zoom: Number(event.target.value) }))}
                className="w-full accent-primary-600"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm text-dark-600 dark:text-dark-300">
                <span>Rotation</span>
                <span>{avatarEditor.rotation}&deg;</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={avatarEditor.rotation}
                onChange={(event) => setAvatarEditor((prev) => ({ ...prev, rotation: Number(event.target.value) }))}
                className="w-full accent-primary-600"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!isUploadingAvatar) {
                  closeAvatarEditor();
                }
              }}
              disabled={isUploadingAvatar}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setAvatarEditor((prev) => ({ ...prev, position: { x: 0, y: 0 }, zoom: 1, rotation: 0 }))}
              disabled={isUploadingAvatar}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleAvatarUpload}
              isLoading={isUploadingAvatar}
            >
              Done & Update
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export { ArticleEditorPage } from './ArticleEditorPage';
export { CategoriesPage } from './CategoriesPage';
export { UsersPage } from './UsersPage';
export { MediaPage } from './MediaPage';
export { MessagesPage } from './MessagesPage';
export { AnalyticsPage } from './AnalyticsPage';
export { AIAssistantPage } from './AIAssistantPage';
export { SiteSettingsPage } from './SiteSettingsPage';
export { HomepageBuilderPage } from './HomepageBuilderPage';
export { CommentsPage } from './CommentsPage';
export { NewsletterPage } from './NewsletterPage';
export { NotificationsPage } from './NotificationsPage';
export { AdsControlPage } from './AdsControlPage';
export { AdInsightsPage } from './AdInsightsPage';
export { ArticleInsightsPage } from './ArticleInsightsPage';
