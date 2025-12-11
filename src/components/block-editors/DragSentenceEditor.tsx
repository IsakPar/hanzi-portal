/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DragSentenceEditor - Edit drag sentence exercise properties
 * 
 * NEW DESIGN: Click-to-order flow
 * 1. Add all words (correct + distractors) in one list
 * 2. Click words in order to mark correct sequence (①②③)
 * 3. Unclicked words = distractors
 * 4. Pinyin shown under each word
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseDragSentenceBlock } from '@/types/lesson';
import { Plus, RotateCcw, Sparkles, Check, X, Search, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { getDistractors, flattenDistractors } from '@/services/distractorsAPI';
import { searchVocabulary, type VocabularyEntry } from '@/services/vocabularyAPI';
import type { LessonWord } from '@/lib/extractLessonVocab';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

// Use pinyin-pro for client-side pinyin lookup
import { pinyin } from 'pinyin-pro';

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface WordItem {
  id: string;
  hanzi: string;
  pinyin: string;
  orderIndex: number | null; // null = distractor, 1/2/3... = correct order position
}

interface DragSentenceEditorProps {
  block: ExerciseDragSentenceBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
  hskLevel?: number;
  lessonWords?: LessonWord[];
}

export function DragSentenceEditor({ block, onChange, hskLevel = 1, lessonWords = [] }: DragSentenceEditorProps) {
  // All words in the exercise (correct + distractors)
  const [words, setWords] = useState<WordItem[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<VocabularyEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Debounced search query
  const debouncedQuery = useDebounce(newWordInput, 300);
  
  // Search vocabulary when input changes (lesson words + DB)
  useEffect(() => {
    const searchVocab = async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) {
        setSuggestions([]);
        return;
      }
      
      const q = debouncedQuery.toLowerCase();
      
      // First, filter lesson words locally (instant, no network)
      const lessonMatches: VocabularyEntry[] = lessonWords
        .filter(w => 
          w.hanzi.includes(debouncedQuery) ||
          w.pinyin?.toLowerCase().includes(q) ||
          w.english?.toLowerCase().includes(q)
        )
        .slice(0, 4) // Max 4 from lesson
        .map(w => ({
          id: `lesson-${w.hanzi}`,
          hanzi: w.hanzi,
          pinyin: w.pinyin || '',
          english: w.english || '',
          category: 'lesson',
          hskLevel: hskLevel,
        }));
      
      // Show lesson matches immediately
      if (lessonMatches.length > 0) {
        setSuggestions(lessonMatches);
        setShowSuggestions(true);
      }
      
      // Then search DB for more results
      setSearchLoading(true);
      try {
        const results = await searchVocabulary({
          query: debouncedQuery,
          hsk_level: hskLevel,
          limit: 8,
        });
        
        // Merge: lesson words first, then DB results (deduplicated)
        const dbResults = results.results || [];
        const seenHanzi = new Set(lessonMatches.map(w => w.hanzi));
        const dedupedDb = dbResults.filter(w => !seenHanzi.has(w.hanzi));
        
        setSuggestions([...lessonMatches, ...dedupedDb.slice(0, 8 - lessonMatches.length)]);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Search failed:', err);
        // Keep lesson matches even if DB fails
        if (lessonMatches.length === 0) {
          setSuggestions([]);
        }
      } finally {
        setSearchLoading(false);
      }
    };
    
    searchVocab();
  }, [debouncedQuery, hskLevel, lessonWords]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize from block content
  useEffect(() => {
    const correctOrder = block.content.correctOrder || [];
    const wordPool = block.content.wordPool || [];
    
    // Build unified word list
    const allWords: WordItem[] = [];
    const seen = new Set<string>();
    
    // Add correct words first (with order)
    correctOrder.forEach((hanzi, idx) => {
      if (hanzi.trim() && !seen.has(hanzi)) {
        seen.add(hanzi);
        allWords.push({
          id: `word_${Date.now()}_${idx}`,
          hanzi,
          pinyin: getPinyin(hanzi),
          orderIndex: idx + 1,
        });
      }
    });
    
    // Add remaining pool words as distractors
    wordPool.forEach((hanzi, idx) => {
      if (hanzi.trim() && !seen.has(hanzi)) {
        seen.add(hanzi);
        allWords.push({
          id: `word_${Date.now()}_pool_${idx}`,
          hanzi,
          pinyin: getPinyin(hanzi),
          orderIndex: null,
        });
      }
    });
    
    setWords(allWords);
  }, [block.content.correctOrder, block.content.wordPool]);

  // Get pinyin for a hanzi string
  function getPinyin(hanzi: string): string {
    try {
      return pinyin(hanzi, { toneType: 'symbol', type: 'string' });
    } catch {
      return '';
    }
  }

  // Sync words back to block content
  const syncToBlock = useCallback((wordList: WordItem[]) => {
    // Extract correct order (words with orderIndex, sorted)
    const correctWords = wordList
      .filter(w => w.orderIndex !== null)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      .map(w => w.hanzi);
    
    // All words go in pool
    const allHanzi = wordList.map(w => w.hanzi);
    
    onChange('content', {
      ...block.content,
      correctOrder: correctWords,
      wordPool: allHanzi,
    });
  }, [block.content, onChange]);

  // Click word to toggle/set order
  const handleWordClick = (wordId: string) => {
    setWords(prev => {
      const word = prev.find(w => w.id === wordId);
      if (!word) return prev;

      let updated: WordItem[];
      
      if (word.orderIndex !== null) {
        // Already in order - remove it
        const removedIndex = word.orderIndex;
        updated = prev.map(w => {
          if (w.id === wordId) {
            return { ...w, orderIndex: null };
          }
          // Decrement higher indices
          if (w.orderIndex !== null && w.orderIndex > removedIndex) {
            return { ...w, orderIndex: w.orderIndex - 1 };
          }
          return w;
        });
      } else {
        // Not in order - add to end
        const maxOrder = Math.max(0, ...prev.map(w => w.orderIndex || 0));
        updated = prev.map(w => 
          w.id === wordId ? { ...w, orderIndex: maxOrder + 1 } : w
        );
      }
      
      syncToBlock(updated);
      return updated;
    });
  };

  // Add new word
  const addWord = (hanzi: string, isCorrect: boolean = false) => {
    if (!hanzi.trim()) return;
    
    // Check if already exists
    if (words.some(w => w.hanzi === hanzi.trim())) {
      toast.info('Word exists', 'This word is already in the list');
      return;
    }
    
    const newWord: WordItem = {
      id: `word_${Date.now()}`,
      hanzi: hanzi.trim(),
      pinyin: getPinyin(hanzi.trim()),
      orderIndex: isCorrect ? words.filter(w => w.orderIndex !== null).length + 1 : null,
    };
    
    const updated = [...words, newWord];
    setWords(updated);
    syncToBlock(updated);
    setNewWordInput('');
  };

  // Remove word
  const removeWord = (wordId: string) => {
    const word = words.find(w => w.id === wordId);
    if (!word) return;
    
    let updated = words.filter(w => w.id !== wordId);
    
    // Reindex if removed word had an order
    if (word.orderIndex !== null) {
      updated = updated.map(w => {
        if (w.orderIndex !== null && w.orderIndex > word.orderIndex!) {
          return { ...w, orderIndex: w.orderIndex - 1 };
        }
        return w;
      });
    }
    
    setWords(updated);
    syncToBlock(updated);
  };

  // Clear all order
  const clearOrder = () => {
    const updated = words.map(w => ({ ...w, orderIndex: null }));
    setWords(updated);
    syncToBlock(updated);
  };

  // AI suggest distractors
  const handleAISuggest = async () => {
    const correctWords = words.filter(w => w.orderIndex !== null);
    if (correctWords.length === 0) {
      toast.info('Add correct words first', 'Mark some words as correct before adding AI distractors');
      return;
    }

    setAiLoading(true);
    try {
      // Use the first correct word as seed
      const seedWord = correctWords[0].hanzi;
      const response = await getDistractors({
        word: seedWord,
        maxHskLevel: hskLevel,
        count: 10,
      });

      const suggestions = flattenDistractors(response.distractors);
      const existingHanzi = new Set(words.map(w => w.hanzi));
      
      // Add up to 3 new distractors
      let added = 0;
      for (const suggestion of suggestions) {
        if (added >= 3) break;
        if (!existingHanzi.has(suggestion.hanzi)) {
          addWord(suggestion.hanzi, false);
          added++;
        }
      }

      if (added > 0) {
        toast.success('Distractors added', `Added ${added} AI-suggested words`);
      } else {
        toast.info('No new words', 'All suggestions already in the list');
      }
    } catch (err) {
      console.error('AI suggest failed:', err);
      toast.error('AI suggest failed', 'Could not fetch suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  // Get correct words in order
  const correctOrderWords = words
    .filter(w => w.orderIndex !== null)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  
  // Get distractors
  const distractorWords = words.filter(w => w.orderIndex === null);

  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
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

      {/* Main Word Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>
            Words <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearOrder}
              disabled={correctOrderWords.length === 0}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <RotateCcw size={12} />
              Clear Order
            </button>
            <button
              type="button"
              onClick={handleAISuggest}
              disabled={aiLoading || correctOrderWords.length === 0}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded disabled:opacity-50"
            >
              <Sparkles size={12} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Loading...' : 'AI Distractors'}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Click words in order to mark the correct sentence. Unclicked words become distractors.
        </p>

        {/* Word Grid */}
        <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg min-h-[100px]">
          {words.map((word) => (
            <div
              key={word.id}
              className="relative group"
            >
              <button
                type="button"
                onClick={() => handleWordClick(word.id)}
                className={cn(
                  "flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all min-w-[60px]",
                  word.orderIndex !== null
                    ? "bg-green-50 border-green-400 text-green-800 shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                )}
              >
                {/* Order badge */}
                {word.orderIndex !== null && (
                  <div className="absolute -top-2 -left-2 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {word.orderIndex}
                  </div>
                )}
                
                {/* Hanzi */}
                <span className="text-lg font-medium">{word.hanzi}</span>
                
                {/* Pinyin */}
                <span className="text-xs text-gray-500">{word.pinyin}</span>
              </button>
              
              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeWord(word.id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          
          {words.length === 0 && (
            <div className="w-full text-center text-gray-400 py-4">
              Add words below to get started
            </div>
          )}
        </div>

        {/* Add word input with autocomplete */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suggestions.length > 0 && showSuggestions) {
                      // Add first suggestion
                      addWord(suggestions[0].hanzi);
                      setShowSuggestions(false);
                    } else {
                      addWord(newWordInput);
                    }
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder="Search by pinyin (e.g., 'ta') or hanzi..."
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={() => addWord(newWordInput)}
              disabled={!newWordInput.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-20 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
            >
              <div className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
                Click to add • {suggestions.length} results
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    addWord(item.hanzi);
                    setShowSuggestions(false);
                    setNewWordInput('');
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-purple-50 flex items-center gap-3 transition-colors",
                    words.some(w => w.hanzi === item.hanzi) && "bg-gray-50 opacity-50"
                  )}
                  disabled={words.some(w => w.hanzi === item.hanzi)}
                >
                  <span className="text-lg font-medium text-gray-900 min-w-[40px]">
                    {item.hanzi}
                  </span>
                  <span className="text-sm text-purple-600">
                    {item.pinyin}
                  </span>
                  <span className="text-sm text-gray-500 truncate flex-1">
                    {item.english}
                  </span>
                  {item.hskLevel && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      HSK{item.hskLevel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* No results message */}
          {showSuggestions && newWordInput.length > 0 && suggestions.length === 0 && !searchLoading && (
            <div className="absolute z-20 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
              No vocabulary found for "{newWordInput}"
              <br />
              <span className="text-xs">Press Enter to add as custom word</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-3 pt-2">
        <Label>Preview</Label>
        
        {/* Correct Order */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Check size={14} className="text-green-600" />
            <span className="text-xs font-medium text-green-700">Correct Sentence</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {correctOrderWords.length > 0 ? (
              correctOrderWords.map((word, idx) => (
                <span key={word.id} className="flex items-center">
                  <span className="px-2 py-1 bg-white rounded border border-green-300 text-sm">
                    {word.hanzi}
                  </span>
                  {idx < correctOrderWords.length - 1 && (
                    <span className="mx-1 text-green-400">→</span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-sm italic">Click words above to set correct order</span>
            )}
          </div>
        </div>

        {/* Distractors */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <X size={14} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Distractors ({distractorWords.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {distractorWords.length > 0 ? (
              distractorWords.map((word) => (
                <span
                  key={word.id}
                  className="px-2 py-1 bg-white rounded border border-gray-200 text-sm text-gray-600"
                >
                  {word.hanzi}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-sm italic">Words not in correct order appear here</span>
            )}
          </div>
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
