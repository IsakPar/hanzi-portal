/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Story, StoryTemplate, StorySeries } from "@/services/storiesAPI";
import { searchStories, getStoryTemplate, importStory, getStorySeries } from "@/services/storiesAPI";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/useToast";
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
  
  // Import state
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);

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

  const handleImport = async () => {
    if (!importJson.trim()) {
      toast.error("Empty JSON", "Please paste your story JSON");
      return;
    }

    // Parse JSON
    let parsed: StoryTemplate;
    try {
      parsed = JSON.parse(importJson) as StoryTemplate;
    } catch (e) {
      const syntaxError = e as SyntaxError;
      toast.error("Invalid JSON Syntax", syntaxError.message);
      logger.error('JSON parse error:', syntaxError);
      return;
    }

    // Local validation
    const validationErrors: string[] = [];
    
    if (!parsed.title || typeof parsed.title !== 'string') {
      validationErrors.push('Missing or invalid "title" (required string)');
    }
    
    if (!parsed.hskLevel || typeof parsed.hskLevel !== 'number' || parsed.hskLevel < 1 || parsed.hskLevel > 9) {
      validationErrors.push('Missing or invalid "hskLevel" (required number 1-9)');
    }
    
    if (!parsed.segments || !Array.isArray(parsed.segments)) {
      validationErrors.push('Missing "segments" array');
    } else if (parsed.segments.length === 0) {
      validationErrors.push('"segments" array is empty - need at least one segment');
    } else {
      parsed.segments.forEach((seg, idx) => {
        if (!seg.chinese || typeof seg.chinese !== 'string') {
          validationErrors.push(`Segment ${idx + 1}: missing or invalid "chinese" field`);
        }
      });
    }
    
    if (parsed.difficulty && !['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
      validationErrors.push(`Invalid "difficulty": "${parsed.difficulty}" (must be easy/medium/hard)`);
    }

    if (validationErrors.length > 0) {
      toast.error(
        `Validation Failed (${validationErrors.length} errors)`,
        validationErrors.slice(0, 3).join('\n') + (validationErrors.length > 3 ? `\n...and ${validationErrors.length - 3} more` : '')
      );
      logger.error('Validation errors:', validationErrors);
      return;
    }

    // Send to backend
    setImporting(true);
    try {
      const result = await importStory(parsed);
      toast.success(
        "Story imported!",
        `Created "${result.story.title}" with ${result.segmentsCreated} segments`
      );
      setShowImportModal(false);
      setImportJson("");
      loadStories();
      navigate(`/stories/${result.story.id}/edit`);
    } catch (error: any) {
      console.error('=== IMPORT ERROR DEBUG ===');
      console.error('Full error object:', error);
      console.error('=== END DEBUG ===');
      
      const responseData = error.response || error;
      let errorMessage = error.message || "Could not import story";
      let errorDetails = "";
      
      if (responseData?.details) {
        errorDetails = typeof responseData.details === 'string' 
          ? responseData.details 
          : JSON.stringify(responseData.details, null, 2);
      }
      
      if (responseData?.issues && Array.isArray(responseData.issues)) {
        errorDetails = responseData.issues.map((i: any) => 
          `${i.path || 'root'}: ${i.message}`
        ).join('\n');
      }
      
      if (responseData?.error) {
        errorMessage = responseData.error;
      }
      if (responseData?.message) {
        errorDetails = responseData.message;
      }
      
      toast.error("Import Failed", errorDetails || errorMessage);
      logger.error('Import API error:', { error, responseData, errorDetails });
    } finally {
      setImporting(false);
    }
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

      {/* Import Modal */}
      {showImportModal && (
        <StoryImportModal
          importJson={importJson}
          setImportJson={setImportJson}
          template={template}
          importing={importing}
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

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
