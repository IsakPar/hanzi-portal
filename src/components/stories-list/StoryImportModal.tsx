/**
 * Story Import Modal
 * 
 * Allows importing a story structure from JSON.
 * Validates the JSON locally and returns parsed data to the parent.
 * Does NOT call the API - the story editor handles saving.
 */

import { useState, useCallback } from 'react';
import { X, Upload, Check, AlertCircle, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Story import data structure
export interface StoryImportData {
  title: string;
  titleEn?: string;
  subtitle?: string;
  description?: string;
  author?: string;
  topic?: string;
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  storyType: 'text' | 'dialogue';
  estimatedMinutes?: number;
  accessTier?: 'free' | 'premium';
  tags?: string[];
  sentences: Array<{
    chinese: string;
    pinyin: string;
    english: string;
    speaker?: string;
  }>;
  practiceIntro?: {
    enabled: boolean;
    title?: string;
    message?: string;
    skipLabel?: string;
    startLabel?: string;
  };
  practiceBlocks?: Array<Record<string, unknown>>;
  // Series assignment
  seriesId?: string;
  seriesOrder?: number;
}

interface StoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: StoryImportData) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sentenceCount: number;
  isDialogue: boolean;
}

function validateStoryJson(json: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sentenceCount = 0;
  let isDialogue = false;

  if (typeof json !== 'object' || json === null) {
    return { isValid: false, errors: ['JSON must be an object'], warnings: [], sentenceCount: 0, isDialogue: false };
  }

  const data = json as Record<string, unknown>;

  // Required fields
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Missing or invalid "title" (string required)');
  }

  if (!data.hskLevel || typeof data.hskLevel !== 'number' || data.hskLevel < 1 || data.hskLevel > 9) {
    errors.push('Missing or invalid "hskLevel" (number 1-9 required)');
  }

  // Accept both 'segments' and 'sentences'
  const contentArray = (data.segments || data.sentences) as Array<Record<string, unknown>> | undefined;

  if (!contentArray || !Array.isArray(contentArray)) {
    errors.push('Missing "sentences" or "segments" array');
  } else if (contentArray.length === 0) {
    errors.push('Content array is empty - need at least one sentence');
  } else {
    sentenceCount = contentArray.length;
    
    contentArray.forEach((item, idx) => {
      if (!item.chinese || typeof item.chinese !== 'string') {
        errors.push(`Sentence ${idx + 1}: Missing "chinese" text`);
      }
      if (item.speaker) {
        isDialogue = true;
      }
    });
  }

  // Validate difficulty
  if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty as string)) {
    errors.push(`Invalid "difficulty": "${data.difficulty}" (must be easy/medium/hard)`);
  }

  // Validate storyType
  if (data.storyType && !['text', 'dialogue'].includes(data.storyType as string)) {
    errors.push(`Invalid "storyType": "${data.storyType}" (must be text/dialogue)`);
  }

  // Warnings
  if (!data.description) {
    warnings.push('No "description" provided');
  }
  if (!data.storyType) {
    warnings.push(`No "storyType" specified - will auto-detect as "${isDialogue ? 'dialogue' : 'text'}"`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sentenceCount,
    isDialogue,
  };
}

// Example JSON template
const EXAMPLE_JSON = `{
  "title": "在咖啡店",
  "titleEn": "At the Café",
  "description": "A simple conversation ordering drinks.",
  "hskLevel": 1,
  "difficulty": "easy",
  "storyType": "dialogue",
  "estimatedMinutes": 3,
  "accessTier": "free",
  "tags": ["food-drink", "conversation"],
  
  "sentences": [
    {
      "chinese": "你好！",
      "pinyin": "nǐ hǎo!",
      "english": "Hello!",
      "speaker": "店员"
    },
    {
      "chinese": "你好！我要一杯咖啡。",
      "pinyin": "nǐ hǎo! wǒ yào yī bēi kāfēi.",
      "english": "Hello! I want a cup of coffee.",
      "speaker": "客人"
    }
  ],
  
  "practiceIntro": {
    "enabled": true,
    "title": "Practice Time! 📝",
    "message": "Test your understanding!"
  },
  
  "practiceBlocks": []
}`;

