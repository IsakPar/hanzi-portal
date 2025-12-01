/**
 * SuggestableInput - All-in-one input with audio status + AI suggestions
 * 
 * Combines:
 * - Text input
 * - Audio status indicator (for Chinese text)
 * - AI suggestion button (optional)
 */

import { Input } from '@/components/ui/input';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from './AISuggestButton';
import type { SuggestContext, Suggestion } from '@/services/aiSuggestAPI';
import { cn } from '@/lib/utils';

interface SuggestableInputProps {
  /** Current value */
  value: string;
  
  /** Value change handler */
  onChange: (value: string) => void;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Input className */
  className?: string;
  
  // Audio props
  /** Existing audio URL */
  audioUrl?: string;
  
  /** Lesson ID for audio storage */
  lessonId: string;
  
  /** Block ID for audio storage */
  blockId: string;
  
  /** Unique ID for this input (for audio path) */
  inputId: string;
  
  /** Called when audio is saved */
  onAudioSaved?: (audioUrl: string) => void;
  
  /** Called when audio is removed */
  onAudioRemoved?: () => void;
  
  // AI Suggest props
  /** Enable AI suggestions */
  enableSuggest?: boolean;
  
  /** Suggestion context type */
  suggestContext?: SuggestContext;
  
  /** Reference text for suggestions (e.g., correct answer) */
  suggestReference?: string;
  
  /** HSK level for filtering suggestions */
  hskLevel?: number;
  
  /** Items to exclude from suggestions */
  excludeItems?: string[];
  
  /** Called when a suggestion is selected */
  onSuggestionSelect?: (suggestion: Suggestion) => void;
  
  /** Disable all interactions */
  disabled?: boolean;
}

export function SuggestableInput({
  value,
  onChange,
  placeholder,
  className,
  audioUrl,
  lessonId,
  blockId,
  inputId,
  onAudioSaved,
  onAudioRemoved,
  enableSuggest = false,
  suggestContext = 'similar-word',
  suggestReference,
  hskLevel = 1,
  excludeItems = [],
  onSuggestionSelect,
  disabled = false,
}: SuggestableInputProps) {
  
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    onChange(suggestion.text);
    onSuggestionSelect?.(suggestion);
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(className)}
          disabled={disabled}
        />
      </div>
      
      {/* Audio Status - only for Chinese text */}
      {onAudioSaved && (
        <InlineAudioStatus
          text={value}
          audioUrl={audioUrl}
          lessonId={lessonId}
          blockId={blockId}
          optionId={inputId}
          onAudioSaved={onAudioSaved}
          onAudioRemoved={onAudioRemoved}
          disabled={disabled}
        />
      )}
      
      {/* AI Suggest */}
      {enableSuggest && suggestReference && (
        <AISuggestButton
          context={suggestContext}
          correctAnswer={suggestReference}
          hskLevel={hskLevel}
          exclude={[...excludeItems, value].filter(Boolean)}
          count={5}
          onSelect={handleSuggestionSelect}
          disabled={disabled}
        />
      )}
    </div>
  );
}

