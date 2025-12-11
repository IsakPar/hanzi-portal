import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Zap } from "lucide-react";
import {
  searchVocabulary,
  getCategories,
  deleteVocabulary,
  exportVocabulary,
  type VocabularyEntry,
} from "@/services/vocabularyAPI";
import api from "@/services/api";
import { useGlobalConfirm } from "@/hooks/useConfirm";
import { toast } from "@/hooks/useToast";
import { useSelection } from "@/hooks/useSelection";
import { useBulkTagging } from "@/hooks/useBulkTagging";
import { useBulkOperations, type BulkOperationType } from "@/hooks/useBulkOperations";
import { SkeletonVocabularyTable } from "@/components/ui/skeleton";
import { EmptyVocabulary, EmptySearchResults } from "@/components/ui/empty-state";
import { BulkTagProgressModal } from "@/components/ui/BulkTagProgressModal";
import { BulkOperationsModal } from "@/components/ui/BulkOperationsModal";
import { BulkOperationConfirmation } from "@/components/ui/BulkOperationConfirmation";
import { InlineTagEditor } from "@/components/ui/InlineTagEditor";
import {
  VocabListHeader,
  VocabFilters,
  LessonStatsBar,
  VocabTable,
  VocabPagination,
  type LessonOption,
} from "@/components/vocabulary-list";

