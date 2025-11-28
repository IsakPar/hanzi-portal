/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PatternEditor - Edit pattern block properties
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import type { PatternBlock } from '@/types/lesson';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PatternEditorProps {
  block: PatternBlock;
  onChange: (field: string, value: any) => void;
}

export function PatternEditor({ block, onChange }: PatternEditorProps) {
  // Fallback to empty array if examples is undefined
  const [examples, setExamples] = useState(block.content.examples || []);
  
  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateExamples = (newExamples: any[]) => {
    setExamples(newExamples);
    updateContent('examples', newExamples);
  };
  
  return (
    <div className="space-y-4">
      <FormField
        label="Pattern Title"
        required
        value={block.content.title || ''}
        onChange={(value) => updateContent('title', value)}
        placeholder="e.g., Subject + 是 + Noun"
      />
      <FormField
        label="Pattern Template"
        required
        value={block.content.template || ''}
        onChange={(value) => updateContent('template', value)}
        placeholder="e.g., Subject + 是 + Noun"
        helpText="The grammar pattern structure"
      />
      
      {/* Examples Array */}
      <div className="space-y-2">
        <Label>
          Examples <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Add example sentences demonstrating this pattern
        </p>
        
        <div className="space-y-3">
          {examples.map((example: any, index: number) => (
            <div key={index} className="p-4 border rounded-md bg-muted/30 space-y-3 relative group">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground">Example {index + 1}</span>
                <button
                  onClick={() => updateExamples(examples.filter((_, i) => i !== index))}
                  className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                  title="Remove example"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="grid gap-2">
                <Input
                  value={example.hanzi || ''}
                  onChange={(e) => {
                    const newExamples = [...examples];
                    newExamples[index] = { ...newExamples[index], hanzi: e.target.value };
                    updateExamples(newExamples);
                  }}
                  placeholder="Chinese text"
                />
                <Input
                  value={example.pinyin || ''}
                  onChange={(e) => {
                    const newExamples = [...examples];
                    newExamples[index] = { ...newExamples[index], pinyin: e.target.value };
                    updateExamples(newExamples);
                  }}
                  placeholder="Pinyin"
                />
                <Input
                  value={example.translation || ''}
                  onChange={(e) => {
                    const newExamples = [...examples];
                    newExamples[index] = { ...newExamples[index], translation: e.target.value };
                    updateExamples(newExamples);
                  }}
                  placeholder="English translation"
                />
              </div>
            </div>
          ))}
          
          <button
            onClick={() => updateExamples([...examples, { hanzi: '', pinyin: '', translation: '' }])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Example
          </button>
        </div>
      </div>
    </div>
  );
}
