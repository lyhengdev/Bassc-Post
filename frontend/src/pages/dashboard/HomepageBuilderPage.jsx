import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Layout, Plus, Trash2, Save, Eye,
  Newspaper, Grid3X3, List, TrendingUp, Star, Zap,
  User, Code, ChevronDown, ChevronUp,
  Columns, LayoutGrid
} from 'lucide-react';
import { useSiteSettings, useUpdateHomepageSections, useCategories } from '../../hooks/useApi';
import { Button, Input, ContentLoader, Modal, ConfirmModal } from '../../components/common/index.jsx';
import { cn } from '../../utils';

const SECTION_TYPES = [
  { type: 'featured_articles', label: 'Featured News', icon: Star, description: 'Grid of featured stories' },
  { type: 'latest_articles', label: 'Latest News', icon: Newspaper, description: '2-column news list' },
  { type: 'breaking_news', label: 'Breaking News', icon: Zap, description: 'Breaking news grid' },
  { type: 'trending', label: 'Trending', icon: TrendingUp, description: 'Horizontal scroll cards' },
  { type: 'news_list', label: 'News List', icon: List, description: 'Vertical article list' },
  { type: 'grid_with_sidebar', label: 'Grid + Sidebar', icon: Columns, description: 'News with sidebar' },
  { type: 'magazine_layout', label: 'Magazine Layout', icon: LayoutGrid, description: 'Featured + numbered list' },
  { type: 'category_tabs', label: 'Category Tabs', icon: Grid3X3, description: 'Tabbed categories' },
  { type: 'category_grid', label: 'Category Grid', icon: Grid3X3, description: 'Browse all categories' },
  { type: 'category_spotlight', label: 'Category Spotlight', icon: Star, description: 'Highlight a specific category' },
  { type: 'editor_picks', label: "Editor's Picks", icon: User, description: 'Curated selections' },
  { type: 'custom_html', label: 'Custom HTML', icon: Code, description: 'Custom content block' },
];

const SECTION_TYPES_BY_ID = SECTION_TYPES.reduce((acc, item) => {
  acc[item.type] = item;
  return acc;
}, {});

const DEFAULT_SETTINGS_BY_TYPE = {
  breaking_news: { limit: 6 },
  featured_articles: { limit: 5 },
  latest_articles: { limit: 8 },
  trending: { limit: 6 },
  news_list: { limit: 10, categorySlug: '' },
  grid_with_sidebar: { limit: 7, sidebarTitle: 'More Stories' },
  magazine_layout: { limit: 5 },
  category_tabs: { limit: 4 },
  category_grid: { limit: 18 },
  category_spotlight: { limit: 4, categorySlug: '' },
  editor_picks: { limit: 4 },
  custom_html: { customHtml: '' },
};

