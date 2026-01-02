/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Story, StoryTemplate, StorySeries } from "@/services/storiesAPI";
import { searchStories, getStoryTemplate, getStorySeries } from "@/services/storiesAPI";
import { logger } from "@/utils/logger";
import { SeriesManagerModal } from "@/components/stories/SeriesManagerModal";
import { CategoryManagerModal } from "@/components/stories/CategoryManagerModal";
import {
  StoriesHeader,
  StoriesStats,
  StoriesFilters,
  SeriesSection,
  StoryCard,
  StoryImportModal,
  StoryTemplateModal,
  EmptyStoriesState,
} from "@/components/stories-list";
import type { StoryImportData } from "@/components/stories-list/StoryImportModal";

export function StoriesList() {
  const navigate = useNavigate();
  
  // Data state
  const [stories, setStories] = useState<Story[]>([]);
  const [series, setSeries] = useState<StorySeries[]>([]);
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

  // Load template and series on mount
  useEffect(() => {
    getStoryTemplate().then(setTemplate).catch(console.error);
    loadSeries();
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

  // Handle import - navigate to editor with imported data (no API call)
  const handleImport = (data: StoryImportData) => {
    // Navigate to "new story" route with the imported data
    navigate('/stories/new/edit', { state: { importedStory: data } });
  };

  if (loading) {
    return <div className="p-8">Loading stories...</div>;
  }

  const publishedCount = stories.filter(s => s.isPublished).length;
  const draftCount = stories.filter(s => !s.isPublished).length;

  return (
    <div className="space-y-8 p-8">
      <StoriesHeader
        onShowTemplateModal={() => setShowTemplateModal(true)}
        onShowImportModal={() => setShowImportModal(true)}
        onShowSeriesModal={() => setShowSeriesModal(true)}
        onShowCategoryModal={() => setShowCategoryModal(true)}
      />

      <StoriesStats
        totalCount={stories.length}
        publishedCount={publishedCount}
        draftCount={draftCount}
      />

      <SeriesSection
        series={series}
        onManageSeries={() => setShowSeriesModal(true)}
      />

      <StoriesFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hskFilter={hskFilter}
        setHskFilter={setHskFilter}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
        onSearch={handleSearch}
      />

      {/* Stories Grid */}
      {stories.length === 0 ? (
        <EmptyStoriesState onShowImportModal={() => setShowImportModal(true)} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard 
              key={story.id} 
              story={story} 
              onClick={() => navigate(`/stories/${story.id}/edit`)}
            />
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && template && (
        <StoryTemplateModal
          template={template}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* Import Modal - Local parsing only, no API call */}
        <StoryImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />

      {/* Series Manager Modal */}
      <SeriesManagerModal
        isOpen={showSeriesModal}
        onClose={() => setShowSeriesModal(false)}
        onSeriesChange={loadSeries}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryChange={() => {}}
      />
    </div>
  );
}
