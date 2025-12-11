/**
 * LessonReview - Pre-save health gate
 * 
 * WORKFLOW:
 * 1. User creates/edits lesson in Editor
 * 2. Clicks "Continue" → lesson stored in sessionStorage (NOT saved to DB yet)
 * 3. This page loads lesson from sessionStorage
 * 4. Runs health check on all vocabulary
 * 5. If passes → "Save Draft" button enabled
 * 6. Save Draft → Creates/updates lesson in DB with isPublished=false
 * 7. Later: Explicit "Publish" action to go live to mobile app
 * 
 * SAFEGUARDS:
 * - Cannot save without passing health check
 * - Saving creates DRAFT (not published)
 * - Draft visible in admin, NOT sent to mobile
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Volume2,
  Tag,
  FileText,
  Database,
  Loader2,
  RefreshCw,
  Save,
  Zap,
  CloudDownload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lessonAPI, type CreateLessonPayload } from '@/services/lessonAPI';
import { extractAndSegmentLessonWords } from '@/utils/lessonWordExtractor';
import { checkVocabularyHealth, type WordHealth } from '@/services/vocabularyAPI';
import { getHealth, triggerSync, type HealthResponse } from '@/services/validatorAPI';
import { VocabularyEditorSlideOver } from '@/components/lesson-editor/VocabularyEditorSlideOver';
import { toast } from '@/hooks/useToast';
import type { Lesson } from '@/types/lesson';

interface ReviewData {
  lesson: Lesson;
  isNewLesson: boolean;
  existingLessonId: string | null;
}

interface GroupedIssues {
  notInVocab: WordHealth[];
  noAudio: WordHealth[];
  noTags: WordHealth[];
  noExample: WordHealth[];
}

export default function LessonReview() {
  const navigate = useNavigate();
  
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [healthResults, setHealthResults] = useState<WordHealth[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  
  // Validator state
  const [validatorHealth, setValidatorHealth] = useState<HealthResponse | null>(null);
  const [validatorLoading, setValidatorLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Slide-over state for adding/editing vocab
  const [editingWord, setEditingWord] = useState<{ hanzi: string; id?: string } | null>(null);

  // Check validator health
  const checkValidatorHealth = useCallback(async () => {
    setValidatorLoading(true);
    try {
      const health = await getHealth();
      console.log('[LessonReview] Validator health:', health);
      setValidatorHealth(health);
      return health;
    } catch (err) {
      console.error('[LessonReview] Health check failed:', err);
      setValidatorHealth(null);
      return null;
    } finally {
      setValidatorLoading(false);
    }
  }, []);

  // Sync validator curriculum
  const syncValidator = useCallback(async () => {
    setSyncing(true);
    try {
      console.log('[LessonReview] Triggering sync...');
      const result = await triggerSync();
      if (result.success) {
        toast.success('Validator synced', `${result.word_count} words loaded`);
        await checkValidatorHealth();
        return true;
      } else {
        toast.error('Sync failed', 'Could not sync validator');
        return false;
      }
    } catch (err) {
      console.error('[LessonReview] Sync failed:', err);
      toast.error('Sync failed', err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [checkValidatorHealth]);

  // Load lesson from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('lesson-review-data');
    
    if (!stored) {
      toast.error('No lesson data', 'Please go back to the editor and click Continue');
      navigate('/lessons');
      return;
    }
    
    try {
      const data: ReviewData = JSON.parse(stored);
      setReviewData(data);
    } catch (err) {
      console.error('Failed to parse review data:', err);
      toast.error('Invalid data', 'Please go back to the editor');
      navigate('/lessons');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Run health check with segmentation
  const runHealthCheck = useCallback(async () => {
    if (!reviewData?.lesson?.blocks) return;
    
    setChecking(true);
    try {
      // Check validator health first
      let health = validatorHealth;
      if (!health) {
        health = await checkValidatorHealth();
      }
      
      // Auto-sync if validator is empty
      if (health && health.word_count === 0) {
        console.log('[LessonReview] Validator empty, auto-syncing...');
        const synced = await syncValidator();
        if (!synced) {
          setChecking(false);
          return;
        }
      }
      
      // Use segmentation to properly split words
      console.log('[LessonReview] Extracting and segmenting words...');
      const segmentResult = await extractAndSegmentLessonWords(reviewData.lesson.blocks);
      
      const wordsToCheck = segmentResult.segmentedWords;
      console.log('[LessonReview] Segmented into', wordsToCheck.length, 'words');
      setTotalWords(wordsToCheck.length);
      
      if (wordsToCheck.length === 0) {
        setHealthResults([]);
        return;
      }
      
      // Now check health of segmented words
      const response = await checkVocabularyHealth(wordsToCheck);
      setHealthResults(response.results);
    } catch (err) {
      console.error('Health check failed:', err);
      toast.error('Health check failed', 'Please try again');
    } finally {
      setChecking(false);
    }
  }, [reviewData?.lesson?.blocks, validatorHealth, checkValidatorHealth, syncValidator]);

  // Check validator health on mount
  useEffect(() => {
    checkValidatorHealth();
  }, [checkValidatorHealth]);

  // Run health check when lesson data is available
  useEffect(() => {
    if (reviewData?.lesson) {
      runHealthCheck();
    }
  }, [reviewData?.lesson, runHealthCheck]);

  // Group issues by type
  const groupedIssues: GroupedIssues = {
    notInVocab: healthResults.filter(w => !w.exists),
    noAudio: healthResults.filter(w => w.exists && !w.hasAudio),
    noTags: healthResults.filter(w => w.exists && !w.hasTags),
    noExample: healthResults.filter(w => w.exists && !w.hasExample),
  };

  const totalIssues = 
    groupedIssues.notInVocab.length + 
    groupedIssues.noAudio.length + 
    groupedIssues.noTags.length + 
    groupedIssues.noExample.length;

  const canSave = totalIssues === 0;
  const healthyWords = healthResults.filter(
    w => w.exists && w.hasAudio && w.hasTags && w.hasExample
  ).length;

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!canSave || !reviewData) return;
    
    const { lesson, isNewLesson, existingLessonId } = reviewData;
    
    setSaving(true);
    try {
      if (isNewLesson) {
        // Create new lesson as draft
        const payload: CreateLessonPayload = {
          title: lesson.title || "Untitled Lesson",
          subtitle: lesson.subtitle,
          hskLevel: lesson.hskLevel || 1,
          lessonType: lesson.lessonType || "lesson",
          difficulty: lesson.difficulty,
          estimatedMinutes: lesson.estimatedMinutes,
          grammarPoints: lesson.grammarPoints,
          tags: lesson.tags,
          targetVocabulary: lesson.targetVocabulary,
          blocks: (lesson.blocks || []).map((block) => ({
            type: block.type,
            content: "content" in block ? (block as any).content : {},
          })),
        };
        
        await lessonAPI.create(payload);
        toast.success('Lesson saved as draft!', `"${lesson.title}" can now be found in your lessons list`);
      } else if (existingLessonId) {
        // Update existing lesson (keep as draft)
        await lessonAPI.update(existingLessonId, {
          ...lesson,
          isPublished: false, // Ensure it stays as draft
          updatedAt: new Date().toISOString(),
        });
        toast.success('Draft updated!', `"${lesson.title}" has been saved`);
      }
      
      // Clear sessionStorage
      sessionStorage.removeItem('lesson-review-data');
      
      // Navigate to lessons list
      navigate('/lessons');
    } catch (err: any) {
      console.error('Save draft failed:', err);
      // Handle Zod validation errors (which have {issues, name} structure)
      let errorDetail = 'Please try again';
      const response = err.response;
      if (response?.details) {
        if (typeof response.details === 'string') {
          errorDetail = response.details;
        } else if (response.details?.issues && Array.isArray(response.details.issues)) {
          // Zod error - extract first issue message
          errorDetail = response.details.issues[0]?.message || 'Validation failed';
        } else {
          errorDetail = JSON.stringify(response.details);
        }
      } else if (response?.error) {
        errorDetail = typeof response.error === 'string' ? response.error : JSON.stringify(response.error);
      } else if (err.message) {
        errorDetail = err.message;
      }
      toast.error('Failed to save', errorDetail);
    } finally {
      setSaving(false);
    }
  };

  // Handle back to editor
  const handleBackToEditor = () => {
    // Keep the data in sessionStorage so editor can restore it if needed
    if (reviewData?.isNewLesson) {
      navigate('/lessons/new/edit?type=lesson&restore=true');
    } else if (reviewData?.existingLessonId) {
      navigate(`/lessons/${reviewData.existingLessonId}/edit`);
    } else {
      navigate('/lessons');
    }
  };

  // Handle word edit/add complete
  const handleWordSaved = () => {
    setEditingWord(null);
    // Re-run health check to update the list
    runHealthCheck();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!reviewData?.lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">No lesson data found</p>
        <Button onClick={() => navigate('/lessons')}>Go to Lessons</Button>
      </div>
    );
  }

  const { lesson, isNewLesson } = reviewData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEditor}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Editor
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-gray-900">{lesson.title}</h1>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                    {isNewLesson ? 'NEW' : 'EDITING'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  HSK {lesson.hskLevel} • {lesson.blocks?.length || 0} blocks
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Validator Status */}
              <div className="flex items-center gap-2 text-sm">
                {syncing ? (
                  <span className="text-purple-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing...
                  </span>
                ) : validatorLoading ? (
                  <span className="text-gray-400">Checking validator...</span>
                ) : validatorHealth ? (
                  validatorHealth.word_count === 0 ? (
                    <button
                      onClick={syncValidator}
                      disabled={syncing}
                      className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 flex items-center gap-1"
                    >
                      <CloudDownload className="w-3 h-3" />
                      Needs sync
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {validatorHealth.word_count} words
                    </span>
                  )
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    Validator unavailable
                  </span>
                )}
                
                {validatorHealth && validatorHealth.word_count > 0 && (
                  <button
                    onClick={syncValidator}
                    disabled={syncing}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Sync vocabulary"
                  >
                    <CloudDownload className={`w-4 h-4 text-gray-500 ${syncing ? 'animate-pulse' : ''}`} />
                  </button>
                )}
              </div>
              
              <div className="h-6 w-px bg-gray-200" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthCheck}
                disabled={checking || syncing}
              >
                <RefreshCw size={16} className={`mr-2 ${checking ? 'animate-spin' : ''}`} />
                Re-check
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={!canSave || saving}
                className={canSave 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-300 cursor-not-allowed'
                }
              >
                {saving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : canSave ? (
                  <Save size={16} className="mr-2" />
                ) : (
                  <XCircle size={16} className="mr-2" />
                )}
                {canSave ? 'Save Draft' : `Fix ${totalIssues} Issues First`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Database className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800">Health Check Required</p>
            <p className="text-blue-700 mt-1">
              Before saving, all vocabulary words in your lesson must have: audio, tags (POS/tone), and example sentences.
              This ensures quality for learners. Saving creates a <strong>draft</strong> that won't be published to the mobile app until you explicitly publish it.
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div className={`rounded-xl p-6 ${canSave 
          ? 'bg-green-50 border-2 border-green-200' 
          : 'bg-amber-50 border-2 border-amber-200'
        }`}>
          <div className="flex items-start gap-4">
            {canSave ? (
              <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <h2 className={`text-lg font-semibold ${canSave ? 'text-green-800' : 'text-amber-800'}`}>
                {canSave 
                  ? '✅ Ready to Save!' 
                  : `⚠️ ${totalIssues} Issue${totalIssues !== 1 ? 's' : ''} to Fix`
                }
              </h2>
              <p className={`text-sm mt-1 ${canSave ? 'text-green-700' : 'text-amber-700'}`}>
                {canSave 
                  ? `All ${totalWords} vocabulary words are complete. You can now save this lesson as a draft.`
                  : `Some vocabulary words are missing required data. Fix all issues before saving.`
                }
              </p>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Vocabulary Health</span>
                  <span>{healthyWords}/{totalWords} complete</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${canSave ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: totalWords > 0 ? `${(healthyWords / totalWords) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issue Sections */}
        {groupedIssues.notInVocab.length > 0 && (
          <IssueSection
            title="Not in Vocabulary Database"
            subtitle="These words need to be added to the vocabulary database"
            icon={<Database className="text-red-600" />}
            words={groupedIssues.notInVocab}
            color="red"
            actionLabel="Add to Vocab"
            onAction={(word) => setEditingWord({ hanzi: word.hanzi })}
          />
        )}

        {groupedIssues.noAudio.length > 0 && (
          <IssueSection
            title="Missing Audio"
            subtitle="Generate audio for these words"
            icon={<Volume2 className="text-orange-600" />}
            words={groupedIssues.noAudio}
            color="orange"
            actionLabel="Edit"
            onAction={(word) => setEditingWord({ hanzi: word.hanzi, id: word.id })}
          />
        )}

        {groupedIssues.noTags.length > 0 && (
          <IssueSection
            title="Missing Tags"
            subtitle="Add POS and tone pattern metadata"
            icon={<Tag className="text-yellow-600" />}
            words={groupedIssues.noTags}
            color="yellow"
            actionLabel="Edit"
            onAction={(word) => setEditingWord({ hanzi: word.hanzi, id: word.id })}
          />
        )}

        {groupedIssues.noExample.length > 0 && (
          <IssueSection
            title="Missing Example Sentence"
            subtitle="Add example sentences for context"
            icon={<FileText className="text-blue-600" />}
            words={groupedIssues.noExample}
            color="blue"
            actionLabel="Edit"
            onAction={(word) => setEditingWord({ hanzi: word.hanzi, id: word.id })}
          />
        )}

        {/* All Good Section */}
        {canSave && healthResults.length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="text-green-600" />
              <h3 className="font-semibold text-gray-900">All Vocabulary Complete</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {healthResults.map((word) => (
                <span
                  key={word.hanzi}
                  className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium"
                >
                  {word.hanzi}
                  <span className="text-green-500 ml-1 text-xs">
                    {word.english ? `(${word.english.split(/[,;]/)[0]})` : ''}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vocabulary Editor Slide-over */}
      <VocabularyEditorSlideOver
        isOpen={!!editingWord}
        onClose={() => setEditingWord(null)}
        wordId={editingWord?.id}
        initialHanzi={editingWord?.hanzi}
        onSaved={handleWordSaved}
      />
    </div>
  );
}

// Issue Section Component
interface IssueSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  words: WordHealth[];
  color: 'red' | 'orange' | 'yellow' | 'blue';
  actionLabel: string;
  onAction: (word: WordHealth) => void;
}

const colorClasses = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    button: 'bg-red-100 hover:bg-red-200 text-red-700',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    button: 'bg-orange-100 hover:bg-orange-200 text-orange-700',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  },
};

function IssueSection({ title, subtitle, icon, words, color, actionLabel, onAction }: IssueSectionProps) {
  const classes = colorClasses[color];
  
  return (
    <div className={`rounded-xl border ${classes.border} ${classes.bg} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes.badge}`}>
          {words.length} word{words.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {words.map((word) => (
          <div 
            key={word.hanzi}
            className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium">{word.hanzi}</span>
              {word.pinyin && (
                <span className="text-sm text-gray-500">{word.pinyin}</span>
              )}
              {word.english && (
                <span className="text-sm text-gray-400">
                  {word.english.split(/[,;]/)[0]}
                </span>
              )}
            </div>
            <button
              onClick={() => onAction(word)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${classes.button}`}
            >
              {actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
