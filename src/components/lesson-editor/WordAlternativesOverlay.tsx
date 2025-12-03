/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WordAlternativesOverlay - Popup overlay for selecting alternative words
 * 
 * Features:
 * - Click any word → popup shows alternatives grouped by category
 * - Sentence-level context suggestions
 * - Selected alternatives appear underneath the word
 * - Keyboard navigation support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Check, Folder, Tag, Type, Music, Ruler, Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VocabWord {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category?: string;
  hskLevel?: number;
  pos?: string;
  tonePattern?: string;
}

interface DistractorResponse {
  source: {
    id: string;
    word: string;
    pinyin: string;
    english: string;
    category: string;
    pos?: string | null;
    tonePattern?: string | null;
    secondaryCategories?: string[] | null;
    hskLevel: number;
  };
  distractors: {
    sameCategory: VocabWord[];
    sameSecondaryCategory: VocabWord[];
    samePos: VocabWord[];
    sameTone: VocabWord[];
    similarLength: VocabWord[];
    semantic: VocabWord[];
  };
  total: number;
}

interface SelectedAlternative {
  id: string;
  hanzi: string;
  pinyin?: string;
  english?: string;
}

interface WordAlternativesOverlayProps {
  /** The word to find alternatives for */
  word: string;
  /** Current HSK level for filtering */
  hskLevel?: number;
  /** Already selected alternatives */
  selectedAlternatives?: SelectedAlternative[];
  /** Called when alternatives change */
  onAlternativesChange: (alternatives: SelectedAlternative[]) => void;
  /** Called to close the overlay */
  onClose: () => void;
  /** Position anchor (for positioning the popup) */
  anchorRect?: DOMRect | null;
  /** Optional: other words in the sentence for context */
  sentenceWords?: string[];
  /** Optional: index of this word in the sentence */
  wordIndex?: number;
}

// ═══════════════════════════════════════════════════════════
// CATEGORY SECTION COMPONENT
// ═══════════════════════════════════════════════════════════

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  words: VocabWord[];
  selected: Set<string>;
  onToggle: (word: VocabWord) => void;
  color: 'green' | 'blue' | 'amber' | 'purple' | 'gray' | 'pink';
}

const colorClasses = {
  green: {
    badge: 'bg-green-100 text-green-700 border-green-200',
    hover: 'hover:bg-green-50 hover:border-green-300',
    selected: 'bg-green-100 border-green-400 ring-2 ring-green-200',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    hover: 'hover:bg-blue-50 hover:border-blue-300',
    selected: 'bg-blue-100 border-blue-400 ring-2 ring-blue-200',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    hover: 'hover:bg-amber-50 hover:border-amber-300',
    selected: 'bg-amber-100 border-amber-400 ring-2 ring-amber-200',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    hover: 'hover:bg-purple-50 hover:border-purple-300',
    selected: 'bg-purple-100 border-purple-400 ring-2 ring-purple-200',
  },
  gray: {
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    hover: 'hover:bg-gray-50 hover:border-gray-300',
    selected: 'bg-gray-100 border-gray-400 ring-2 ring-gray-200',
  },
  pink: {
    badge: 'bg-pink-100 text-pink-700 border-pink-200',
    hover: 'hover:bg-pink-50 hover:border-pink-300',
    selected: 'bg-pink-100 border-pink-400 ring-2 ring-pink-200',
  },
};

