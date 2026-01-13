import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Layout, Plus, Trash2, Save, Eye,
  Newspaper, Grid3X3, List, TrendingUp, Star, Zap, Mail,
  Video, User, Image as ImageIcon, Code, ChevronDown, ChevronUp,
  Columns, LayoutGrid, Megaphone
} from 'lucide-react';
import { useSiteSettings, useUpdateHomepageSections, useCategories } from '../../hooks/useApi';
import { Button, Input, ContentLoader, Modal, ConfirmModal } from '../../components/common/index.jsx';
import { cn } from '../../utils';

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero Section', icon: Layout, description: 'Main featured article with side stories (Kiripost style)' },
  { type: 'featured_articles', label: 'Featured Articles', icon: Star, description: 'Grid of featured stories' },
  { type: 'latest_articles', label: 'Latest Articles', icon: Newspaper, description: '2-column news list' },
  { type: 'breaking_news', label: 'Breaking News', icon: Zap, description: 'Breaking news grid' },
  { type: 'trending', label: 'Trending', icon: TrendingUp, description: 'Horizontal scroll cards' },
  { type: 'news_list', label: 'News List', icon: List, description: 'Vertical article list' },
  { type: 'grid_with_sidebar', label: 'Grid + Sidebar', icon: Columns, description: 'Articles with sidebar' },
  { type: 'magazine_layout', label: 'Magazine Layout', icon: LayoutGrid, description: 'Featured + numbered list' },
  { type: 'category_tabs', label: 'Category Tabs', icon: Grid3X3, description: 'Tabbed categories' },
  { type: 'category_grid', label: 'Category Grid', icon: Grid3X3, description: 'Browse all categories' },
  { type: 'category_spotlight', label: 'Category Spotlight', icon: Star, description: 'Highlight a specific category' },
  { type: 'editor_picks', label: "Editor's Picks", icon: User, description: 'Curated selections' },
  { type: 'video', label: 'Video Section', icon: Video, description: 'Video content grid' },
  { type: 'newsletter_signup', label: 'Newsletter', icon: Mail, description: 'Email signup form' },
  { type: 'ad_banner', label: 'Advertisement', icon: Megaphone, description: 'Ad banner space' },
  { type: 'custom_html', label: 'Custom HTML', icon: Code, description: 'Custom content block' },
];

