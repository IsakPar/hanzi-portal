/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockLibrary } from "@/components/lesson-editor/BlockLibrary";
import { LessonFlow } from "@/components/lesson-editor/LessonFlow";
import { BlockEditor } from "@/components/BlockEditor";
import { LessonMetadataEditor } from "@/components/lesson-editor/LessonMetadataEditor";
import type { ContentBlock, Lesson } from "@/types/lesson";
import { createDefaultBlock } from "@/lib/block-defaults";
import { logger } from "@/utils/logger";
import { toast } from "@/hooks/useToast";
import { useGlobalConfirm } from "@/hooks/useConfirm";
import { lessonAPI, type CreateLessonPayload } from "@/services/lessonAPI";
import { useSaveShortcut, useEscapeKey } from "@/hooks/useKeyboardShortcuts";
import { useAbortController } from "@/hooks/useAbortController";

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
  const navigate = useNavigate();
  const confirm = useGlobalConfirm();
  const { getSignal } = useAbortController();
  const isNewLesson = !lessonId || lessonId === "new";

  // State
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(!isNewLesson);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref for save handler (needed for keyboard shortcut)
  const saveHandlerRef = useRef<() => void>(() => {});

  // Load lesson data
  const loadLesson = useCallback(async () => {
    if (isNewLesson) {
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
  }, [lessonId, isNewLesson, getSignal]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);
  
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

  const handleSave = useCallback(async () => {
    if (!lesson) return;

    try {
      setSaving(true);

      if (isNewLesson) {
        // Create new lesson
        const payload: CreateLessonPayload = {
          title: lesson.title,
          subtitle: lesson.subtitle,
          hskLevel: lesson.hskLevel,
          lessonType: lesson.lessonType,
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

        const response = await lessonAPI.create(payload);
        logger.log("Created lesson:", response);

        toast.success(
          "Lesson created!",
          `Lesson #${response.lessonNumber} has been created`
        );

        // Navigate to the new lesson's edit page
        navigate(`/lessons/${response.id}`, { replace: true });
      } else {
        // Update existing lesson
        await lessonAPI.update(lesson.id, {
          ...lesson,
          updatedAt: new Date().toISOString(),
        });
        logger.log("Updated lesson:", lesson.title);
        toast.success("Lesson saved!", "Changes have been saved successfully");
      }

      setIsDirty(false);
    } catch (err: any) {
      logger.error("Failed to save lesson:", err);
      toast.error("Failed to save", err.message || "Please try again");
    } finally {
      setSaving(false);
    }
  }, [lesson, isNewLesson, navigate]);

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
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                {isNewLesson ? "Create Lesson" : isDirty ? "Save Changes" : "Saved"}
              </>
            )}
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
                <BlockEditor block={activeBlock} onChange={handleUpdateBlock} lessonId={lesson.id} />
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
    </div>
  );
}

