/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, Clock, Star, TrendingUp, Search, FileJson, Upload, Copy, X, Library, LayoutGrid, ChevronRight } from "lucide-react";
import type { Story, StoryTemplate, StorySeries } from "@/services/storiesAPI";
import { searchStories, getStoryTemplate, importStory, getStorySeries } from "@/services/storiesAPI";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { SeriesManagerModal } from "@/components/stories/SeriesManagerModal";
import { CategoryManagerModal } from "@/components/stories/CategoryManagerModal";
import { Thumbnail } from "@/components/stories/ThumbnailUploader";

export function StoriesList() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hskFilter, setHskFilter] = useState<number | undefined>();
  const [difficultyFilter, setDifficultyFilter] = useState<string | undefined>();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [template, setTemplate] = useState<StoryTemplate | null>(null);
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [series, setSeries] = useState<StorySeries[]>([]);
  const navigate = useNavigate();

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

  const handleCopyTemplate = async () => {
    if (template) {
      await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
      toast.success("Template copied!", "Paste and edit in your favorite editor");
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      toast.error("Empty JSON", "Please paste your story JSON");
      return;
    }

    // Step 1: Parse JSON
    let parsed: StoryTemplate;
    try {
      parsed = JSON.parse(importJson) as StoryTemplate;
    } catch (e) {
      const syntaxError = e as SyntaxError;
      toast.error("Invalid JSON Syntax", syntaxError.message);
      logger.error('JSON parse error:', syntaxError);
      return;
    }

    // Step 2: Local validation with detailed messages
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
      // Validate each segment
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

    // Step 3: Send to backend
    setImporting(true);
    try {
      const result = await importStory(parsed);
      toast.success(
        "Story imported!",
        `Created "${result.story.title}" with ${result.segmentsCreated} segments`
      );
      setShowImportModal(false);
      setImportJson("");
      loadStories(); // Refresh list
      navigate(`/stories/${result.story.id}/edit`);
    } catch (error: any) {
      // Log the FULL error for debugging
      console.error('=== IMPORT ERROR DEBUG ===');
      console.error('Full error object:', error);
      console.error('Error.message:', error?.message);
      console.error('Error.statusCode:', error?.statusCode);
      console.error('Error.response:', error?.response);
      console.error('=== END DEBUG ===');
      
      // Parse error response - APIError stores data in .response
      const responseData = error.response || error;
      let errorMessage = error.message || "Could not import story";
      let errorDetails = "";
      
      // Try to extract validation details from response
      if (responseData?.details) {
        errorDetails = typeof responseData.details === 'string' 
          ? responseData.details 
          : JSON.stringify(responseData.details, null, 2);
      }
      
      // Check for Zod validation errors from backend (in response)
      if (responseData?.issues && Array.isArray(responseData.issues)) {
        errorDetails = responseData.issues.map((i: any) => 
          `${i.path || 'root'}: ${i.message}`
        ).join('\n');
      }
      
      // Use backend error message if available
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-800">
            Stories
          </h1>
          <p className="text-gray-600 mt-1">Reading comprehension content with practice exercises</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCategoryModal(true)}
            className="gap-2"
          >
            <LayoutGrid size={18} />
            Categories
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSeriesModal(true)}
            className="gap-2"
          >
            <Library size={18} />
            Series
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTemplateModal(true)}
            className="gap-2"
          >
            <FileJson size={18} />
            Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
            className="gap-2"
          >
            <Upload size={18} />
            Import JSON
          </Button>
          <button 
            onClick={() => navigate("/stories/new/edit")}
            className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105 flex items-center gap-2"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            Create Story
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">{stories.length}</div>
              <div className="text-xs text-blue-600">Total Stories</div>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Star size={20} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">{publishedCount}</div>
              <div className="text-xs text-green-600">Published</div>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-900">{draftCount}</div>
              <div className="text-xs text-purple-600">Drafts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Series Section */}
      {series.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Library className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Story Series</h2>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                {series.length}
              </span>
            </div>
            <button
              onClick={() => setShowSeriesModal(true)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              Manage
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {series.map((s) => (
              <button
                key={s.id}
                onClick={() => setShowSeriesModal(true)}
                className="flex-shrink-0 w-40 h-40 rounded-xl relative overflow-hidden transition-transform hover:scale-105 group"
              >
                {/* Background - Thumbnail or Color Fallback */}
                <div className="absolute inset-0">
                  <Thumbnail
                    r2Key={s.coverImageR2Key}
                    fallbackColor={s.color}
                    className="w-full h-full"
                  />
                  {/* Gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </div>
                {/* Decorative circle (only on color fallback) */}
                {!s.coverImageR2Key && (
                  <div className="absolute top-[-30px] right-[-30px] w-[100px] h-[100px] rounded-full bg-white/15" />
                )}
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <BookOpen className="w-6 h-6 text-white/90 mb-2" />
                  <div className="text-white font-bold text-base truncate">{s.title}</div>
                  <div className="text-white/80 text-sm">{s.storyCount} Stories</div>
                </div>
                {!s.isPublished && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 text-white/90 text-xs rounded">Draft</div>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowSeriesModal(true)}
              className="flex-shrink-0 w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">New Series</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-gray-50 pl-10 pr-4 h-11 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <select
            value={hskFilter || ""}
            onChange={(e) => setHskFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 h-11 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All HSK Levels</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <option key={level} value={level}>
                HSK {level}{level > 6 ? ' (HSK 3.0)' : ''}
              </option>
            ))}
          </select>
          <select
            value={difficultyFilter || ""}
            onChange={(e) => setDifficultyFilter(e.target.value || undefined)}
            className="px-4 h-11 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-6 h-11 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>
      </div>

      {/* Stories Grid */}
      {stories.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No stories yet</h3>
          <p className="text-gray-500 mb-6">Create your first story to get started</p>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="gap-2"
            >
              <Upload size={18} />
              Import from JSON
            </Button>
            <button 
              onClick={() => navigate("/stories/new/edit")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-medium"
            >
              Create Story
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && template && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Story JSON Template</h2>
                <p className="text-sm text-gray-500 mt-1">Copy this template and fill in your content</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleCopyTemplate} className="gap-2">
                  <Copy size={16} />
                  Copy Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowTemplateModal(false)}>
                  <X size={20} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-auto font-mono">
                {JSON.stringify(template, null, 2)}
              </pre>
            </div>
            <div className="p-4 border-t bg-blue-50">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Edit the template in your favorite editor, then use "Import JSON" to create the story.
                You can import the template as-is to create an example story.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
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

// Import Modal with live preview
function ImportModal({
  importJson,
  setImportJson,
  template,
  importing,
  onImport,
  onClose,
}: {
  importJson: string;
  setImportJson: (v: string) => void;
  template: StoryTemplate | null;
  importing: boolean;
  onImport: () => void;
  onClose: () => void;
}) {
  // Try to parse JSON and show preview
  const preview = (() => {
    if (!importJson.trim()) return null;
    try {
      const parsed = JSON.parse(importJson) as StoryTemplate;
      const errors: string[] = [];
      
      if (!parsed.title) errors.push('❌ Missing title');
      if (!parsed.hskLevel || parsed.hskLevel < 1 || parsed.hskLevel > 9) errors.push('❌ Invalid hskLevel (1-9)');
      if (!parsed.segments || !Array.isArray(parsed.segments)) errors.push('❌ Missing segments array');
      else if (parsed.segments.length === 0) errors.push('❌ No segments');
      else {
        const invalidSegs = parsed.segments.filter((s) => !s.chinese);
        if (invalidSegs.length > 0) errors.push(`❌ ${invalidSegs.length} segments missing Chinese text`);
      }
      
      if (parsed.difficulty && !['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
        errors.push(`❌ Invalid difficulty: ${parsed.difficulty}`);
      }
      
      return { parsed, errors };
    } catch {
      return { parseError: true };
    }
  })();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Import Story from JSON</h2>
            <p className="text-sm text-gray-500 mt-1">Paste your story JSON below</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-6">
          {/* JSON Input */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">JSON Input</label>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"title": "My Story", "hskLevel": 1, "segments": [...]}'
              className="flex-1 font-mono text-sm p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[300px]"
            />
          </div>
          
          {/* Preview */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className="flex-1 border border-gray-300 rounded-lg p-4 overflow-auto bg-gray-50 min-h-[300px]">
              {!importJson.trim() ? (
                <div className="text-gray-400 text-center py-8">
                  Paste JSON to see preview
                </div>
              ) : preview?.parseError ? (
                <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                  <div className="font-medium mb-2">❌ Invalid JSON syntax</div>
                  <p className="text-sm">Check for missing commas, brackets, or quotes</p>
                </div>
              ) : preview?.parsed ? (
                <div className="space-y-4">
                  {/* Validation Status */}
                  {preview.errors.length > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-red-700 font-medium mb-1">Validation Errors</div>
                      {preview.errors.map((err, i) => (
                        <div key={i} className="text-sm text-red-600">{err}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-green-700 font-medium">✅ Valid - Ready to import</div>
                    </div>
                  )}
                  
                  {/* Story Info */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {preview.parsed.title || '(No title)'}
                    </h3>
                    <div className="flex gap-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        HSK {preview.parsed.hskLevel || '?'}
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded capitalize">
                        {preview.parsed.difficulty || 'medium'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        {preview.parsed.segments?.length || 0} segments
                      </span>
                    </div>
                    {preview.parsed.description && (
                      <p className="mt-2 text-sm text-gray-600">{preview.parsed.description}</p>
                    )}
                  </div>
                  
                  {/* Segments Preview */}
                  {preview.parsed.segments && preview.parsed.segments.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Segments Preview</div>
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {preview.parsed.segments.slice(0, 5).map((seg, i) => (
                          <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                            <span className="text-gray-400 mr-2">{i + 1}.</span>
                            <span className="font-medium">{seg.chinese || '(empty)'}</span>
                            {seg.pinyin && <span className="text-gray-500 ml-2">{seg.pinyin}</span>}
                          </div>
                        ))}
                        {preview.parsed.segments.length > 5 && (
                          <div className="text-sm text-gray-500 italic">
                            ...and {preview.parsed.segments.length - 5} more segments
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Practice Blocks */}
                  {preview.parsed.practiceBlocks && preview.parsed.practiceBlocks.length > 0 && (
                    <div className="text-sm text-gray-600">
                      📝 {preview.parsed.practiceBlocks.length} practice blocks included
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center p-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (template) {
                setImportJson(JSON.stringify(template, null, 2));
              }
            }}
          >
            Load Example Template
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={onImport} 
              disabled={importing || !preview?.parsed || (preview?.errors?.length || 0) > 0}
            >
              {importing ? 'Importing...' : 'Import Story'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryCard({ story, navigate }: { story: Story; navigate: any }) {
  const difficultyColors = {
    easy: "from-green-500 to-emerald-500",
    medium: "from-yellow-500 to-orange-500",
    hard: "from-red-500 to-rose-500",
  };

  const practiceCount = story.practiceBlocks?.length || 0;

  return (
    <div 
      onClick={() => navigate(`/stories/${story.id}/edit`)}
      className="group relative overflow-hidden bg-white rounded-2xl border border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]"
    >
      {/* Gradient Header */}
      <div className={cn(
        "h-32 bg-gradient-to-br p-6 relative overflow-hidden",
        difficultyColors[story.difficulty]
      )}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm bg-white/20 text-white">
              HSK {story.hskLevel}
            </span>
            {story.isPublished ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
                <Star size={12} fill="currentColor" />
                Published
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                Draft
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white line-clamp-2">{story.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{story.description || 'No description'}</p>
        
        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{story.estimatedMinutes || 15} min</span>
          </div>
          {practiceCount > 0 && (
            <div className="flex items-center gap-1">
              <BookOpen size={14} />
              <span>{practiceCount} practice</span>
            </div>
          )}
        </div>

        {/* Difficulty Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Difficulty:</span>
          <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold capitalize",
            story.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
            story.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            {story.difficulty}
          </span>
        </div>

        {/* Topic */}
        {story.topic && (
          <div className="mb-4">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              {story.topic}
            </span>
          </div>
        )}
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 border-2 border-purple-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

