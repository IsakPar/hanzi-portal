/**
 * SentenceWordEditor - Click any word to see/edit alternatives
 * 
 * Usage:
 * <SentenceWordEditor
 *   sentence="我的妈妈很好"
 *   hskLevel={1}
 *   onSentenceChange={(newSentence) => ...}
 * />
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getDistractors, type DistractorResponse } from '@/services/distractorsAPI';
import { AlternativesPanel } from './AlternativesPanel';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

interface SentenceWordEditorProps {
  /** The Chinese sentence to edit */
  sentence: string;
  
  /** HSK level for filtering alternatives (default: 1) */
  hskLevel?: number;
  
  /** Called when the sentence changes */
  onSentenceChange: (newSentence: string) => void;
  
  /** Called when a specific word changes */
  onWordChange?: (wordIndex: number, oldWord: string, newWord: string) => void;
  
  /** Custom tokenizer (default: character-by-character) */
  tokenizer?: (sentence: string) => string[];
  
  /** Disable editing */
  disabled?: boolean;
  
  /** Additional class name */
  className?: string;
}

/**
 * Simple Chinese tokenizer - splits by characters
 * For v1, this is sufficient. Can upgrade to Jieba/proper segmenter later.
 * 
 * Attempts to group common multi-character words:
 * - Numbers followed by measure words
 * - Common two-character patterns
 */
function defaultTokenizer(sentence: string): string[] {
  // For now, simple character split
  // Could enhance with a dictionary lookup later
  const chars = sentence.split('');
  const tokens: string[] = [];
  
  let i = 0;
  while (i < chars.length) {
    // Skip whitespace and punctuation
    if (/[\s，。！？、；：""''（）【】]/.test(chars[i])) {
      i++;
      continue;
    }
    
    // Try to group 2-character words (very basic heuristic)
    // In production, use proper segmentation
    if (i + 1 < chars.length && !/[\s，。！？]/.test(chars[i + 1])) {
      // Common patterns to keep together
      const twoChar = chars[i] + chars[i + 1];
      
      // Check if this looks like a word (both are Chinese characters)
      if (/^[\u4e00-\u9fff]{2}$/.test(twoChar)) {
        tokens.push(twoChar);
        i += 2;
        continue;
      }
    }
    
    tokens.push(chars[i]);
    i++;
  }
  
  return tokens.filter(t => t.length > 0);
}

export function SentenceWordEditor({
  sentence,
  hskLevel = 1,
  onSentenceChange,
  onWordChange,
  tokenizer = defaultTokenizer,
  disabled = false,
  className,
}: SentenceWordEditorProps) {
  const [words, setWords] = useState<string[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [alternatives, setAlternatives] = useState<DistractorResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Tokenize sentence when it changes
  useEffect(() => {
    const tokenized = tokenizer(sentence);
    setWords(tokenized);
    // Reset selection when sentence changes from outside
    setActiveWordIndex(null);
    setAlternatives(null);
  }, [sentence, tokenizer]);

  // Fetch alternatives when a word is clicked
  const handleWordClick = useCallback(async (index: number) => {
    if (disabled) return;
    
    // Toggle off if clicking same word
    if (activeWordIndex === index) {
      setActiveWordIndex(null);
      setAlternatives(null);
      return;
    }

    setActiveWordIndex(index);
    setLoading(true);
    setAlternatives(null);

    try {
      const response = await getDistractors({
        word: words[index],
        maxHskLevel: hskLevel,
        count: 20,
      });
      setAlternatives(response);
    } catch (err) {
      toast.error('Failed to load alternatives', (err as Error).message);
      setActiveWordIndex(null);
    } finally {
      setLoading(false);
    }
  }, [activeWordIndex, words, hskLevel, disabled]);

  // Handle selecting an alternative
  const handleAlternativeSelect = useCallback((newWord: string) => {
    if (activeWordIndex === null) return;

    const oldWord = words[activeWordIndex];
    const newWords = [...words];
    newWords[activeWordIndex] = newWord;
    
    setWords(newWords);
    
    // Reconstruct sentence (preserving any punctuation/spacing from original)
    // For now, simple join
    const newSentence = newWords.join('');
    onSentenceChange(newSentence);
    onWordChange?.(activeWordIndex, oldWord, newWord);
    
    // Close panel
    setActiveWordIndex(null);
    setAlternatives(null);
  }, [activeWordIndex, words, onSentenceChange, onWordChange]);

  // Refresh alternatives
  const handleRefresh = useCallback(async () => {
    if (activeWordIndex === null) return;
    
    setLoading(true);
    try {
      const response = await getDistractors({
        word: words[activeWordIndex],
        maxHskLevel: hskLevel,
        count: 20,
      });
      setAlternatives(response);
    } catch (err) {
      toast.error('Failed to refresh', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeWordIndex, words, hskLevel]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Instructions */}
      <p className="text-xs text-gray-500">
        Click any word to see alternatives
      </p>

      {/* Word chips */}
      <div className="flex flex-wrap gap-1.5">
        {words.map((word, index) => (
          <button
            key={`${word}-${index}`}
            onClick={() => handleWordClick(index)}
            disabled={disabled}
            className={cn(
              "px-3 py-1.5 rounded-lg text-lg font-medium transition-all",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1",
              activeWordIndex === index
                ? "bg-purple-100 text-purple-900 ring-2 ring-purple-500 shadow-sm"
                : disabled
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800 hover:shadow-sm"
            )}
          >
            {word}
          </button>
        ))}
        
        {words.length === 0 && (
          <span className="text-gray-400 text-sm italic">
            Enter a sentence to edit words
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && activeWordIndex !== null && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Finding alternatives for "{words[activeWordIndex]}"...
        </div>
      )}

      {/* Alternatives panel */}
      {activeWordIndex !== null && alternatives && !loading && (
        <AlternativesPanel
          source={alternatives.source}
          distractors={alternatives.distractors}
          onSelect={handleAlternativeSelect}
          onClose={() => {
            setActiveWordIndex(null);
            setAlternatives(null);
          }}
          onRefresh={handleRefresh}
          loading={loading}
        />
      )}
    </div>
  );
}

export default SentenceWordEditor;

