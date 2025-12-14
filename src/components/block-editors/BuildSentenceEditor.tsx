/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BuildSentenceEditor - Intuitive fill-in-the-blank exercise editor
 * 
 * User types a sentence with ___ to mark blanks:
 * - "她是___" (blank at end)
 * - "___是老师" (blank at start)
 * - "我___很高兴" (blank in middle)
 * - "___是___" (multiple blanks)
 */

import { useState, useEffect, useMemo } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseBuildSentenceBlock } from '@/types/lesson';
import { Plus, Trash2, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from '@/components/ai/AISuggestButton';
import type { Suggestion } from '@/services/aiSuggestAPI';
import type { LessonWord } from '@/lib/extractLessonVocab';
import { RubyText } from '@/components/ui/RubyText';

interface BuildSentenceEditorProps {
  block: ExerciseBuildSentenceBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
  hskLevel?: number;
  lessonWords?: LessonWord[];
}

// Parse sentence with ___ markers into slots structure
function parseSentenceToSlots(sentence: string): Array<{ content: string | null; isFixed: boolean }> {
  if (!sentence) return [];
  
  const slots: Array<{ content: string | null; isFixed: boolean }> = [];
  const parts = sentence.split('___');
  
  parts.forEach((part, index) => {
    // Add the fixed content (if any)
    if (part.trim()) {
      slots.push({ content: part.trim(), isFixed: true });
    }
    // Add blank slot between parts (not after last)
    if (index < parts.length - 1) {
      slots.push({ content: null, isFixed: false });
    }
  });
  
  return slots;
}

// Convert slots back to sentence string with ___
function slotsToSentence(slots: Array<{ content: string | null; isFixed: boolean }>): string {
  return slots.map(slot => slot.isFixed ? slot.content : '___').join('');
}

// Count blanks in sentence
function countBlanks(sentence: string): number {
  return (sentence.match(/___/g) || []).length;
}

export function BuildSentenceEditor({ block, onChange, lessonId = '', hskLevel = 1, lessonWords: _lessonWords = [] }: BuildSentenceEditorProps) {
  // Derive sentence from existing slots or use empty
  const initialSentence = useMemo(() => {
    if (block.content.sentence) return block.content.sentence;
    if (block.content.slots?.length) return slotsToSentence(block.content.slots);
    return '';
  }, []);
  
  const [sentence, setSentence] = useState(initialSentence);
  const [correctAnswer, setCorrectAnswer] = useState(block.content.correctAnswer || '');
  const [distractors, setDistractors] = useState<string[]>(
    block.content.distractors || 
    (block.content.phrasePool?.filter((p: string) => p !== block.content.correctAnswer) || [])
  );
  
  const blankCount = countBlanks(sentence);
  
  // Update parent whenever values change
  useEffect(() => {
    const slots = parseSentenceToSlots(sentence);
    const phrasePool = correctAnswer ? [correctAnswer, ...distractors.filter(d => d)] : distractors.filter(d => d);
    
    // Build correct sentence by replacing blanks with correct answer
    const correctSentence = sentence.replace(/___/g, correctAnswer || '___').split('').filter(c => c.trim()).join('');
    
    onChange('content', {
      ...block.content,
      sentence,
      slots,
      correctAnswer,
      distractors: distractors.filter(d => d),
      phrasePool,
      correctSentence: correctSentence ? [correctSentence] : [],
    });
  }, [sentence, correctAnswer, distractors]);
  
  const addDistractor = () => {
    setDistractors([...distractors, '']);
  };
  
  const updateDistractor = (index: number, value: string) => {
    const newDistractors = [...distractors];
    newDistractors[index] = value;
    setDistractors(newDistractors);
  };
  
  const removeDistractor = (index: number) => {
    setDistractors(distractors.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-6">
      {/* Sentence with blank */}
      <div className="space-y-2">
        <Label>
          Sentence with Blank <span className="text-destructive">*</span>
        </Label>
        <Input
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="她是___"
          className="font-medium text-lg"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1 py-0.5 rounded font-mono">___</code> (three underscores) to mark where the blank goes. 
          You can place it anywhere: <code className="bg-muted px-1 py-0.5 rounded">___是老师</code>, <code className="bg-muted px-1 py-0.5 rounded">她___老师</code>, <code className="bg-muted px-1 py-0.5 rounded">她是___</code>
        </p>
        
        {/* Preview */}
        {sentence && (
          <div className="mt-3 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Eye size={14} />
              <span>Preview</span>
            </div>
            <div className="flex items-center gap-2 text-2xl font-medium">
              {sentence.split('___').map((part, index, arr) => (
                <span key={index} className="flex items-center gap-2">
                  {part && <RubyText text={part} size="lg" />}
                  {index < arr.length - 1 && (
                    <span className="inline-block min-w-[60px] h-10 border-b-2 border-dashed border-primary/50 bg-primary/5 rounded px-2 text-center text-primary/70">
                      {correctAnswer || '?'}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Correct Answer */}
      <div className="space-y-2">
        <Label>
          Correct Answer <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2 items-center">
          <Input
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="老师"
            className="flex-1 font-medium"
          />
          {correctAnswer && (
            <RubyText text={correctAnswer} size="sm" className="text-green-600 min-w-[50px]" />
          )}
          <InlineAudioStatus
            text={correctAnswer}
            audioUrl={undefined}
            lessonId={lessonId || 'draft'}
            blockId={block.id}
            optionId="correct"
            onAudioSaved={() => {}}
            disabled={!lessonId || !correctAnswer}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The word that correctly fills the blank
          {blankCount > 1 && (
            <span className="text-amber-600"> (Note: {blankCount} blanks detected - same answer fills all)</span>
          )}
        </p>
      </div>
      
      {/* Distractors */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Distractor Options</Label>
          {correctAnswer && (
            <AISuggestButton
              context="distractor-word"
              correctAnswer={correctAnswer}
              hskLevel={hskLevel}
              exclude={[correctAnswer, ...distractors]}
              count={5}
              onSelect={(suggestion: Suggestion) => {
                if (!distractors.includes(suggestion.text)) {
                  setDistractors([...distractors, suggestion.text]);
                }
              }}
              size="md"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Wrong options to make it challenging. Click ✨ for AI-suggested distractors.
        </p>
        
        <div className="space-y-2">
          {distractors.map((distractor, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={distractor}
                onChange={(e) => updateDistractor(index, e.target.value)}
                placeholder={`Wrong option ${index + 1}`}
                className="flex-1"
              />
              {distractor && (
                <RubyText text={distractor} size="sm" className="text-muted-foreground min-w-[50px]" />
              )}
              <InlineAudioStatus
                text={distractor}
                audioUrl={undefined}
                lessonId={lessonId || 'draft'}
                blockId={block.id}
                optionId={`distractor-${index}`}
                onAudioSaved={() => {}}
                disabled={!lessonId || !distractor}
              />
              <button
                onClick={() => removeDistractor(index)}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button
            onClick={addDistractor}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Distractor
          </button>
        </div>
      </div>
      
      {/* English Hint */}
      <FormField
        label="English Hint"
        value={block.content.instruction || ''}
        onChange={(value) => onChange('content', { ...block.content, instruction: value })}
        placeholder="She is a ___"
        helpText="The English translation with blank to help the user"
      />
      
      {/* Explanation */}
      <FormField
        label="Explanation (shown after answer)"
        value={block.content.explanation || ''}
        onChange={(value) => onChange('content', { ...block.content, explanation: value })}
        placeholder="她是老师 = She is a teacher"
        multiline
      />
    </div>
  );
}
