/**
 * HanziInput Component
 * Smart Chinese character input with auto-pinyin generation
 * 
 * Flow:
 * 1. User types/pastes Chinese characters → pinyin auto-generated
 * 2. User types pinyin → Search existing vocabulary database
 * 3. If match found → Auto-fills hanzi, pinyin, english from DB
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { 
  isPinyin, 
  hasChinese, 
  hanziToPinyin,
} from '@/services/chineseNLP';
import { searchVocabulary, type VocabularyEntry } from '@/services/vocabularyAPI';
import { CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface HanziInputProps {
  value: string;
  onChange: (value: string) => void;
  onPinyinDetected?: (pinyin: string) => void;
  onEnglishSuggested?: (english: string) => void;
  onVocabularySelected?: (vocab: VocabularyEntry) => void;
  onRequestAddToDatabase?: (hanzi: string, pinyin: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  className?: string;
}

interface Suggestion {
  hanzi: string;
  pinyin: string;
  english?: string;
  source: 'database' | 'nlp';
  hskLevel?: number;
  category?: string;
}

export function HanziInput({
  value,
  onChange,
  onPinyinDetected,
  onEnglishSuggested,
  onVocabularySelected,
  onRequestAddToDatabase,
  placeholder = 'Type or paste Chinese characters...',
  showSuggestions = true,
  className = '',
}: HanziInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (input: string) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // If input is Chinese characters, auto-generate pinyin
    if (hasChinese(input)) {
      const generatedPinyin = hanziToPinyin(input, { toneType: 'symbol' });
      onPinyinDetected?.(generatedPinyin);
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // If input is not pinyin, skip search
    if (!isPinyin(input)) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);

    try {
      // Step 1: Search vocabulary database first (priority)
      const response = await searchVocabulary({ 
        query: input, 
        limit: 10 
      });

      const dbSuggestions: Suggestion[] = response.results.map(vocab => ({
        hanzi: vocab.hanzi,
        pinyin: vocab.pinyin,
        english: vocab.english,
        source: 'database',
        hskLevel: vocab.hskLevel,
        category: vocab.category,
      }));

      // Step 2: For now, only show database results
      // NLP suggestions can be added later if needed
      // (pinyin-pro doesn't have a reliable pinyin→hanzi dictionary)

      setSuggestions(dbSuggestions);
      setShowDropdown(dbSuggestions.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      logger.error('Search error:', error);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, [onPinyinDetected]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Debounce search by 300ms
    if (showSuggestions) {
      searchTimeout.current = setTimeout(() => {
        performSearch(newValue);
      }, 300);
    }
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.hanzi);
    
    if (suggestion.source === 'database') {
      // Auto-fill all fields from database
      onPinyinDetected?.(suggestion.pinyin);
      if (suggestion.english) {
        onEnglishSuggested?.(suggestion.english);
      }
      
      // Notify parent that a vocabulary entry was selected
      onVocabularySelected?.({
        id: '',
        hanzi: suggestion.hanzi,
        pinyin: suggestion.pinyin,
        english: suggestion.english || '',
        category: suggestion.category || '',
        hskLevel: suggestion.hskLevel || 1,
        tags: null,
      });
    } else {
      // NLP suggestion - only fill pinyin
      onPinyinDetected?.(suggestion.pinyin);
      
      // Prompt to add to database
      onRequestAddToDatabase?.(suggestion.hanzi, suggestion.pinyin);
    }

    setShowDropdown(false);
    setSuggestions([]);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} ${hasChinese(value) ? 'text-2xl' : ''}`}
        />
        
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.hanzi}-${index}`}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`
                w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors
                border-b border-gray-100 last:border-b-0
                ${index === selectedIndex ? 'bg-purple-50' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-medium text-gray-900">
                      {suggestion.hanzi}
                    </span>
                    <span className="text-sm text-gray-600">
                      {suggestion.pinyin}
                    </span>
                    {suggestion.english && (
                      <span className="text-sm text-gray-700">
                        - {suggestion.english}
                      </span>
                    )}
                  </div>
                  
                  {suggestion.source === 'database' && suggestion.hskLevel && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                        HSK {suggestion.hskLevel}
                      </span>
                      {suggestion.category && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          {suggestion.category}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 ml-3">
                  {suggestion.source === 'database' ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">In Database</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs font-medium">Add to DB</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper Text */}
      {value && isPinyin(value) && !showDropdown && !isSearching && (
        <p className="text-xs text-gray-500 mt-1">
          💡 Searching vocabulary database... Or paste Chinese characters directly for auto-pinyin
        </p>
      )}
      {!value && (
        <p className="text-xs text-gray-400 mt-1">
          Paste Chinese characters → pinyin generated automatically
        </p>
      )}
    </div>
  );
}

/**
 * Simplified version for forms that just need hanzi input
 */
export function SimpleHanziInput({
  value,
  onChange,
  placeholder = 'Enter Chinese characters',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${className} ${hasChinese(value) ? 'text-2xl font-medium' : ''}`}
    />
  );
}

