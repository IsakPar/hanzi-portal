/**
 * BulkOperationsModal
 * 
 * Shows progress for bulk vocabulary operations
 */

import { X, CheckCircle2, XCircle, Loader2, Volume2, MessageSquare, Tag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BulkOperationType, BulkOperationProgress } from '@/hooks/useBulkOperations';

interface BulkOperationsModalProps {
  isOpen: boolean;
  isRunning: boolean;
  operationType: BulkOperationType;
  progress: BulkOperationProgress;
  onAbort: () => void;
  onClose: () => void;
}

const operationLabels: Record<BulkOperationType, { title: string; icon: React.ReactNode }> = {
  audio: { title: 'Generating Audio', icon: <Volume2 className="w-5 h-5" /> },
  example: { title: 'Generating Examples', icon: <MessageSquare className="w-5 h-5" /> },
  tags: { title: 'Auto-Tagging', icon: <Tag className="w-5 h-5" /> },
  complete: { title: 'Complete Processing', icon: <Zap className="w-5 h-5" /> },
};

export function BulkOperationsModal({
  isOpen,
  isRunning,
  operationType,
  progress,
  onAbort,
  onClose,
}: BulkOperationsModalProps) {
  if (!isOpen) return null;

  const { title, icon } = operationLabels[operationType];
  const percentComplete = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            {icon}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-6 space-y-4">
          {/* Stage indicator (for complete operation) */}
          {progress.stage && (
            <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium">
              {progress.stage}
            </div>
          )}

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">
                {isRunning ? (
                  <>Processing <strong>{progress.current}</strong>...</>
                ) : (
                  'Complete!'
                )}
              </span>
              <span className="font-medium text-gray-900">
                {progress.completed} / {progress.total}
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-800">{progress.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-600">{progress.successful}</div>
              <div className="text-xs text-green-600">Success</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
          </div>

          {/* Recent results */}
          {progress.results.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <div className="divide-y">
                {progress.results.slice(-10).reverse().map((result, i) => (
                  <div
                    key={`${result.wordId}-${i}`}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{result.hanzi}</span>
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 truncate max-w-[150px]">
                          {result.error}
                        </span>
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          {isRunning ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-500 mr-auto">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
              <Button variant="outline" onClick={onAbort}>
                Stop
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

