/**
 * Bulk Generate Modal
 * Generate multiple lessons at once using AI
 */

import { useState } from 'react';
import { X, Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { logger } from '@/utils/logger';
import { lessonCacheAPI, MAX_CACHED_LESSON } from '@/services/lessonCacheAPI';

interface BulkGenerateModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function BulkGenerateModal({ onClose, onComplete }: BulkGenerateModalProps) {
  const [generating, setGenerating] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<Array<{
    lessonNumber: number;
    success: boolean;
    error?: string;
    cost?: number;
  }> | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  // Toggle lesson selection
  const toggleLesson = (num: number) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(num)) {
      newSelected.delete(num);
    } else {
      newSelected.add(num);
    }
    setSelectedLessons(newSelected);
  };

  // Select all lessons
  const selectAll = () => {
    const all = new Set<number>();
    for (let i = 1; i <= MAX_CACHED_LESSON; i++) {
      all.add(i);
    }
    setSelectedLessons(all);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedLessons(new Set());
  };

  // Generate selected lessons
  const handleGenerate = async () => {
    if (selectedLessons.size === 0) {
      toast.error('No lessons selected');
      return;
    }

    setGenerating(true);
    setResults(null);

    try {
      const lessons = Array.from(selectedLessons).map(num => ({
        lessonNumber: num,
      }));

      const response = await lessonCacheAPI.bulkGenerate({
        lessons,
        autoApprove,
      });

      setResults(response.results);
      setTotalCost(response.totalCost);

      if (response.success) {
        toast.success(
          'Generation complete',
          `${response.generated} lessons generated • $${response.totalCost.toFixed(4)}`
        );
      } else {
        toast.warning(
          'Partial success',
          `${response.generated} succeeded, ${response.failed} failed`
        );
      }
    } catch (err) {
      logger.error('Bulk generation failed:', err);
      toast.error('Bulk generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Bulk Generate Lessons
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!results ? (
            <>
              {/* Lesson Selector */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select lessons to generate
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* HSK 1 */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">HSK 1 (1-10)</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        onClick={() => toggleLesson(num)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          selectedLessons.has(num)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HSK 2 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">HSK 2 (11-20)</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 10 }, (_, i) => i + 11).map(num => (
                      <button
                        key={num}
                        onClick={() => toggleLesson(num)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          selectedLessons.has(num)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={(e) => setAutoApprove(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    Auto-approve generated lessons
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  If unchecked, lessons will be saved as drafts for review
                </p>
              </div>

              {/* Cost Estimate */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Estimated cost:</strong> ~${(selectedLessons.size * 0.0003).toFixed(4)}
                    <br />
                    <span className="text-xs">
                      ({selectedLessons.size} lessons × ~$0.0003 each)
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Results */
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <strong>Total cost:</strong> ${totalCost.toFixed(4)}
                  <span className="mx-2">•</span>
                  <span className="text-green-600">
                    {results.filter(r => r.success).length} succeeded
                  </span>
                  {results.some(r => !r.success) && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-red-600">
                        {results.filter(r => !r.success).length} failed
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map(result => (
                  <div
                    key={result.lessonNumber}
                    className={`flex items-center justify-between p-2 rounded ${
                      result.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">
                        Lesson {result.lessonNumber}
                      </span>
                    </div>
                    {result.success ? (
                      <span className="text-xs text-green-600">
                        ${result.cost?.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-red-600">
                        {result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          {results ? (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || selectedLessons.size === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generating ? 'Generating...' : `Generate ${selectedLessons.size} Lessons`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