export function VocabularyList() {
  // DEBUG: Verify new code is loaded
  console.log('[VocabList] Component loaded - v2 with server-side filters');
  
  const navigate = useNavigate();
  const confirm = useGlobalConfirm();
  
  // Data
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(0);
  const limit = 50;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHSK, setSelectedHSK] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [filterHasAudio, setFilterHasAudio] = useState(false);
  const [filterHasExample, setFilterHasExample] = useState(false);
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [filterMissingSecondary, setFilterMissingSecondary] = useState(false);
  const [filterInLesson, setFilterInLesson] = useState(false);
  
  // Inline tag editor state
  const [inlineEditVocab, setInlineEditVocab] = useState<{
    id: string;
    hanzi: string;
    tags: string[];
    position: { top: number; left: number };
  } | null>(null);

  // Filters are now applied server-side for proper pagination
  // Just use vocabulary directly
  const filteredVocabulary = vocabulary;

  // Selection hook
  const selection = useSelection(filteredVocabulary);

  // Bulk tagging hook
  const bulkTagging = useBulkTagging({
    maxBatch: 100,
    onComplete: (results) => {
      // Update local state
      setVocabulary(prev => prev.map(v => {
        const tagResult = results.find(r => r.wordId === v.id);
        if (tagResult?.success && tagResult.categories) {
          return { ...v, secondaryCategories: tagResult.categories };
        }
        return v;
      }));
      
      // Refresh lessons to update counts
      loadLessons();
      selection.clear();
    },
  });

  // Bulk operations hook (audio, examples, tags, complete)
  const bulkOps = useBulkOperations({
    batchSize: 5, // Process 5 at a time
    voice: 'xiaoxiao',
    onComplete: () => {
      // Refresh vocabulary to show updated data
      loadVocabulary();
      selection.clear();
    },
  });

  // Stats for filter bar
  const stats = useMemo(() => ({
    withAudio: vocabulary.filter(v => v.wordAudioR2Key).length,
    withExamples: vocabulary.filter(v => v.exampleChinese).length,
    withSecondary: vocabulary.filter(v => v.secondaryCategories && v.secondaryCategories.length > 0).length,
    incomplete: vocabulary.filter(v => !v.wordAudioR2Key || !v.exampleChinese).length,
  }), [vocabulary]);

  // Use virtualization for large datasets
  const useVirtualization = filteredVocabulary.length > 100;

  // Selected lesson for stats bar
  const currentLesson = useMemo(
    () => lessons.find(l => l.id === selectedLesson),
    [lessons, selectedLesson]
  );

  // Load categories and lessons on mount
  useEffect(() => {
    loadCategories();
    loadLessons();
  }, []);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input (300ms delay)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  // Load vocabulary when filters change (using debounced search)
  useEffect(() => {
    loadVocabulary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, selectedHSK, selectedCategory, selectedLesson, filterHasAudio, filterHasExample, filterIncomplete, filterMissingSecondary, filterInLesson, page]);

  async function loadCategories() {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch {
      // Ignore - categories are optional
    }
  }

  async function loadLessons() {
    try {
      const response = await api.get<{ lessons: LessonOption[] }>('/v1/lessons/summary');
      const sorted = (response.lessons || []).sort((a, b) => {
        if (a.hskLevel !== b.hskLevel) return a.hskLevel - b.hskLevel;
        return a.lessonNumber - b.lessonNumber;
      });
      setLessons(sorted);
    } catch {
      // Ignore - lessons filter is optional
    }
  }

  async function loadVocabulary() {
    try {
      setLoading(true);
      setError(null);

      const params = {
        query: debouncedSearchTerm || undefined,
        hsk_level: selectedHSK || undefined,
        category: selectedCategory || undefined,
        lesson_id: selectedLesson || undefined,
        // Server-side filters for proper pagination
        has_audio: filterHasAudio ? true : undefined,
        has_example: filterHasExample ? true : undefined,
        incomplete: filterIncomplete ? true : undefined,
        missing_secondary: filterMissingSecondary ? true : undefined,
        in_lesson: filterInLesson ? true : undefined,
        limit,
        offset: page * limit,
        sort: 'hanzi' as const,
        order: 'asc' as const,
      };
      
      // Debug: log the params being sent
      console.log('[VocabList] Fetching with params:', params);

      const response = await searchVocabulary(params);
      
      console.log('[VocabList] Response:', { total: response.total, resultsCount: response.results.length });

      setVocabulary(response.results);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vocabulary");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = useCallback(async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Vocabulary?",
      description: "Are you sure you want to delete this vocabulary entry? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await deleteVocabulary(id);
      await loadVocabulary();
      toast.success("Vocabulary deleted", "The entry has been removed.");
    } catch (err) {
      toast.error("Failed to delete", err instanceof Error ? err.message : "Unknown error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirm]);

  async function handleExport() {
    try {
      const data = await exportVocabulary();
      const blob = new Blob([JSON.stringify(data.entries, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vocabulary-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }

  const handleBulkTagSecondary = useCallback(() => {
    const idsToTag = selection.selectedCount > 0 
      ? Array.from(selection.selectedIds)
      : filteredVocabulary
          .filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0)
          .map(v => v.id);
    
    bulkTagging.startBulkTag(idsToTag);
  }, [selection, filteredVocabulary, bulkTagging]);

  // Handle bulk operations (audio, example, tags, complete)
  const handleBulkOperation = useCallback((type: BulkOperationType) => {
    // Get items to process - NO LIMIT, process all
    let itemsToProcess = selection.selectedCount > 0
      ? filteredVocabulary.filter(v => selection.selectedIds.has(v.id))
      : filteredVocabulary;
    
    // Filter based on operation type - only process items that need it
    if (type === 'audio') {
      itemsToProcess = itemsToProcess.filter(v => !v.wordAudioR2Key);
    } else if (type === 'example') {
      itemsToProcess = itemsToProcess.filter(v => !v.exampleChinese);
    } else if (type === 'tags') {
      itemsToProcess = itemsToProcess.filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0);
    }
    // 'complete' processes all items but stages internally filter by what's needed
    
    if (itemsToProcess.length === 0) {
      toast.info('Nothing to process', `All items already have ${type === 'audio' ? 'audio' : type === 'example' ? 'examples' : 'tags'}`);
      return;
    }
    
    // Convert to the format expected by bulkOps
    const vocabItems = itemsToProcess.map(v => ({
      id: v.id,
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      english: v.english,
      category: v.category,
      wordAudioR2Key: v.wordAudioR2Key,
      exampleChinese: v.exampleChinese,
      exampleAudioR2Key: v.exampleAudioR2Key,
      secondaryCategories: v.secondaryCategories,
    }));
    
    // This now shows confirmation first with cost estimate
    bulkOps.startBulkOperation(vocabItems, type);
  }, [selection, filteredVocabulary, bulkOps]);

  const handleTagMissing = useCallback(() => {
    const untaggedIds = filteredVocabulary
      .filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0)
      .map(v => v.id);
    selection.setSelectedIds(new Set(untaggedIds));
    setTimeout(() => handleBulkTagSecondary(), 100);
  }, [filteredVocabulary, selection, handleBulkTagSecondary]);

  const handleTagsClick = useCallback((e: React.MouseEvent, entry: VocabularyEntry) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setInlineEditVocab({
      id: entry.id,
      hanzi: entry.hanzi,
      tags: entry.secondaryCategories || [],
      position: { top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 340) },
    });
  }, []);

  const handleTagsSave = useCallback((tags: string[]) => {
    if (!inlineEditVocab) return;
    
    setVocabulary(prev => prev.map(v => 
      v.id === inlineEditVocab.id 
        ? { ...v, secondaryCategories: tags }
        : v
    ));
    loadLessons();
    toast.success("Tags saved", `Updated secondary categories for ${inlineEditVocab.hanzi}`);
    setInlineEditVocab(null);
  }, [inlineEditVocab]);

  // Handlers for filter changes (reset page)
  const handleSearchChange = (value: string) => { setSearchTerm(value); setPage(0); };
  const handleHSKChange = (value: number | null) => { setSelectedHSK(value); setPage(0); };
  const handleCategoryChange = (value: string) => { setSelectedCategory(value); setPage(0); };
  const handleLessonChange = (value: string) => { setSelectedLesson(value); setPage(0); };
  const handleFilterHasAudioChange = (value: boolean) => { 
    console.log('[VocabList] Has Audio toggled to:', value);
    setFilterHasAudio(value); 
    setPage(0); 
  };
  const handleFilterHasExampleChange = (value: boolean) => { setFilterHasExample(value); setPage(0); };
  const handleFilterIncompleteChange = (value: boolean) => { setFilterIncomplete(value); setPage(0); };
  const handleFilterMissingSecondaryChange = (value: boolean) => { setFilterMissingSecondary(value); setPage(0); };
  const handleFilterInLessonChange = (value: boolean) => { setFilterInLesson(value); setPage(0); };

  // Loading state
  if (loading && vocabulary.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading vocabulary...</p>
      </div>
    );
  }

  const hasFilters = searchTerm || selectedHSK || selectedCategory || filterHasAudio || filterHasExample || filterIncomplete || filterInLesson;

  return (
    <div className="p-8">
      <VocabListHeader total={total} onExport={handleExport} />

      <VocabFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedHSK={selectedHSK}
        onHSKChange={handleHSKChange}
        selectedCategory={selectedCategory}
        categories={categories}
        onCategoryChange={handleCategoryChange}
        selectedLesson={selectedLesson}
        lessons={lessons}
        onLessonChange={handleLessonChange}
        filterHasAudio={filterHasAudio}
        onFilterHasAudioChange={handleFilterHasAudioChange}
        filterHasExample={filterHasExample}
        onFilterHasExampleChange={handleFilterHasExampleChange}
        filterIncomplete={filterIncomplete}
        onFilterIncompleteChange={handleFilterIncompleteChange}
        filterMissingSecondary={filterMissingSecondary}
        onFilterMissingSecondaryChange={handleFilterMissingSecondaryChange}
        filterInLesson={filterInLesson}
        onFilterInLessonChange={handleFilterInLessonChange}
        selectedCount={selection.selectedCount}
        onSelectAll={selection.selectAll}
        onClearSelection={selection.clear}
        bulkTagging={bulkTagging.isTagging}
        onBulkTagSecondary={handleBulkTagSecondary}
        bulkOperationRunning={bulkOps.isRunning}
        onBulkOperation={handleBulkOperation}
        stats={stats}
      />

      {selectedLesson && (
        <LessonStatsBar lesson={currentLesson} onTagMissing={handleTagMissing} />
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Virtualization indicator */}
      {useVirtualization && (
        <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
          <Zap className="w-4 h-4" />
          <span>Virtual scrolling enabled for {filteredVocabulary.length} items</span>
        </div>
      )}

      {/* Table / Empty States */}
      {loading ? (
        <SkeletonVocabularyTable rows={10} />
      ) : filteredVocabulary.length === 0 ? (
        hasFilters ? (
          <EmptySearchResults />
        ) : (
          <EmptyVocabulary onAction={() => navigate("/vocabulary/new")} />
        )
      ) : (
        <VocabTable
          vocabulary={filteredVocabulary}
          selectedIds={selection.selectedIds}
          onToggleSelect={selection.toggle}
          onSelectAll={selection.selectAll}
          onClearSelection={selection.clear}
          onDelete={handleDelete}
          onTagsClick={handleTagsClick}
          useVirtualization={useVirtualization}
        />
      )}

      {/* Pagination - only for non-virtualized view */}
      {!useVirtualization && (
        <VocabPagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Bulk Tag Progress Modal */}
      <BulkTagProgressModal
        isOpen={bulkTagging.showProgressModal}
        onClose={bulkTagging.closeModal}
        wordIds={bulkTagging.wordIdsToTag}
        onTagBatch={bulkTagging.tagBatch}
        onComplete={bulkTagging.handleComplete}
        batchSize={5}
      />

      {/* Bulk Operation Confirmation (shows cost estimate) */}
      <BulkOperationConfirmation
        isOpen={bulkOps.showConfirmation}
        operationType={bulkOps.operationType}
        items={bulkOps.itemsToProcess}
        costEstimate={bulkOps.costEstimate}
        onConfirm={bulkOps.confirmAndRun}
        onCancel={bulkOps.cancelConfirmation}
      />

      {/* Bulk Operations Progress Modal */}
      <BulkOperationsModal
        isOpen={bulkOps.showModal}
        isRunning={bulkOps.isRunning}
        operationType={bulkOps.operationType}
        progress={bulkOps.progress}
        onAbort={bulkOps.abort}
        onClose={bulkOps.closeModal}
      />

      {/* Inline Tag Editor Popover */}
      {inlineEditVocab && (
        <InlineTagEditor
          vocabId={inlineEditVocab.id}
          hanzi={inlineEditVocab.hanzi}
          currentTags={inlineEditVocab.tags}
          position={inlineEditVocab.position}
          onClose={() => setInlineEditVocab(null)}
          onSave={handleTagsSave}
        />
      )}
    </div>
  );
}
