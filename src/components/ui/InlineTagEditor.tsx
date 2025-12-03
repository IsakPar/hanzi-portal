import { useState, useEffect, useRef } from 'react';
import { X, Bot, Loader2, Check } from 'lucide-react';
import { Button } from './button';
import api from '@/services/api';

// Predefined secondary categories
const SECONDARY_CATEGORIES = [
  'people', 'family', 'relationships', 'greetings', 'daily-life', 
  'food', 'drinks', 'shopping', 'numbers', 'time', 'dates',
  'weather', 'nature', 'animals', 'colors', 'body', 'health',
  'emotions', 'actions', 'movement', 'location', 'direction',
  'home', 'school', 'work', 'travel', 'transport', 'technology',
  'question-words', 'measure-words', 'particles', 'connectors',
  'adjectives', 'adverbs', 'verbs', 'nouns', 'pronouns'
];

interface InlineTagEditorProps {
  vocabId: string;
  hanzi: string;
  currentTags: string[];
  onSave: (tags: string[]) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function InlineTagEditor({
  vocabId,
  hanzi,
  currentTags,
  onSave,
  onClose,
  position,
}: InlineTagEditorProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(currentTags));
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  const handleAISuggest = async () => {
    setIsLoading(true);
    try {
      const result = await api.post<{
        results: { wordId: string; secondaryCategories: string[] | null; success: boolean }[];
      }>('/v1/vocabulary/admin/bulk-tag-secondary-categories', { wordIds: [vocabId] });
      
      const tagResult = result.results[0];
      if (tagResult?.success && tagResult.secondaryCategories) {
        setSelectedTags(new Set(tagResult.secondaryCategories));
      }
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tags = Array.from(selectedTags);
      await api.patch(`/v1/vocabulary/admin/${vocabId}`, {
        secondaryCategories: tags,
      });
      onSave(tags);
    } catch {
      // Keep editor open on error
      setIsSaving(false);
    }
  };

  const style = position ? {
    position: 'fixed' as const,
    top: position.top,
    left: position.left,
    zIndex: 100,
  } : {};

  return (
    <div
      ref={ref}
      className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden"
      style={style}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-white font-medium">{hanzi}</div>
          <div className="text-white/80 text-xs">Secondary Categories</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Selected Tags */}
      {selectedTags.size > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">Selected ({selectedTags.size})</div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedTags).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition-colors"
              >
                {tag}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Available Tags */}
      <div className="px-4 py-3 max-h-48 overflow-y-auto">
        <div className="text-xs text-gray-500 mb-2">Available Categories</div>
        <div className="flex flex-wrap gap-1.5">
          {SECONDARY_CATEGORIES.filter(cat => !selectedTags.has(cat)).map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-pink-100 hover:text-pink-700 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAISuggest}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Bot className="w-3 h-3 mr-1" />
          )}
          AI Suggest
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-pink-600 hover:bg-pink-700"
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Check className="w-3 h-3 mr-1" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

