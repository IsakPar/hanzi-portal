/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Story, StoryTemplate, StorySeries, StoryCategory, CategoryWithStories } from "@/services/storiesAPI";
import { 
  searchStories, 
  getStoryTemplate, 
  getStorySeries, 
  deleteStory,
  getStoryCategories,
  getCategoryById,
  setCategoryStories,
  updateStory,
} from "@/services/storiesAPI";
import { toast } from "@/hooks/useToast";
import { logger } from "@/utils/logger";
import { SeriesManagerModal } from "@/components/stories/SeriesManagerModal";
import { CategoryManagerModal } from "@/components/stories/CategoryManagerModal";
import {
  StoriesFilters,
  StoryCard,
  StoryImportModal,
  StoryTemplateModal,
  EmptyStoriesState,
} from "@/components/stories-list";
import type { StoryImportData } from "@/components/stories-list/StoryImportModal";
import { PushToAppModal } from "@/components/stories-list/PushToAppModal";
import { 
  FileText, 
  Radio, 
  BarChart3, 
  Plus, 
  Upload, 
  FolderOpen, 
  Layers,
  Rocket,
  Star,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type TabType = 'drafts' | 'live' | 'analytics';

export function StoriesList() {
  const navigate = useNavigate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('drafts');
  
  // Data state
  const [stories, setStories] = useState<Story[]>([]);
  const [_series, setSeries] = useState<StorySeries[]>([]);
  const [categories, setCategories] = useState<StoryCategory[]>([]);
  const [categoriesWithStories, setCategoriesWithStories] = useState<Map<string, CategoryWithStories>>(new Map());
  const [template, setTemplate] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [hskFilter, setHskFilter] = useState<number | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<string | undefined>();
  
  // Modal state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  
  // Live tab state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<{
    added: string[];
    removed: string[];
    reordered: string[];
  }>({ added: [], removed: [], reordered: [] });

  // Load initial data
  useEffect(() => {
    getStoryTemplate().then(setTemplate).catch(console.error);
    loadSeries();
    loadCategories();
  }, []);

  useEffect(() => {
    loadStories();
  }, [hskFilter, difficultyFilter]);

  const loadSeries = async () => {
    try {
      const data = await getStorySeries();
      setSeries(data.series);
    } catch (error) {
      logger.error('Failed to load series:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getStoryCategories();
      setCategories(data.categories);
      
      // Load stories for each category
      const categoriesMap = new Map<string, CategoryWithStories>();
      await Promise.all(
        data.categories.map(async (cat) => {
          try {
            const catWithStories = await getCategoryById(cat.id);
            categoriesMap.set(cat.id, catWithStories);
          } catch (e) {
            logger.error(`Failed to load category ${cat.id}:`, e);
          }
        })
      );
      setCategoriesWithStories(categoriesMap);
    } catch (error) {
      logger.error('Failed to load categories:', error);
    }
  };

  const loadStories = async () => {
    setLoading(true);
    try {
      const results = await searchStories({
        hskLevel: hskFilter,
        difficulty: difficultyFilter,
        query: searchQuery,
      });
      setStories(results);
    } catch (error) {
      logger.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadStories();
  };

  // Derived data
  const draftStories = useMemo(() => 
    stories.filter(s => !s.isPublished), [stories]);
  
  const publishedStories = useMemo(() => 
    stories.filter(s => s.isPublished), [stories]);
  
  // Stories that are published but not in any category (ready to add)
  const readyToAdd = useMemo(() => {
    const storiesInCategories = new Set<string>();
    categoriesWithStories.forEach(cat => {
      cat.stories.forEach(s => storiesInCategories.add(s.id));
    });
    return publishedStories.filter(s => !storiesInCategories.has(s.id));
  }, [publishedStories, categoriesWithStories]);

  // Handle import
  const handleImport = (data: StoryImportData) => {
    navigate('/stories/new/edit', { state: { importedStory: data } });
  };
  
  const handleUpdateExisting = (storyId: string, data: StoryImportData) => {
    navigate(`/stories/${storyId}/edit`, { state: { importedStory: data, isUpdate: true } });
  };

  // Handle delete
  const handleDelete = async (story: Story, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(
      `Delete "${story.title}"?\n\nThis will permanently delete this story and all its content. This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await deleteStory(story.id);
      toast.success('Story deleted', `"${story.title}" has been deleted.`);
      loadStories();
    } catch (error) {
      logger.error('Failed to delete story:', error);
      toast.error('Delete failed', 'Could not delete story. Please try again.');
    }
  };

  // Mark story as ready for live (publish it)
  const handleMarkReady = async (story: Story) => {
    try {
      await updateStory(story.id, { isPublished: true });
      toast.success('Story published', `"${story.title}" is now ready for live.`);
      loadStories();
    } catch (error) {
      logger.error('Failed to publish story:', error);
      toast.error('Publish failed', 'Could not publish story.');
    }
  };

  // Add story to category
  const handleAddToCategory = async (storyId: string, categoryId: string) => {
    const cat = categoriesWithStories.get(categoryId);
    if (!cat) return;
    
    const newStoryIds = [...cat.stories.map(s => s.id), storyId];
    try {
      await setCategoryStories(categoryId, newStoryIds);
      toast.success('Added to category');
      setPendingChanges(prev => ({
        ...prev,
        added: [...prev.added, storyId],
      }));
      loadCategories();
    } catch (error) {
      logger.error('Failed to add to category:', error);
      toast.error('Failed to add story to category');
    }
  };

  // Toggle category expand
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Toggle featured
  const handleToggleFeatured = async (story: Story) => {
    try {
      await updateStory(story.id, { isFeatured: !story.isFeatured } as any);
      toast.success(story.isFeatured ? 'Removed from featured' : 'Added to featured');
      loadStories();
    } catch (error) {
      logger.error('Failed to toggle featured:', error);
    }
  };

  const hasPendingChanges = pendingChanges.added.length > 0 || 
    pendingChanges.removed.length > 0 || 
    pendingChanges.reordered.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-zinc-400">Loading stories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Stories</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Create, manage, and publish Chinese reading content
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import JSON
              </button>
              <button
                onClick={() => setShowSeriesModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Series
              </button>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                <Layers className="w-4 h-4" />
                Categories
              </button>
              <button
                onClick={() => navigate('/stories/new/edit')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Story
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            <TabButton 
              active={activeTab === 'drafts'} 
              onClick={() => setActiveTab('drafts')}
              icon={<FileText className="w-4 h-4" />}
              label="Drafts"
              badge={draftStories.length}
            />
            <TabButton 
              active={activeTab === 'live'} 
              onClick={() => setActiveTab('live')}
              icon={<Radio className="w-4 h-4" />}
              label="Live"
              badge={publishedStories.length}
            />
            <TabButton 
              active={activeTab === 'analytics'} 
              onClick={() => setActiveTab('analytics')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Analytics"
            />
            
            {/* Push to App button (only show on Live tab with changes) */}
            {activeTab === 'live' && (
              <div className="ml-auto">
                <button
                  onClick={() => setShowPushModal(true)}
                  disabled={!hasPendingChanges}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    hasPendingChanges 
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/25' 
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <Rocket className="w-4 h-4" />
                  Push to App
                  {hasPendingChanges && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {pendingChanges.added.length + pendingChanges.removed.length + pendingChanges.reordered.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'drafts' && (
          <DraftsTab
            stories={draftStories}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hskFilter={hskFilter}
            setHskFilter={setHskFilter}
            difficultyFilter={difficultyFilter}
            setDifficultyFilter={setDifficultyFilter}
            onSearch={handleSearch}
            onCardClick={(story) => navigate(`/stories/${story.id}/edit`)}
            onDelete={handleDelete}
            onMarkReady={handleMarkReady}
            onShowImportModal={() => setShowImportModal(true)}
          />
        )}
        
        {activeTab === 'live' && (
          <LiveTab
            readyToAdd={readyToAdd}
            categories={categories}
            categoriesWithStories={categoriesWithStories}
            expandedCategories={expandedCategories}
            stories={stories}
            onToggleCategory={toggleCategory}
            onAddToCategory={handleAddToCategory}
            onCardClick={(story) => navigate(`/stories/${story.id}/edit`)}
            onToggleFeatured={handleToggleFeatured}
            onManageCategories={() => setShowCategoryModal(true)}
          />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}
      </div>

      {/* Modals */}
      {showTemplateModal && template && (
        <StoryTemplateModal
          template={template}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      <StoryImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        onUpdateExisting={handleUpdateExisting}
      />

      <SeriesManagerModal
        isOpen={showSeriesModal}
        onClose={() => setShowSeriesModal(false)}
        onSeriesChange={loadSeries}
      />

      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryChange={loadCategories}
      />

      <PushToAppModal
        isOpen={showPushModal}
        onClose={() => setShowPushModal(false)}
        changes={pendingChanges}
        stories={stories}
        onPushComplete={() => {
          setPendingChanges({ added: [], removed: [], reordered: [] });
          loadCategories();
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════

function TabButton({ 
  active, 
  onClick, 
  icon, 
  label, 
  badge 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-zinc-800 text-white' 
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-zinc-700' : 'bg-zinc-800'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// DRAFTS TAB
// ═══════════════════════════════════════════════════════════

function DraftsTab({
  stories,
  searchQuery,
  setSearchQuery,
  hskFilter,
  setHskFilter,
  difficultyFilter,
  setDifficultyFilter,
  onSearch,
  onCardClick,
  onDelete,
  onMarkReady,
  onShowImportModal,
}: {
  stories: Story[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  hskFilter: number | undefined;
  setHskFilter: (h: number | undefined) => void;
  difficultyFilter: string | undefined;
  setDifficultyFilter: (d: string | undefined) => void;
  onSearch: () => void;
  onCardClick: (story: Story) => void;
  onDelete: (story: Story, e: React.MouseEvent) => void;
  onMarkReady: (story: Story) => void;
  onShowImportModal: () => void;
}) {
  return (
    <div className="space-y-6">
      <StoriesFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hskFilter={hskFilter}
        setHskFilter={setHskFilter}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
        onSearch={onSearch}
      />

      {stories.length === 0 ? (
        <EmptyStoriesState onShowImportModal={onShowImportModal} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <div key={story.id} className="relative group">
              <StoryCard 
                story={story} 
                onClick={() => onCardClick(story)}
                onDelete={(e) => onDelete(story, e)}
              />
              {/* Mark as Ready button overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkReady(story);
                }}
                className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium shadow-lg"
              >
                <Radio className="w-3 h-3" />
                Publish
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LIVE TAB
// ═══════════════════════════════════════════════════════════

function LiveTab({
  readyToAdd,
  categories,
  categoriesWithStories,
  expandedCategories,
  stories,
  onToggleCategory,
  onAddToCategory,
  onCardClick,
  onToggleFeatured,
  onManageCategories,
}: {
  readyToAdd: Story[];
  categories: StoryCategory[];
  categoriesWithStories: Map<string, CategoryWithStories>;
  expandedCategories: Set<string>;
  stories: Story[];
  onToggleCategory: (id: string) => void;
  onAddToCategory: (storyId: string, categoryId: string) => void;
  onCardClick: (story: Story) => void;
  onToggleFeatured: (story: Story) => void;
  onManageCategories: () => void;
}) {
  const [selectedStoryForAdd, setSelectedStoryForAdd] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Ready to Add Section */}
      {readyToAdd.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-950/50 to-zinc-900 border border-emerald-800/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-100">Ready to Add</h3>
              <p className="text-sm text-emerald-400/70">
                {readyToAdd.length} published stories not in any category
              </p>
            </div>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {readyToAdd.map(story => (
              <div 
                key={story.id}
                className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                    {story.hskLevel}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{story.title}</p>
                    {story.subtitle && (
                      <p className="text-xs text-zinc-500 truncate">{story.subtitle}</p>
                    )}
                  </div>
                </div>
                
                {selectedStoryForAdd === story.id ? (
                  <select
                    autoFocus
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
                    onChange={(e) => {
                      if (e.target.value) {
                        onAddToCategory(story.id, e.target.value);
                      }
                      setSelectedStoryForAdd(null);
                    }}
                    onBlur={() => setSelectedStoryForAdd(null)}
                  >
                    <option value="">Select category...</option>
                    {categories.filter(c => c.filterType === 'manual').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.title}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setSelectedStoryForAdd(story.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                  >
                    Add to Live
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Categories</h3>
          <button
            onClick={onManageCategories}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            <Layers className="w-4 h-4" />
            Manage
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No categories yet</p>
            <button
              onClick={onManageCategories}
              className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Create your first category
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map(category => {
              const catWithStories = categoriesWithStories.get(category.id);
              const isExpanded = expandedCategories.has(category.id);
              
              return (
                <div 
                  key={category.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => onToggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-zinc-600" />
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      )}
                      <span className="font-medium">{category.title}</span>
                      <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400">
                        {catWithStories?.stories.length || 0} stories
                      </span>
                      {category.filterType !== 'manual' && (
                        <span className="text-xs bg-violet-900/50 text-violet-400 px-2 py-0.5 rounded-full">
                          {category.filterType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!category.isPublished && (
                        <span className="text-xs bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Category Stories */}
                  {isExpanded && catWithStories && (
                    <div className="border-t border-zinc-800 p-4 space-y-2">
                      {catWithStories.stories.length === 0 ? (
                        <p className="text-sm text-zinc-500 text-center py-4">
                          No stories in this category
                        </p>
                      ) : (
                        catWithStories.stories.map(storyRef => {
                          const fullStory = stories.find(s => s.id === storyRef.id);
                          return (
                            <div
                              key={storyRef.id}
                              onClick={() => fullStory && onCardClick(fullStory)}
                              className="flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                            >
                              <GripVertical className="w-4 h-4 text-zinc-600 cursor-grab" />
                              <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center text-xs font-medium">
                                {storyRef.hskLevel}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{storyRef.title}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (fullStory) onToggleFeatured(fullStory);
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  fullStory?.isFeatured 
                                    ? 'bg-amber-500/20 text-amber-400' 
                                    : 'bg-zinc-700 text-zinc-500 hover:text-amber-400'
                                }`}
                              >
                                <Star className="w-4 h-4" fill={fullStory?.isFeatured ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS TAB (PLACEHOLDER)
// ═══════════════════════════════════════════════════════════

function AnalyticsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 flex items-center justify-center mb-6">
        <BarChart3 className="w-10 h-10 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Story Analytics</h3>
      <p className="text-zinc-400 max-w-md mb-6">
        Story telemetry and engagement metrics will appear here. 
        Track which stories are most popular, completion rates, and more.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-full text-sm text-zinc-400">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Coming Soon
      </div>
    </div>
  );
}
