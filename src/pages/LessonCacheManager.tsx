/**
 * Lesson Cache Manager
 * Admin page for managing pre-generated lessons (1-20)
 */

import { useState, useEffect } from 'react';
import { 
  Loader2, RefreshCw, Sparkles, Check, Edit, Trash2, 
  Plus, ChevronRight, BookOpen, AlertCircle, FileQuestion, Puzzle
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { logger } from '@/utils/logger';
import {
  lessonCacheAPI,
  type LessonCacheSummary,
  type CachedLesson,
  getLessonHSK,
  getLessonInHSK,
  getStatusEmoji,
  getStatusColor,
  MAX_CACHED_LESSON,
} from '@/services/lessonCacheAPI';
import { LessonEditor } from '@/components/lesson-cache/LessonEditor';
import { BulkGenerateModal } from '@/components/lesson-cache/BulkGenerateModal';

export default function LessonCacheManager() {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonCacheSummary[]>([]);
  const [stats, setStats] = useState({ approved: 0, pending: 0, empty: 0 });
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [variants, setVariants] = useState<CachedLesson[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CachedLesson | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatingPractice, setGeneratingPractice] = useState<string | null>(null);

  // Load lessons summary
  const loadLessons = async () => {
    setLoading(true);
    try {
      const response = await lessonCacheAPI.list();
      setLessons(response.lessons);
      setStats({
        approved: response.approved,
        pending: response.pending,
        empty: response.empty,
      });
    } catch (err) {
      logger.error('Failed to load lesson cache:', err);
      toast.error('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  // Load variants for selected lesson
  const loadVariants = async (lessonNumber: number) => {
    setLoadingVariants(true);
    try {
      const response = await lessonCacheAPI.getLesson(lessonNumber);
      setVariants(response.variants);
    } catch (err) {
      logger.error('Failed to load variants:', err);
      toast.error('Failed to load lesson variants');
    } finally {
      setLoadingVariants(false);
    }
  };

  // Handle lesson selection
  const handleSelectLesson = (lessonNumber: number) => {
    setSelectedLesson(lessonNumber);
    loadVariants(lessonNumber);
  };

  // Generate lesson with AI
  const handleGenerate = async (lessonNumber: number) => {
    setGenerating(lessonNumber);
    try {
      const response = await lessonCacheAPI.generate(lessonNumber, {
        autoApprove: false,
        includePractice: true,
      });
      
      if (response.success) {
        toast.success(
          'Lesson generated',
          `Cost: $${response.generation?.cost?.toFixed(4)} | ${response.generation?.latencyMs}ms`
        );
        loadLessons();
        if (selectedLesson === lessonNumber) {
          loadVariants(lessonNumber);
        }
      } else {
        toast.error('Generation failed', response.error);
      }
    } catch (err) {
      logger.error('Failed to generate lesson:', err);
      toast.error('Failed to generate lesson');
    } finally {
      setGenerating(null);
    }
  };

  // Generate practice for existing lesson
  const handleGeneratePractice = async (lesson: CachedLesson) => {
    setGeneratingPractice(lesson.id);
    try {
      const response = await lessonCacheAPI.generatePractice(
        lesson.lessonNumber,
        { questionCount: 3 },
        lesson.focusWords.length > 0 ? lesson.focusWords : undefined
      );
      
      if (response.success) {
        toast.success(
          'Practice generated',
          `Cost: $${response.generation?.cost?.toFixed(4)}`
        );
        loadVariants(lesson.lessonNumber);
      }
    } catch (err) {
      logger.error('Failed to generate practice:', err);
      toast.error('Failed to generate practice');
    } finally {
      setGeneratingPractice(null);
    }
  };

  // Approve variant
  const handleApprove = async (lesson: CachedLesson) => {
    try {
      await lessonCacheAPI.approve(
        lesson.lessonNumber,
        lesson.focusWords.length > 0 ? lesson.focusWords : undefined
      );
      toast.success('Lesson approved');
      loadLessons();
      loadVariants(lesson.lessonNumber);
    } catch (err) {
      logger.error('Failed to approve lesson:', err);
      toast.error('Failed to approve lesson');
    }
  };

  // Delete variant
  const handleDelete = async (lesson: CachedLesson) => {
    if (!confirm('Delete this lesson variant?')) return;
    
    try {
      await lessonCacheAPI.delete(
        lesson.lessonNumber,
        lesson.focusWords.length > 0 ? lesson.focusWords : undefined
      );
      toast.success('Lesson deleted');
      loadLessons();
      loadVariants(lesson.lessonNumber);
    } catch (err) {
      logger.error('Failed to delete lesson:', err);
      toast.error('Failed to delete lesson');
    }
  };

  // Initial load
  useEffect(() => {
    loadLessons();
  }, []);

  // Group lessons by HSK level
  const hsk1Lessons = lessons.filter(l => l.hskLevel === 1);
  const hsk2Lessons = lessons.filter(l => l.hskLevel === 2);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-indigo-600" />
              Lesson Cache Manager
            </h1>
            <p className="text-gray-500 mt-1">
              Pre-generated lessons for early learners (1-{MAX_CACHED_LESSON})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBulkOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
            >
              <Sparkles className="w-4 h-4" />
              Bulk Generate
            </button>
            <button
              onClick={loadLessons}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-green-700">Approved</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-700">Pending Review</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-3xl font-bold text-red-600">{stats.empty}</div>
            <div className="text-sm text-red-700">Empty</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Lesson Grid */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-4">Lessons 1-{MAX_CACHED_LESSON}</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* HSK 1 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">HSK 1 (Lessons 1-10)</h3>
                <div className="grid grid-cols-5 gap-2">
                  {hsk1Lessons.map((lesson) => (
                    <button
                      key={lesson.lessonNumber}
                      onClick={() => handleSelectLesson(lesson.lessonNumber)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        selectedLesson === lesson.lessonNumber
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-lg font-bold">L{getLessonInHSK(lesson.lessonNumber)}</div>
                      <div className="text-xs">{getStatusEmoji(lesson)}{lesson.variantCount}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* HSK 2 */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">HSK 2 (Lessons 11-20)</h3>
                <div className="grid grid-cols-5 gap-2">
                  {hsk2Lessons.map((lesson) => (
                    <button
                      key={lesson.lessonNumber}
                      onClick={() => handleSelectLesson(lesson.lessonNumber)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        selectedLesson === lesson.lessonNumber
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-lg font-bold">L{getLessonInHSK(lesson.lessonNumber)}</div>
                      <div className="text-xs">{getStatusEmoji(lesson)}{lesson.variantCount}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lesson Detail */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {selectedLesson ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">
                  Lesson {selectedLesson} (HSK {getLessonHSK(selectedLesson)})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerate(selectedLesson)}
                    disabled={generating === selectedLesson}
                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-200"
                  >
                    {generating === selectedLesson ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    AI Generate
                  </button>
                  <button
                    onClick={() => {
                      setEditingLesson(null);
                      setEditorOpen(true);
                    }}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-200"
                  >
                    <Plus className="w-4 h-4" />
                    Add Manual
                  </button>
                </div>
              </div>

              {loadingVariants ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : variants.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No cached lessons yet</p>
                  <p className="text-sm mt-1">Generate with AI or add manually</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`border rounded-lg p-4 ${
                        variant.status === 'approved'
                          ? 'border-green-200 bg-green-50'
                          : variant.status === 'draft'
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(variant.status)}`}>
                            {variant.status}
                          </span>
                          {variant.focusWords.length > 0 && (
                            <span className="text-xs text-gray-500">
                              Focus: {variant.focusWords.join(', ')}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            v{variant.version} • {variant.createdBy}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {variant.status === 'draft' && (
                            <button
                              onClick={() => handleApprove(variant)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingLesson(variant);
                              setEditorOpen(true);
                            }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(variant)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs font-medium text-gray-500">Chinese</div>
                          <div className="text-lg text-gray-900">{variant.chinese}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500">Pinyin</div>
                          <div className="text-gray-700">{variant.pinyin}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500">English</div>
                          <div className="text-gray-600">{variant.english}</div>
                        </div>
                      </div>

                      {/* Practice Section */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Puzzle className="w-3 h-3" />
                            Practice Material
                          </div>
                          {!variant.practice?.multipleChoice?.length && (
                            <button
                              onClick={() => handleGeneratePractice(variant)}
                              disabled={generatingPractice === variant.id}
                              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                              {generatingPractice === variant.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              Generate
                            </button>
                          )}
                        </div>
                        
                        {variant.practice?.multipleChoice?.length ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileQuestion className="w-4 h-4" />
                              {variant.practice.multipleChoice.length} Multiple Choice Questions
                            </div>
                            {variant.practice.buildSentence?.length ? (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Puzzle className="w-4 h-4" />
                                {variant.practice.buildSentence.length} Build Sentence Exercises
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">
                            No practice material yet
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <ChevronRight className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Select a lesson to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && selectedLesson && (
        <LessonEditor
          lessonNumber={selectedLesson}
          existingLesson={editingLesson}
          onClose={() => {
            setEditorOpen(false);
            setEditingLesson(null);
          }}
          onSave={() => {
            setEditorOpen(false);
            setEditingLesson(null);
            loadLessons();
            loadVariants(selectedLesson);
          }}
        />
      )}

      {/* Bulk Generate Modal */}
      {bulkOpen && (
        <BulkGenerateModal
          onClose={() => setBulkOpen(false)}
          onComplete={() => {
            setBulkOpen(false);
            loadLessons();
          }}
        />
      )}
    </div>
  );
}