export function HomepageBuilderPage() {
  const { data: settings, isLoading } = useSiteSettings();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];
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
    const sectionType = SECTION_TYPES_BY_ID[type];
    const newSection = {
      id: `section_${Date.now()}`,
      type,
      title: sectionType?.label || type,
      subtitle: '',
      enabled: true,
      order: sections.length,
      settings: { ...(DEFAULT_SETTINGS_BY_TYPE[type] || { limit: 6 }) }
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

  // between_sections index is 0-based and matches the order the public homepage renders ACTIVE sections.
  const activeOrderedSections = sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);
  const betweenSectionsIndexById = activeOrderedSections.reduce((acc, section, index) => {
    acc[section.id] = index;
    return acc;
  }, {});

  return (
    <>
      <Helmet><title>Homepage Builder - Dashboard</title></Helmet>
      
      <div className="rounded-2xl bg-gradient-to-br from-dark-900 to-dark-700 text-white p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Homepage Layout</p>
            <h1 className="text-2xl sm:text-2xl font-bold mt-2">Homepage Builder</h1>
            <p className="text-white/70 mt-2 text-sm max-w-2xl">
              Arrange sections, tune limits, and curate what visitors see first.
            </p>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between bg-dark-50 dark:bg-dark-900/40">
              <div>
                <h2 className="font-semibold text-dark-900 dark:text-white">Page Sections</h2>
                <p className="text-xs text-dark-500 mt-1">Drag order using arrows and edit settings per section.</p>
              </div>
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
                  const sectionType = SECTION_TYPES_BY_ID[section.type];
                  const Icon = sectionType?.icon || Layout;
                  const isExpanded = expandedSections[section.id];
                  const categorySlug = section.settings?.categorySlug || section.settings?.category || '';
                  const categoryLabel = categorySlug
                    ? categories.find(cat => cat.slug === categorySlug)?.name || categorySlug
                    : '';
                  const betweenSectionsIndex = Number.isInteger(betweenSectionsIndexById[section.id])
                    ? betweenSectionsIndexById[section.id]
                    : null;
                  const limitValue = Number.isFinite(Number(section.settings?.limit))
                    ? Number(section.settings.limit)
                    : null;
                  const metaItems = [
                    limitValue !== null ? `Items: ${limitValue}` : null,
                    categoryLabel ? `Category: ${categoryLabel}` : null,
                    section.type === 'grid_with_sidebar' ? `Sidebar: ${section.settings?.sidebarTitle || 'More Stories'}` : null,
                    section.enabled && betweenSectionsIndex !== null ? `Between Sections Index: ${betweenSectionsIndex}` : null,
                  ].filter(Boolean);
                  
                  return (
                    <div key={section.id} className={cn('relative', section.enabled ? 'bg-white dark:bg-dark-900' : 'bg-dark-50 dark:bg-dark-900/40')}>
                      <div className={cn('border-l-4', section.enabled ? 'border-primary-600' : 'border-dark-200 dark:border-dark-700')}>
                        <div className="p-4 sm:p-5 flex items-start gap-4">
                          <div className="flex flex-col items-center gap-2 pt-1">
                            <button 
                              onClick={() => moveSection(index, -1)} 
                              disabled={index === 0}
                              className="p-1.5 hover:bg-dark-100 dark:hover:bg-dark-800 rounded disabled:opacity-30"
                              aria-label="Move section up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <div className="text-xs text-dark-400 font-semibold">{index + 1}</div>
                            <button 
                              onClick={() => moveSection(index, 1)} 
                              disabled={index === sections.length - 1}
                              className="p-1.5 hover:bg-dark-100 dark:hover:bg-dark-800 rounded disabled:opacity-30"
                              aria-label="Move section down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-dark-500">
                              <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg', section.enabled ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-dark-100 text-dark-400 dark:bg-dark-800')}>
                                <Icon className="w-4 h-4" />
                              </span>
                              <span>{sectionType?.label || 'Section'}</span>
                            </div>
                            <p className={cn('text-lg sm:text-2xl font-semibold leading-snug mt-2', section.enabled ? 'text-dark-900 dark:text-white' : 'text-dark-500')}>
                              {section.title}
                            </p>
                            {section.subtitle && (
                              <p className="text-sm text-dark-500 italic mt-1 line-clamp-2">{section.subtitle}</p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-dark-400">
                              {metaItems.map(item => (
                                <span key={item} className="px-2 py-1 rounded-full bg-dark-100 dark:bg-dark-800">{item}</span>
                              ))}
                              <span className={cn(
                                'px-2 py-1 rounded-full',
                                section.enabled
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-dark-100 text-dark-500 dark:bg-dark-800'
                              )}>
                                {section.enabled ? 'Active' : 'Hidden'}
                              </span>
                            </div>
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
                      </div>
                      
                      {isExpanded && (
                        <div className="px-3 sm:px-4 pb-4 pt-4 sm:ml-12 bg-dark-50 dark:bg-dark-800/50 border-t border-dashed border-dark-200 dark:border-dark-700">
                          <div className="grid grid-cols-2 gap-4">
                            <Input label="Section Title" value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} />
                            <Input label="Subtitle" value={section.subtitle || ''} onChange={(e) => updateSection(section.id, { subtitle: e.target.value })} />
                            
                            {section.type !== 'custom_html' && (
                              <Input
                                type="number"
                                label="Items"
                                value={section.settings?.limit ?? 6}
                                onChange={(e) => updateSectionSettings(section.id, 'limit', parseInt(e.target.value))}
                                min={1}
                                max={50}
                              />
                            )}

                            {['news_list', 'category_spotlight'].includes(section.type) && (
                              <div className="sm:col-span-2">
                                <label className="label">Category</label>
                                <select value={section.settings?.categorySlug || section.settings?.category || ''} onChange={(e) => {
                                  updateSectionSettings(section.id, 'categorySlug', e.target.value);
                                  // Backward compat: some public sections still read `settings.category`.
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
          <p className="text-xs text-dark-500 mb-3">
            Ads tip: Use placement <span className="font-mono">between_sections</span> + section index (0-based) to target a specific homepage section.
          </p>
          <div className="bg-dark-100 dark:bg-dark-800 rounded-lg p-3 space-y-3">
            {sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).map(section => {
              const sectionType = SECTION_TYPES_BY_ID[section.type];
              const Icon = sectionType?.icon || Layout;
              return (
                <div key={section.id} className="bg-white dark:bg-dark-900 rounded-lg p-3 border-l-4 border-primary-600">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-dark-500">
                      <Icon className="w-3 h-3 text-primary-600" />
                      <span>{sectionType?.label || 'Section'}</span>
                    </div>
                    {Number.isInteger(betweenSectionsIndexById[section.id]) && (
                      <span className="text-[10px] font-semibold text-dark-400 bg-dark-100 dark:bg-dark-800 px-2 py-1 rounded-full">
                        Index {betweenSectionsIndexById[section.id]}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-dark-900 dark:text-white line-clamp-2">{section.title}</p>
                  {section.subtitle && (
                    <p className="mt-1 text-xs text-dark-500 italic line-clamp-2">{section.subtitle}</p>
                  )}
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
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {SECTION_TYPES.map(section => (
            <button
              key={section.type}
              onClick={() => addSection(section.type)}
              className="group text-left p-4 rounded-xl border-2 border-dark-200 dark:border-dark-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-dark-500">
                <section.icon className="w-4 h-4 text-primary-600" />
                <span>Section Type</span>
              </div>
              <div className="mt-3">
                <span className="block text-sm sm:text-base font-semibold text-dark-900 dark:text-white group-hover:text-primary-700">
                  {section.label}
                </span>
                <span className="block text-xs text-dark-500 mt-1 line-clamp-2">{section.description}</span>
              </div>
              <div className="mt-4 border-t border-dashed border-dark-200 dark:border-dark-700 pt-2 text-xs uppercase tracking-widest text-dark-400">
                Click to add
              </div>
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
