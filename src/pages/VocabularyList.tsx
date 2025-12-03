import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Download,
  Upload,
  Edit,
  Trash2,
  AlertCircle,
  Zap,
  Volume2,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Bot,
  Tag,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  searchVocabulary,
  getCategories,
  deleteVocabulary,
  exportVocabulary,
  HSK_LEVELS,
  type VocabularyEntry,
} from "@/services/vocabularyAPI";
import api from "@/services/api";
import { useGlobalConfirm } from "@/hooks/useConfirm";
import { toast } from "@/hooks/useToast";
import { SkeletonVocabularyTable } from "@/components/ui/skeleton";
import { EmptyVocabulary, EmptySearchResults } from "@/components/ui/empty-state";
import { VirtualizedTable, type VirtualizedTableColumn } from "@/components/ui/virtualized-table";
import { BulkTagProgressModal } from "@/components/ui/BulkTagProgressModal";
import { InlineTagEditor } from "@/components/ui/InlineTagEditor";

interface LessonOption {
  id: string;
  title: string;
  lessonNumber: number;
  hskLevel: number;
  contentStatus?: string;
  vocabCount?: number;
  withAudio?: number;
  withSecondary?: number;
  untaggedCount?: number;
}

export function VocabularyList() {
  const navigate = useNavigate();
  const confirm = useGlobalConfirm();
  
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHSK, setSelectedHSK] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;
  
  // Completeness filters
  const [filterHasAudio, setFilterHasAudio] = useState(false);
  const [filterHasExample, setFilterHasExample] = useState(false);
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [filterMissingSecondary, setFilterMissingSecondary] = useState(false);
  
  // Lesson filter
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  
  // Bulk operations
  const [bulkTagging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [bulkTagWordIds, setBulkTagWordIds] = useState<string[]>([]);
  
  // Inline tag editor
  const [inlineEditVocab, setInlineEditVocab] = useState<{
    id: string;
    hanzi: string;
    tags: string[];
    position: { top: number; left: number };
  } | null>(null);

  useEffect(() => {
    loadCategories();
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      // Use summary endpoint which includes vocab stats
      const response = await api.get<{ lessons: LessonOption[] }>('/v1/lessons/summary');
      // Sort by HSK level then lesson number
      const sorted = (response.lessons || []).sort((a, b) => {
        if (a.hskLevel !== b.hskLevel) return a.hskLevel - b.hskLevel;
        return a.lessonNumber - b.lessonNumber;
      });
      setLessons(sorted);
    } catch {
      // Ignore - lessons filter is optional
    }
  }

  useEffect(() => {
    loadVocabulary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedHSK, selectedCategory, selectedLesson, page]);

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

  // Bulk tag secondary categories
  const handleBulkTagSecondary = async () => {
    // Get IDs to tag - either selected or all visible that are missing secondary categories
    const idsToTag = selectedIds.size > 0 
      ? Array.from(selectedIds)
      : filteredVocabulary
          .filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0)
          .slice(0, 100) // Max 100 at a time
          .map(v => v.id);
    
    if (idsToTag.length === 0) {
      toast.info("Nothing to tag", "All visible words already have secondary categories");
      return;
    }

    // Open progress modal
    setBulkTagWordIds(idsToTag);
    setShowProgressModal(true);
  };

  // Tag a batch of words - called by progress modal
  const tagBatch = async (ids: string[]) => {
    const result = await api.post<{
      results: { wordId: string; hanzi: string; secondaryCategories: string[] | null; success: boolean }[];
      summary: { successful: number; failed: number };
    }>('/v1/vocabulary/admin/bulk-tag-secondary-categories', { wordIds: ids });

    return result.results.map(r => ({
      wordId: r.wordId,
      hanzi: r.hanzi,
      categories: r.secondaryCategories,
      success: r.success,
    }));
  };

  // Called when progress modal completes
  const handleBulkTagComplete = (results: { wordId: string; hanzi: string; categories: string[] | null; success: boolean }[]) => {
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
    
    setSelectedIds(new Set());
    setShowProgressModal(false);
    
    const successCount = results.filter(r => r.success).length;
    toast.success("Bulk tagging complete", `Tagged ${successCount} words with secondary categories`);
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible
  const selectAllVisible = () => {
    const allIds = new Set(filteredVocabulary.map(v => v.id));
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Helper to check completeness
  const getCompletenessStatus = (entry: VocabularyEntry) => {
    const hasAudio = !!entry.wordAudioR2Key;
    const hasExample = !!entry.exampleChinese;
    return { hasAudio, hasExample, isComplete: hasAudio && hasExample };
  };

  async function loadCategories() {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch {
      // Ignore error, categories are optional
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
  }, [confirm, loadVocabulary]);

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

  const getHSKColor = (level: number) => {
    return HSK_LEVELS.find((h) => h.value === level)?.color || "bg-gray-100 text-gray-700";
  };

  // Virtualized table columns definition
  const virtualizedColumns = useMemo<VirtualizedTableColumn<VocabularyEntry>[]>(() => [
    {
      key: 'select',
      header: '☑',
      width: '40px',
      render: (entry) => (
        <input
          type="checkbox"
          checked={selectedIds.has(entry.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelection(entry.id);
          }}
          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
        />
      ),
    },
    {
      key: 'rowNum',
      header: '#',
      width: '60px',
      render: (entry) => (
        <span className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
          {entry.rowNum || '—'}
        </span>
      ),
    },
    {
      key: 'hanzi',
      header: 'Hanzi',
      width: '120px',
      render: (entry) => (
        <span className="text-2xl font-medium text-gray-900">{entry.hanzi}</span>
      ),
    },
    {
      key: 'pinyin',
      header: 'Pinyin',
      width: '150px',
      render: (entry) => (
        <span className="text-sm text-gray-700">{entry.pinyin}</span>
      ),
    },
    {
      key: 'english',
      header: 'English',
      render: (entry) => (
        <span className="text-sm text-gray-700 truncate">{entry.english}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      width: '120px',
      render: (entry) => (
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
          {entry.category}
        </span>
      ),
    },
    {
      key: 'hsk',
      header: 'HSK',
      width: '80px',
      render: (entry) => (
        <span className={`text-xs px-2 py-1 rounded font-medium ${getHSKColor(entry.hskLevel)}`}>
          HSK {entry.hskLevel}
        </span>
      ),
    },
    {
      key: 'secondaryCategories',
      header: 'Tags',
      width: '140px',
      render: (entry) => {
        const tags = entry.secondaryCategories || [];
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setInlineEditVocab({
                id: entry.id,
                hanzi: entry.hanzi,
                tags: tags,
                position: { top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 340) },
              });
            }}
            className="text-left hover:bg-pink-50 rounded px-1 py-0.5 -mx-1 transition-colors cursor-pointer"
          >
            {tags.length === 0 ? (
              <span className="text-gray-400 text-xs italic">+ Add tags</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                    {tag}
                  </span>
                ))}
                {tags.length > 2 && (
                  <span className="text-xs text-gray-500">+{tags.length - 2}</span>
                )}
              </div>
            )}
          </button>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (entry) => {
        const { hasAudio, hasExample, isComplete } = getCompletenessStatus(entry);
        return (
          <div className="flex items-center gap-1.5">
            <span className={`${hasAudio ? 'text-emerald-500' : 'text-gray-300'}`} title={hasAudio ? 'Has audio' : 'No audio'}>
              <Volume2 className="w-4 h-4" />
            </span>
            <span className={`${hasExample ? 'text-blue-500' : 'text-gray-300'}`} title={hasExample ? 'Has example' : 'No example'}>
              <MessageSquare className="w-4 h-4" />
            </span>
            <span title={isComplete ? 'Complete' : 'Incomplete'}>
              {isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      headerClassName: 'text-right',
      className: 'justify-end',
      render: (entry) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/vocabulary/${entry.id}/edit`);
            }}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(entry.id);
            }}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ], [getHSKColor, navigate, handleDelete, selectedIds, toggleSelection]);

  // Use virtualization for large datasets (100+ items)
  const useVirtualization = filteredVocabulary.length > 100;

  if (loading && vocabulary.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading vocabulary...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Vocabulary Database
            </h1>
            <p className="text-gray-600 mt-2">
              {total} total entries
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/vocabulary/tagging")}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <Bot className="w-4 h-4 mr-2" />
              AI Tagging
            </Button>
            <Button
              onClick={() => navigate("/vocabulary/import")}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => navigate("/vocabulary/new")}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search hanzi, pinyin, or English..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* HSK Level Filter */}
          <div>
            <select
              value={selectedHSK || ""}
              onChange={(e) => {
                setSelectedHSK(e.target.value ? Number(e.target.value) : null);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All HSK Levels</option>
              {HSK_LEVELS.map((hsk) => (
                <option key={hsk.value} value={hsk.value}>
                  {hsk.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second row: Lesson filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pt-3 border-t border-gray-100">
          {/* Lesson Filter */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <select
                value={selectedLesson}
                onChange={(e) => {
                  setSelectedLesson(e.target.value);
                  setPage(0);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="">All Lessons</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    HSK{lesson.hskLevel} L{lesson.lessonNumber}: {lesson.title}
                    {lesson.vocabCount !== undefined && ` (${lesson.vocabCount} words)`}
                    {lesson.untaggedCount && lesson.untaggedCount > 0 ? ` ⚠️ ${lesson.untaggedCount} untagged` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="md:col-span-2 flex items-center gap-2 justify-end">
            {selectedIds.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedIds.size} selected
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={selectedIds.size > 0 ? clearSelection : selectAllVisible}
              className="text-gray-600"
            >
              {selectedIds.size > 0 ? "Clear" : "Select All"}
            </Button>
            <Button
              size="sm"
              onClick={handleBulkTagSecondary}
              disabled={bulkTagging}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {bulkTagging ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Tagging...
                </>
              ) : (
                <>
                  <Tag className="w-3 h-3 mr-1" />
                  AI Tag Secondary ({selectedIds.size > 0 ? selectedIds.size : `up to 50`})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Completeness Filters */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={() => setFilterHasAudio(!filterHasAudio)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterHasAudio
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Has Audio
          </button>
          <button
            onClick={() => setFilterHasExample(!filterHasExample)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterHasExample
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Has Example
          </button>
          <button
            onClick={() => setFilterIncomplete(!filterIncomplete)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterIncomplete
                ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Incomplete Only
          </button>
          <button
            onClick={() => setFilterMissingSecondary(!filterMissingSecondary)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterMissingSecondary
                ? 'bg-pink-100 text-pink-700 border-2 border-pink-400'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Missing Secondary
          </button>
          
          {/* Stats */}
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-emerald-500" />
              {vocabulary.filter(v => v.wordAudioR2Key).length} audio
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-blue-500" />
              {vocabulary.filter(v => v.exampleChinese).length} examples
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-pink-500" />
              {vocabulary.filter(v => v.secondaryCategories && v.secondaryCategories.length > 0).length} secondary
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              {vocabulary.filter(v => !v.wordAudioR2Key || !v.exampleChinese).length} incomplete
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar - Shows when filtering by lesson */}
      {selectedLesson && (() => {
        const lesson = lessons.find(l => l.id === selectedLesson);
        if (!lesson) return null;
        
        return (
          <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-indigo-900">
                    HSK{lesson.hskLevel} L{lesson.lessonNumber}: {lesson.title}
                  </h3>
                  {lesson.contentStatus && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      lesson.contentStatus === 'live' ? 'bg-green-100 text-green-700' :
                      lesson.contentStatus === 'staging' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {lesson.contentStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-indigo-700">{lesson.vocabCount || 0}</span> words
                  </span>
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium">{lesson.withAudio || 0}</span> with audio
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-pink-500" />
                    <span className="font-medium">{lesson.withSecondary || 0}</span> with tags
                  </span>
                  {lesson.untaggedCount && lesson.untaggedCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="font-medium">{lesson.untaggedCount}</span> need tagging
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lesson.untaggedCount && lesson.untaggedCount > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      // Select words missing secondary categories and trigger bulk tag
                      const untaggedIds = filteredVocabulary
                        .filter(v => !v.secondaryCategories || v.secondaryCategories.length === 0)
                        .map(v => v.id);
                      setSelectedIds(new Set(untaggedIds));
                      // Small delay then trigger bulk tag
                      setTimeout(() => handleBulkTagSecondary(), 100);
                    }}
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    AI Tag Missing ({lesson.untaggedCount})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit Lesson
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Vocabulary Table */}
      {loading ? (
        <SkeletonVocabularyTable rows={10} />
      ) : filteredVocabulary.length === 0 ? (
        searchTerm || selectedHSK || selectedCategory || filterHasAudio || filterHasExample || filterIncomplete ? (
          <EmptySearchResults />
        ) : (
          <EmptyVocabulary 
            onAction={() => navigate("/vocabulary/new")} 
          />
        )
      ) : useVirtualization ? (
        /* Virtualized table for large datasets */
        <VirtualizedTable
          data={filteredVocabulary}
          columns={virtualizedColumns}
          getRowKey={(item) => item.id}
          rowHeight={56}
          maxHeight={600}
          onRowClick={(item) => navigate(`/vocabulary/${item.id}/edit`)}
        />
      ) : (
        /* Standard table for smaller datasets */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredVocabulary.length && filteredVocabulary.length > 0}
                      onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hanzi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pinyin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    English
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HSK
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVocabulary.map((entry) => (
                  <tr key={entry.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(entry.id) ? 'bg-pink-50' : ''}`}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => toggleSelection(entry.id)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        {entry.rowNum || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-2xl font-medium text-gray-900">
                        {entry.hanzi}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{entry.pinyin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{entry.english}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getHSKColor(entry.hskLevel)}`}>
                        HSK {entry.hskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const tags = entry.secondaryCategories || [];
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.target as HTMLElement).getBoundingClientRect();
                              setInlineEditVocab({
                                id: entry.id,
                                hanzi: entry.hanzi,
                                tags: tags,
                                position: { top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 340) },
                              });
                            }}
                            className="text-left hover:bg-pink-50 rounded px-1 py-0.5 -mx-1 transition-colors cursor-pointer"
                          >
                            {tags.length === 0 ? (
                              <span className="text-gray-400 text-xs italic">+ Add tags</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {tags.slice(0, 2).map((tag, i) => (
                                  <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                                    {tag}
                                  </span>
                                ))}
                                {tags.length > 2 && (
                                  <span className="text-xs text-gray-500">+{tags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const { hasAudio, hasExample, isComplete } = getCompletenessStatus(entry);
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`${hasAudio ? 'text-emerald-500' : 'text-gray-300'}`} title={hasAudio ? 'Has audio' : 'No audio'}>
                              <Volume2 className="w-4 h-4" />
                            </span>
                            <span className={`${hasExample ? 'text-blue-500' : 'text-gray-300'}`} title={hasExample ? 'Has example' : 'No example'}>
                              <MessageSquare className="w-4 h-4" />
                            </span>
                            <span title={isComplete ? 'Complete' : 'Incomplete'}>
                              {isComplete ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/vocabulary/${entry.id}/edit`)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination - only for non-virtualized view */}
      {!useVirtualization && total > limit && (
        <div className="mt-4 px-6 py-4 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Tag Progress Modal */}
      <BulkTagProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        wordIds={bulkTagWordIds}
        onTagBatch={tagBatch}
        onComplete={handleBulkTagComplete}
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
          onSave={(tags) => {
            // Update local state
            setVocabulary(prev => prev.map(v => 
              v.id === inlineEditVocab.id 
                ? { ...v, secondaryCategories: tags }
                : v
            ));
            // Refresh lesson counts
            loadLessons();
            setInlineEditVocab(null);
            toast.success("Tags saved", `Updated secondary categories for ${inlineEditVocab.hanzi}`);
          }}
        />
      )}
    </div>
  );
}