function CategorySection({ title, subtitle, icon, words, selected, onToggle, color }: CategorySectionProps) {
  if (words.length === 0) return null;

  const colors = colorClasses[color];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("p-1 rounded", colors.badge)}>{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {subtitle && <span className="text-xs text-gray-400">• {subtitle}</span>}
        <span className="text-xs text-gray-400 ml-auto">{words.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word) => {
          const isSelected = selected.has(word.id);
          return (
            <button
              key={word.id}
              onClick={() => onToggle(word)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-sm transition-all flex items-center gap-1.5",
                isSelected ? colors.selected : `bg-white border-gray-200 ${colors.hover}`
              )}
              title={`${word.pinyin} - ${word.english}`}
            >
              <span className="font-medium">{word.hanzi}</span>
              {word.pinyin && <span className="text-xs text-gray-400">{word.pinyin}</span>}
              {isSelected && <Check size={12} className="text-green-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function WordAlternativesOverlay({
  word,
  hskLevel = 1,
  selectedAlternatives = [],
  onAlternativesChange,
  onClose,
  anchorRect,
  sentenceWords = [],
  wordIndex,
}: WordAlternativesOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DistractorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedAlternatives.map(a => a.id))
  );
  const [manualInput, setManualInput] = useState('');

  // Position state
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Fetch alternatives on mount
  const fetchAlternatives = useCallback(async () => {
    if (!word.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        word,
        maxHskLevel: hskLevel.toString(),
        count: '20',
      });
      
      console.log('[WordAlternatives] Fetching for:', word, 'HSK:', hskLevel);
      const response = await api.get<DistractorResponse>(`/v1/distractors?${params}`);
      console.log('[WordAlternatives] Response:', response);
      setData(response);
    } catch (err: unknown) {
      const error = err as Error & { status?: number; message?: string };
      console.error('[WordAlternatives] Failed to fetch:', error);
      
      // Provide specific error messages
      if (error.status === 404 || error.message?.includes('not found')) {
        setError(`"${word}" not in vocabulary. Add it first.`);
      } else if (error.status === 401) {
        setError('Session expired. Please refresh the page.');
      } else {
        setError('Failed to load alternatives');
      }
    } finally {
      setLoading(false);
    }
  }, [word, hskLevel]);

  useEffect(() => {
    fetchAlternatives();
  }, [fetchAlternatives]);

  // Position the overlay
  useEffect(() => {
    if (anchorRect && overlayRef.current) {
      const overlayRect = overlayRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = anchorRect.bottom + 8;
      let left = anchorRect.left;
      
      // Prevent going off right edge
      if (left + overlayRect.width > viewportWidth - 20) {
        left = viewportWidth - overlayRect.width - 20;
      }
      
      // Prevent going off bottom
      if (top + overlayRect.height > viewportHeight - 20) {
        top = anchorRect.top - overlayRect.height - 8;
      }
      
      setPosition({ top: Math.max(20, top), left: Math.max(20, left) });
    }
  }, [anchorRect, data]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Toggle word selection
  const handleToggle = (vocabWord: VocabWord) => {
    const newSelected = new Set(selected);
    
    if (newSelected.has(vocabWord.id)) {
      newSelected.delete(vocabWord.id);
    } else {
      newSelected.add(vocabWord.id);
    }
    
    setSelected(newSelected);
    
    // Build alternatives list
    const alternatives: SelectedAlternative[] = [];
    
    // Add from all categories
    if (data) {
      const allWords = [
        ...data.distractors.sameCategory,
        ...data.distractors.sameSecondaryCategory,
        ...data.distractors.samePos,
        ...data.distractors.sameTone,
        ...data.distractors.similarLength,
        ...data.distractors.semantic,
      ];
      
      const seen = new Set<string>();
      for (const w of allWords) {
        if (newSelected.has(w.id) && !seen.has(w.id)) {
          seen.add(w.id);
          alternatives.push({
            id: w.id,
            hanzi: w.hanzi,
            pinyin: w.pinyin,
            english: w.english,
          });
        }
      }
    }
    
    // Add manually added alternatives
    selectedAlternatives.forEach(alt => {
      if (newSelected.has(alt.id) && !alternatives.find(a => a.id === alt.id)) {
        alternatives.push(alt);
      }
    });
    
    onAlternativesChange(alternatives);
  };

  // Add manual alternative
  const handleAddManual = () => {
    if (!manualInput.trim()) return;
    
    const newAlt: SelectedAlternative = {
      id: `manual_${Date.now()}`,
      hanzi: manualInput.trim(),
    };
    
    const newSelected = new Set(selected);
    newSelected.add(newAlt.id);
    setSelected(newSelected);
    
    const newAlternatives = [...selectedAlternatives, newAlt];
    onAlternativesChange(newAlternatives);
    setManualInput('');
  };

  // Check if there are any suggestions
  const hasAnySuggestions = data && (
    data.distractors.sameCategory.length > 0 ||
    data.distractors.sameSecondaryCategory.length > 0 ||
    data.distractors.samePos.length > 0 ||
    data.distractors.sameTone.length > 0 ||
    data.distractors.similarLength.length > 0 ||
    data.distractors.semantic.length > 0
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
      />

      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed z-50 w-[420px] max-h-[80vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        style={anchorRect ? { top: position.top, left: position.left } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-gray-900">{word}</div>
            {data?.source && (
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">{data.source.pinyin}</span>
                <span className="text-xs text-gray-400">{data.source.english}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {data?.source && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                HSK{data.source.hskLevel}
              </span>
            )}
            <button
              onClick={fetchAlternatives}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
              title="Refresh suggestions"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Source Info Tags */}
        {data?.source && (
          <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-gray-50 border-b">
            {data.source.category && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                <Folder size={10} /> {data.source.category}
              </span>
            )}
            {data.source.pos && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                <Type size={10} /> {data.source.pos}
              </span>
            )}
            {data.source.tonePattern && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                <Music size={10} /> Tone {data.source.tonePattern}
              </span>
            )}
            {data.source.secondaryCategories && data.source.secondaryCategories.length > 0 && (
              data.source.secondaryCategories.map(cat => (
                <span key={cat} className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full flex items-center gap-1">
                  <Tag size={10} /> {cat}
                </span>
              ))
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
              <span className="text-gray-500">Finding alternatives...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
              <button
                onClick={fetchAlternatives}
                className="mt-2 text-sm text-indigo-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : !hasAnySuggestions ? (
            <div className="text-center py-8 text-gray-500">
              <Lightbulb size={24} className="mx-auto mb-2 opacity-50" />
              <p className="font-medium">No alternatives found</p>
              <p className="text-sm mt-1">Add one manually below</p>
            </div>
          ) : (
            <>
              {/* Same Category - Best */}
              <CategorySection
                title="Same Category"
                subtitle={data?.source.category}
                icon={<Folder size={14} />}
                words={data?.distractors.sameCategory || []}
                selected={selected}
                onToggle={handleToggle}
                color="green"
              />

              {/* Same Secondary Category */}
              <CategorySection
                title="Secondary Category"
                subtitle={data?.source.secondaryCategories?.join(', ')}
                icon={<Tag size={14} />}
                words={data?.distractors.sameSecondaryCategory || []}
                selected={selected}
                onToggle={handleToggle}
                color="pink"
              />

              {/* Same POS */}
              <CategorySection
                title="Same Type"
                subtitle={data?.source.pos || undefined}
                icon={<Type size={14} />}
                words={data?.distractors.samePos || []}
                selected={selected}
                onToggle={handleToggle}
                color="blue"
              />

              {/* Same Tone */}
              <CategorySection
                title="Similar Sound"
                subtitle={data?.source.tonePattern ? `Tone: ${data.source.tonePattern}` : undefined}
                icon={<Music size={14} />}
                words={data?.distractors.sameTone || []}
                selected={selected}
                onToggle={handleToggle}
                color="amber"
              />

              {/* Similar Length */}
              <CategorySection
                title="Similar Length"
                subtitle={`${word.length} char${word.length > 1 ? 's' : ''}`}
                icon={<Ruler size={14} />}
                words={data?.distractors.similarLength || []}
                selected={selected}
                onToggle={handleToggle}
                color="gray"
              />

              {/* Semantic / AI */}
              <CategorySection
                title="AI Suggestions"
                subtitle="semantic similarity"
                icon={<Sparkles size={14} />}
                words={data?.distractors.semantic || []}
                selected={selected}
                onToggle={handleToggle}
                color="purple"
              />
            </>
          )}

          {/* Sentence Context */}
          {sentenceWords.length > 0 && wordIndex !== undefined && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb size={14} className="text-amber-500" />
                <span className="text-sm font-medium text-gray-700">Sentence Context</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 bg-amber-50 rounded-lg">
                {sentenceWords.map((w, i) => (
                  <span
                    key={i}
                    className={cn(
                      "px-2 py-1 rounded text-sm",
                      i === wordIndex
                        ? "bg-amber-200 text-amber-800 font-bold"
                        : "bg-white text-gray-600"
                    )}
                  >
                    {w}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 Alternatives should make grammatical sense in this position
              </p>
            </div>
          )}
        </div>

        {/* Footer - Manual Add + Summary */}
        <div className="border-t bg-gray-50 p-3 space-y-3">
          {/* Selected count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              <strong className="text-indigo-600">{selected.size}</strong> alternatives selected
            </span>
            {selected.size > 0 && (
              <button
                onClick={() => {
                  setSelected(new Set());
                  onAlternativesChange([]);
                }}
                className="text-xs text-red-500 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Manual input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Add manually..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
              onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
            />
            <button
              onClick={handleAddManual}
              disabled={!manualInput.trim()}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default WordAlternativesOverlay;

