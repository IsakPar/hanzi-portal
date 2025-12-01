/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MultipleChoiceEditor - Edit multiple choice exercise properties
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseMultipleChoiceBlock } from '@/types/lesson';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from '@/components/ai/AISuggestButton';
import type { Suggestion } from '@/services/aiSuggestAPI';
import { cn } from '@/lib/utils';

interface MultipleChoiceEditorProps {
  block: ExerciseMultipleChoiceBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
  hskLevel?: number;
}

export function MultipleChoiceEditor({ block, onChange, lessonId = '', hskLevel = 1 }: MultipleChoiceEditorProps) {
  // Default empty array for options if undefined
  const [options, setOptions] = useState(block.content.options || []);

  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateOptions = (newOptions: any[]) => {
    setOptions(newOptions);
    updateContent('options', newOptions);
  };

  const handleAudioSaved = (index: number, audioUrl: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], audioUrl };
    updateOptions(newOptions);
  };

  const handleAudioRemoved = (index: number) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], audioUrl: undefined };
    updateOptions(newOptions);
  };

  const handleSuggestionSelect = (index: number, suggestion: Suggestion) => {
    const newOptions = [...options];
    newOptions[index] = { 
      ...newOptions[index], 
      text: suggestion.text,
      audioUrl: undefined, // Reset audio when text changes
    };
    updateOptions(newOptions);
  };

  // Get the correct answer for context
  const correctAnswer = options.find(o => o.isCorrect)?.text || '';
  
  // Get all current option texts for exclusion
  const excludeTexts = options.map(o => o.text).filter(Boolean);

  return (
    <div className="space-y-4">
      <FormField
        label="Question"
        required
        value={block.content.question || ''}
        onChange={(value) => updateContent('question', value)}
        placeholder="What does '你好' mean?"
        multiline
      />

      {/* Options */}
      <div className="space-y-2">
        <Label>
          Answer Options <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Add 3-4 options (one must be correct). Chinese options show audio status.
        </p>
        
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={option.id || index} className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Input
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index] = { ...newOptions[index], text: e.target.value };
                    updateOptions(newOptions);
                  }}
                  placeholder={`Option ${index + 1}`}
                  className={cn(
                    option.isCorrect && "border-green-500 ring-1 ring-green-500/20 bg-green-50/10"
                  )}
                />
              </div>
              
              {/* Audio status for Chinese text */}
              <InlineAudioStatus
                text={option.text}
                audioUrl={option.audioUrl}
                lessonId={lessonId || 'draft'}
                blockId={block.id}
                optionId={option.id || `opt-${index}`}
                onAudioSaved={(url) => handleAudioSaved(index, url)}
                onAudioRemoved={() => handleAudioRemoved(index)}
                disabled={!lessonId}
              />
              
              {/* AI Suggest for wrong options */}
              {!option.isCorrect && correctAnswer && (
                <AISuggestButton
                  context="mcq-wrong-option"
                  correctAnswer={correctAnswer}
                  hskLevel={hskLevel}
                  exclude={excludeTexts}
                  count={5}
                  onSelect={(suggestion) => handleSuggestionSelect(index, suggestion)}
                />
              )}
              
              <button
                onClick={() => {
                  const newOptions = options.map((opt, i) => ({
                    ...opt,
                    isCorrect: i === index
                  }));
                  updateOptions(newOptions);
                }}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  option.isCorrect 
                    ? "bg-green-100 text-green-700 hover:bg-green-200" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                title="Mark as correct"
              >
                <CheckCircle size={18} />
              </button>
              
              <button
                onClick={() => updateOptions(options.filter((_, i) => i !== index))}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                title="Remove option"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => updateOptions([
              ...options, 
              { id: crypto.randomUUID(), text: '', isCorrect: false }
            ])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Option
          </button>
        </div>
      </div>

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
