/**
 * PracticeTab - Practice block management using Lesson BlockEditor
 * 
 * Features:
 * - Add/remove practice blocks
 * - Practice intro toggle
 * - Uses same BlockEditor as lessons for consistent UX
 * - Adapts between story and lesson block formats
 */

import { useState, useCallback } from "react";
import { 
  Plus, 
  Trash2, 
  GripVertical,
  CheckSquare,
  FileQuestion,
  Shuffle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import type { ContentBlock } from "@/types/lesson";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { BlockEditor } from "@/components/BlockEditor";
import { 
  storyToLessonBlock, 
  lessonToStoryBlock, 
  type StoryPracticeBlock 
} from "@/lib/storyPracticeAdapter";

// Simple ID generator
const nanoid = () => Math.random().toString(36).substring(2, 15);

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface PracticeTabProps {
  story: StoryWithDetails;
  onChange: (updates: Partial<StoryWithDetails>) => void;
}

interface PracticeIntro {
  enabled: boolean;
  title: string;
  message: string;
  skipLabel: string;
  startLabel: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const BLOCK_TYPES = [
  {
    type: 'exercise_multiple_choice',
    label: 'Multiple Choice',
    icon: CheckSquare,
    description: 'Question with 2-4 answer options',
    color: 'bg-blue-500',
  },
  {
    type: 'reading_comprehension',
    label: 'Reading Comprehension',
    icon: FileQuestion,
    description: 'Questions about the story',
    color: 'bg-green-500',
  },
  {
    type: 'exercise_drag_sentence',
    label: 'Sentence Ordering',
    icon: Shuffle,
    description: 'Drag words to form a sentence',
    color: 'bg-purple-500',
  },
  {
    type: 'exercise_spot_error',
    label: 'Spot the Error',
    icon: AlertCircle,
    description: 'Find and correct mistakes',
    color: 'bg-amber-500',
  },
];

const DEFAULT_INTRO: PracticeIntro = {
  enabled: true,
  title: "Practice Time! 📝",
  message: "Ready to test your understanding?",
  skipLabel: "Skip",
  startLabel: "Let's go!",
};

// ═══════════════════════════════════════════════════════════
// DEFAULT BLOCK CONTENT
// ═══════════════════════════════════════════════════════════

const getDefaultContent = (type: string): Record<string, unknown> => {
  switch (type) {
    case 'exercise_multiple_choice':
      return {
        question: '',
        questionHanzi: '',
        options: [
          { id: nanoid(), text: '', isCorrect: true },
          { id: nanoid(), text: '', isCorrect: false },
          { id: nanoid(), text: '', isCorrect: false },
          { id: nanoid(), text: '', isCorrect: false },
        ],
        explanation: '',
      };
    case 'reading_comprehension':
      return {
        instruction: 'Answer the following:',
        questions: [
          { 
            question: '', 
            choices: [
              { text: '', isCorrect: true },
              { text: '', isCorrect: false },
            ],
          }
        ],
      };
    case 'exercise_drag_sentence':
      return {
        instruction: '',
        correctOrder: [],
        wordPool: [],
        hint: '',
      };
    case 'exercise_spot_error':
      return {
        question: '',
        words: [],
        incorrectWordIndex: 0,
        explanation: '',
      };
    default:
      return {};
  }
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function PracticeTab({ story, onChange }: PracticeTabProps) {
  const [showIntroSettings, setShowIntroSettings] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────
  // EXTRACT DATA
  // ─────────────────────────────────────────────────────────
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = (story.practiceBlocks || []) as any[];
  
  // Find practice intro (stored as special block type)
  const introBlock = blocks.find(b => b.type === '_practice_intro');
  const intro: PracticeIntro = introBlock?.content 
    ? (introBlock.content as unknown as PracticeIntro)
    : DEFAULT_INTRO;
  
  // Regular practice blocks (exclude intro)
  const practiceBlocks = blocks.filter(b => b.type !== '_practice_intro') as StoryPracticeBlock[];

  // Get the currently active block for editing
  const activeBlock = practiceBlocks.find(b => b.id === activeBlockId);

  // ─────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────
  
  const updateIntro = (updates: Partial<PracticeIntro>) => {
    const newIntro = { ...intro, ...updates };
    const newBlocks = blocks.filter(b => b.type !== '_practice_intro');
    
    onChange({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      practiceBlocks: [
        { id: introBlock?.id || nanoid(), type: '_practice_intro', content: newIntro },
        ...newBlocks,
      ] as any,
    });
  };

  const addBlock = (type: string) => {
    const newBlock = {
      id: nanoid(),
      type,
      content: getDefaultContent(type),
    };

    const newBlocks = [
      ...blocks.filter(b => b.type === '_practice_intro'),
      ...practiceBlocks,
      newBlock,
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange({ practiceBlocks: newBlocks as any });
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = useCallback((updatedLessonBlock: ContentBlock) => {
    // Convert back to story format and save
    const storyBlock = lessonToStoryBlock(updatedLessonBlock);
    
    const newBlocks = blocks.map(b =>
      b.id === storyBlock.id ? storyBlock : b
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange({ practiceBlocks: newBlocks as any });
  }, [blocks, onChange]);

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(b => b.id !== blockId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange({ practiceBlocks: newBlocks as any });
    if (activeBlockId === blockId) {
      setActiveBlockId(null);
    }
  };

  const getBlockTypeInfo = (type: string) => {
    return BLOCK_TYPES.find(t => t.type === type) || {
      label: type.replace(/_/g, ' '),
      icon: CheckSquare,
      color: 'bg-slate-500',
    };
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* ═══════════════════════════════════════════════════════ */}
      {/* LEFT PANEL - Block List */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Practice Introduction */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Practice Introduction</h2>
                <p className="text-sm text-slate-500">
                  Optional prompt before practice begins
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={intro.enabled}
                onChange={(e) => updateIntro({ enabled: e.target.checked })}
                className="w-5 h-5 rounded text-purple-600"
              />
              <span className="text-sm font-medium text-slate-700">Enabled</span>
            </label>
          </div>

          {intro.enabled && (
            <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowIntroSettings(!showIntroSettings)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                {showIntroSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Customize text
              </button>

              {showIntroSettings && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input
                      value={intro.title}
                      onChange={(e) => updateIntro({ title: e.target.value })}
                      placeholder="Practice Time!"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Message</Label>
                    <Input
                      value={intro.message}
                      onChange={(e) => updateIntro({ message: e.target.value })}
                      placeholder="Ready to test yourself?"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Skip Label</Label>
                    <Input
                      value={intro.skipLabel}
                      onChange={(e) => updateIntro({ skipLabel: e.target.value })}
                      placeholder="Skip"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Start Label</Label>
                    <Input
                      value={intro.startLabel}
                      onChange={(e) => updateIntro({ startLabel: e.target.value })}
                      placeholder="Let's go!"
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-600 mb-2">Preview:</p>
                <p className="text-lg font-semibold text-slate-900">{intro.title}</p>
                <p className="text-slate-600 mt-1">{intro.message}</p>
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded text-sm text-slate-600">
                    {intro.skipLabel}
                  </span>
                  <span className="px-3 py-1 bg-purple-600 rounded text-sm text-white">
                    {intro.startLabel}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Blocks */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-medium text-slate-900 mb-4">Add Practice Block</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {BLOCK_TYPES.map((blockType) => {
              const Icon = blockType.icon;
              return (
                <button
                  key={blockType.type}
                  onClick={() => addBlock(blockType.type)}
                  className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                >
                  <div className={cn("p-2 rounded-lg", blockType.color)}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{blockType.label}</p>
                    <p className="text-xs text-slate-500">{blockType.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Blocks List */}
        {practiceBlocks.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-slate-900">
              Practice Blocks ({practiceBlocks.length})
            </h3>

            {practiceBlocks.map((block, index) => {
              const typeInfo = getBlockTypeInfo(block.type);
              const Icon = typeInfo.icon;
              const isActive = activeBlockId === block.id;

              return (
                <div
                  key={block.id}
                  className={cn(
                    "bg-white rounded-xl border overflow-hidden cursor-pointer transition-all",
                    isActive 
                      ? "border-purple-400 ring-2 ring-purple-100" 
                      : "border-slate-200 hover:border-slate-300"
                  )}
                  onClick={() => setActiveBlockId(isActive ? null : block.id)}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                    
                    <div className={cn("p-1.5 rounded", typeInfo.color)}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>

                    <span className="font-medium text-slate-900 flex-1">
                      {index + 1}. {typeInfo.label}
                    </span>

                    <span className={cn(
                      "text-xs px-2 py-1 rounded",
                      isActive ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {isActive ? 'Editing' : 'Click to edit'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBlock(block.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preview of content */}
                  {!isActive && block.content && (
                    <div className="px-4 pb-3 text-sm text-slate-500 truncate">
                      {getBlockPreview(block)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {practiceBlocks.length === 0 && (
          <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Plus className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 mb-1">No practice blocks yet</p>
            <p className="text-sm text-slate-400">
              Add blocks above to test comprehension
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* RIGHT PANEL - Block Editor (like lessons) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeBlock && (
        <div className="w-[420px] border-l bg-card flex flex-col shrink-0">
          {/* Panel Header */}
          <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-muted/30">
            <div>
              <h2 className="text-sm font-semibold">Edit Block</h2>
              <p className="text-xs text-muted-foreground capitalize">
                {getBlockTypeInfo(activeBlock.type).label}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveBlockId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Panel Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-5">
              <BlockEditor
                key={activeBlockId}
                block={storyToLessonBlock(activeBlock)}
                onChange={updateBlock}
                hskLevel={story.hskLevel || 1}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function getBlockPreview(block: StoryPracticeBlock): string {
  const content = block.content as Record<string, unknown>;
  
  switch (block.type) {
    case 'exercise_multiple_choice':
      return (content.question as string) || 'No question set';
    case 'reading_comprehension': {
      const questions = content.questions as Array<{ question: string }> | undefined;
      return questions?.[0]?.question || 'No questions set';
    }
    case 'exercise_drag_sentence':
      return (content.targetSentence as string) || 'No sentence set';
    case 'exercise_spot_error':
      return (content.sentence as string) || 'No sentence set';
    default:
      return 'Block content';
  }
}
