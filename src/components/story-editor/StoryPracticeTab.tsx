/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import type { StoryWithDetails } from "@/services/storiesAPI";
import type { ContentBlock, BlockType } from "@/types/lesson";

// Practice intro type
interface PracticeIntro {
  enabled: boolean;
  title?: string;
  message?: string;
  skipLabel?: string;
  startLabel?: string;
}

// Internal type for blocks including practiceIntro
type InternalBlock = ContentBlock | { type: '_practice_intro'; id?: string; content: PracticeIntro };
import { Plus, Edit, Trash2, GripVertical, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { BlockEditor } from "@/components/BlockEditor";
import { createDefaultBlock } from "@/lib/block-defaults";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PracticeGenerator } from './PracticeGenerator';

interface StoryPracticeTabProps {
  story: StoryWithDetails;
  onChange: (story: StoryWithDetails) => void;
}

// Default practice intro config
const DEFAULT_PRACTICE_INTRO: PracticeIntro = {
  enabled: true,
  title: "Practice Time! 📝",
  message: "Want to test your understanding?",
  skipLabel: "Skip",
  startLabel: "Let's go!",
};

export function StoryPracticeTab({ story, onChange }: StoryPracticeTabProps) {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  
  // Parse practiceBlocks and extract practiceIntro if present
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    const pb = story.practiceBlocks;
    let arr: InternalBlock[] = [];
    if (Array.isArray(pb)) arr = pb as InternalBlock[];
    else if (typeof pb === 'string') {
      try { arr = JSON.parse(pb); } catch { arr = []; }
    }
    // Filter out _practice_intro block and return only ContentBlocks
    return arr.filter(b => b.type !== '_practice_intro') as ContentBlock[];
  });
  
  const [practiceIntro, setPracticeIntro] = useState<PracticeIntro>(() => {
    const pb = story.practiceBlocks;
    let arr: InternalBlock[] = [];
    if (Array.isArray(pb)) arr = pb as InternalBlock[];
    else if (typeof pb === 'string') {
      try { arr = JSON.parse(pb); } catch { arr = []; }
    }
    // Find _practice_intro block
    const introBlock = arr.find(b => b.type === '_practice_intro') as { type: '_practice_intro'; content: PracticeIntro } | undefined;
    if (introBlock?.content) {
      return { ...DEFAULT_PRACTICE_INTRO, ...introBlock.content };
    }
    return DEFAULT_PRACTICE_INTRO;
  });
  
  const [showIntroSettings, setShowIntroSettings] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Sync practiceIntro changes back to story
  const updatePracticeIntro = (updates: Partial<PracticeIntro>) => {
    const newIntro = { ...practiceIntro, ...updates };
    setPracticeIntro(newIntro);
    // Build full practiceBlocks with intro at start
    const fullBlocks: InternalBlock[] = newIntro.enabled 
      ? [{ type: '_practice_intro' as const, content: newIntro }, ...blocks]
      : blocks;
    onChange({ ...story, practiceBlocks: fullBlocks as any });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper to build full practiceBlocks array (with intro)
  const buildFullBlocks = (blockList: ContentBlock[]): any[] => {
    return practiceIntro.enabled
      ? [{ type: '_practice_intro' as const, content: practiceIntro }, ...blockList]
      : blockList;
  };

  const handleAddBlock = (type: BlockType) => {
    const newBlock = createDefaultBlock(type);
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    onChange({ ...story, practiceBlocks: buildFullBlocks(newBlocks) });
    setEditingIndex(newBlocks.length - 1);
    setShowLibrary(false);
  };

  const handleUpdateBlock = (index: number, updatedBlock: ContentBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = updatedBlock;
    setBlocks(newBlocks);
    onChange({ ...story, practiceBlocks: buildFullBlocks(newBlocks) });
  };

  const handleDeleteBlock = async (index: number) => {
    const confirmed = await confirm({
      title: "Delete Practice Block?",
      description: "Are you sure you want to delete this practice block?",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    onChange({ ...story, practiceBlocks: buildFullBlocks(newBlocks) });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((_, i) => i.toString() === active.id);
    const newIndex = blocks.findIndex((_, i) => i.toString() === over.id);

    const newBlocks = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(newBlocks);
    onChange({ ...story, practiceBlocks: buildFullBlocks(newBlocks) });
  };

  const handleAIBlocksGenerated = (newBlocks: ContentBlock[]) => {
    const combined = [...blocks, ...newBlocks];
    setBlocks(combined);
    onChange({ ...story, practiceBlocks: buildFullBlocks(combined) });
  };

  return (
    <>
      {ConfirmDialogComponent}
      <div className="flex h-full">
        {/* Block Library Sidebar */}
        <div className={cn(
          "border-r border-gray-200 bg-white transition-all duration-300",
          showLibrary ? "w-80" : "w-0 overflow-hidden"
        )}>
        <div className="p-6">
          <h3 className="font-bold text-lg text-gray-800 mb-4">Practice Block Library</h3>
          <p className="text-sm text-gray-600 mb-6">
            Add practice exercises that reinforce the story content
          </p>

          <div className="space-y-6">
            {/* Exercise Blocks */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Exercises
              </h4>
              <div className="space-y-2">
                {[
                  { type: 'exercise_multiple_choice' as BlockType, label: 'Multiple Choice' },
                  { type: 'exercise_drag_sentence' as BlockType, label: 'Drag Sentence' },
                  { type: 'exercise_spot_error' as BlockType, label: 'Spot Error' },
                  { type: 'exercise_build_sentence' as BlockType, label: 'Build Sentence' },
                  { type: 'reading_comprehension' as BlockType, label: '📝 Quiz' },
                ].map((block) => (
                  <button
                    key={block.type}
                    onClick={() => handleAddBlock(block.type)}
                    className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors text-sm font-medium text-purple-700"
                  >
                    {block.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Blocks */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Content
              </h4>
              <div className="space-y-2">
                {[
                  { type: 'explain' as BlockType, label: 'Explanation' },
                  { type: 'tip' as BlockType, label: 'Tip / Note' },
                ].map((block) => (
                  <button
                    key={block.type}
                    onClick={() => handleAddBlock(block.type)}
                    className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-sm font-medium text-blue-700"
                  >
                    {block.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Practice Blocks</h2>
              <p className="text-sm text-gray-600">
                Exercises that appear after users finish reading the story
              </p>
            </div>
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              {showLibrary ? 'Hide Library' : 'Add Block'}
            </button>
          </div>

          {/* Practice Intro Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowIntroSettings(!showIntroSettings)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-800">Practice Prompt</div>
                  <div className="text-sm text-gray-500">
                    {practiceIntro.enabled ? 'Users can skip or start practice' : 'Disabled - practice starts automatically'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={practiceIntro.enabled}
                    onChange={(e) => updatePracticeIntro({ enabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-600">Enabled</span>
                </label>
                {showIntroSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>
            
            {showIntroSettings && practiceIntro.enabled && (
              <div className="px-6 py-4 border-t border-gray-100 space-y-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={practiceIntro.title || ''}
                      onChange={(e) => updatePracticeIntro({ title: e.target.value })}
                      placeholder="Practice Time! 📝"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Input
                      value={practiceIntro.message || ''}
                      onChange={(e) => updatePracticeIntro({ message: e.target.value })}
                      placeholder="Want to test your understanding?"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Skip Button</Label>
                    <Input
                      value={practiceIntro.skipLabel || ''}
                      onChange={(e) => updatePracticeIntro({ skipLabel: e.target.value })}
                      placeholder="Skip"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Button</Label>
                    <Input
                      value={practiceIntro.startLabel || ''}
                      onChange={(e) => updatePracticeIntro({ startLabel: e.target.value })}
                      placeholder="Let's go!"
                    />
                  </div>
                </div>
                
                {/* Preview */}
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-400 uppercase mb-2">Preview</div>
                  <div className="text-center space-y-3">
                    <div className="text-xl font-bold text-gray-800">{practiceIntro.title || 'Practice Time! 📝'}</div>
                    <div className="text-gray-600">{practiceIntro.message || 'Want to test your understanding?'}</div>
                    <div className="flex justify-center gap-3">
                      <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm">
                        {practiceIntro.skipLabel || 'Skip'}
                      </button>
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
                        {practiceIntro.startLabel || "Let's go!"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Practice Generator */}
          <PracticeGenerator
            storyId={story.id}
            onBlocksGenerated={handleAIBlocksGenerated}
          />

          {/* Blocks List */}
          {blocks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="text-gray-400 mb-4">
                <Plus size={64} className="mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No practice blocks yet</h3>
              <p className="text-gray-500 mb-6">
                Add exercises to help users practice what they learned
              </p>
              <button
                onClick={() => setShowLibrary(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add First Block
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((_, i) => i.toString())}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <SortableBlockItem
                      key={index}
                      id={index.toString()}
                      block={block}
                      index={index}
                      isEditing={editingIndex === index}
                      onEdit={() => setEditingIndex(editingIndex === index ? null : index)}
                      onDelete={() => handleDeleteBlock(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Block Editor Overlay */}
      {editingIndex !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Practice Block</h2>
              <button
                onClick={() => setEditingIndex(null)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Done
              </button>
            </div>
            <div className="p-6">
              <BlockEditor
                block={blocks[editingIndex]}
                onChange={(updated) => handleUpdateBlock(editingIndex, updated)}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

function SortableBlockItem({
  id,
  block,
  index,
  isEditing,
  onEdit,
  onDelete,
}: {
  id: string;
  block: ContentBlock;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getBlockLabel = (type: BlockType) => {
    const labels: Record<string, string> = {
      exercise_multiple_choice: 'Multiple Choice',
      exercise_drag_sentence: 'Drag Sentence',
      exercise_spot_error: 'Spot Error',
      exercise_build_sentence: 'Build Sentence',
      reading_comprehension: '📝 Quiz',
      explain: 'Explanation',
      tip: 'Tip',
    };
    return labels[type] || type;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-xl border-2 p-4 transition-all",
        isEditing ? "border-purple-500 shadow-lg" : "border-gray-200 hover:border-gray-300"
      )}
    >
      <div className="flex items-center gap-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-400 hover:text-gray-600"
        >
          <GripVertical size={20} />
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-purple-600 uppercase">
              {getBlockLabel(block.type)}
            </span>
            <span className="text-xs text-gray-500">Block #{index + 1}</span>
          </div>
          <p className="text-sm text-gray-600">
            {block.type === 'exercise_multiple_choice' && (block.content as any).question}
            {block.type === 'exercise_drag_sentence' && (block.content as any).prompt}
            {block.type === 'explain' && (block.content as any).text?.substring(0, 100)}
            {block.type === 'tip' && (block.content as any).text?.substring(0, 100)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

