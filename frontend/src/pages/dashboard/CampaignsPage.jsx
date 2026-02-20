import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  LayoutGrid,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Play,
  Pause,
  TrendingUp,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PLACEMENT_INFO = {
  popup: { icon: '🎯', label: 'Popup', color: 'purple' },
  top_banner: { icon: '📍', label: 'Top Banner', color: 'blue' },
  in_content: { icon: '📰', label: 'In-Content', color: 'green' },
  sidebar: { icon: '📊', label: 'Sidebar', color: 'orange' },
  floating: { icon: '🎈', label: 'Floating', color: 'red' },
  footer_banner: { icon: '📝', label: 'Footer', color: 'indigo' },
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [summary, setSummary] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  useEffect(() => {
    fetchCampaigns();
    fetchSummary();
  }, [statusFilter, placementFilter, searchTerm]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (placementFilter !== 'all') params.append('placement', placementFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/campaigns?${params.toString()}`);
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/campaigns/dashboard/summary');
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleToggleStatus = async (campaign) => {
    try {
      await api.post(`/campaigns/${campaign._id}/toggle`);
      toast.success(`Campaign ${campaign.status === 'active' ? 'paused' : 'activated'}`);
      fetchCampaigns();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDuplicate = async (campaign) => {
    try {
      await api.post(`/campaigns/${campaign._id}/duplicate`);
      toast.success('Campaign duplicated successfully');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to duplicate campaign');
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;

    try {
      await api.delete(`/campaigns/${campaignToDelete._id}`);
      toast.success('Campaign deleted successfully');
      setShowDeleteModal(false);
      setCampaignToDelete(null);
      fetchCampaigns();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const confirmDelete = (campaign) => {
    setCampaignToDelete(campaign);
    setShowDeleteModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { icon: CheckCircle, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', text: 'Active' },
      paused: { icon: Pause, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', text: 'Paused' },
      draft: { icon: AlertCircle, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', text: 'Draft' },
      ended: { icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', text: 'Ended' },
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.text}
      </span>
    );
  };

  const getPlacementBadge = (placement) => {
    const info = PLACEMENT_INFO[placement] || { icon: '⚙️', label: 'Custom', color: 'gray' };

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
        <span>{info.icon}</span>
        {info.label}
      </span>
    );
  };

  return (
    <>
      <Helmet>
        <title>Campaigns - Bassac CMS</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage your advertising campaigns
              </p>
            </div>
            <Link
              to="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              New Campaign
            </Link>
          </div>

          {/* Stats Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Campaigns"
                value={summary.totalCampaigns}
                icon={LayoutGrid}
                color="blue"
              />
              <StatsCard
                title="Active"
                value={summary.activeCampaigns}
                icon={CheckCircle}
                color="green"
              />
              <StatsCard
                title="Total Impressions"
                value={summary.totalImpressions.toLocaleString()}
                icon={Eye}
                color="purple"
              />
              <StatsCard
                title="Avg CTR"
                value={`${summary.averageCtr}%`}
                icon={TrendingUp}
                color="orange"
              />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={(e) => { e.preventDefault(); fetchCampaigns(); }} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </form>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="ended">Ended</option>
              </select>

              {/* Placement Filter */}
              <select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Placements</option>
                <option value="popup">🎯 Popup</option>
                <option value="top_banner">📍 Top Banner</option>
                <option value="in_content">📰 In-Content</option>
                <option value="sidebar">📊 Sidebar</option>
                <option value="floating">🎈 Floating</option>
                <option value="footer_banner">📝 Footer</option>
              </select>
            </div>
          </div>

          {/* Campaigns Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <LayoutGrid className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No campaigns yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first campaign to start advertising</p>
              <Link
                to="/dashboard/campaigns/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign._id}
                  campaign={campaign}
                  onToggle={() => handleToggleStatus(campaign)}
                  onEdit={() => navigate(`/dashboard/campaigns/${campaign._id}/edit`)}
                  onDuplicate={() => handleDuplicate(campaign)}
                  onDelete={() => confirmDelete(campaign)}
                  onViewAnalytics={() => navigate(`/dashboard/campaigns/${campaign._id}/analytics`)}
                  getStatusBadge={getStatusBadge}
                  getPlacementBadge={getPlacementBadge}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Campaign"
          message={`Are you sure you want to delete "${campaignToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setCampaignToDelete(null);
          }}
        />
      )}
    </>
  );
}

// ==================== SUB-COMPONENTS ====================

function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{title}</div>
    </div>
  );
}

function CampaignCard({ campaign, onToggle, onEdit, onDuplicate, onDelete, onViewAnalytics, getStatusBadge, getPlacementBadge }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
            {campaign.name}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            {getStatusBadge(campaign.status)}
            {getPlacementBadge(campaign.placement)}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ads</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{campaign.ads?.length || 0}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Impressions</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {(campaign.stats?.totalImpressions || 0).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">CTR</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {campaign.stats?.ctr || 0}%
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          title={campaign.status === 'active' ? 'Pause' : 'Activate'}
        >
          {campaign.status === 'active' ? (
            <span className="flex items-center justify-center gap-1.5">
              <Pause className="w-4 h-4" /> Pause
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Play className="w-4 h-4" /> Activate
            </span>
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onViewAnalytics}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDuplicate}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, confirmVariant, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
