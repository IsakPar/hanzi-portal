/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DragSentenceEditor - Edit drag sentence exercise properties
 * 
 * Now includes clickable words that open an overlay for selecting alternatives.
 * Selected alternatives appear underneath each word.
 * 
 * Alternatives sync flow:
 * 1. User selects alternatives via overlay → saved to block.content.wordAlternatives (local)
 * 2. On lesson save → alternatives sync to backend slot_alternatives table (background)
 * 3. Mobile export → pulls from slot_alternatives for structured data
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseDragSentenceBlock } from '@/types/lesson';
import { Plus, Trash2, Cloud, CloudOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { WordAlternativesOverlay } from '../lesson-editor/WordAlternativesOverlay';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from '@/components/ai/AISuggestButton';
import type { Suggestion } from '@/services/aiSuggestAPI';
import { syncBlockAlternatives } from '@/services/lessonAlternativesAPI';

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
  /** Called when alternatives should be synced to backend (e.g., after save) */
  onSyncRequest?: () => void;
}

export function DragSentenceEditor({ block, onChange, lessonId = '', hskLevel = 1 }: DragSentenceEditorProps) {
  const [correctOrder, setCorrectOrder] = useState<string[]>(block.content.correctOrder || []);
  const [pool, setPool] = useState<string[]>(block.content.wordPool || []);
  
  // Track alternatives per word index (stored in extended content)
  const extendedContent = block.content as typeof block.content & { wordAlternatives?: Record<number, Alternative[]> };
  const [wordAlternatives, setWordAlternatives] = useState<Record<number, Alternative[]>>(
    extendedContent.wordAlternatives || {}
  );

  // Overlay state
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const wordRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Sync alternatives to backend (called after lesson save or manually)
  const syncToBackend = useCallback(async () => {
    if (!lessonId || lessonId === 'draft' || !block.id) {
      console.log('[DragSentence] Skipping sync - no lessonId or blockId');
      return;
    }
    
    const hasAlternatives = Object.values(wordAlternatives).some(alts => alts.length > 0);
    if (!hasAlternatives && correctOrder.length === 0) {
      console.log('[DragSentence] Skipping sync - no content');
      return;
    }

    setSyncStatus('syncing');
    try {
      console.log('[DragSentence] Syncing to backend:', {
        blockId: block.id,
        correctOrder,
        alternativesCount: Object.keys(wordAlternatives).length,
      });
      
      const result = await syncBlockAlternatives(block.id, correctOrder, wordAlternatives);
      
      if (result.success) {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        console.log('[DragSentence] Sync complete:', result);
      } else {
        setSyncStatus('error');
        console.error('[DragSentence] Sync failed');
      }
    } catch (err) {
      console.error('[DragSentence] Sync error:', err);
      setSyncStatus('error');
    }
  }, [lessonId, block.id, correctOrder, wordAlternatives]);

  // Sync with block content when it changes externally
  useEffect(() => {
    setCorrectOrder(block.content.correctOrder || []);
    setPool(block.content.wordPool || []);
    const ext = block.content as typeof block.content & { wordAlternatives?: Record<number, Alternative[]> };
    setWordAlternatives(ext.wordAlternatives || {});
  }, [block.content]);

  // Open overlay for a word
  const openOverlay = (index: number) => {
    const ref = wordRefs.current[index];
    if (ref) {
      setAnchorRect(ref.getBoundingClientRect());
    }
    setActiveWordIndex(index);
  };

  // Close overlay
  const closeOverlay = () => {
    setActiveWordIndex(null);
    setAnchorRect(null);
  };

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

      {/* Correct Word Order with Click-to-Open Alternatives */}
      <div className="space-y-2">
        <Label>
          Correct Word Order <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Click any word to add alternatives. Selected alternatives appear below.
        </p>
        
        {/* Word Input Grid */}
        <div className="space-y-4">
          {correctOrder.map((word, index) => {
            const alts = wordAlternatives[index] || [];
            return (
              <div key={index} className="space-y-2">
                {/* Word Input Row */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => {
                      const newOrder = [...correctOrder];
                      newOrder[index] = e.target.value;
                      updateCorrectOrder(newOrder);
                    }}
                    placeholder={`Word ${index + 1}`}
                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  
                  {/* Click to open alternatives overlay */}
                  <button
                    ref={(el) => { wordRefs.current[index] = el; }}
                    type="button"
                    onClick={() => word.trim() && openOverlay(index)}
                    disabled={!word.trim()}
                    className="px-3 py-2 border rounded-md hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Click to add alternatives"
                  >
                    <Plus size={14} />
                    <span className="text-sm">
                      {alts.length > 0 ? `${alts.length} alt${alts.length > 1 ? 's' : ''}` : 'Add'}
                    </span>
                  </button>

                  {/* Remove Word Button */}
                  <button
                    type="button"
                    onClick={() => {
                      updateCorrectOrder(correctOrder.filter((_, i) => i !== index));
                      const updatedAlts = { ...wordAlternatives };
                      delete updatedAlts[index];
                      setWordAlternatives(updatedAlts);
                      updateContent('wordAlternatives', updatedAlts);
                    }}
                    className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-md transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Show selected alternatives underneath */}
                {alts.length > 0 && (
                  <div className="ml-2 pl-3 border-l-2 border-indigo-200">
                    <div className="text-xs text-muted-foreground mb-1">Alternatives:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {alts.map((alt) => (
                        <span
                          key={alt.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm border border-indigo-200"
                          title={alt.pinyin ? `${alt.pinyin} - ${alt.english}` : undefined}
                        >
                          {alt.hanzi}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = alts.filter(a => a.id !== alt.id);
                              handleAlternativesChange(index, updated);
                            }}
                            className="hover:text-red-500 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
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

      {/* Word Alternatives Overlay */}
      {activeWordIndex !== null && correctOrder[activeWordIndex] && (
        <WordAlternativesOverlay
          word={correctOrder[activeWordIndex]}
          hskLevel={hskLevel}
          selectedAlternatives={wordAlternatives[activeWordIndex] || []}
          onAlternativesChange={(alts) => handleAlternativesChange(activeWordIndex, alts)}
          onClose={closeOverlay}
          anchorRect={anchorRect}
          sentenceWords={correctOrder.filter(w => w.trim())}
          wordIndex={activeWordIndex}
        />
      )}

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
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-purple-700">
              ✨ Alternatives Summary
            </div>
            
            {/* Sync to Backend Button */}
            {lessonId && lessonId !== 'draft' && (
              <button
                type="button"
                onClick={syncToBackend}
                disabled={syncStatus === 'syncing'}
                className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                  syncStatus === 'synced' 
                    ? 'bg-green-100 text-green-700' 
                    : syncStatus === 'error'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : syncStatus === 'syncing'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={lastSyncedAt ? `Last synced: ${lastSyncedAt.toLocaleTimeString()}` : 'Sync to backend for mobile export'}
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <Cloud size={12} className="animate-pulse" />
                    Syncing...
                  </>
                ) : syncStatus === 'synced' ? (
                  <>
                    <Cloud size={12} />
                    Synced
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <CloudOff size={12} />
                    Retry
                  </>
                ) : (
                  <>
                    <Cloud size={12} />
                    Sync
                  </>
                )}
              </button>
            )}
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
          
          {/* Sync status hint */}
          {lessonId && lessonId !== 'draft' && syncStatus === 'idle' && (
            <p className="text-xs text-purple-400 mt-2">
              💡 Click "Sync" to save alternatives to backend for mobile export
            </p>
          )}
        </div>
      )}
    </div>
  );
}
