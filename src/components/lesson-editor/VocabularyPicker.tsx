/**
 * VocabularyPicker Component
 * Search and select vocabulary words for lesson targetVocabulary
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Plus, Loader2, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchVocabulary, type VocabularyEntry } from '@/services/vocabularyAPI';
import { cn } from '@/lib/utils';

interface VocabularyPickerProps {
  selectedIds: string[];
  hskLevel: number;
  onChange: (ids: string[]) => void;
}

interface SelectedWord {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
}

export function VocabularyPicker({ selectedIds, hskLevel, onChange }: VocabularyPickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<VocabularyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load selected word details on mount
  useEffect(() => {
    if (selectedIds.length > 0 && selectedWords.length === 0) {
      loadSelectedWords();
    }
  }, [selectedIds]);

  const loadSelectedWords = async () => {
    try {
      // Fetch all vocabulary and filter by selected IDs
      const response = await searchVocabulary({ limit: 500 });
      const words = response.results
        .filter(v => selectedIds.includes(v.id))
        .map(v => ({
          id: v.id,
          hanzi: v.hanzi,
          pinyin: v.pinyin,
          english: v.english,
        }));
      setSelectedWords(words);
    } catch {
      // If we can't load details, just show IDs
      setSelectedWords(selectedIds.map(id => ({
        id,
        hanzi: id.slice(0, 8),
        pinyin: '',
        english: 'Loading...',
      })));
    }
  };

  // Search vocabulary
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await searchVocabulary({
        query: query.trim(),
        hsk_level: hskLevel || undefined,
        limit: 20,
      });
      // Filter out already selected
      setResults(response.results.filter(v => !selectedIds.includes(v.id)));
    } catch (err) {
      console.error('Failed to search vocabulary:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [hskLevel, selectedIds]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        handleSearch(search);
        setShowDropdown(true);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, handleSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add word
  const handleAddWord = (word: VocabularyEntry) => {
    const newIds = [...selectedIds, word.id];
    const newWords = [...selectedWords, {
      id: word.id,
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      english: word.english,
    }];
    
    setSelectedWords(newWords);
    onChange(newIds);
    setSearch('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Remove word
  const handleRemoveWord = (id: string) => {
    const newIds = selectedIds.filter(i => i !== id);
    const newWords = selectedWords.filter(w => w.id !== id);
    
    setSelectedWords(newWords);
    onChange(newIds);
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => search && setShowDropdown(true)}
            placeholder="Search vocabulary (hanzi, pinyin, or english)..."
            className="pl-10 pr-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Dropdown Results */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {results.length === 0 && search && !isLoading && (
              <div className="p-4 text-center text-gray-500">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No vocabulary found for "{search}"</p>
                <p className="text-xs mt-1">Try a different search or add new vocabulary</p>
              </div>
            )}
            {results.map((word) => (
              <button
                key={word.id}
                onClick={() => handleAddWord(word)}
                className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg font-medium text-purple-700">
                  {word.hanzi.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-gray-900">{word.hanzi}</span>
                    <span className="text-sm text-purple-600">{word.pinyin}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{word.english}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    word.hskLevel <= 2 ? "bg-green-100 text-green-700" :
                    word.hskLevel <= 4 ? "bg-amber-100 text-amber-700" :
                    "bg-orange-100 text-orange-700"
                  )}>
                    HSK {word.hskLevel}
                  </span>
                  <Plus className="w-4 h-4 text-purple-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Words */}
      {selectedWords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedWords.map((word) => (
            <div
              key={word.id}
              className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg group"
            >
              <span className="text-lg font-medium text-purple-900">{word.hanzi}</span>
              {word.pinyin && (
                <span className="text-sm text-purple-600">{word.pinyin}</span>
              )}
              <button
                onClick={() => handleRemoveWord(word.id)}
                className="p-0.5 hover:bg-purple-200 rounded transition-colors"
              >
                <X className="w-4 h-4 text-purple-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {selectedWords.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          No target vocabulary selected. Search above to add words.
        </div>
      )}

      {/* Count */}
      <div className="text-xs text-gray-400">
        {selectedWords.length} word{selectedWords.length !== 1 ? 's' : ''} selected
        {selectedWords.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedWords([]);
              onChange([]);
            }}
            className="ml-2 h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

