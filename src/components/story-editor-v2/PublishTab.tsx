/**
 * PublishTab - Pre-publish checklist and actions
 * 
 * Features:
 * - Readiness checklist
 * - Vocabulary health check
 * - Publish/unpublish toggle
 * - Story summary
 */

import { useState, useEffect, useCallback } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Rocket, 
  Eye, 
  EyeOff,
  BookOpen,
  Volume2,
  GraduationCap,
  AlertTriangle,
  ExternalLink,
  Download,
  Database,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import { exportStory } from "@/services/storiesAPI";
import { extractAndSegmentStoryWords } from "@/utils/storyWordExtractor";
import { checkVocabularyHealth, type WordHealth } from "@/services/vocabularyAPI";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { StoryVocabHealthModal } from "./StoryVocabHealthModal";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface PublishTabProps {
  story: StoryWithDetails;
  stats: {
    sentences: number;
    withAudio: number;
    practiceBlocks: number;
  };
  readiness: {
    ready: boolean;
    issues: string[];
    score: number;
  };
  onPublish: () => Promise<void>;
  onUnpublish: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function PublishTab({ 
  story, 
  stats, 
  readiness, 
  onPublish, 
  onUnpublish 
}: PublishTabProps) {
  // Vocabulary health check state
  const [vocabLoading, setVocabLoading] = useState(false);
  const [vocabResults, setVocabResults] = useState<WordHealth[] | null>(null);
  const [vocabExpanded, setVocabExpanded] = useState(false);
  const [showVocabModal, setShowVocabModal] = useState(false);

  // Run vocab check on mount
  const checkVocabHealth = useCallback(async () => {
    if (story.id === 'new') return; // Skip for new stories
    
    setVocabLoading(true);
    try {
      const { segmentedWords } = await extractAndSegmentStoryWords(story);
      
      if (segmentedWords.length === 0) {
        setVocabResults([]);
        return;
      }
      
      const response = await checkVocabularyHealth(segmentedWords);
      setVocabResults(response.results);
    } catch (err) {
      logger.error('Vocab health check failed:', err);
      setVocabResults(null);
    } finally {
      setVocabLoading(false);
    }
  }, [story]);

  useEffect(() => {
    checkVocabHealth();
  }, [checkVocabHealth]);

  // Vocab health summary
  const vocabSummary = vocabResults ? {
    total: vocabResults.length,
    inDb: vocabResults.filter(w => w.exists).length,
    missing: vocabResults.filter(w => !w.exists).length,
    noAudio: vocabResults.filter(w => w.exists && !w.hasAudio).length,
    noTags: vocabResults.filter(w => w.exists && !w.hasCategory).length,
  } : null;

  const handleExport = async () => {
    try {
      const data = await exportStory(story.id);
      // Convert to content-planner format
      const exportData = {
        ...data,
        sentences: data.segments,
        segments: undefined,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Story exported!');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  // ─────────────────────────────────────────────────────────
  // CHECKLIST ITEMS
  // ─────────────────────────────────────────────────────────
  
  const checklist = [
    {
      label: 'Story title',
      description: 'A clear, descriptive title',
      passed: !!story.title && story.title.length > 0,
      icon: BookOpen,
    },
    {
      label: 'HSK level set',
      description: 'Content difficulty is specified',
      passed: !!story.hskLevel,
      icon: GraduationCap,
    },
    {
      label: 'Has content',
      description: `${stats.sentences} sentence${stats.sentences !== 1 ? 's' : ''}`,
      passed: stats.sentences > 0,
      icon: BookOpen,
    },
    {
      label: 'Audio complete',
      description: `${stats.withAudio}/${stats.sentences} sentences have audio`,
      passed: stats.withAudio === stats.sentences && stats.sentences > 0,
      icon: Volume2,
    },
    {
      label: 'Vocabulary in database',
      description: vocabLoading 
        ? 'Checking...'
        : vocabSummary 
          ? vocabSummary.missing === 0
            ? `${vocabSummary.inDb} words verified`
            : `${vocabSummary.missing} words missing from database`
          : 'Check vocabulary health',
      passed: vocabSummary ? vocabSummary.missing === 0 : false,
      loading: vocabLoading,
      icon: Database,
    },
    {
      label: 'Practice blocks',
      description: stats.practiceBlocks > 0 
        ? `${stats.practiceBlocks} practice block${stats.practiceBlocks !== 1 ? 's' : ''}`
        : 'No practice blocks (optional)',
      passed: stats.practiceBlocks > 0,
      optional: true,
      icon: GraduationCap,
    },
  ];

  const requiredItems = checklist.filter(c => !c.optional);
  const allRequiredPassed = requiredItems.every(c => c.passed);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* STATUS CARD */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <div className={cn(
        "rounded-xl p-6 text-center",
        story.isPublished 
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
          : allRequiredPassed
          ? "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200"
          : "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
      )}>
        {story.isPublished ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Eye className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              Story is Live! 🎉
            </h2>
            <p className="text-green-700 mb-4">
              Your story is published and visible to learners.
            </p>
            <Button
              variant="outline"
              onClick={onUnpublish}
              className="border-green-300 text-green-700 hover:bg-green-100"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Unpublish
            </Button>
          </>
        ) : allRequiredPassed ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-purple-800 mb-2">
              Ready to Publish! 🚀
            </h2>
            <p className="text-purple-700 mb-4">
              All requirements met. Your story is ready to go live.
            </p>
            <Button
              onClick={onPublish}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Publish Story
            </Button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-amber-800 mb-2">
              Not Ready Yet
            </h2>
            <p className="text-amber-700 mb-4">
              Complete the checklist below before publishing.
            </p>
            <div className="text-sm text-amber-600">
              {readiness.issues.slice(0, 2).join(' • ')}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CHECKLIST */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-900">Pre-publish Checklist</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {checklist.map((item, idx) => {
            const Icon = item.icon;
            const isLoading = (item as any).loading;
            const isVocabItem = item.label === 'Vocabulary in database';
            
            return (
              <div key={idx} className="flex items-center gap-4 px-5 py-4">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
                ) : item.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (item as any).optional ? (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}

                <div className="flex-1">
                  <p className={cn(
                    "font-medium",
                    item.passed ? "text-slate-900" : (item as any).optional ? "text-slate-600" : "text-slate-900"
                  )}>
                    {item.label}
                    {(item as any).optional && (
                      <span className="ml-2 text-xs text-slate-400 font-normal">(optional)</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>

                {/* Add View Details button for vocabulary item */}
                {isVocabItem && !isLoading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVocabModal(true)}
                    className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  >
                    View Details
                  </Button>
                )}

                <Icon className={cn(
                  "w-4 h-4 shrink-0",
                  item.passed ? "text-green-500" : "text-slate-300"
                )} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* VOCABULARY HEALTH DETAILS */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      {vocabSummary && (vocabSummary.missing > 0 || vocabSummary.noAudio > 0) && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div className="text-left">
                <h3 className="font-medium text-amber-900">Vocabulary Issues</h3>
                <p className="text-sm text-amber-700">
                  {vocabSummary.missing > 0 && `${vocabSummary.missing} missing`}
                  {vocabSummary.missing > 0 && vocabSummary.noAudio > 0 && ' • '}
                  {vocabSummary.noAudio > 0 && `${vocabSummary.noAudio} no audio`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => checkVocabHealth()}
                className="text-amber-700"
              >
                <RefreshCw className={cn("w-4 h-4", vocabLoading && "animate-spin")} />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowVocabModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Fix Issues
              </Button>
              <button
                onClick={() => setVocabExpanded(!vocabExpanded)}
                className="p-1 hover:bg-amber-100 rounded"
              >
                {vocabExpanded ? (
                  <ChevronDown className="w-5 h-5 text-amber-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-amber-500" />
                )}
              </button>
            </div>
          </div>

          {vocabExpanded && vocabResults && (
            <div className="px-5 pb-5 border-t border-amber-100">
              {/* Missing words */}
              {vocabSummary.missing > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Not in Database ({vocabSummary.missing})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {vocabResults.filter(w => !w.exists).map((word, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm"
                      >
                        {word.hanzi}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Add these words to the vocabulary database before publishing.
                  </p>
                </div>
              )}

              {/* No audio */}
              {vocabSummary.noAudio > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Missing Audio ({vocabSummary.noAudio})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {vocabResults.filter(w => w.exists && !w.hasAudio).map((word, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm"
                      >
                        {word.hanzi}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* STORY SUMMARY */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Story Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Title:</span>
            <p className="font-medium text-slate-900">{story.title || '-'}</p>
          </div>
          <div>
            <span className="text-slate-500">HSK Level:</span>
            <p className="font-medium text-slate-900">HSK {story.hskLevel}</p>
          </div>
          <div>
            <span className="text-slate-500">Difficulty:</span>
            <p className="font-medium text-slate-900 capitalize">{story.difficulty}</p>
          </div>
          <div>
            <span className="text-slate-500">Type:</span>
            <p className="font-medium text-slate-900 capitalize">{story.storyType || 'text'}</p>
          </div>
          <div>
            <span className="text-slate-500">Duration:</span>
            <p className="font-medium text-slate-900">
              {story.estimatedMinutes ? `~${story.estimatedMinutes} min` : '-'}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Series:</span>
            <p className="font-medium text-slate-900">
              {story.seriesId ? 'Part of series' : 'Standalone'}
            </p>
          </div>
        </div>

        {story.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">Description:</span>
            <p className="text-sm text-slate-700 mt-1">{story.description}</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ACTIONS */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      {story.id !== 'new' && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.open(`/stories/${story.id}`, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview in App
          </Button>
        </div>
      )}

      {/* Vocabulary Health Modal */}
      <StoryVocabHealthModal
        isOpen={showVocabModal}
        onClose={async () => {
          setShowVocabModal(false);
          // Force refresh vocab check after modal closes
          // Small delay to ensure DB writes have propagated
          setVocabLoading(true);
          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            const { segmentedWords } = await extractAndSegmentStoryWords(story);
            if (segmentedWords.length > 0) {
              const response = await checkVocabularyHealth(segmentedWords);
              setVocabResults(response.results);
            } else {
              setVocabResults([]);
            }
          } catch (err) {
            logger.error('Vocab health check failed:', err);
          } finally {
            setVocabLoading(false);
          }
        }}
        story={story}
      />
    </div>
  );
}

