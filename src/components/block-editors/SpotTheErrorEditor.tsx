/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SpotTheErrorEditor - Edit spot-the-error exercise properties
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseSpotErrorBlock } from '@/types/lesson';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { RubyText } from '@/components/ui/RubyText';

interface SpotTheErrorEditorProps {
  block: ExerciseSpotErrorBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function SpotTheErrorEditor({ block, onChange, lessonId = '' }: SpotTheErrorEditorProps) {
  const [words, setWords] = useState<string[]>(block.content.words || []);
  
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateWords = (newWords: string[]) => {
    setWords(newWords);
    updateContent('words', newWords);
  };
  
  return (
    <div className="space-y-4">
      <FormField
        label="Question"
        required
        value={block.content.question || ''}
        onChange={(value) => updateContent('question', value)}
        placeholder="Which word does NOT belong in this sentence?"
      />
      
      {/* Word Array */}
      <div className="space-y-2">
        <Label>
          Words in Sentence <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Enter all words in the sentence (including the incorrect one)
        </p>
        
        <div className="space-y-2">
          {words.map((word, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={word}
                onChange={(e) => {
                  const newWords = [...words];
                  newWords[index] = e.target.value;
                  updateWords(newWords);
                }}
                placeholder={`Word ${index + 1}`}
                className="flex-1"
              />
              {/* Pinyin display */}
              {word && (
                <RubyText text={word} size="sm" className="min-w-[50px] text-purple-600" />
              )}
              <InlineAudioStatus
                text={word}
                audioUrl={undefined}
                lessonId={lessonId || 'draft'}
                blockId={block.id}
                optionId={`word-${index}`}
                onAudioSaved={() => {}}
                disabled={!lessonId}
              />
              <button
                onClick={() => updateWords(words.filter((_, i) => i !== index))}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <button
            onClick={() => updateWords([...words, ''])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Word
          </button>
        </div>
      </div>
      
      {/* Incorrect Word Index */}
      <div className="space-y-2">
        <Label>
          Incorrect Word Position <span className="text-destructive">*</span>
        </Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={block.content.incorrectWordIndex ?? ''}
          onChange={(e) => updateContent('incorrectWordIndex', parseInt(e.target.value))}
        >
          <option value="">Select position...</option>
          {words.map((word, index) => (
            <option key={index} value={index}>
              Position {index + 1}: {word || '(empty)'}
            </option>
          ))}
        </select>
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
        placeholder="Explain why this word is incorrect..."
        multiline
      />
    </div>
  );
}
