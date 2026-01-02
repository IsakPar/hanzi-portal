/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
/**
 * StoryEditorV2 - Revamped Story Editor with improved UX
 * 
 * Features:
 * - Tab-based workflow: Story → Audio → Practice → Publish
 * - Split panel with live preview
 * - Inline sentence editing
 * - Bulk TTS generation
 * - Pre-publish checklist
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, 
  Save, 
  BookOpen, 
  Headphones, 
  GraduationCap, 
  Rocket,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import { getStory, createStory, updateStory, bulkSaveSegments } from "@/services/storiesAPI";
import type { StoryImportData } from "@/components/stories-list/StoryImportModal";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/useToast";
// import { useGlobalConfirm } from "@/hooks/useConfirm";
import { useSaveShortcut } from "@/hooks/useKeyboardShortcuts";
import { useAbortController } from "@/hooks/useAbortController";
import { useStoryAutoSave } from "@/hooks/useStoryAutoSave";
import { cn } from "@/lib/utils";

// New tabs
import { StoryTab } from "@/components/story-editor-v2/StoryTab";
import { AudioTab } from "@/components/story-editor-v2/AudioTab";
import { PracticeTab } from "@/components/story-editor-v2/PracticeTab";
import { PublishTab } from "@/components/story-editor-v2/PublishTab";
import { StoryPreviewPanel } from "@/components/story-editor-v2/StoryPreviewPanel";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type EditorTab = 'story' | 'audio' | 'practice' | 'publish';

interface TabConfig {
  id: EditorTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const TABS: TabConfig[] = [
  {
    id: 'story',
    label: 'Story',
    icon: <BookOpen className="w-4 h-4" />,
    description: 'Content & sentences',
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: <Headphones className="w-4 h-4" />,
    description: 'Generate TTS',
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: <GraduationCap className="w-4 h-4" />,
    description: 'Add exercises',
  },
  {
    id: 'publish',
    label: 'Publish',
    icon: <Rocket className="w-4 h-4" />,
    description: 'Review & publish',
  },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function StoryEditorV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // const confirm = useGlobalConfirm();
  const { getSignal } = useAbortController();
  const isNew = id === 'new';

  // Check for imported data from JSON import workflow
  const importedData = (location.state as { importedStory?: StoryImportData } | null)?.importedStory;

  // ─────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────
  
  const [story, setStory] = useState<StoryWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('story');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Auto-save key based on story ID
  const autoSaveKey = `story-draft-${id || 'new'}`;

  // Auto-save hook for draft persistence
  const { 
    lastLocalSave, 
    hasRecoveredData,
    recoveryTimestamp,
    clearStorage: clearAutoSave,
    recoverData,
    dismissRecovery,
  } = useStoryAutoSave({
    storageKey: autoSaveKey,
    data: story,
    isDirty,
    isNew,
    localDebounceMs: 2000, // Save to localStorage after 2 seconds of inactivity
    onRecover: (recoveredStory) => {
      setStory(recoveredStory);
      setIsDirty(true);
      logger.log("Recovered story from auto-save");
      toast.success("Restored!", "Your unsaved changes have been restored.");
    },
  });

  // ─────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────
  
  const stats = useMemo(() => {
    if (!story) return { sentences: 0, withAudio: 0, practiceBlocks: 0 };
    
    const sentences = story.sentences?.length || 0;
    const withAudio = story.sentences?.filter(s => s.audioUrl || s.audioR2Key).length || 0;
    const practiceBlocks = story.practiceBlocks?.filter(b => (b as any).type !== '_practice_intro').length || 0;
    
    return { sentences, withAudio, practiceBlocks };
  }, [story]);

  const readiness = useMemo(() => {
    const issues: string[] = [];
    
    if (!story?.title) issues.push('Missing title');
    if (!story?.hskLevel) issues.push('Missing HSK level');
    if (stats.sentences === 0) issues.push('No sentences');
    if (stats.withAudio < stats.sentences) issues.push(`${stats.sentences - stats.withAudio} sentences without audio`);
    
    return {
      ready: issues.length === 0,
      issues,
      score: story ? Math.round((
        (story.title ? 25 : 0) +
        (stats.sentences > 0 ? 25 : 0) +
        (stats.withAudio === stats.sentences ? 25 : 0) +
        (stats.practiceBlocks > 0 ? 25 : 0)
      )) : 0,
    };
  }, [story, stats]);

  // ─────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────
  
  useSaveShortcut(() => {
    if (story && (isDirty || isNew) && !saving) {
      handleSave();
    }
  }, [story, isDirty, isNew, saving]);

  // ─────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (!isNew && id) {
      loadStory();
    } else if (importedData) {
      // Initialize from imported JSON data
      initializeFromImport(importedData);
    } else {
      // Initialize empty new story
      initializeEmpty();
    }
  }, [id, isNew]);

  // ─────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────
  
  const loadStory = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getStory(id, getSignal());
      setStory(data);
    } catch (error: any) {
      if (error.isAborted) return;
      logger.error('Failed to load story:', error);
      toast.error('Failed to load story');
    } finally {
      setLoading(false);
    }
  }, [id, getSignal]);

  // Transform practice blocks from various JSON formats to editor format
  const transformPracticeBlocks = (blocks: any[]): any[] => {
    if (!blocks || !Array.isArray(blocks)) return [];
    
    return blocks.map((block, idx) => {
      const id = block.id || `practice-${idx}`;
      const content = block.content || {};
      
      switch (block.type) {
        case 'exercise_multiple_choice': {
          // Transform { text, isCorrect } format to string[] + correctIndex
          if (Array.isArray(content.options) && content.options[0]?.text !== undefined) {
            const correctIdx = content.options.findIndex((o: any) => o.isCorrect);
            return {
              id,
              type: block.type,
              content: {
                question: content.question || '',
                questionChinese: content.questionChinese || '',
                options: content.options.map((o: any) => o.text || o),
                correctIndex: correctIdx >= 0 ? correctIdx : 0,
                explanation: content.explanation || '',
              },
            };
          }
          // Already in correct format, just ensure id
          return { id, type: block.type, content };
        }
        
        case 'exercise_drag_sentence': {
          // Transform correctOrder/wordPool format to targetSentence/translation
          if (content.correctOrder && !content.targetSentence) {
            return {
              id,
              type: block.type,
              content: {
                targetSentence: Array.isArray(content.correctOrder) 
                  ? content.correctOrder.join('') 
                  : content.correctOrder,
                translation: content.hint || content.instruction || '',
              },
            };
          }
          return { id, type: block.type, content };
        }
        
        case 'reading_comprehension': {
          // Transform choices format to simple question/answer
          if (content.questions && Array.isArray(content.questions)) {
            const transformedQuestions = content.questions.map((q: any) => {
              if (q.choices) {
                // Old format with choices
                const correctChoice = q.choices.find((c: any) => c.isCorrect);
                return {
                  question: q.question || '',
                  questionChinese: q.questionChinese || '',
                  answer: correctChoice?.text || q.answer || '',
                };
              }
              return q;
            });
            return {
              id,
              type: block.type,
              content: { questions: transformedQuestions },
            };
          }
          return { id, type: block.type, content };
        }
        
        case 'exercise_spot_error': {
          // Transform words/incorrectWordIndex to sentence/errorWord/correctWord
          if (content.words && content.incorrectWordIndex !== undefined) {
            const errorWord = content.words[content.incorrectWordIndex];
            return {
              id,
              type: block.type,
              content: {
                sentence: content.words.join(''),
                errorWord: errorWord || '',
                correctWord: '',
                explanation: content.explanation || '',
              },
            };
          }
          return { id, type: block.type, content };
        }
        
        default:
          return { id, type: block.type, content };
      }
    });
  };

  const initializeFromImport = (data: StoryImportData) => {
    // Transform practice blocks to editor format
    const transformedBlocks = transformPracticeBlocks(data.practiceBlocks || []);
    
    // Handle practiceIntro if present
    const practiceIntro = data.practiceIntro;
    const allBlocks = practiceIntro 
      ? [{ id: 'intro-0', type: '_practice_intro', content: practiceIntro }, ...transformedBlocks]
      : transformedBlocks;
    
    setStory({
      id: 'new',
      title: data.title,
      subtitle: data.titleEn || data.subtitle,
      author: data.author,
      description: data.description,
      topic: data.topic,
      hskLevel: data.hskLevel,
      difficulty: data.difficulty || 'medium',
      storyType: data.storyType,
      estimatedMinutes: data.estimatedMinutes,
      accessTier: data.accessTier,
      seriesId: data.seriesId,
      seriesOrder: data.seriesOrder,
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentences: data.sentences.map((s, idx) => ({
        id: `temp-${idx}`,
        storyId: 'new',
        orderIndex: idx,
        chinese: s.chinese,
        pinyin: s.pinyin,
        english: s.english,
        speaker: s.speaker || null,
        audioUrl: null,
        createdAt: new Date(),
      })),
      vocabulary: [],
      questions: [],
      practiceBlocks: allBlocks,
    } as any);
    setIsDirty(true);
    toast.success('Story imported!', `Loaded "${data.title}" with ${data.sentences.length} sentences`);
  };

  const initializeEmpty = () => {
    setStory({
      id: 'new',
      title: '',
      hskLevel: 1,
      difficulty: 'medium',
      storyType: 'text',
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentences: [],
      vocabulary: [],
      questions: [],
      practiceBlocks: [],
    } as any);
  };

  const handleSave = useCallback(async () => {
    if (!story) return;

    setSaving(true);
    try {
      if (isNew) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createParams: any = {
          title: story.title,
          subtitle: story.subtitle,
          author: story.author,
          description: story.description,
          topic: story.topic,
          hskLevel: story.hskLevel,
          difficulty: story.difficulty,
          estimatedMinutes: story.estimatedMinutes,
          practiceBlocks: story.practiceBlocks,
        };
        const newStory = await createStory(createParams);

        // Save sentences if we have them
        if (story.sentences && story.sentences.length > 0) {
          await bulkSaveSegments(newStory.id, story.sentences.map((s) => ({
            chinese: s.chinese,
            pinyin: s.pinyin,
            english: s.english,
            speaker: s.speaker || undefined,
            audioR2Key: s.audioR2Key,
          })));
        }

        toast.success('Story created!', `"${story.title}" saved with ${story.sentences?.length || 0} sentences`);
        navigate(`/stories/${newStory.id}/edit`, { replace: true });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateParams: any = {
          title: story.title,
          subtitle: story.subtitle,
          author: story.author,
          description: story.description,
          topic: story.topic,
          hskLevel: story.hskLevel,
          difficulty: story.difficulty,
          estimatedMinutes: story.estimatedMinutes,
          isPublished: story.isPublished,
          practiceBlocks: story.practiceBlocks,
        };
        await updateStory(story.id, updateParams);
        toast.success('Story saved!');
      }
      setIsDirty(false);
      clearAutoSave(); // Clear local draft after successful save
    } catch (error) {
      logger.error('Failed to save story:', error);
      toast.error('Save failed', 'Could not save story. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [story, isNew, navigate]);

  const handleStoryChange = useCallback((updates: Partial<StoryWithDetails>) => {
    setStory(prev => prev ? { ...prev, ...updates } : null);
    setIsDirty(true);
  }, []);

  const handleSentenceAudioUpdate = useCallback((sentenceId: string, audioR2Key: string) => {
    // Update the in-memory sentence with the R2 key
    setStory(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sentences: prev.sentences?.map(s =>
          s.id === sentenceId ? { ...s, audioR2Key } : s
        ),
      };
    });
    setIsDirty(true);
  }, []);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading story...</span>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600">Story not found</p>
          <button
            onClick={() => navigate('/stories')}
            className="mt-4 text-purple-600 hover:underline"
          >
            Back to stories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* RECOVERY BANNER */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      {hasRecoveredData && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Unsaved changes found!</p>
              <p className="text-sm text-amber-700">
                You have a draft from {recoveryTimestamp ? new Date(recoveryTimestamp).toLocaleString() : 'earlier'}. 
                Would you like to restore it?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={dismissRecovery}
              className="px-3 py-1.5 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-medium"
            >
              Discard
            </button>
            <button
              onClick={recoverData}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
            >
              Restore Draft
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/stories')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {isNew ? 'New Story' : story.title || 'Untitled'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                HSK {story.hskLevel}
              </span>
              <span className="capitalize">{story.difficulty}</span>
              <span className={story.isPublished ? 'text-green-600' : 'text-amber-600'}>
                • {story.isPublished ? 'Published' : 'Draft'}
              </span>
              {isDirty && lastLocalSave && (
                <span className="text-slate-400">
                  • Saved locally {new Date(lastLocalSave).toLocaleTimeString()}
                </span>
              )}
              {isDirty && !lastLocalSave && (
                <span className="text-amber-500 animate-pulse">
                  • Unsaved changes
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Readiness Score */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
            <div className={cn(
              "w-2 h-2 rounded-full",
              readiness.score >= 100 ? "bg-green-500" :
              readiness.score >= 50 ? "bg-amber-500" : "bg-red-500"
            )} />
            <span className="text-sm font-medium text-slate-700">
              {readiness.score}% ready
            </span>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
              isDirty || isNew
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-slate-100 text-slate-600"
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : isDirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB NAVIGATION */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <nav className="bg-white border-b border-slate-200 px-6 shrink-0">
        <div className="flex gap-1">
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const isComplete = 
              (tab.id === 'story' && story.title && stats.sentences > 0) ||
              (tab.id === 'audio' && stats.withAudio === stats.sentences && stats.sentences > 0) ||
              (tab.id === 'practice' && stats.practiceBlocks > 0) ||
              (tab.id === 'publish' && story.isPublished);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
                  isActive
                    ? "text-purple-600"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                  isComplete
                    ? "bg-green-100 text-green-600"
                    : isActive
                    ? "bg-purple-100 text-purple-600"
                    : "bg-slate-100 text-slate-500"
                )}>
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </span>
                <span>{tab.label}</span>
                
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════ */}
      
      <main className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className={cn(
          "flex-1 overflow-y-auto transition-all",
          showPreview ? "pr-0" : "pr-0"
        )}>
          {activeTab === 'story' && (
            <StoryTab
              story={story}
              onChange={handleStoryChange}
              onSentencesChange={(sentences) => {
                handleStoryChange({ sentences } as any);
              }}
            />
          )}
          
          {activeTab === 'audio' && (
            <AudioTab
              story={story}
              onUpdate={loadStory}
              onSentenceAudioUpdate={handleSentenceAudioUpdate}
            />
          )}
          
          {activeTab === 'practice' && (
            <PracticeTab
              story={story}
              onChange={handleStoryChange}
            />
          )}
          
          {activeTab === 'publish' && (
            <PublishTab
              story={story}
              stats={stats}
              readiness={readiness}
              onPublish={async () => {
                handleStoryChange({ isPublished: true });
                await handleSave();
              }}
              onUnpublish={async () => {
                handleStoryChange({ isPublished: false });
                await handleSave();
              }}
            />
          )}
        </div>

        {/* Preview Panel (Optional) */}
        {showPreview && (
          <StoryPreviewPanel
            story={story}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
          />
        )}
      </main>
    </div>
  );
}

export default StoryEditorV2;

