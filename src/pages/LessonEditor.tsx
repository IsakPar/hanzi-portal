/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save, Eye, Settings, Loader2, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockLibrary } from "@/components/lesson-editor/BlockLibrary";
import { LessonFlow } from "@/components/lesson-editor/LessonFlow";
import { BlockEditor } from "@/components/BlockEditor";
import { LessonMetadataEditor } from "@/components/lesson-editor/LessonMetadataEditor";
import type { ContentBlock, Lesson } from "@/types/lesson";
import { createDefaultBlock } from "@/lib/block-defaults";
import { extractLessonVocab, type LessonWord } from "@/lib/extractLessonVocab";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/useToast";
import { useGlobalConfirm } from "@/hooks/useConfirm";
import { lessonAPI, type CreateLessonPayload } from "@/services/lessonAPI";
import { useSaveShortcut, useEscapeKey } from "@/hooks/useKeyboardShortcuts";
import { useAbortController } from "@/hooks/useAbortController";
import { useAutoSave } from "@/hooks/useAutoSave";
import { LessonImportModal } from "@/components/lesson-editor/LessonImportModal";
import { LessonChecklist } from "@/components/lesson-editor/LessonChecklist";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { AIPanel } from "@/components/ai/AIPanel";

// Default structure for a new lesson
const createNewLesson = (): Lesson => ({
  id: "",
  title: "Untitled Lesson",
  subtitle: "",
  lessonNumber: 1,
  lessonType: "lesson",
  hskLevel: 1,
  difficulty: "easy",
  estimatedMinutes: 15,
  grammarPoints: [],
  tags: [],
  isPublished: false,
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  blocks: [createDefaultBlock("intro")],
});

