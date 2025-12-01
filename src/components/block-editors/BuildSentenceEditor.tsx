/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BuildSentenceEditor - Edit build sentence exercise properties
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseBuildSentenceBlock } from '@/types/lesson';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from '@/components/ai/AISuggestButton';
import type { Suggestion } from '@/services/aiSuggestAPI';
import { cn } from '@/lib/utils';

interface BuildSentenceEditorProps {
  block: ExerciseBuildSentenceBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
  hskLevel?: number;
}

export function BuildSentenceEditor({ block, onChange, lessonId = '', hskLevel = 1 }: BuildSentenceEditorProps) {
  const [slots, setSlots] = useState(block.content.slots || [{ content: null, isFixed: false }]);
  const [phrasePool, setPhrasePool] = useState<string[]>(block.content.phrasePool || []);
  
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateSlots = (newSlots: any[]) => {
    setSlots(newSlots);
    updateContent('slots', newSlots);
  };
  
  const updatePhrasePool = (newPool: string[]) => {
    setPhrasePool(newPool);
    updateContent('phrasePool', newPool);
  };
  
  return (
    <div className="space-y-6">
      <FormField
        label="Instruction"
        required
        value={block.content.instruction || ''}
        onChange={(value) => updateContent('instruction', value)}
        placeholder="Put the parts in the correct order"
      />
      
      {/* Slots */}
      <div className="space-y-2">
        <Label>
          Sentence Slots <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Define the sentence structure with fixed and empty slots
        </p>
        
        <div className="space-y-3">
          {slots.map((slot: any, index: number) => (
            <div key={index} className="flex gap-2 items-start p-4 border rounded-md bg-muted/30 relative group">
              <div className="flex-1 space-y-3">
                <div className="flex gap-2 items-center">
                  <span className="bg-muted font-mono text-xs px-2 py-1 rounded text-muted-foreground">
                    Slot {index + 1}
                  </span>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={slot.isFixed}
                      onChange={(e) => {
                        const newSlots = [...slots];
                        newSlots[index] = { ...newSlots[index], isFixed: e.target.checked };
                        updateSlots(newSlots);
                      }}
                      className="rounded border-input"
                    />
                    Fixed Content (Pre-filled)
                  </label>
                </div>

                <Input
                  value={slot.content || ''}
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[index] = { ...newSlots[index], content: e.target.value || null };
                    updateSlots(newSlots);
                  }}
                  placeholder={slot.isFixed ? "Fixed word (e.g., 我)" : "Leave empty for user to fill"}
                  className={cn(
                    slot.isFixed ? "bg-primary/5 border-primary/20" : "bg-background"
                  )}
                />
              </div>
              
              <button
                onClick={() => updateSlots(slots.filter((_, i) => i !== index))}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors mt-8"
                title="Remove slot"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => updateSlots([...slots, { content: null, isFixed: false }])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Slot
          </button>
        </div>
      </div>
      
      {/* Correct Sentence */}
      <FormField
        label="Correct Sentence (comma-separated)"
        required
        value={(block.content.correctSentence || []).join(', ')}
        onChange={(value) => updateContent('correctSentence', value.split(',').map((s: string) => s.trim()))}
        placeholder="我, 有, 两个, 哥哥, 。"
        helpText="The complete correct sentence in order"
      />
      
      {/* Phrase Pool */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Phrase Pool <span className="text-destructive">*</span>
          </Label>
          {phrasePool.length > 0 && (
            <AISuggestButton
              context="distractor-word"
              correctAnswer={phrasePool[0] || ''}
              hskLevel={hskLevel}
              exclude={phrasePool}
              count={5}
              onSelect={(suggestion: Suggestion) => {
                if (!phrasePool.includes(suggestion.text)) {
                  updatePhrasePool([...phrasePool, suggestion.text]);
                }
              }}
              size="md"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Available phrases. Click ✨ for AI-suggested distractors.
        </p>
        
        <div className="space-y-2">
          {phrasePool.map((phrase, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={phrase}
                onChange={(e) => {
                  const newPool = [...phrasePool];
                  newPool[index] = e.target.value;
                  updatePhrasePool(newPool);
                }}
                placeholder={`Phrase ${index + 1}`}
                className="flex-1"
              />
              <InlineAudioStatus
                text={phrase}
                audioUrl={undefined}
                lessonId={lessonId || 'draft'}
                blockId={block.id}
                optionId={`phrase-${index}`}
                onAudioSaved={() => {}}
                disabled={!lessonId}
              />
              <button
                onClick={() => updatePhrasePool(phrasePool.filter((_, i) => i !== index))}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => updatePhrasePool([...phrasePool, ''])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Phrase
          </button>
        </div>
      </div>
      
      <FormField
        label="Hint"
        value={block.content.hint || ''}
        onChange={(value) => updateContent('hint', value)}
        placeholder="I have two older brothers."
      />
      
      <FormField
        label="Explanation"
        value={block.content.explanation || ''}
        onChange={(value) => updateContent('explanation', value)}
        placeholder="In Chinese, quantity + measure word comes before the noun..."
        multiline
      />
    </div>
  );
}
