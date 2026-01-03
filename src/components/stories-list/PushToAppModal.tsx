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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Push to App</h2>
              <p className="text-sm text-zinc-400">Review changes before pushing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {pushComplete ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Push Complete!</h3>
              <p className="text-zinc-400 text-sm">Changes are now live in the app</p>
            </div>
          ) : (
            <>
              {/* Added */}
              {changes.added.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-600/20 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="font-medium text-emerald-400">
                      Adding ({changes.added.length})
                    </span>
                  </div>
                  <div className="space-y-2 pl-8">
                    {changes.added.map(id => (
                      <div key={id} className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {getStoryTitle(id)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reordered */}
              {changes.reordered.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="font-medium text-blue-400">
                      Reordering ({changes.reordered.length})
                    </span>
                  </div>
                  <div className="space-y-2 pl-8">
                    {changes.reordered.map(id => (
                      <div key={id} className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {getStoryTitle(id)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed */}
              {changes.removed.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <span className="font-medium text-red-400">
                      Removing ({changes.removed.length})
                    </span>
                  </div>
                  <div className="space-y-2 pl-8">
                    {changes.removed.map(id => (
                      <div key={id} className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {getStoryTitle(id)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No changes */}
              {totalChanges === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  <p>No pending changes to push</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!pushComplete && (
          <div className="flex items-center justify-between p-6 border-t border-zinc-800 bg-zinc-900/50">
            <div className="text-sm text-zinc-400">
              {totalChanges} change{totalChanges !== 1 ? 's' : ''} pending
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 hover:bg-zinc-800 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePush}
                disabled={pushing || totalChanges === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pushing || totalChanges === 0
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500'
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

