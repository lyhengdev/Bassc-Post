import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Filter, Eye, BarChart3, Edit, Copy, 
  Trash2, Play, Pause, MoreVertical, Calendar 
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

/**
 * Ad Collections List Page
 * Main view for managing ad collections (campaigns)
 */
export function AdCollectionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [placementFilter, setPlacementFilter] = useState('all');
  const queryClient = useQueryClient();

  // Fetch collections
  const { data, isLoading } = useQuery({
    queryKey: ['ad-collections', statusFilter, placementFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (placementFilter !== 'all') params.append('placement', placementFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get(`/ad-collections?${params}`);
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/ad-collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ad-collections']);
      toast.success('Collection deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete collection');
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/ad-collections/${id}/duplicate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ad-collections']);
      toast.success('Collection duplicated successfully');
    },
    onError: () => {
      toast.error('Failed to duplicate collection');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }) => {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await api.put(`/ad-collections/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ad-collections']);
      toast.success('Status updated');
    },
  });

  const collections = data?.collections || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      {/* Header */}
      <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ad Collections
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage your ad campaigns and collections
              </p>
            </div>
            <Link
              to="/dashboard/ad-collections/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Collection
            </Link>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="scheduled">Scheduled</option>
              <option value="ended">Ended</option>
              <option value="draft">Draft</option>
            </select>

            {/* Placement Filter */}
            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Placements</option>
              <option value="popup">Popup</option>
              <option value="header">Header</option>
              <option value="sidebar">Sidebar</option>
              <option value="footer">Footer</option>
              <option value="in_article">In News</option>
              <option value="after_article">After News</option>
              <option value="before_comments">Before Comments</option>
              <option value="after_hero">After Hero</option>
              <option value="between_sections">Between Sections</option>
              <option value="floating_banner">Floating Banner</option>
              <option value="in_category">In Category</option>
              <option value="in_search">In Search</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collections List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-900 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No collections found</p>
            <Link
              to="/dashboard/ad-collections/new"
              className="inline-flex items-center gap-2 mt-4 link-primary"
            >
              <Plus className="w-4 h-4" />
              Create your first collection
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection._id}
                collection={collection}
                onDelete={() => deleteMutation.mutate(collection._id)}
                onDuplicate={() => duplicateMutation.mutate(collection._id)}
                onToggleStatus={() => toggleStatusMutation.mutate({ 
                  id: collection._id, 
                  currentStatus: collection.status 
                })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Collection Card
 */
function CollectionCard({ collection, onDelete, onDuplicate, onToggleStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  const showSectionIndex = collection.placement === 'between_sections' && Number.isInteger(collection.sectionIndex);

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ended: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  const placementLabels = {
    popup: 'Popup',
    header: 'Header',
    sidebar: 'Sidebar',
    footer: 'Footer',
    in_article: 'In News',
    after_article: 'After News',
    before_comments: 'Before Comments',
    after_hero: 'After Hero',
    between_sections: 'Between Sections',
    floating_banner: 'Floating Banner',
    in_category: 'In Category',
    in_search: 'In Search',
    custom: 'Custom',
  };

  return (
    <div className="bg-white dark:bg-dark-900 rounded-lg border border-gray-200 dark:border-dark-800 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title & Status */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              <Link
                to={`/dashboard/ad-collections/${collection._id}`}
                className="hover:underline"
              >
                {collection.name}
              </Link>
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[collection.status]}`}>
              {collection.status}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <strong className="text-gray-900 dark:text-white">Placement:</strong>
              {placementLabels[collection.placement]}
              {showSectionIndex ? ` (Index ${collection.sectionIndex})` : ''}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <strong className="text-gray-900 dark:text-white">Pages:</strong>
              {collection.targetPages?.join(', ') || 'All'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <strong className="text-gray-900 dark:text-white">Ads:</strong>
              {collection.activeAdsCount || 0} active / {collection.adsCount || 0} total
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Impressions</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {(collection.stats?.totalImpressions || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clicks</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {(collection.stats?.totalClicks || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CTR</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {collection.stats?.ctr || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative ml-4">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 py-1 z-10">
              <Link
                to={`/dashboard/ad-collections/${collection._id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                <Eye className="w-4 h-4" />
                View Ads
              </Link>
              <Link
                to={`/dashboard/ad-collections/${collection._id}/analytics`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Link>
              <Link
                to={`/dashboard/ad-collections/${collection._id}/edit`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onToggleStatus();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                {collection.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Activate
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDuplicate();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <hr className="my-1 border-gray-200 dark:border-dark-700" />
              <button
                onClick={() => {
                  setShowMenu(false);
                  if (confirm('Delete this collection and all its ads?')) {
                    onDelete();
                  }
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdCollectionsPage;
