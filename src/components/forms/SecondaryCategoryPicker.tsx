/**
 * SecondaryCategoryPicker
 * 
 * Reusable component for selecting secondary vocabulary categories.
 * Shows clickable pills with optional AI suggestion button.
 */

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

export const SECONDARY_CATEGORY_OPTIONS = [
  'people', 'relationships', 'emotions', 'actions', 'descriptive',
  'time', 'location', 'quantity', 'question', 'polite',
  'formal', 'informal', 'spoken', 'written', 'idiom',
  'measure', 'direction', 'color', 'size', 'state',
  'weather', 'nature', 'body', 'health', 'education',
  'work', 'travel', 'communication', 'daily-life', 'culture',
] as const;

export type SecondaryCategory = typeof SECONDARY_CATEGORY_OPTIONS[number];

interface SecondaryCategoryPickerProps {
  /** Selected categories */
  value: string[];
  /** Callback when categories change */
  onChange: (categories: string[]) => void;
  /** Label text */
  label?: string;
  /** Show AI suggest button */
  showAISuggest?: boolean;
  /** Callback for AI suggestion (returns suggested categories) */
  onAISuggest?: () => Promise<string[]>;
  /** Whether AI can be used (e.g., false for new entries) */
  canUseAI?: boolean;
  /** Max categories that can be selected */
  maxSelections?: number;
  /** Compact mode (smaller pills) */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

export function SecondaryCategoryPicker({
  value,
  onChange,
  label = 'Secondary Categories',
  showAISuggest = false,
  onAISuggest,
  canUseAI = true,
  maxSelections,
  compact = false,
  disabled = false,
  className = '',
}: SecondaryCategoryPickerProps) {
  const [aiLoading, setAiLoading] = useState(false);

  const toggleCategory = (cat: string) => {
    if (disabled) return;
    
    if (value.includes(cat)) {
      onChange(value.filter(c => c !== cat));
    } else {
      if (maxSelections && value.length >= maxSelections) {
        toast.info('Max reached', `Maximum ${maxSelections} categories allowed`);
        return;
      }
      onChange([...value, cat]);
    }
  };

  const handleAISuggest = async () => {
    if (!onAISuggest || !canUseAI) return;
    
    setAiLoading(true);
    try {
      const suggested = await onAISuggest();
      onChange(suggested);
      toast.success('AI suggested categories', suggested.length > 0 ? suggested.join(', ') : 'No categories suggested');
    } catch (err) {
      toast.error('AI tagging failed', (err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        {label && (
          <Label className="text-gray-700 flex items-center gap-2">
            {label}
            {value.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                {value.length} selected
              </span>
            )}
          </Label>
        )}
        
        {showAISuggest && onAISuggest && (
          <button
            type="button"
            onClick={handleAISuggest}
            disabled={aiLoading || !canUseAI || disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {aiLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {aiLoading ? 'Suggesting...' : 'AI Suggest'}
          </button>
        )}
      </div>

      <div className={cn(
        'flex flex-wrap gap-1.5',
        compact ? 'gap-1' : 'gap-1.5'
      )}>
        {SECONDARY_CATEGORY_OPTIONS.map(cat => {
          const isSelected = value.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              disabled={disabled}
              className={cn(
                'border transition-all',
                compact ? 'px-1.5 py-0.5 text-xs rounded' : 'px-2 py-1 text-xs rounded-full',
                isSelected
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-medium'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {!canUseAI && showAISuggest && (
        <p className="text-xs text-gray-500 mt-2">
          💡 Save the entry first to use AI suggestions
        </p>
      )}
    </div>
  );
}

export default SecondaryCategoryPicker;

