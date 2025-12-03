/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MultipleChoiceEditor - Edit multiple choice exercise properties
 * 
 * Features:
 * - Smart Fill: One-click distractor population using pedagogic strategies
 * - Per-option AI suggestions via dropdown
 * - Audio status indicators
 */

import { useState, useCallback } from 'react';
import { FormField } from '../shared/FormField';
import type { ExerciseMultipleChoiceBlock } from '@/types/lesson';
import { Plus, Trash2, CheckCircle, Zap, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from '@/components/ai/AISuggestButton';
import { AlternativesPanel } from '@/components/ai/AlternativesPanel';
import type { Suggestion } from '@/services/aiSuggestAPI';
import { getDistractors, flattenDistractors, type DistractorResponse } from '@/services/distractorsAPI';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

interface MultipleChoiceEditorProps {
  block: ExerciseMultipleChoiceBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
  hskLevel?: number;
}

export function MultipleChoiceEditor({ block, onChange, lessonId = '', hskLevel = 1 }: MultipleChoiceEditorProps) {
  // Default empty array for options if undefined
  const [options, setOptions] = useState(block.content.options || []);
  const [smartFillLoading, setSmartFillLoading] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState<number | null>(null);
  const [alternativesData, setAlternativesData] = useState<DistractorResponse | null>(null);
  const [alternativesLoading, setAlternativesLoading] = useState(false);

  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateOptions = (newOptions: any[]) => {
    setOptions(newOptions);
    updateContent('options', newOptions);
  };

  const handleAudioSaved = (index: number, audioUrl: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], audioUrl };
    updateOptions(newOptions);
  };

  const handleAudioRemoved = (index: number) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], audioUrl: undefined };
    updateOptions(newOptions);
  };

  const handleSuggestionSelect = (index: number, suggestion: Suggestion) => {
    const newOptions = [...options];
    newOptions[index] = { 
      ...newOptions[index], 
      text: suggestion.text,
      audioUrl: undefined, // Reset audio when text changes
    };
    updateOptions(newOptions);
  };

  // Get the correct answer for context
  const correctAnswer = options.find(o => o.isCorrect)?.text || '';
  
  // Get all current option texts for exclusion
  const excludeTexts = options.map(o => o.text).filter(Boolean);

  /**
   * Smart Fill - Auto-populate empty wrong options with pedagogic distractors
   */
  const handleSmartFill = useCallback(async () => {
    if (!correctAnswer) {
      toast.error('Need correct answer', 'Enter the correct answer first');
      return;
    }

    setSmartFillLoading(true);
    try {
      console.log('[MCQ Smart Fill] Fetching distractors for:', correctAnswer);
      const response = await getDistractors({
        word: correctAnswer,
        maxHskLevel: hskLevel,
        count: 10,
      });
      console.log('[MCQ Smart Fill] Response:', response);

      // Get flattened, prioritized distractors
      const allDistractors = flattenDistractors(response.distractors);
      
      // Filter out existing options
      const existingTexts = new Set(options.map(o => o.text?.toLowerCase()).filter(Boolean));
      const available = allDistractors.filter(d => !existingTexts.has(d.hanzi.toLowerCase()));

      if (available.length === 0) {
        toast.info('No new distractors', 'All available alternatives are already used');
        return;
      }

      // Fill empty wrong options
      let distractorIndex = 0;
      const newOptions = options.map((opt) => {
        // Skip correct answer or already filled options
        if (opt.isCorrect || opt.text) return opt;
        
        // Get next distractor
        const distractor = available[distractorIndex];
        if (!distractor) return opt;
        
        distractorIndex++;
        return {
          ...opt,
          text: distractor.hanzi,
          audioUrl: undefined,
        };
      });

      updateOptions(newOptions);
      toast.success('Smart Fill complete', `Added ${distractorIndex} distractors`);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      console.error('[MCQ Smart Fill] Error:', error);
      
      let errorMessage = error.message || 'Unknown error';
      if (error.status === 404 || errorMessage.includes('not found')) {
        errorMessage = `"${correctAnswer}" isn't in the vocabulary database. Add it first or use a different word.`;
      }
      
      toast.error('Smart Fill failed', errorMessage);
    } finally {
      setSmartFillLoading(false);
    }
  }, [correctAnswer, hskLevel, options, updateOptions]);

  /**
   * Show alternatives panel for a specific option
   */
  const handleShowAlternatives = useCallback(async (index: number) => {
    if (showAlternatives === index) {
      setShowAlternatives(null);
      setAlternativesData(null);
      return;
    }

    const optionText = options[index]?.text || correctAnswer;
    if (!optionText) {
      toast.info('Enter text first', 'Enter some text to see alternatives');
      return;
    }

    setShowAlternatives(index);
    setAlternativesLoading(true);
    setAlternativesData(null);

    try {
      console.log('[MCQ] Fetching distractors for:', optionText, 'HSK:', hskLevel);
      const response = await getDistractors({
        word: optionText,
        maxHskLevel: hskLevel,
        count: 20,
      });
      console.log('[MCQ] Distractors response:', response);
      setAlternativesData(response);
    } catch (err: unknown) {
      const error = err as Error & { status?: number; response?: { error?: string } };
      console.error('[MCQ] Distractors error:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Unknown error';
      let errorTitle = 'Failed to load alternatives';
      
      if (error.status === 404 || errorMessage.includes('not found')) {
        errorTitle = 'Word not in vocabulary';
        errorMessage = `"${optionText}" isn't in the HSK vocabulary database. Try a different word or add it to vocabulary first.`;
      } else if (error.status === 401) {
        errorTitle = 'Authentication error';
        errorMessage = 'Please refresh the page and try again.';
      } else if (error.status === 500 || errorMessage.includes('secondary_categories')) {
        errorTitle = 'Database issue';
        errorMessage = 'There may be a database migration pending. Contact support if this persists.';
      }
      
      toast.error(errorTitle, errorMessage);
      setShowAlternatives(null);
    } finally {
      setAlternativesLoading(false);
    }
  }, [showAlternatives, options, correctAnswer, hskLevel]);

  /**
   * Handle selecting an alternative from the panel
   */
  const handleAlternativeSelect = useCallback((word: string) => {
    if (showAlternatives === null) return;
    
    const newOptions = [...options];
    newOptions[showAlternatives] = {
      ...newOptions[showAlternatives],
      text: word,
      audioUrl: undefined,
    };
    updateOptions(newOptions);
    setShowAlternatives(null);
    setAlternativesData(null);
  }, [showAlternatives, options, updateOptions]);

  return (
    <div className="space-y-4">
      <FormField
        label="Question"
        required
        value={block.content.question || ''}
        onChange={(value) => updateContent('question', value)}
        placeholder="What does '你好' mean?"
        multiline
      />

      {/* Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label>
              Answer Options <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Add 3-4 options (one must be correct)
            </p>
          </div>
          
          {/* Smart Fill Button */}
          <button
            onClick={handleSmartFill}
            disabled={!correctAnswer || smartFillLoading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              correctAnswer && !smartFillLoading
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-sm hover:shadow"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
            title="Auto-fill empty wrong options with smart distractors"
          >
            {smartFillLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Filling...
              </>
            ) : (
              <>
                <Zap size={14} />
                Smart Fill
              </>
            )}
          </button>
        </div>
        
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={option.id || index} className="space-y-2">
              <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <Input
                  value={option.text}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index] = { ...newOptions[index], text: e.target.value };
                    updateOptions(newOptions);
                  }}
                  placeholder={`Option ${index + 1}`}
                  className={cn(
                    option.isCorrect && "border-green-500 ring-1 ring-green-500/20 bg-green-50/10"
                  )}
                />
              </div>
              
              {/* Audio status for Chinese text */}
              <InlineAudioStatus
                text={option.text}
                audioUrl={option.audioUrl}
                lessonId={lessonId || 'draft'}
                blockId={block.id}
                optionId={option.id || `opt-${index}`}
                onAudioSaved={(url) => handleAudioSaved(index, url)}
                onAudioRemoved={() => handleAudioRemoved(index)}
                disabled={!lessonId}
              />
              
              {/* Alternatives button - show categorized alternatives */}
              <button
                onClick={() => handleShowAlternatives(index)}
                className={cn(
                  "p-2 rounded-md transition-colors text-sm",
                  showAlternatives === index
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                )}
                title="Show categorized alternatives"
              >
                <Zap size={16} />
              </button>
              
              {/* Legacy AI Suggest for wrong options (fallback) */}
              {!option.isCorrect && correctAnswer && (
                <AISuggestButton
                  context="mcq-wrong-option"
                  correctAnswer={correctAnswer}
                  hskLevel={hskLevel}
                  exclude={excludeTexts}
                  count={5}
                  onSelect={(suggestion) => handleSuggestionSelect(index, suggestion)}
                />
              )}
              
              <button
                onClick={() => {
                  const newOptions = options.map((opt, i) => ({
                    ...opt,
                    isCorrect: i === index
                  }));
                  updateOptions(newOptions);
                }}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  option.isCorrect 
                    ? "bg-green-100 text-green-700 hover:bg-green-200" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                title="Mark as correct"
              >
                <CheckCircle size={18} />
              </button>
              
              <button
                onClick={() => updateOptions(options.filter((_, i) => i !== index))}
                className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                title="Remove option"
              >
                <Trash2 size={18} />
              </button>
              </div>
            
              {/* Alternatives Panel - appears below this option */}
            {showAlternatives === index && (
              <div className="ml-0 mt-2">
                {alternativesLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm p-4 bg-gray-50 rounded-lg">
                    <Loader2 size={16} className="animate-spin" />
                    Loading alternatives...
                  </div>
                ) : alternativesData ? (
                  <AlternativesPanel
                    source={alternativesData.source}
                    distractors={alternativesData.distractors}
                    onSelect={handleAlternativeSelect}
                    onClose={() => {
                      setShowAlternatives(null);
                      setAlternativesData(null);
                    }}
                  />
                ) : null}
              </div>
            )}
          </div>
          ))}
          
          <button
            onClick={() => updateOptions([
              ...options, 
              { id: crypto.randomUUID(), text: '', isCorrect: false }
            ])}
            className="flex items-center justify-center gap-2 w-full p-2 border border-dashed rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
          >
            <Plus size={14} />
            Add Option
          </button>
        </div>
      </div>

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
