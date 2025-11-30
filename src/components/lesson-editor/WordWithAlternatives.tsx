/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WordWithAlternatives - Inline component for adding alternative words
 * 
 * Shows a word with a [+] button to add alternatives.
 * Alternatives appear directly below the word for immediate visibility.
 */

import { useState } from 'react';
import { Plus, X, Loader2, Check, Sparkles, Trash2 } from 'lucide-react';
import { api } from '@/services/api';

interface Alternative {
  id: string;
  hanzi: string;
  pinyin?: string;
  english?: string;
}

interface Suggestion {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
}

interface WordWithAlternativesProps {
  word: string;
  wordIndex: number;
  blockId?: string;
  alternatives?: Alternative[];
  onAlternativesChange?: (wordIndex: number, alternatives: Alternative[]) => void;
  placeholder?: string;
  onWordChange?: (value: string) => void;
  onRemove?: () => void;
  showRemoveButton?: boolean;
}

export function WordWithAlternatives({
  word,
  wordIndex,
  blockId: _blockId, // Prefixed to avoid unused warning
  alternatives = [],
  onAlternativesChange,
  placeholder,
  onWordChange,
  onRemove,
  showRemoveButton = true,
}: WordWithAlternativesProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [localAlternatives, setLocalAlternatives] = useState<Alternative[]>(alternatives);

  // Fetch suggestions from AI
  const fetchSuggestions = async () => {
    if (!word.trim()) return;
    
    try {
      setLoading(true);
      setShowSuggestions(true);
      
      // Call the suggest endpoint
      const response = await api.get(`/v1/lesson-alternatives/suggest-for-word?word=${encodeURIComponent(word)}&limit=8`) as { suggestions?: Suggestion[] };
      setSuggestions(response.suggestions || []);
    } catch (err: any) {
      console.error('Failed to fetch suggestions:', err);
      // Fallback: show empty suggestions
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a suggestion as an alternative
  const addAlternative = (suggestion: Suggestion) => {
    const newAlt: Alternative = {
      id: suggestion.id,
      hanzi: suggestion.hanzi,
      pinyin: suggestion.pinyin,
      english: suggestion.english,
    };
    
    const updated = [...localAlternatives, newAlt];
    setLocalAlternatives(updated);
    onAlternativesChange?.(wordIndex, updated);
    
    // Remove from suggestions
    setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
  };

  // Remove an alternative
  const removeAlternative = (altId: string) => {
    const updated = localAlternatives.filter(a => a.id !== altId);
    setLocalAlternatives(updated);
    onAlternativesChange?.(wordIndex, updated);
  };

  // Manual add alternative
  const [manualInput, setManualInput] = useState('');
  const addManualAlternative = () => {
    if (!manualInput.trim()) return;
    
    const newAlt: Alternative = {
      id: `manual_${Date.now()}`,
      hanzi: manualInput.trim(),
    };
    
    const updated = [...localAlternatives, newAlt];
    setLocalAlternatives(updated);
    onAlternativesChange?.(wordIndex, updated);
    setManualInput('');
  };

  return (
    <div className="space-y-2">
      {/* Word Input Row */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={word}
          onChange={(e) => onWordChange?.(e.target.value)}
          placeholder={placeholder || `Word ${wordIndex + 1}`}
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        
        {/* Add Alternative Button */}
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={!word.trim() || loading}
          className="p-2 border rounded-md hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add alternative words"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
        </button>

        {/* Remove Word Button */}
        {showRemoveButton && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-md transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Alternatives Display (always visible if any) */}
      {localAlternatives.length > 0 && (
        <div className="ml-2 pl-3 border-l-2 border-purple-200">
          <div className="text-xs text-muted-foreground mb-1">Alternatives:</div>
          <div className="flex flex-wrap gap-1">
            {localAlternatives.map((alt) => (
              <span
                key={alt.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-sm border border-purple-200"
                title={alt.pinyin ? `${alt.pinyin} - ${alt.english}` : undefined}
              >
                {alt.hanzi}
                <button
                  type="button"
                  onClick={() => removeAlternative(alt.id)}
                  className="hover:text-red-500 ml-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions Panel (shown when fetching/after fetch) */}
      {showSuggestions && (
        <div className="ml-2 p-3 bg-gray-50 rounded-lg border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Sparkles size={12} className="text-purple-500" />
              AI Suggestions
            </div>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin mr-2" />
              Finding alternatives...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  onClick={() => addAlternative(sug)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border hover:border-purple-400 hover:bg-purple-50 rounded text-sm transition-colors group"
                  title={`${sug.pinyin} - ${sug.english}`}
                >
                  <span>{sug.hanzi}</span>
                  <span className="text-xs text-gray-400 group-hover:text-purple-500">
                    {sug.pinyin}
                  </span>
                  <Check size={12} className="text-purple-500 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-2">
              No suggestions found
            </div>
          )}

          {/* Manual Add */}
          <div className="flex gap-2 pt-2 border-t">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Add manually..."
              className="flex-1 px-2 py-1 text-sm border rounded"
              onKeyDown={(e) => e.key === 'Enter' && addManualAlternative()}
            />
            <button
              type="button"
              onClick={addManualAlternative}
              disabled={!manualInput.trim()}
              className="px-2 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simpler version for use in word pools (just shows + button, no input editing)
interface WordChipWithAlternativesProps {
  word: string;
  alternatives?: Alternative[];
  onAlternativesChange?: (alternatives: Alternative[]) => void;
}

export function WordChipWithAlternatives({
  word,
  alternatives = [],
  onAlternativesChange,
}: WordChipWithAlternativesProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const fetchSuggestions = async () => {
    if (!word.trim()) return;
    
    try {
      setLoading(true);
      setShowPanel(true);
      
      const response = await api.get(`/v1/lesson-alternatives/suggest-for-word?word=${encodeURIComponent(word)}&limit=6`) as { suggestions?: Suggestion[] };
      setSuggestions(response.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const addAlternative = (suggestion: Suggestion) => {
    const newAlt: Alternative = {
      id: suggestion.id,
      hanzi: suggestion.hanzi,
      pinyin: suggestion.pinyin,
      english: suggestion.english,
    };
    
    onAlternativesChange?.([...alternatives, newAlt]);
    setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
  };

  const removeAlternative = (altId: string) => {
    onAlternativesChange?.(alternatives.filter(a => a.id !== altId));
  };

  return (
    <div className="relative inline-block">
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded border">
        <span className="text-sm">{word}</span>
        <button
          type="button"
          onClick={fetchSuggestions}
          className="p-0.5 hover:bg-purple-100 rounded transition-colors"
          title="Add alternatives"
        >
          <Plus size={12} className="text-purple-500" />
        </button>
        {alternatives.length > 0 && (
          <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">
            +{alternatives.length}
          </span>
        )}
      </div>

      {/* Alternatives & Suggestions Dropdown */}
      {showPanel && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg z-10 min-w-48">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Alternatives for {word}</span>
            <button onClick={() => setShowPanel(false)}>
              <X size={12} />
            </button>
          </div>

          {/* Current alternatives */}
          {alternatives.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {alternatives.map((alt) => (
                <span key={alt.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                  {alt.hanzi}
                  <button onClick={() => removeAlternative(alt.id)}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {loading ? (
            <div className="text-xs text-gray-500 py-2 text-center">
              <Loader2 size={12} className="animate-spin inline mr-1" />
              Loading...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((sug) => (
                <button
                  key={sug.id}
                  onClick={() => addAlternative(sug)}
                  className="px-1.5 py-0.5 text-xs bg-gray-50 hover:bg-purple-50 border rounded transition-colors"
                  title={`${sug.pinyin} - ${sug.english}`}
                >
                  {sug.hanzi}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 py-1">No suggestions</div>
          )}
        </div>
      )}
    </div>
  );
}

