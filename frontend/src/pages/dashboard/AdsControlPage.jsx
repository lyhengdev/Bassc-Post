import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
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
  Calendar,
  Target,
  Image as ImageIcon,
  BarChart3,
  Settings,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { buildMediaUrl } from '../../utils';

// ==================== MAIN COMPONENT ====================

export function AdsControlPage() {
  const navigate = useNavigate();
  const { collectionId: routeCollectionId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedCollectionId = routeCollectionId || searchParams.get('collection');
  const autoOpenedRef = useRef(false);
  const [view, setView] = useState('collections'); // 'collections' or 'collection-detail'
  const [selectedCollection, setSelectedCollection] = useState(null);
  
  // Collections state
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [placementFilter, setPlacementFilter] = useState('all');
  
  // Ads state (for collection detail view)
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  
  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ==================== FETCH COLLECTIONS ====================
  
  useEffect(() => {
    fetchCollections();
  }, [statusFilter, placementFilter]);

  useEffect(() => {
    if (!requestedCollectionId || autoOpenedRef.current || loading) return;

    const openCollection = async () => {
      const collection = collections.find((item) => item._id === requestedCollectionId);
      if (collection) {
        await handleViewCollection(collection);
        autoOpenedRef.current = true;
        return;
      }

      try {
        const response = await api.get(`/ad-collections/${requestedCollectionId}`);
        const fetchedCollection = response.data.collection || response.data.data?.collection;
        if (fetchedCollection) {
          setSelectedCollection(fetchedCollection);
          setView('collection-detail');
          await fetchCollectionAds(fetchedCollection._id);
        }
      } catch (error) {
        console.error('Error loading requested collection:', error);
      } finally {
        autoOpenedRef.current = true;
      }
    };

    openCollection();
  }, [requestedCollectionId, collections, loading]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (placementFilter !== 'all') params.append('placement', placementFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/ad-collections?${params.toString()}`);
      setCollections(response.data.collections || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  // ==================== FETCH COLLECTION ADS ====================
  
  const fetchCollectionAds = async (collectionId) => {
    try {
      setAdsLoading(true);
      const response = await api.get(`/ad-collections/${collectionId}/ads`);
      setAds(response.data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast.error('Failed to load ads');
    } finally {
      setAdsLoading(false);
    }
  };

  // ==================== HANDLERS ====================

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCollections();
  };

  const handleViewCollection = async (collection) => {
    setSelectedCollection(collection);
    setView('collection-detail');
    await fetchCollectionAds(collection._id);
  };

  const handleBackToCollections = () => {
    if (routeCollectionId) {
      navigate('/dashboard/ad-collections');
      return;
    }
    setView('collections');
    setSelectedCollection(null);
    setAds([]);
  };

  const handleToggleStatus = async (collection) => {
    try {
      const newStatus = collection.status === 'active' ? 'paused' : 'active';
      await api.put(`/ad-collections/${collection._id}`, { status: newStatus });
      toast.success(`Collection ${newStatus === 'active' ? 'activated' : 'paused'}`);
      fetchCollections();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;
    
    try {
      await api.delete(`/ad-collections/${collectionToDelete._id}`);
      toast.success('Collection deleted successfully');
      setShowDeleteModal(false);
      setCollectionToDelete(null);
      fetchCollections();
    } catch (error) {
      toast.error('Failed to delete collection');
    }
  };

  const handleDuplicateCollection = async (collection) => {
    try {
      await api.post(`/ad-collections/${collection._id}/duplicate`);
      toast.success('Collection duplicated successfully');
      fetchCollections();
    } catch (error) {
      toast.error('Failed to duplicate collection');
    }
  };

  const confirmDelete = (collection) => {
    setCollectionToDelete(collection);
    setShowDeleteModal(true);
  };

  // ==================== RENDER FUNCTIONS ====================

  const getStatusBadge = (status) => {
    const badges = {
      active: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', text: 'Active' },
      paused: { icon: Pause, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', text: 'Paused' },
      scheduled: { icon: Clock, color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300', text: 'Scheduled' },
      ended: { icon: XCircle, color: 'bg-dark-100 text-dark-600 dark:bg-dark-900/50 dark:text-dark-300', text: 'Ended' },
      draft: { icon: AlertCircle, color: 'bg-dark-100 text-dark-600 dark:bg-dark-900/50 dark:text-dark-300', text: 'Draft' },
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
    const placements = {
      popup: { icon: '🎯', label: 'Popup' },
      after_hero: { icon: '📍', label: 'After Hero' },
      between_sections: { icon: '📊', label: 'Between Sections' },
      in_article: { icon: '📰', label: 'In News' },
      after_article: { icon: '📝', label: 'After News' },
      before_comments: { icon: '💬', label: 'Before Comments' },
      in_category: { icon: '📁', label: 'In Category' },
      in_search: { icon: '🔍', label: 'In Search' },
      floating_banner: { icon: '🎈', label: 'Floating Banner' },
      custom: { icon: '⚙️', label: 'Custom' },
    };
    
    const p = placements[placement] || placements.custom;
    
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
        <span>{p.icon}</span>
        {p.label}
      </span>
    );
  };

  // ==================== COLLECTIONS VIEW ====================

  const renderCollectionsView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-dark-900 to-dark-700 text-white p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Advertising</p>
            <h1 className="text-2xl sm:text-2xl font-bold mt-2">Ad Collections</h1>
            <p className="text-white/70 mt-2 text-sm max-w-2xl">
              Organize placements and rotate campaigns from one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs">
              {collections.length} collections
            </div>
            <Link
              to="/dashboard/ad-collections/new"
              className="inline-flex items-center gap-2 px-3 py-2 bg-white text-dark-900 rounded-lg hover:bg-white/90 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              New Collection
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Collections"
          value={collections.length}
          icon={LayoutGrid}
          color="primary"
        />
        <StatsCard
          title="Active"
          value={collections.filter(c => c.status === 'active').length}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Total Impressions"
          value={collections.reduce((sum, c) => sum + (c.stats?.totalImpressions || 0), 0).toLocaleString()}
          icon={Eye}
          color="blue"
        />
        <StatsCard
          title="Total Clicks"
          value={collections.reduce((sum, c) => sum + (c.stats?.totalClicks || 0), 0).toLocaleString()}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-100 dark:border-dark-800 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>

          {/* Placement Filter */}
          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Placements</option>
            <option value="popup">Popup</option>
            <option value="after_hero">After Hero</option>
            <option value="between_sections">Between Sections</option>
            <option value="in_article">In News</option>
            <option value="after_article">After News</option>
            <option value="before_comments">Before Comments</option>
            <option value="floating_banner">Floating Banner</option>
            <option value="in_category">In Category</option>
            <option value="in_search">In Search</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <p className="mt-3 text-xs text-dark-500 dark:text-dark-400">
          Use placement <code>between_sections</code> + section index to target specific sections. Homepage: index = section order.
          News/Category: index 0 is after 2 rows (mobile 2 articles, tablet 4, desktop 6).
        </p>
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-100 dark:border-dark-800 p-6 animate-pulse">
              <div className="h-6 bg-dark-200 dark:bg-dark-800 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-dark-200 dark:bg-dark-800 rounded w-1/2 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-dark-200 dark:bg-dark-800 rounded"></div>
                <div className="h-4 bg-dark-200 dark:bg-dark-800 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-dark-900 rounded-2xl border border-dark-100 dark:border-dark-800">
          <LayoutGrid className="w-16 h-16 mx-auto text-dark-300 mb-4" />
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">No collections yet</h3>
          <p className="text-dark-500 mb-6">Create your first collection to start managing ads</p>
          <Link
            to="/dashboard/ad-collections/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection._id}
              collection={collection}
              onView={() => handleViewCollection(collection)}
              onEdit={() => navigate(`/dashboard/ad-collections/${collection._id}/edit`)}
              onToggleStatus={() => handleToggleStatus(collection)}
              onDuplicate={() => handleDuplicateCollection(collection)}
              onDelete={() => confirmDelete(collection)}
              getStatusBadge={getStatusBadge}
              getPlacementBadge={getPlacementBadge}
            />
          ))}
        </div>
      )}
    </div>
  );

  // ==================== COLLECTION DETAIL VIEW ====================

  const renderCollectionDetailView = () => {
    if (!selectedCollection) return null;
    const showSectionIndex = selectedCollection.placement === 'between_sections' && Number.isInteger(selectedCollection.sectionIndex);

    return (
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-100 dark:border-dark-800 p-5 sm:p-6">
          <button
            onClick={handleBackToCollections}
            className="inline-flex items-center gap-2 text-dark-500 hover:text-dark-900 dark:text-dark-400 dark:hover:text-white mb-4"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Collections
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-2xl font-bold text-dark-900 dark:text-white">{selectedCollection.name}</h1>
                {getStatusBadge(selectedCollection.status)}
                {getPlacementBadge(selectedCollection.placement)}
                {showSectionIndex && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-dark-100 text-dark-700 dark:bg-dark-800 dark:text-dark-200">
                    Index {selectedCollection.sectionIndex}
                  </span>
                )}
              </div>
              {selectedCollection.description && (
                <p className="text-dark-500 max-w-2xl">{selectedCollection.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/dashboard/ad-collections/${selectedCollection._id}/edit`)}
                className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
                title="Edit Collection"
              >
                <Settings className="w-5 h-5" />
              </button>
              <Link
                to={`/dashboard/ad-collections/${selectedCollection._id}/ads/new`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Ad
              </Link>
            </div>
          </div>
        </div>

        {/* Collection Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total Ads"
            value={selectedCollection.adsCount || 0}
            icon={ImageIcon}
            color="primary"
          />
          <StatsCard
            title="Active Ads"
            value={selectedCollection.activeAdsCount || 0}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="Impressions"
            value={(selectedCollection.stats?.totalImpressions || 0).toLocaleString()}
            icon={Eye}
            color="blue"
          />
          <StatsCard
            title="Clicks (CTR)"
            value={`${(selectedCollection.stats?.totalClicks || 0).toLocaleString()} (${selectedCollection.stats?.ctr || 0}%)`}
            icon={TrendingUp}
            color="orange"
          />
        </div>

        {/* Ads List */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-100 dark:border-dark-800">
          <div className="p-6 border-b border-dark-100 dark:border-dark-800">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-white">Ads in this Collection</h2>
          </div>
          
          {adsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 border border-dark-100 dark:border-dark-800 rounded-lg">
                  <div className="w-20 h-20 bg-dark-200 dark:bg-dark-800 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-dark-200 dark:bg-dark-800 rounded w-1/3"></div>
                    <div className="h-3 bg-dark-200 dark:bg-dark-800 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : ads.length === 0 ? (
            <div className="p-12 text-center">
              <ImageIcon className="w-16 h-16 mx-auto text-dark-300 mb-4" />
              <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">No ads yet</h3>
              <p className="text-dark-500 mb-6">Add your first ad to this collection</p>
              <Link
                to={`/dashboard/ad-collections/${selectedCollection._id}/ads/new`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Ad
              </Link>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {ads.map((ad) => (
                <AdCard
                  key={ad._id}
                  ad={ad}
                  collectionId={selectedCollection._id}
                  onRefresh={() => fetchCollectionAds(selectedCollection._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  return (
    <>
      <Helmet>
        <title>Ad Collections - Bassac CMS</title>
      </Helmet>

      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 p-6">
        <div className="max-w-7xl mx-auto">
          {view === 'collections' ? renderCollectionsView() : renderCollectionDetailView()}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Collection"
          message={`Are you sure you want to delete "${collectionToDelete?.name}"? This will also delete all ads within this collection.`}
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={handleDeleteCollection}
          onCancel={() => {
            setShowDeleteModal(false);
            setCollectionToDelete(null);
          }}
        />
      )}
    </>
  );
}

// ==================== SUB-COMPONENTS ====================

function StatsCard({ title, value, icon: Icon, color }) {
  const colors = {
    primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    blue: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    orange: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-100 dark:border-dark-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`p-2 sm:p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
      </div>
      <div className="text-lg sm:text-2xl font-bold text-dark-900 dark:text-white mb-0.5 sm:mb-1">{value}</div>
      <div className="text-xs sm:text-sm text-dark-500">{title}</div>
    </div>
  );
}

function CollectionCard({ collection, onView, onEdit, onToggleStatus, onDuplicate, onDelete, getStatusBadge, getPlacementBadge }) {
  const showSectionIndex = collection.placement === 'between_sections' && Number.isInteger(collection.sectionIndex);
  return (
    <div className="bg-white dark:bg-dark-900 rounded-2xl border border-dark-100 dark:border-dark-800 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-2">{collection.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {getStatusBadge(collection.status)}
            {getPlacementBadge(collection.placement)}
            {showSectionIndex && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-dark-100 text-dark-700 dark:bg-dark-800 dark:text-dark-200">
                Index {collection.sectionIndex}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-dark-100 dark:border-dark-800">
        <div>
          <div className="text-xs text-dark-500 mb-1">Ads</div>
          <div className="text-lg font-bold text-dark-900 dark:text-white">{collection.adsCount || 0}</div>
        </div>
        <div>
          <div className="text-xs text-dark-500 mb-1">Impressions</div>
          <div className="text-lg font-bold text-dark-900 dark:text-white">{(collection.stats?.totalImpressions || 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-dark-500 mb-1">CTR</div>
          <div className="text-lg font-bold text-dark-900 dark:text-white">{collection.stats?.ctr || 0}%</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          View Ads
        </button>
        <button
          onClick={onEdit}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleStatus}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
          title={collection.status === 'active' ? 'Pause' : 'Activate'}
        >
          {collection.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={onDuplicate}
          className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
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

function AdCard({ ad, collectionId, onRefresh }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = async () => {
    try {
      await api.delete(`/ads/${ad._id}`);
      toast.success('Ad deleted successfully');
      setShowDeleteModal(false);
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete ad');
    }
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = ad.status === 'active' ? 'paused' : 'active';
      await api.put(`/ads/${ad._id}`, { status: newStatus });
      toast.success(`Ad ${newStatus === 'active' ? 'activated' : 'paused'}`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 border border-dark-100 dark:border-dark-800 rounded-xl hover:bg-dark-50 dark:hover:bg-dark-900/40 transition-colors">
        {/* Preview */}
        {ad.imageUrl && (
          <div className="w-20 h-20 flex-shrink-0">
            <img loading="lazy"
              src={buildMediaUrl(ad.imageUrl)}
              alt={ad.name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-dark-900 dark:text-white mb-1">{ad.name}</h4>
          <div className="flex flex-wrap items-center gap-3 text-sm text-dark-500">
            <span>Type: {ad.type}</span>
            <span>•</span>
            <span>Weight: {ad.weight || 50}</span>
            <span>•</span>
            <span>Impressions: {(ad.stats?.impressions || 0).toLocaleString()}</span>
            <span>•</span>
            <span>Clicks: {(ad.stats?.clicks || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {ad.status === 'active' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircle className="w-3.5 h-3.5" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-dark-100 text-dark-600 dark:bg-dark-900/50 dark:text-dark-300">
              <Pause className="w-3.5 h-3.5" />
              Paused
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
            title={ad.status === 'active' ? 'Pause' : 'Activate'}
          >
            {ad.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <Link
            to={`/dashboard/ad-collections/${collectionId}/ads/${ad._id}/edit`}
            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Ad"
          message={`Are you sure you want to delete "${ad.name}"?`}
          confirmText="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}

// Simple ConfirmModal component (you can use your existing one)
function ConfirmModal({ title, message, confirmText, confirmVariant, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-dark-100 dark:border-dark-800">
        <h3 className="text-2xl font-semibold text-dark-900 dark:text-white mb-2">{title}</h3>
        <p className="text-dark-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-dark-200 dark:border-dark-700 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default AdsControlPage;
