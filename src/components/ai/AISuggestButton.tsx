/**
 * AISuggestButton - AI-powered content suggestion button
 * 
 * Uses RAG (Vectorize) to find semantically similar content.
 * Shows a dropdown with suggestions that can be selected.
 */

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { getSuggestions, type SuggestContext, type Suggestion } from '@/services/aiSuggestAPI';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface AISuggestButtonProps {
  /** Context for the suggestion (determines search strategy) */
  context: SuggestContext;
  
  /** The correct answer (used to find similar items) */
  correctAnswer?: string;
  
  /** HSK level to filter suggestions */
  hskLevel?: number;
  
  /** Items to exclude from suggestions */
  exclude?: string[];
  
  /** Number of suggestions to fetch */
  count?: number;
  
  /** Called when a suggestion is selected */
  onSelect: (suggestion: Suggestion) => void;
  
  /** Disable the button */
  disabled?: boolean;
  
  /** Size variant */
  size?: 'sm' | 'md';
}

export function AISuggestButton({
  context,
  correctAnswer,
  hskLevel,
  exclude = [],
  count = 5,
  onSelect,
  disabled = false,
  size = 'sm',
}: AISuggestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (disabled || !correctAnswer) {
      toast.error('Need context', 'Enter the correct answer first to get suggestions');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getSuggestions({
        context,
        correctAnswer,
        hskLevel,
        exclude,
        count,
      });

      if (result.error) {
        setError(result.error);
        toast.error('Suggestion failed', result.message || result.error);
        return;
      }

      if (result.suggestions.length === 0) {
        setError('No suggestions found');
        toast.info('No suggestions', 'Try a different word or HSK level');
        return;
      }

      setSuggestions(result.suggestions);
      setShowDropdown(true);
    } catch (err) {
      const message = (err as Error).message || 'Failed to get suggestions';
      setError(message);
      toast.error('Suggestion failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    onSelect(suggestion);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleRefresh = () => {
    handleFetch();
  };

  return (
    <div className="relative">
      {/* Main button */}
      <button
        onClick={showDropdown ? () => setShowDropdown(false) : handleFetch}
        disabled={disabled || isLoading}
        className={cn(
          "flex items-center justify-center rounded-md transition-all",
          size === 'sm' ? "p-1.5" : "p-2",
          disabled || isLoading
            ? "text-gray-300 cursor-not-allowed"
            : "text-purple-500 hover:bg-purple-50 hover:text-purple-600",
        )}
        title="Get AI suggestions"
      >
        {isLoading ? (
          <Loader2 size={size === 'sm' ? 16 : 18} className="animate-spin" />
        ) : (
          <Sparkles size={size === 'sm' ? 16 : 18} />
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
              <span className="text-xs font-medium text-purple-700">
                AI Suggestions
              </span>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1 text-purple-500 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors"
                title="Refresh suggestions"
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Suggestions list */}
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id || index}
                  onClick={() => handleSelect(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 block truncate">
                        {suggestion.text}
                      </span>
                      {suggestion.pinyin && (
                        <span className="text-xs text-gray-500">
                          {suggestion.pinyin}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {suggestion.hskLevel && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          HSK{suggestion.hskLevel}
                        </span>
                      )}
                      <span className="text-[10px] text-purple-500 font-medium">
                        {Math.round(suggestion.score * 100)}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <span className="text-[10px] text-gray-500">
                Based on: {correctAnswer}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Error state (inline) */}
      {error && !showDropdown && (
        <div className="absolute right-0 top-full mt-1 z-50 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
}

