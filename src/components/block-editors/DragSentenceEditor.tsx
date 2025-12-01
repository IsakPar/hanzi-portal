/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DragSentenceEditor - Edit drag sentence exercise properties
 * 
 * Now includes inline [+] buttons for adding alternative words directly
 */

import { useState, useEffect } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseDragSentenceBlock } from '@/types/lesson';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { WordWithAlternatives } from '../lesson-editor/WordWithAlternatives';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from '@/components/ai/AISuggestButton';
import type { Suggestion } from '@/services/aiSuggestAPI';

interface Alternative {
  id: string;
  hanzi: string;
  pinyin?: string;
  english?: string;
}

interface DragSentenceEditorProps {
  block: ExerciseDragSentenceBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
  hskLevel?: number;
}

export function DragSentenceEditor({ block, onChange, lessonId = '', hskLevel = 1 }: DragSentenceEditorProps) {
  const [correctOrder, setCorrectOrder] = useState<string[]>(block.content.correctOrder || []);
  const [pool, setPool] = useState<string[]>(block.content.wordPool || []);
  
  // Track alternatives per word index (stored in extended content)
  const extendedContent = block.content as typeof block.content & { wordAlternatives?: Record<number, Alternative[]> };
  const [wordAlternatives, setWordAlternatives] = useState<Record<number, Alternative[]>>(
    extendedContent.wordAlternatives || {}
  );

  // Sync with block content when it changes externally
  useEffect(() => {
    setCorrectOrder(block.content.correctOrder || []);
    setPool(block.content.wordPool || []);
    const ext = block.content as typeof block.content & { wordAlternatives?: Record<number, Alternative[]> };
    setWordAlternatives(ext.wordAlternatives || {});
  }, [block.content]);

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

  // Handle alternatives change for a word
  const handleAlternativesChange = (wordIndex: number, alternatives: Alternative[]) => {
    const updated = { ...wordAlternatives, [wordIndex]: alternatives };
    setWordAlternatives(updated);
    updateContent('wordAlternatives', updated);
    
    // Also add alternative hanzi to the word pool if not already there
    alternatives.forEach(alt => {
      if (!pool.includes(alt.hanzi)) {
        const newPool = [...pool, alt.hanzi];
        setPool(newPool);
        updateContent('wordPool', newPool);
      }
    });
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

      {/* Correct Word Order with Inline Alternatives */}
      <div className="space-y-2">
        <Label>
          Correct Word Order <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Click [+] on any word to add alternative words for variety
        </p>
        <div className="space-y-3">
          {correctOrder.map((word, index) => (
            <WordWithAlternatives
              key={index}
              word={word}
              wordIndex={index}
              blockId={block.id}
              alternatives={wordAlternatives[index] || []}
              onAlternativesChange={handleAlternativesChange}
              placeholder={`Word ${index + 1}`}
              onWordChange={(value) => {
                const newOrder = [...correctOrder];
                newOrder[index] = value;
                updateCorrectOrder(newOrder);
              }}
              onRemove={() => {
                updateCorrectOrder(correctOrder.filter((_, i) => i !== index));
                // Also remove alternatives for this index
                const updatedAlts = { ...wordAlternatives };
                delete updatedAlts[index];
                setWordAlternatives(updatedAlts);
                updateContent('wordAlternatives', updatedAlts);
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => updateCorrectOrder([...correctOrder, ''])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Word
          </button>
        </div>
      </div>

      {/* Word Pool - Auto-populated from correct order + alternatives */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Word Pool (auto-generated)
          </Label>
          {correctOrder.length > 0 && (
            <AISuggestButton
              context="distractor-word"
              correctAnswer={correctOrder.join('')}
              hskLevel={hskLevel}
              exclude={pool}
              count={5}
              onSelect={(suggestion: Suggestion) => {
                if (!pool.includes(suggestion.text)) {
                  updatePool([...pool, suggestion.text]);
                }
              }}
              size="md"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Includes correct words + alternatives. Click ✨ for AI-suggested distractors.
        </p>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg min-h-12">
          {pool.map((word, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded text-sm"
            >
              {word}
              <InlineAudioStatus
                text={word}
                audioUrl={undefined}
                lessonId={lessonId || 'draft'}
                blockId={block.id}
                optionId={`pool-${index}`}
                onAudioSaved={() => {}}
                disabled={!lessonId}
              />
              {!correctOrder.includes(word) && !Object.values(wordAlternatives).flat().some(a => a.hanzi === word) && (
                <button
                  type="button"
                  onClick={() => updatePool(pool.filter((_, i) => i !== index))}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        
        {/* Add extra distractors */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add distractor word..."
            className="flex-1 px-3 py-2 border rounded-md text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                if (input.value.trim() && !pool.includes(input.value.trim())) {
                  updatePool([...pool, input.value.trim()]);
                  input.value = '';
                }
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
              if (input.value.trim() && !pool.includes(input.value.trim())) {
                updatePool([...pool, input.value.trim()]);
                input.value = '';
              }
            }}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
          >
            Add
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

      {/* Summary of alternatives */}
      {Object.keys(wordAlternatives).length > 0 && (
        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
          <div className="text-sm font-medium text-purple-700 mb-2">
            ✨ Alternatives Summary
          </div>
          <div className="space-y-1 text-sm">
            {correctOrder.map((word, index) => {
              const alts = wordAlternatives[index];
              if (!alts || alts.length === 0) return null;
              return (
                <div key={index} className="flex items-center gap-2">
                  <span className="font-medium">{word}:</span>
                  <span className="text-purple-600">
                    {alts.map(a => a.hanzi).join(', ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
