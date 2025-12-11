import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, AlertCircle, Volume2, Tag, BookOpen, Loader2, RefreshCw, Zap, Plus, CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { getHealth, segmentText, extractChineseFromBlocks, triggerSync, type HealthResponse, type SegmentResponse } from '@/services/validatorAPI';
import { toast } from '@/hooks/useToast';

interface ChecklistData {
  vocabulary: {
    total: number;
    withAudio: number;
    withSecondary: number;
    complete: boolean;
  };
  blocks: {
    total: number;
    withAudio: number;
    complete: boolean;
  };
  overallComplete: boolean;
}

interface LessonChecklistProps {
  lessonId: string;
  blocks?: unknown[]; // Pass lesson blocks for vocab scanning
}

export function LessonChecklist({ lessonId, blocks = [] }: LessonChecklistProps) {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Validator status
  const [validatorHealth, setValidatorHealth] = useState<HealthResponse | null>(null);
  const [validatorLoading, setValidatorLoading] = useState(false);
  const [segmentResult, setSegmentResult] = useState<SegmentResponse | null>(null);
  const [scanningVocab, setScanningVocab] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadChecklist = async () => {
    if (!lessonId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.get<{ checklist: ChecklistData }>(`/v1/lessons/${lessonId}/checklist`);
      setChecklist(data.checklist);
    } catch (err) {
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };
  
  // Check validator health
  const checkValidatorHealth = useCallback(async () => {
    setValidatorLoading(true);
    try {
      const health = await getHealth();
      setValidatorHealth(health);
      return health;
    } catch {
      setValidatorHealth(null);
      return null;
    } finally {
      setValidatorLoading(false);
    }
  }, []);
  
  // Sync the validator curriculum
  const syncValidator = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await triggerSync();
      if (result.success) {
        toast.success('Validator synced', `${result.word_count} words loaded`);
        // Refresh health after sync
        await checkValidatorHealth();
        return true;
      } else {
        toast.error('Sync failed', 'Could not sync validator');
        return false;
      }
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Sync failed', err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [checkValidatorHealth]);
  
  // Scan blocks for unknown vocabulary (with auto-sync if empty)
  const scanForUnknownVocab = useCallback(async () => {
    if (!blocks || blocks.length === 0) return;
    
    setScanningVocab(true);
    try {
      // Check if validator needs sync first
      const health = validatorHealth || await checkValidatorHealth();
      
      // Auto-sync if validator is empty
      if (health && health.word_count === 0) {
        console.log('[Checklist] Validator empty, auto-syncing...');
        const synced = await syncValidator();
        if (!synced) {
          setScanningVocab(false);
          return; // Don't scan if sync failed
        }
      }
      
      const chineseTexts = extractChineseFromBlocks(blocks);
      if (chineseTexts.length === 0) {
        setSegmentResult(null);
        return;
      }
      
      const result = await segmentText(chineseTexts);
      setSegmentResult(result);
    } catch (err) {
      console.error('Vocab scan failed:', err);
      setSegmentResult(null);
    } finally {
      setScanningVocab(false);
    }
  }, [blocks, validatorHealth, checkValidatorHealth, syncValidator]);

  useEffect(() => {
    loadChecklist();
    checkValidatorHealth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);
  
  // Scan for unknown vocab when blocks change
  useEffect(() => {
    if (validatorHealth?.curriculum_loaded && blocks.length > 0) {
      scanForUnknownVocab();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, validatorHealth?.curriculum_loaded]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading checklist...</span>
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Checklist unavailable</span>
        </div>
      </div>
    );
  }

  const items = [
    {
      label: 'Vocabulary linked',
      complete: checklist.vocabulary.total > 0,
      detail: `${checklist.vocabulary.total} words`,
      icon: BookOpen,
    },
    {
      label: 'Vocab has audio',
      complete: checklist.vocabulary.total > 0 && checklist.vocabulary.withAudio === checklist.vocabulary.total,
      detail: `${checklist.vocabulary.withAudio}/${checklist.vocabulary.total}`,
      icon: Volume2,
    },
    {
      label: 'Vocab has secondary tags',
      complete: checklist.vocabulary.complete,
      detail: `${checklist.vocabulary.withSecondary}/${checklist.vocabulary.total}`,
      icon: Tag,
      actionLabel: checklist.vocabulary.total - checklist.vocabulary.withSecondary > 0 ? 'Tag in Vocab' : undefined,
      action: () => navigate(`/vocabulary?lesson_id=${lessonId}`),
    },
    {
      label: 'Blocks created',
      complete: checklist.blocks.total > 0,
      detail: `${checklist.blocks.total} blocks`,
      icon: BookOpen,
    },
    {
      label: 'Blocks have audio',
      complete: checklist.blocks.complete,
      detail: `${checklist.blocks.withAudio}/${checklist.blocks.total}`,
      icon: Volume2,
    },
  ];

  const completedCount = items.filter(i => i.complete).length;
  const totalCount = items.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        checklist.overallComplete 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-2">
          {checklist.overallComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600" />
          )}
          <span className={`font-medium ${checklist.overallComplete ? 'text-green-900' : 'text-amber-900'}`}>
            Lesson Checklist
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            {completedCount}/{totalCount}
          </span>
          <button
            onClick={loadChecklist}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completionPercent === 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-gray-100">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.complete ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <div>
                <div className={`text-sm ${item.complete ? 'text-gray-700' : 'text-gray-500'}`}>
                  {item.label}
                </div>
                <div className="text-xs text-gray-400">{item.detail}</div>
              </div>
            </div>
            {item.actionLabel && !item.complete && (
              <Button
                size="sm"
                variant="outline"
                onClick={item.action}
                className="text-xs"
              >
                {item.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
      
      {/* Vocabulary Scanner Section */}
      <div className="border-t border-gray-200">
        {/* Validator Status */}
        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">Vocab Scanner</span>
          </div>
          <div className="flex items-center gap-2">
            {syncing ? (
              <span className="text-xs text-purple-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Syncing...
              </span>
            ) : validatorLoading ? (
              <span className="text-xs text-gray-400">Checking...</span>
            ) : validatorHealth ? (
              validatorHealth.word_count === 0 ? (
                <button
                  onClick={syncValidator}
                  disabled={syncing}
                  className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1 transition-colors"
                  title="Sync vocabulary from database"
                >
                  <CloudDownload className="w-3 h-3" />
                  Needs sync
                </button>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {validatorHealth.word_count} words
                </span>
              )
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Unavailable
              </span>
            )}
            
            {/* Sync button (always visible when validator is available) */}
            {validatorHealth && validatorHealth.word_count > 0 && (
              <button
                onClick={syncValidator}
                disabled={syncing}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Sync vocabulary"
              >
                <CloudDownload className={`w-3 h-3 text-gray-500 ${syncing ? 'animate-pulse' : ''}`} />
              </button>
            )}
            
            {/* Refresh status button */}
            <button
              onClick={checkValidatorHealth}
              disabled={validatorLoading || syncing}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-3 h-3 text-gray-500 ${validatorLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Sync prompt when validator is empty */}
        {validatorHealth && !validatorHealth.curriculum_loaded && !syncing && (
          <div className="px-4 py-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <CloudDownload className="w-4 h-4" />
                <span>Vocabulary scanner needs to sync the curriculum.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={syncValidator}
                className="mt-2 text-xs"
              >
                <CloudDownload className="w-3 h-3 mr-1" />
                Sync Now
              </Button>
            </div>
          </div>
        )}
        
        {/* Unknown Words */}
        {validatorHealth?.curriculum_loaded && (
          <div className="px-4 py-3">
            {scanningVocab || syncing ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {syncing ? 'Syncing vocabulary database...' : 'Scanning lesson for vocabulary...'}
                </span>
              </div>
            ) : segmentResult ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {segmentResult.unknown_words.length === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm text-gray-700">
                      {segmentResult.unknown_words.length === 0 
                        ? 'All words in curriculum' 
                        : `${segmentResult.unknown_words.length} unknown words`}
                    </span>
                  </div>
                  <button
                    onClick={scanForUnknownVocab}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    Rescan
                  </button>
                </div>
                
                {segmentResult.unknown_words.length > 0 && (
                  <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-xs font-medium text-amber-800 mb-2">
                      Words not in vocab database:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {segmentResult.unknown_words.slice(0, 20).map((word, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded border border-amber-300 text-sm"
                        >
                          {word}
                          <button
                            onClick={() => navigate(`/vocabulary/new?hanzi=${encodeURIComponent(word)}`)}
                            className="text-amber-600 hover:text-amber-800"
                            title="Add to vocabulary"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {segmentResult.unknown_words.length > 20 && (
                        <span className="text-xs text-amber-600 self-center">
                          +{segmentResult.unknown_words.length - 20} more
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-amber-700">
                      Tip: Add these words to the vocabulary database, or they may be common words not needing explicit teaching.
                    </div>
                  </div>
                )}
                
                {/* Stats */}
                <div className="text-xs text-gray-400 mt-2">
                  Found {segmentResult.all_words.length} unique words 
                  ({segmentResult.curriculum_words.length} in curriculum, 
                  {segmentResult.always_safe_removed.length} common words skipped)
                </div>
              </div>
            ) : blocks.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={scanForUnknownVocab}
                className="text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Scan for vocabulary
              </Button>
            ) : (
              <span className="text-xs text-gray-400">Add blocks to scan vocabulary</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

