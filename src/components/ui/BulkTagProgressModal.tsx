import { useState, useEffect, useRef } from 'react';
import { X, Tag, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './button';

interface TagResult {
  wordId: string;
  hanzi: string;
  categories: string[] | null;
  success: boolean;
  error?: string;
}

interface BulkTagProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordIds: string[];
  onTagBatch: (ids: string[]) => Promise<TagResult[]>;
  onComplete: (results: TagResult[]) => void;
  batchSize?: number;
}

export function BulkTagProgressModal({
  isOpen,
  onClose,
  wordIds,
  onTagBatch,
  onComplete,
  batchSize = 5,
}: BulkTagProgressModalProps) {
  const [progress, setProgress] = useState(0);
  const [tagged, setTagged] = useState(0);
  const [failed, setFailed] = useState(0);
  const [recentResults, setRecentResults] = useState<TagResult[]>([]);
  const [, setAllResults] = useState<TagResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRef = useRef(false);

  const total = wordIds.length;
  const remaining = total - tagged - failed;

  // Start processing when modal opens
  useEffect(() => {
    if (isOpen && wordIds.length > 0 && !isRunning) {
      startProcessing();
    }
    return () => {
      cancelRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startProcessing = async () => {
    setIsRunning(true);
    setIsCancelled(false);
    cancelRef.current = false;
    setProgress(0);
    setTagged(0);
    setFailed(0);
    setRecentResults([]);
    setAllResults([]);

    const results: TagResult[] = [];
    
    // Process in batches
    for (let i = 0; i < wordIds.length; i += batchSize) {
      if (cancelRef.current) {
        setIsCancelled(true);
        break;
      }

      const batch = wordIds.slice(i, i + batchSize);
      
      try {
        const batchResults = await onTagBatch(batch);
        results.push(...batchResults);
        
        const successCount = batchResults.filter(r => r.success).length;
        const failCount = batchResults.filter(r => !r.success).length;
        
        setTagged(prev => prev + successCount);
        setFailed(prev => prev + failCount);
        setProgress(Math.round(((i + batch.length) / wordIds.length) * 100));
        setRecentResults(prev => [...batchResults, ...prev].slice(0, 5));
        setAllResults(prev => [...prev, ...batchResults]);
      } catch (err) {
        // Batch failed entirely
        setFailed(prev => prev + batch.length);
        setProgress(Math.round(((i + batch.length) / wordIds.length) * 100));
      }

      // Small delay between batches for UI smoothness
      if (i + batchSize < wordIds.length && !cancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setIsRunning(false);
    
    if (!cancelRef.current) {
      // Completed successfully - wait a moment then close
      setTimeout(() => {
        onComplete(results);
      }, 1500);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setIsCancelled(true);
  };

  const handleClose = () => {
    cancelRef.current = true;
    onClose();
  };

  if (!isOpen) return null;

  const isComplete = progress === 100 && !isRunning;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isComplete ? handleClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isComplete ? 'Tagging Complete!' : isCancelled ? 'Tagging Cancelled' : 'Tagging Secondary Categories'}
                </h2>
                <p className="text-sm text-white/80">
                  {isComplete ? `Tagged ${tagged} words` : `Processing ${total} words...`}
                </p>
              </div>
            </div>
            {isComplete && (
              <button
                onClick={handleClose}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-6 py-5">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                  isCancelled ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                  'bg-gradient-to-r from-pink-500 to-purple-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <div className="text-2xl font-bold text-emerald-600">{tagged}</div>
              <div className="text-xs text-emerald-700">Tagged</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-600">{remaining}</div>
              <div className="text-xs text-gray-600">Remaining</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <div className="text-2xl font-bold text-red-600">{failed}</div>
              <div className="text-xs text-red-700">Failed</div>
            </div>
          </div>

          {/* Recent Results */}
          {recentResults.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Recently Tagged</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recentResults.map((result, i) => (
                  <div 
                    key={`${result.wordId}-${i}`}
                    className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                      result.success ? 'bg-emerald-50' : 'bg-red-50'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-900">{result.hanzi}</span>
                    {result.success && result.categories && result.categories.length > 0 && (
                      <>
                        <span className="text-gray-400">→</span>
                        <div className="flex gap-1 flex-wrap">
                          {result.categories.slice(0, 3).map((cat, ci) => (
                            <span key={ci} className="text-xs px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {!result.success && (
                      <span className="text-xs text-red-600">{result.error || 'Failed'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          {isComplete ? (
            <Button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              Done
            </Button>
          ) : isCancelled ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  // Reset and restart
                  setIsCancelled(false);
                  startProcessing();
                }}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
              >
                Retry
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full"
              disabled={!isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancel
                </>
              ) : (
                'Waiting...'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

