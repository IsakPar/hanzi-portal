/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DragSentenceEditor - Edit drag sentence exercise properties
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseDragSentenceBlock } from '@/types/lesson';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DragSentenceEditorProps {
  block: ExerciseDragSentenceBlock;
  onChange: (field: string, value: any) => void;
}

export function DragSentenceEditor({ block, onChange }: DragSentenceEditorProps) {
  const [correctOrder, setCorrectOrder] = useState<string[]>(block.content.correctOrder || []);
  const [pool, setPool] = useState<string[]>(block.content.wordPool || []);

  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateCorrectOrder = (newOrder: string[]) => {
    setCorrectOrder(newOrder);
    updateContent('correctOrder', newOrder);
  };

  const updatePool = (newPool: string[]) => {
    setPool(newPool);
    updateContent('wordPool', newPool);
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Instruction"
        required
        value={block.content.instruction || ''}
        onChange={(value) => updateContent('instruction', value)}
        placeholder="Build the correct sentence"
      />

      {/* Correct Order */}
      <div className="space-y-2">
        <Label>
          Correct Word Order <span className="text-destructive">*</span>
        </Label>
        <div className="space-y-2">
          {correctOrder.map((word, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={word}
                onChange={(e) => {
                  const newOrder = [...correctOrder];
                  newOrder[index] = e.target.value;
                  updateCorrectOrder(newOrder);
                }}
                placeholder={`Word ${index + 1}`}
                className="flex-1"
              />
              <button
                onClick={() => updateCorrectOrder(correctOrder.filter((_, i) => i !== index))}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => updateCorrectOrder([...correctOrder, ''])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Word
          </button>
        </div>
      </div>

      {/* Word Pool */}
      <div className="space-y-2">
        <Label>
          Word Pool (all options) <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Include correct words + wrong alternatives
        </p>
        <div className="space-y-2">
          {pool.map((word, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={word}
                onChange={(e) => {
                  const newPool = [...pool];
                  newPool[index] = e.target.value;
                  updatePool(newPool);
                }}
                placeholder={`Option ${index + 1}`}
                className="flex-1"
              />
              <button
                onClick={() => updatePool(pool.filter((_, i) => i !== index))}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => updatePool([...pool, ''])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Option
          </button>
        </div>
      </div>

      <FormField
        label="Hint"
        value={block.content.hint || ''}
        onChange={(value) => updateContent('hint', value)}
        placeholder="Optional hint text..."
      />
      
      <FormField
        label="Explanation"
        value={block.content.explanation || ''}
        onChange={(value) => updateContent('explanation', value)}
        placeholder="Explain why this is correct..."
        multiline
      />
    </div>
  );
}
