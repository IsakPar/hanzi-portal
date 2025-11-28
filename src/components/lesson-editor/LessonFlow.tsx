/* eslint-disable @typescript-eslint/no-explicit-any, no-constant-binary-expression */
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ContentBlock } from "@/types/lesson";
import { GripVertical, Trash2, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonFlowProps {
  blocks: ContentBlock[];
  onReorder: (newBlocks: ContentBlock[]) => void;
  onEditBlock: (block: ContentBlock) => void;
  onDeleteBlock: (blockId: string) => void;
}

export function LessonFlow({ blocks, onReorder, onEditBlock, onDeleteBlock }: LessonFlowProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over.id);
      onReorder(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 pb-32">
      <div className="space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {blocks.map((block, index) => (
              <SortableBlockItem
                key={block.id}
                block={block}
                index={index}
                onEdit={() => onEditBlock(block)}
                onDelete={() => onDeleteBlock(block.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground">
            <p>No blocks yet.</p>
            <p className="text-sm">Click items in the library to add content.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SortableBlockItemProps {
  block: ContentBlock;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableBlockItem({ block, index, onEdit, onDelete }: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 bg-card border rounded-lg p-3 shadow-sm transition-all hover:border-primary/50 hover:shadow-md",
        isDragging && "shadow-lg ring-2 ring-primary opacity-50"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
      >
        <GripVertical size={20} />
      </div>

      {/* Block Info */}
      <div className="flex-1 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-muted text-muted-foreground text-[10px] font-mono px-1.5 py-0.5 rounded uppercase">
            {block.type.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-muted-foreground">Block {index + 1}</span>
        </div>
        <div className="font-medium text-sm truncate">
          {getBlockSummary(block)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// Helper to generate a preview string based on block type
function getBlockSummary(block: ContentBlock): string {
  // Use safe access for content properties
  const content = (block as any).content || {};
  
  switch (block.type) {
    case 'intro':
      return content.titleEn || 'New Intro';
    case 'hero_hanzi':
      return `${content.hanzi || ''} (${content.pinyin || ''})` || 'New Character';
    case 'explain':
      return content.title || 'Explanation';
    case 'tip':
      return (content.markdown || '').substring(0, 50) || 'Tip';
    case 'pattern':
      return content.title || 'Pattern';
    case 'exercise_multiple_choice':
      return content.question || 'Multiple Choice Question';
    case 'exercise_drag_sentence':
      return content.instruction || 'Drag Sentence';
    case 'reading_passage':
      return content.instruction || 'Reading Passage';
    case 'dialogue':
      return content.scenario || 'Dialogue';
    default:
      return 'Content Block';
  }
}

