import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Volume2,
  MessageSquare,
  AlertTriangle,
  Tag,
  Loader2,
  BookOpen,
  Zap,
  ChevronDown,
} from "lucide-react";
import { HSK_LEVELS } from "@/services/vocabularyAPI";
import type { BulkOperationType } from "@/hooks/useBulkOperations";

export interface LessonOption {
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

interface VocabFiltersProps {
  // Search
  searchTerm: string;
  onSearchChange: (value: string) => void;
  
  // HSK
  selectedHSK: number | null;
  onHSKChange: (value: number | null) => void;
  
  // Category
  selectedCategory: string;
  categories: string[];
  onCategoryChange: (value: string) => void;
  
  // Lesson
  selectedLesson: string;
  lessons: LessonOption[];
  onLessonChange: (value: string) => void;
  
  // Completeness filters
  filterHasAudio: boolean;
  onFilterHasAudioChange: (value: boolean) => void;
  filterHasExample: boolean;
  onFilterHasExampleChange: (value: boolean) => void;
  filterIncomplete: boolean;
  onFilterIncompleteChange: (value: boolean) => void;
  filterMissingSecondary: boolean;
  onFilterMissingSecondaryChange: (value: boolean) => void;
  filterInLesson: boolean;
  onFilterInLessonChange: (value: boolean) => void;
  
  // Selection
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  
  // Bulk operations
  bulkTagging?: boolean; // Legacy, kept for compatibility
  onBulkTagSecondary?: () => void; // Legacy, kept for compatibility
  bulkOperationRunning?: boolean;
  onBulkOperation?: (type: BulkOperationType) => void;
  
  // Stats
  stats: {
    withAudio: number;
    withExamples: number;
    withSecondary: number;
    incomplete: number;
  };
}

export function VocabFilters({
  searchTerm,
  onSearchChange,
  selectedHSK,
  onHSKChange,
  selectedCategory,
  categories,
  onCategoryChange,
  selectedLesson,
  lessons,
  onLessonChange,
  filterHasAudio,
  onFilterHasAudioChange,
  filterHasExample,
  onFilterHasExampleChange,
  filterIncomplete,
  onFilterIncompleteChange,
  filterMissingSecondary,
  onFilterMissingSecondaryChange,
  filterInLesson,
  onFilterInLessonChange,
  selectedCount,
  onSelectAll,
  onClearSelection,
  bulkTagging,
  onBulkTagSecondary: _onBulkTagSecondary, // Legacy prop, now using bulk operations
  bulkOperationRunning = false,
  onBulkOperation,
  stats,
}: VocabFiltersProps) {
  // Suppress unused variable warning
  void _onBulkTagSecondary;
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  
  const handleBulkAction = (type: BulkOperationType) => {
    setShowBulkMenu(false);
    onBulkOperation?.(type);
  };
  
  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* First row: Search, HSK, Category */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search hanzi, pinyin, or English..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <select
            value={selectedHSK || ""}
            onChange={(e) => onHSKChange(e.target.value ? Number(e.target.value) : null)}
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

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
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

      {/* Second row: Lesson filter & Bulk actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pt-3 border-t border-gray-100">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <select
              value={selectedLesson}
              onChange={(e) => onLessonChange(e.target.value)}
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

        <div className="md:col-span-2 flex items-center gap-2 justify-end">
          {selectedCount > 0 && (
            <span className="text-sm text-gray-600">
              {selectedCount} selected
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={selectedCount > 0 ? onClearSelection : onSelectAll}
            className="text-gray-600"
          >
            {selectedCount > 0 ? "Clear" : "Select All"}
          </Button>
          
          {/* Bulk Operations Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              disabled={bulkOperationRunning || bulkTagging}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {bulkOperationRunning ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Bulk Actions ({selectedCount > 0 ? selectedCount : 'all'})
                  <ChevronDown className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
            
            {showBulkMenu && !bulkOperationRunning && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowBulkMenu(false)} 
                />
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
                  <div className="py-2">
                    <button
                      onClick={() => handleBulkAction('audio')}
                      className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 transition-colors"
                    >
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Volume2 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Generate Audio</div>
                        <div className="text-xs text-gray-500">Azure TTS at 1.0x speed</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleBulkAction('example')}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
                    >
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Generate Examples</div>
                        <div className="text-xs text-gray-500">AI example sentences + audio</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleBulkAction('tags')}
                      className="w-full px-4 py-3 text-left hover:bg-pink-50 flex items-center gap-3 transition-colors"
                    >
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <Tag className="w-4 h-4 text-pink-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Auto-Tag</div>
                        <div className="text-xs text-gray-500">POS, tone patterns, etc.</div>
                      </div>
                    </button>
                    
                    <div className="border-t border-gray-100 my-2" />
                    
                    <button
                      onClick={() => handleBulkAction('complete')}
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center gap-3 transition-colors"
                    >
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Zap className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Complete All</div>
                        <div className="text-xs text-gray-500">Audio + example + tags</div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Third row: Completeness Filters */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => onFilterHasAudioChange(!filterHasAudio)}
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
          onClick={() => onFilterHasExampleChange(!filterHasExample)}
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
          onClick={() => onFilterIncompleteChange(!filterIncomplete)}
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
          onClick={() => onFilterMissingSecondaryChange(!filterMissingSecondary)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterMissingSecondary
              ? 'bg-pink-100 text-pink-700 border-2 border-pink-400'
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Missing Secondary
        </button>
        <button
          onClick={() => onFilterInLessonChange(!filterInLesson)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterInLesson
              ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400'
              : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          In Lesson
        </button>
        
        {/* Stats */}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-emerald-500" />
            {stats.withAudio} audio
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-blue-500" />
            {stats.withExamples} examples
          </span>
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-pink-500" />
            {stats.withSecondary} secondary
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            {stats.incomplete} incomplete
          </span>
        </div>
      </div>
    </div>
  );
}

