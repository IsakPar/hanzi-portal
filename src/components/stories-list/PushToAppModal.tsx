import { useState } from 'react';
import type { Story } from '@/services/storiesAPI';
import { Rocket, Plus, RefreshCw, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface PushToAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: {
    added: string[];
    removed: string[];
    reordered: string[];
  };
  stories: Story[];
  onPushComplete: () => void;
}

export function PushToAppModal({
  isOpen,
  onClose,
  changes,
  stories,
  onPushComplete,
}: PushToAppModalProps) {
  const [pushing, setPushing] = useState(false);
  const [pushComplete, setPushComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getStoryTitle = (id: string) => {
    const story = stories.find(s => s.id === id);
    return story?.title || id;
  };

  const totalChanges = changes.added.length + changes.removed.length + changes.reordered.length;

  const handlePush = async () => {
    setPushing(true);
    setError(null);
    
    try {
      // TODO: Call actual sync API endpoint
      // For now, simulate a push
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPushComplete(true);
      setTimeout(() => {
        onPushComplete();
        onClose();
        setPushComplete(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Push to App</h2>
              <p className="text-sm text-gray-500">Review changes before syncing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto bg-white">
          {pushComplete ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Push Complete!</h3>
              <p className="text-gray-500 text-sm">Changes are now live in the app</p>
            </div>
          ) : (
            <>
              {/* Added */}
              {changes.added.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-emerald-700">
                      Adding {changes.added.length} {changes.added.length === 1 ? 'story' : 'stories'}
                    </span>
                  </div>
                  <div className="space-y-2 pl-8">
                    {changes.added.map(id => (
                      <div key={id} className="flex items-center gap-2 text-sm text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {getStoryTitle(id)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reordered */}
              {changes.reordered.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-blue-700">
                      Reordering {changes.reordered.length} {changes.reordered.length === 1 ? 'category' : 'categories'}
                    </span>
                  </div>
                  <div className="space-y-2 pl-8">
                    {changes.reordered.map(id => (
                      <div key={id} className="flex items-center gap-2 text-sm text-blue-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {getStoryTitle(id)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed */}
              {changes.removed.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-semibold text-red-700">
                      Removing {changes.removed.length} {changes.removed.length === 1 ? 'story' : 'stories'}
                    </span>
                  </div>
                  <div className="space-y-2 pl-8">
                    {changes.removed.map(id => (
                      <div key={id} className="flex items-center gap-2 text-sm text-red-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {getStoryTitle(id)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No changes */}
              {totalChanges === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Everything is up to date!</p>
                  <p className="text-gray-400 text-sm mt-1">No pending changes to push</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!pushComplete && (
          <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
            <div className="text-sm text-gray-500 font-medium">
              {totalChanges} change{totalChanges !== 1 ? 's' : ''} pending
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 hover:bg-gray-200 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePush}
                disabled={pushing || totalChanges === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg ${
                  pushing || totalChanges === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-200'
                }`}
              >
                {pushing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Confirm Push
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
