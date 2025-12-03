import { useState, useEffect, useMemo, useCallback } from "react";
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
import { SkeletonVocabularyTable } from "@/components/ui/skeleton";
import { EmptyVocabulary, EmptySearchResults } from "@/components/ui/empty-state";
import { BulkTagProgressModal } from "@/components/ui/BulkTagProgressModal";
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
  
  // Inline tag editor state
  const [inlineEditVocab, setInlineEditVocab] = useState<{
    id: string;
    hanzi: string;
    tags: string[];
    position: { top: number; left: number };
  } | null>(null);

  // Filter vocabulary by completeness (client-side)
  const filteredVocabulary = useMemo(() => {
    let result = vocabulary;
    
    if (filterHasAudio) {
      result = result.filter(v => v.wordAudioR2Key);
    }
    if (filterHasExample) {
      result = result.filter(v => v.exampleChinese);
    }
    if (filterIncomplete) {
      result = result.filter(v => !v.wordAudioR2Key || !v.exampleChinese);
    }
    if (filterMissingSecondary) {
      result = result.filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0);
    }
    
    return result;
  }, [vocabulary, filterHasAudio, filterHasExample, filterIncomplete, filterMissingSecondary]);

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

  // Load vocabulary when filters change
  useEffect(() => {
    loadVocabulary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedHSK, selectedCategory, selectedLesson, page]);

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

      const response = await searchVocabulary({
        query: searchTerm || undefined,
        hsk_level: selectedHSK || undefined,
        category: selectedCategory || undefined,
        lesson_id: selectedLesson || undefined,
        limit,
        offset: page * limit,
        sort: 'hanzi',
        order: 'asc',
      });

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

  // Loading state
  if (loading && vocabulary.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading vocabulary...</p>
      </div>
    );
  }

  const hasFilters = searchTerm || selectedHSK || selectedCategory || filterHasAudio || filterHasExample || filterIncomplete;

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
        onFilterHasAudioChange={setFilterHasAudio}
        filterHasExample={filterHasExample}
        onFilterHasExampleChange={setFilterHasExample}
        filterIncomplete={filterIncomplete}
        onFilterIncompleteChange={setFilterIncomplete}
        filterMissingSecondary={filterMissingSecondary}
        onFilterMissingSecondaryChange={setFilterMissingSecondary}
        selectedCount={selection.selectedCount}
        onSelectAll={selection.selectAll}
        onClearSelection={selection.clear}
        bulkTagging={bulkTagging.isTagging}
        onBulkTagSecondary={handleBulkTagSecondary}
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