export function StoryImportModal({ isOpen, onClose, onImport }: StoryImportModalProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleValidate = useCallback(() => {
    setParseError(null);
    setValidation(null);

    if (!jsonInput.trim()) {
      setParseError('Please paste JSON first');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const result = validateStoryJson(parsed);
      setValidation(result);
    } catch (err) {
      setParseError(`Invalid JSON: ${err instanceof Error ? err.message : 'Parse error'}`);
    }
  }, [jsonInput]);

  const handleImport = useCallback(() => {
    if (!validation?.isValid) return;

    try {
      const parsed = JSON.parse(jsonInput) as Record<string, unknown>;
      
      // Normalize: use 'sentences' internally
      const contentArray = (parsed.segments || parsed.sentences) as Array<Record<string, unknown>>;
      
      // Auto-detect dialogue if not specified
      const hasDialogue = contentArray.some(s => s.speaker);
      const storyType = (parsed.storyType as string) || (hasDialogue ? 'dialogue' : 'text');
      
      const importData: StoryImportData = {
        title: parsed.title as string,
        titleEn: parsed.titleEn as string | undefined,
        subtitle: parsed.subtitle as string | undefined,
        description: parsed.description as string | undefined,
        author: parsed.author as string | undefined,
        topic: parsed.topic as string | undefined,
        hskLevel: parsed.hskLevel as number,
        difficulty: (parsed.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        storyType: storyType as 'text' | 'dialogue',
        estimatedMinutes: parsed.estimatedMinutes as number | undefined,
        accessTier: (parsed.accessTier as 'free' | 'premium') || 'free',
        tags: parsed.tags as string[] | undefined,
        sentences: contentArray.map((s) => ({
          chinese: s.chinese as string,
          pinyin: (s.pinyin as string) || '',
          english: (s.english as string) || '',
          speaker: s.speaker as string | undefined,
        })),
        practiceIntro: parsed.practiceIntro as StoryImportData['practiceIntro'],
        practiceBlocks: parsed.practiceBlocks as Array<Record<string, unknown>> | undefined,
        seriesId: parsed.seriesId as string | undefined,
        seriesOrder: parsed.seriesOrder as number | undefined,
      };

      onImport(importData);
      setJsonInput('');
      setValidation(null);
      onClose();
    } catch (err) {
      setParseError('Failed to process JSON');
    }
  }, [jsonInput, validation, onImport, onClose]);

  const handlePasteExample = () => {
    setJsonInput(EXAMPLE_JSON);
    setValidation(null);
    setParseError(null);
  };

  const handleClear = () => {
    setJsonInput('');
    setValidation(null);
    setParseError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <FileJson size={20} className="text-white" />
            </div>
          <div>
              <h2 className="text-xl font-bold text-gray-900">Import Story from JSON</h2>
              <p className="text-sm text-gray-500">Paste your story JSON to populate the editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* JSON Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Story JSON
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handlePasteExample}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                >
                  Paste Example
                </button>
                {jsonInput && (
                  <button
                    onClick={handleClear}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setValidation(null);
                setParseError(null);
              }}
              placeholder="Paste your story JSON here..."
              className={cn(
                'w-full h-64 p-4 font-mono text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500',
                parseError ? 'border-red-300 bg-red-50' : 'border-gray-200'
              )}
              spellCheck={false}
            />
          </div>
          
          {/* Parse Error */}
          {parseError && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Parse Error</p>
                <p className="text-sm text-red-700">{parseError}</p>
                    </div>
                    </div>
                  )}
                  
          {/* Validation Results */}
          {validation && (
            <div className={cn(
              'p-4 rounded-xl border',
              validation.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            )}>
              <div className="flex items-start gap-3">
                {validation.isValid ? (
                  <Check size={20} className="text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    'font-semibold',
                    validation.isValid ? 'text-green-800' : 'text-red-800'
                  )}>
                    {validation.isValid 
                      ? `✅ Valid! ${validation.sentenceCount} sentences${validation.isDialogue ? ' (dialogue)' : ''} ready` 
                      : 'Validation Failed'}
                  </p>

                  {/* Errors */}
                  {validation.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {validation.errors.map((err, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="text-red-500">✗</span>
                          {err}
                        </li>
                        ))}
                    </ul>
                  )}

                  {/* Warnings */}
                  {validation.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {validation.warnings.map((warn, i) => (
                        <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                          <span className="text-amber-500">⚠</span>
                          {warn}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>📋 Workflow:</strong> Import validates your JSON and opens the Story Editor. 
              You can then add TTS audio, edit sentences, and save when ready.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={!jsonInput.trim()}
            >
              Validate
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!validation?.isValid}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Upload size={16} className="mr-2" />
              Open in Editor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