export function HomepageBuilderPage() {
  const { data: settings, isLoading } = useSiteSettings();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.data || [];
  const { mutate: updateSections, isPending: isSaving } = useUpdateHomepageSections();
  
  const [sections, setSections] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    if (settings?.homepageSections) {
      setSections(settings.homepageSections);
    }
  }, [settings]);

  const moveSection = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const items = [...sections];
    const [removed] = items.splice(index, 1);
    items.splice(newIndex, 0, removed);
    
    setSections(items.map((item, i) => ({ ...item, order: i })));
  };

  const addSection = (type) => {
    const sectionType = SECTION_TYPES.find(s => s.type === type);
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      title: sectionType?.label || type,
      subtitle: '',
      enabled: true,
      order: sections.length,
      settings: {
        layout: 'grid',
        limit: 6,
        showExcerpt: true,
        showAuthor: true,
        showDate: true,
        showCategory: true,
        customHtml: '',
        position: 'horizontal',
        imageUrl: '',
        linkUrl: '',
        altText: 'Advertisement',
        sidebarTitle: 'More Stories',
      }
    };
    setSections([...sections, newSection]);
    setShowAddModal(false);
    setExpandedSections(prev => ({ ...prev, [newSection.id]: true }));
  };

  const updateSection = (id, updates) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateSectionSettings = (id, key, value) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, settings: { ...s.settings, [key]: value } } : s
    ));
  };

  const removeSection = () => {
    if (deleteModal) {
      setSections(sections.filter(s => s.id !== deleteModal));
      setDeleteModal(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    updateSections(sections);
  };

  if (isLoading) return <ContentLoader />;

  return (
    <>
      <Helmet><title>Homepage Builder - Dashboard</title></Helmet>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white">Homepage Builder</h1>
          <p className="text-dark-500 text-sm">Customize your homepage layout</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => window.open('/', '_blank')} className="flex-1 sm:flex-initial">
            <Eye className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button onClick={handleSave} isLoading={isSaving} className="flex-1 sm:flex-initial">
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
              <h2 className="font-semibold text-dark-900 dark:text-white">Page Sections</h2>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Add Section</span>
              </Button>
            </div>

            {sections.length === 0 ? (
              <div className="p-8 text-center">
                <Layout className="w-12 h-12 mx-auto text-dark-300 mb-3" />
                <p className="text-dark-500 mb-4">No sections added yet</p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Section
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-dark-200 dark:divide-dark-700">
                {sections.sort((a, b) => a.order - b.order).map((section, index) => {
                  const sectionType = SECTION_TYPES.find(s => s.type === section.type);
                  const Icon = sectionType?.icon || Layout;
                  const isExpanded = expandedSections[section.id];
                  
                  return (
                    <div key={section.id}>
                      <div className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => moveSection(index, -1)} 
                            disabled={index === 0}
                            className="p-1 hover:bg-dark-100 dark:hover:bg-dark-800 rounded disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => moveSection(index, 1)} 
                            disabled={index === sections.length - 1}
                            className="p-1 hover:bg-dark-100 dark:hover:bg-dark-800 rounded disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className={cn('p-2 rounded-lg', section.enabled ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-dark-100 dark:bg-dark-800')}>
                          <Icon className={cn('w-4 h-4 sm:w-5 sm:h-5', section.enabled ? 'text-primary-600' : 'text-dark-400')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-medium text-sm sm:text-base truncate', section.enabled ? 'text-dark-900 dark:text-white' : 'text-dark-500')}>
                            {section.title}
                          </p>
                          <p className="text-xs text-dark-500 hidden sm:block">{sectionType?.description}</p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium hidden sm:block',
                              section.enabled 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-dark-100 text-dark-500 dark:bg-dark-800'
                            )}
                          >
                            {section.enabled ? 'Active' : 'Hidden'}
                          </button>
                          <button onClick={() => toggleExpand(section.id)} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setDeleteModal(section.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-4 pt-4 sm:ml-12 bg-dark-50 dark:bg-dark-800/50 border-t border-dark-100 dark:border-dark-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Section Title" value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} />
                            <Input label="Subtitle" value={section.subtitle || ''} onChange={(e) => updateSection(section.id, { subtitle: e.target.value })} />
                            
                            {!['ad_banner', 'custom_html', 'newsletter_signup'].includes(section.type) && (
                              <>
                                <div>
                                  <label className="label">Layout</label>
                                  <select value={section.settings?.layout || 'grid'} onChange={(e) => updateSectionSettings(section.id, 'layout', e.target.value)} className="input">
                                    <option value="grid">Grid</option>
                                    <option value="list">List</option>
                                  </select>
                                </div>
                                <Input type="number" label="Items" value={section.settings?.limit || 6} onChange={(e) => updateSectionSettings(section.id, 'limit', parseInt(e.target.value))} min={1} max={20} />
                              </>
                            )}

                            {['news_list', 'category_tabs', 'category_spotlight'].includes(section.type) && (
                              <div className="sm:col-span-2">
                                <label className="label">Category</label>
                                <select value={section.settings?.categorySlug || section.settings?.category || ''} onChange={(e) => {
                                  updateSectionSettings(section.id, 'categorySlug', e.target.value);
                                  updateSectionSettings(section.id, 'category', e.target.value);
                                }} className="input">
                                  <option value="">All Categories</option>
                                  {categories.map(cat => <option key={cat._id} value={cat.slug}>{cat.name}</option>)}
                                </select>
                              </div>
                            )}

                            {section.type === 'grid_with_sidebar' && (
                              <Input label="Sidebar Title" value={section.settings?.sidebarTitle || 'More Stories'} onChange={(e) => updateSectionSettings(section.id, 'sidebarTitle', e.target.value)} />
                            )}

                            {section.type === 'ad_banner' && (
                              <>
                                <div>
                                  <label className="label">Position</label>
                                  <select value={section.settings?.position || 'horizontal'} onChange={(e) => updateSectionSettings(section.id, 'position', e.target.value)} className="input">
                                    <option value="horizontal">Horizontal</option>
                                    <option value="vertical">Vertical</option>
                                  </select>
                                </div>
                                <Input label="Image URL" value={section.settings?.imageUrl || ''} onChange={(e) => updateSectionSettings(section.id, 'imageUrl', e.target.value)} placeholder="https://..." />
                                <Input label="Link URL" value={section.settings?.linkUrl || ''} onChange={(e) => updateSectionSettings(section.id, 'linkUrl', e.target.value)} placeholder="https://..." />
                                <Input label="Alt Text" value={section.settings?.altText || ''} onChange={(e) => updateSectionSettings(section.id, 'altText', e.target.value)} />
                                <div className="sm:col-span-2">
                                  <label className="label">Or Custom Ad HTML</label>
                                  <textarea value={section.settings?.customHtml || ''} onChange={(e) => updateSectionSettings(section.id, 'customHtml', e.target.value)} className="input font-mono text-sm" rows={3} placeholder="<script>...</script>" />
                                </div>
                              </>
                            )}

                            {section.type === 'custom_html' && (
                              <div className="sm:col-span-2">
                                <label className="label">Custom HTML</label>
                                <textarea value={section.settings?.customHtml || ''} onChange={(e) => updateSectionSettings(section.id, 'customHtml', e.target.value)} className="input font-mono text-sm" rows={6} placeholder="<div>...</div>" />
                              </div>
                            )}

                            <div className="sm:col-span-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={section.enabled} onChange={(e) => updateSection(section.id, { enabled: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
                                <span className="text-sm text-dark-600 dark:text-dark-400">Enable section</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="hidden lg:block">
          <div className="card p-4 sticky top-4">
            <h3 className="font-semibold text-dark-900 dark:text-white mb-4">Layout Preview</h3>
            <div className="bg-dark-100 dark:bg-dark-800 rounded-lg p-3 space-y-2">
              {sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).map(section => {
                const sectionType = SECTION_TYPES.find(s => s.type === section.type);
                const Icon = sectionType?.icon || Layout;
                return (
                  <div key={section.id} className="flex items-center gap-2 p-2 bg-white dark:bg-dark-900 rounded text-sm">
                    <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="truncate">{section.title}</span>
                  </div>
                );
              })}
              {sections.filter(s => s.enabled).length === 0 && (
                <p className="text-dark-500 text-sm text-center py-4">No active sections</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Section" size="lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {SECTION_TYPES.map(section => (
            <button
              key={section.type}
              onClick={() => addSection(section.type)}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dark-200 dark:border-dark-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <section.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600" />
              <span className="font-medium text-dark-900 dark:text-white text-xs sm:text-sm text-center">{section.label}</span>
              <span className="text-xs text-dark-500 text-center hidden sm:block">{section.description}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Delete Section Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={removeSection}
        title="Remove Section"
        message="Are you sure you want to remove this section from your homepage?"
        confirmText="Remove"
        variant="danger"
        icon={Trash2}
      />
    </>
  );
}