export function LessonEditor() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirm = useGlobalConfirm();
  const { getSignal } = useAbortController();
  const { setCurrentDraft } = useAIAssistant();
  const isNewLesson = !lessonId || lessonId === "new";
  const shouldImport = searchParams.get('import') === 'true';

  // State
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(!isNewLesson);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Ref for save handler (needed for keyboard shortcut)
  const saveHandlerRef = useRef<() => void>(() => {});

  // Generate storage key based on lesson ID
  const autoSaveKey = `lesson-draft-${lessonId || 'new'}`;

  // Auto-save hook for draft persistence
  const { 
    lastLocalSave, 
    hasRecoveredData,
    clearStorage: clearAutoSave,
    recoverData,
    dismissRecovery,
  } = useAutoSave({
    storageKey: autoSaveKey,
    data: lesson,
    isDirty,
    isNew: isNewLesson,
    localDebounceMs: 2000, // Save to localStorage after 2 seconds of inactivity
    onRecover: (recoveredLesson) => {
      setLesson(recoveredLesson);
      setIsDirty(true);
      logger.log("Recovered lesson from auto-save");
      toast.success("Restored!", "Your unsaved changes have been restored.");
    },
  });

  // Load lesson data (or import from JSON)
  const loadLesson = useCallback(async () => {
    if (isNewLesson) {
      // Check if we have import data from the list page
      if (shouldImport) {
        const importData = sessionStorage.getItem('lesson-import-data');
        if (importData) {
          try {
            const parsed = JSON.parse(importData);
            
            // Generate IDs for blocks if missing
            const blocks: ContentBlock[] = (parsed.blocks || []).map((block: any, index: number) => ({
              id: block.id || crypto.randomUUID(),
              type: block.type,
              orderIndex: index,
              content: block.content,
            }));

            const importedLesson: Lesson = {
              ...createNewLesson(),
              title: parsed.title || "Imported Lesson",
              subtitle: parsed.subtitle || "",
              hskLevel: parsed.hskLevel || Number(searchParams.get('hsk')) || 1,
              lessonType: parsed.lessonType || (searchParams.get('type') as any) || "lesson",
              difficulty: parsed.difficulty || "easy",
              estimatedMinutes: parsed.estimatedMinutes || 15,
              grammarPoints: parsed.grammarPoints || [],
              tags: parsed.tags || [],
              targetVocabulary: parsed.targetVocabulary || [],
              blocks,
            };

            setLesson(importedLesson);
            setIsDirty(true); // Mark as dirty so user knows to save
            sessionStorage.removeItem('lesson-import-data'); // Clear after use
            toast.success(
              "Lesson Imported!",
              `Loaded ${blocks.length} blocks. Review and save when ready.`
            );
            setLoading(false);
            return;
          } catch (err) {
            logger.error("Failed to parse import data:", err);
            sessionStorage.removeItem('lesson-import-data');
            // Fall through to create empty lesson
          }
        }
      }
      
      setLesson(createNewLesson());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await lessonAPI.getById(lessonId!, getSignal());
      setLesson(data);
      logger.log("Loaded lesson:", data.title);
    } catch (err: any) {
      // Ignore cancelled requests
      if (err.isAborted) return;
      logger.error("Failed to load lesson:", err);
      setError(err.message || "Failed to load lesson");
      toast.error("Failed to load lesson", err.message || "Please try again");
    } finally {
      setLoading(false);
    }
  }, [lessonId, isNewLesson, shouldImport, searchParams, getSignal]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // Update AI context with current draft whenever lesson changes
  useEffect(() => {
    if (lesson) {
      setCurrentDraft({
        type: 'lesson',
        id: lesson.id || 'new',
        title: lesson.title || 'Untitled Lesson',
        content: JSON.stringify(lesson, null, 2),
      });
    }
    
    // Clear draft when leaving the editor
    return () => {
      setCurrentDraft(null);
    };
  }, [lesson, setCurrentDraft]);

  
  // Keyboard shortcuts
  useSaveShortcut(() => {
    if (lesson && (isDirty || isNewLesson) && !saving) {
      saveHandlerRef.current();
    }
  }, [lesson, isDirty, isNewLesson, saving]);
  
  // Escape key to close panels
  useEscapeKey(() => {
    if (showSettings) {
      setShowSettings(false);
    } else if (activeBlockId) {
      setActiveBlockId(null);
    }
  });

  // Derived state
  const activeBlock = lesson?.blocks?.find((b) => b.id === activeBlockId);
  
  // Extract all vocabulary from lesson blocks (for distractor suggestions)
  const lessonWords = useMemo<LessonWord[]>(() => {
    if (!lesson?.blocks) return [];
    return extractLessonVocab(lesson.blocks);
  }, [lesson?.blocks]);

  // Handlers
  const handleAddBlock = (type: any) => {
    if (!lesson) return;
    const newBlock = createDefaultBlock(type);
    setLesson((prev) =>
      prev
        ? {
            ...prev,
            blocks: [...(prev.blocks || []), newBlock],
          }
        : prev
    );
    setActiveBlockId(newBlock.id);
    setIsDirty(true);
  };

  const handleReorderBlocks = (newBlocks: ContentBlock[]) => {
    setLesson((prev) => (prev ? { ...prev, blocks: newBlocks } : prev));
    setIsDirty(true);
  };

  const handleUpdateBlock = (updatedBlock: ContentBlock) => {
    setLesson((prev) =>
      prev
        ? {
            ...prev,
            blocks:
              prev.blocks?.map((b) =>
                b.id === updatedBlock.id ? updatedBlock : b
              ) || [],
          }
        : prev
    );
    setIsDirty(true);
  };

  const handleDeleteBlock = async (blockId: string) => {
    const confirmed = await confirm({
      title: "Delete Block?",
      description: "Are you sure you want to delete this block? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    
    if (confirmed) {
      setLesson((prev) =>
        prev
          ? {
              ...prev,
              blocks: prev.blocks?.filter((b) => b.id !== blockId) || [],
            }
          : prev
      );
      if (activeBlockId === blockId) setActiveBlockId(null);
      setIsDirty(true);
    }
  };

  const handleImportLesson = (importedData: Partial<Lesson>) => {
    setLesson((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        title: importedData.title || prev.title,
        subtitle: importedData.subtitle || prev.subtitle,
        hskLevel: importedData.hskLevel || prev.hskLevel,
        lessonType: importedData.lessonType || prev.lessonType,
        difficulty: importedData.difficulty || prev.difficulty,
        estimatedMinutes: importedData.estimatedMinutes || prev.estimatedMinutes,
        grammarPoints: importedData.grammarPoints || prev.grammarPoints,
        tags: importedData.tags || prev.tags,
        targetVocabulary: importedData.targetVocabulary || prev.targetVocabulary,
        blocks: importedData.blocks || prev.blocks,
      };
    });
    setIsDirty(true);
    setActiveBlockId(null);
    toast.success(
      "Lesson Imported!",
      `Imported ${importedData.blocks?.length || 0} blocks. Review and save when ready.`
    );
  };

  const handleSave = useCallback(async (): Promise<string | null> => {
    if (!lesson) return null;

    try {
      setSaving(true);
      let savedLessonId: string;

      if (isNewLesson) {
        // Create new lesson
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

        // Debug: Log payload before sending
        logger.log("[LessonEditor] Creating lesson with payload:", JSON.stringify(payload, null, 2));

        const response = await lessonAPI.create(payload);
        logger.log("Created lesson:", response);
        savedLessonId = response.id;

        toast.success(
          "Lesson created!",
          `Lesson #${response.lessonNumber} has been created`
        );

        // Update lesson state with new ID
        setLesson(prev => prev ? { ...prev, id: response.id } : prev);
      } else {
        // Update existing lesson
        await lessonAPI.update(lesson.id, {
          ...lesson,
          updatedAt: new Date().toISOString(),
        });
        logger.log("Updated lesson:", lesson.title);
        toast.success("Lesson saved!", "Changes have been saved successfully");
        savedLessonId = lesson.id;
      }

      setIsDirty(false);
      clearAutoSave(); // Clear auto-save storage after successful save
      return savedLessonId;
    } catch (err: any) {
      logger.error("Failed to save lesson:", err);
      // Log more details about the error
      if (err.response) {
        logger.error("Backend response:", err.response);
      }
      if (err.statusCode) {
        logger.error("Status code:", err.statusCode);
      }
      const errorDetail = err.response?.details || err.response?.error || err.message || "Please try again";
      toast.error("Failed to save", errorDetail);
      throw err; // Re-throw so Continue button knows it failed
    } finally {
      setSaving(false);
    }
  }, [lesson, isNewLesson]);

  // Update ref for keyboard shortcut
  saveHandlerRef.current = handleSave;

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Loading lesson...</p>
      </div>
    );
  }

  // Error state
  if (error || !lesson) {
    return (
      <div className="flex flex-col h-screen bg-background items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">
            {error || "Lesson not found"}
          </h2>
          <p className="text-muted-foreground">
            The lesson you're looking for couldn't be loaded.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/lessons")}>
              <ArrowLeft size={16} className="mr-2" />
              Back to Lessons
            </Button>
            <Button onClick={loadLesson}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Recovery Banner */}
      {hasRecoveredData && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-sm text-amber-800">
              <strong>Unsaved changes found!</strong> Would you like to restore your previous work?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={dismissRecovery}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={recoverData}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Restore Changes
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/lessons")}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">
              {isNewLesson ? "New Lesson" : lesson.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              HSK {lesson.hskLevel} • {lesson.blocks?.length || 0} Blocks
              {isNewLesson && " • Draft"}
              {isDirty && !lastLocalSave && (
                <span className="ml-2 text-amber-600 animate-pulse">
                  • Saving locally...
                </span>
              )}
              {isDirty && lastLocalSave && (
                <span className="ml-2 text-green-600">
                  • ✓ Saved locally {lastLocalSave.toLocaleTimeString()}
                </span>
              )}
              {!isDirty && lastLocalSave && (
                <span className="ml-2 text-gray-500">
                  • Last edit saved
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportModal(true)}
            title="Import lesson from JSON"
          >
            <FileJson size={16} className="mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={16} className="mr-2" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Preview", "Preview mode coming soon!")}
          >
            <Eye size={16} className="mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty && !isNewLesson || saving}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                {isNewLesson ? "Create" : isDirty ? "Save" : "Saved"}
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              // Validate minimum requirements before continuing
              if (!lesson.title?.trim()) {
                toast.error("Missing title", "Please add a lesson title before continuing");
                return;
              }
              if (!lesson.blocks || lesson.blocks.length === 0) {
                toast.error("No content", "Please add at least one block before continuing");
                return;
              }

              // Store lesson data in sessionStorage for health check page
              // This does NOT save to database yet - that happens after health check passes
              const reviewData = {
                lesson,
                isNewLesson,
                existingLessonId: isNewLesson ? null : lessonId,
              };
              sessionStorage.setItem('lesson-review-data', JSON.stringify(reviewData));
              
              // Navigate to health check page (no ID in URL - uses sessionStorage)
              navigate('/lessons/review');
            }}
            disabled={saving || !lesson.blocks?.length}
            className="bg-green-600 hover:bg-green-700"
          >
            Continue
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Block Library */}
        <BlockLibrary onAddBlock={handleAddBlock} />

        {/* Center: Lesson Flow Canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/5">
          <LessonFlow
            blocks={lesson.blocks || []}
            onReorder={handleReorderBlocks}
            onEditBlock={(block) => setActiveBlockId(block.id)}
            onDeleteBlock={handleDeleteBlock}
          />
        </div>

        {/* Right: Block Editor Panel */}
        {activeBlock && !showSettings && (
          <div className="w-[420px] border-l bg-card flex flex-col shrink-0">
            {/* Panel Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-muted/30">
              <div>
                <h2 className="text-sm font-semibold">Edit Block</h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {activeBlock.type.replace(/_/g, ' ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveBlockId(null)}
              >
                Close
              </Button>
            </div>
            
            {/* Panel Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-5">
                <BlockEditor 
                  key={activeBlockId} 
                  block={activeBlock} 
                  onChange={handleUpdateBlock} 
                  lessonId={lesson.id}
                  hskLevel={lesson.hskLevel}
                  lessonWords={lessonWords}
                />
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-96 border-l bg-card overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Lesson Settings</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                Close
              </Button>
            </div>

            {/* Checklist - only show for saved lessons */}
            {!isNewLesson && lesson.id && (
              <LessonChecklist lessonId={lesson.id} blocks={lesson.blocks} />
            )}

            <LessonMetadataEditor
              lesson={lesson}
              onChange={(updates) => {
                setLesson({ ...lesson, ...updates });
                setIsDirty(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Import Modal */}
      <LessonImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportLesson}
        currentHskLevel={lesson.hskLevel}
      />

      {/* Floating AI Assistant Panel */}
      <AIPanel />
    </div>
  );
}

