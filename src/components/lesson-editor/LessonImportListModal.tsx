/**
 * Lesson Import Modal for LessonList Page
 * 
 * Flow: Paste JSON → Validate → Continue → Editor opens with blocks pre-filled
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, FileJson, Check, AlertCircle, Copy, ArrowRight } from "lucide-react";
import type { BlockType, LessonType } from "@/types/lesson";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/useToast";

interface LessonImportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHskLevel?: number;
}

// Valid block types
const VALID_BLOCK_TYPES: BlockType[] = [
  'intro', 'hero_hanzi', 'explain', 'tip', 'pattern',
  'exercise_drag_sentence', 'exercise_multiple_choice', 
  'exercise_spot_error', 'exercise_build_sentence',
  'reading_passage', 'reading_comprehension',
  'speaking_practice', 'speech_practice_v2',
  'dialogue', 'celebration',
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  blockCount: number;
  lessonTitle?: string;
  lessonType?: LessonType;
  hskLevel?: number;
}

function validateLessonJson(json: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let blockCount = 0;
  let lessonTitle: string | undefined;
  let lessonType: LessonType | undefined;
  let hskLevel: number | undefined;

  if (typeof json !== 'object' || json === null) {
    return { isValid: false, errors: ['JSON must be an object'], warnings: [], blockCount: 0 };
  }

  const data = json as Record<string, unknown>;

  // Extract metadata
  lessonTitle = typeof data.title === 'string' ? data.title : undefined;
  lessonType = typeof data.lessonType === 'string' ? data.lessonType as LessonType : undefined;
  hskLevel = typeof data.hskLevel === 'number' ? data.hskLevel : undefined;

  if (!lessonTitle) {
    errors.push('Missing "title" (string required)');
  }

  if (!data.subtitle) {
    warnings.push('No "subtitle" provided');
  }

  // Blocks validation
  if (!data.blocks || !Array.isArray(data.blocks)) {
    errors.push('Missing "blocks" array');
  } else {
    blockCount = data.blocks.length;
    
    if (blockCount === 0) {
      errors.push('Blocks array is empty');
    }

    data.blocks.forEach((block: unknown, index: number) => {
      if (typeof block !== 'object' || block === null) {
        errors.push(`Block ${index + 1}: Must be an object`);
        return;
      }

      const b = block as Record<string, unknown>;

      if (!b.type || typeof b.type !== 'string') {
        errors.push(`Block ${index + 1}: Missing "type"`);
      } else if (!VALID_BLOCK_TYPES.includes(b.type as BlockType)) {
        errors.push(`Block ${index + 1}: Invalid type "${b.type}"`);
      }

      if (!b.content || typeof b.content !== 'object') {
        errors.push(`Block ${index + 1}: Missing "content" object`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    blockCount,
    lessonTitle,
    lessonType,
    hskLevel,
  };
}

// Empty template for copying
const EMPTY_TEMPLATE = `{
  "title": "Your Lesson Title",
  "subtitle": "A brief description",
  "hskLevel": 1,
  "lessonType": "lesson",
  "difficulty": "easy",
  "estimatedMinutes": 10,
  "blocks": [
    {
      "type": "intro",
      "content": {
        "titleEn": "Lesson Title",
        "introText": "What you'll learn...",
        "heroHanzi": "汉字"
      }
    },
    {
      "type": "hero_hanzi",
      "content": {
        "hanzi": "你好",
        "pinyin": "nǐ hǎo",
        "translation": "Hello"
      }
    },
    {
      "type": "explain",
      "content": {
        "title": "Explanation",
        "markdown": "Your explanation here..."
      }
    },
    {
      "type": "exercise_multiple_choice",
      "content": {
        "question": "What does 你好 mean?",
        "options": [
          { "id": "a", "text": "Hello", "isCorrect": true },
          { "id": "b", "text": "Goodbye", "isCorrect": false }
        ]
      }
    },
    {
      "type": "celebration",
      "content": {
        "message": "Great job! 🎉"
      }
    }
  ]
}`;

export function LessonImportListModal({ isOpen, onClose, defaultHskLevel = 1 }: LessonImportListModalProps) {
  const navigate = useNavigate();
  const [jsonInput, setJsonInput] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleValidate = useCallback(() => {
    setParseError(null);
    setValidation(null);

    if (!jsonInput.trim()) {
      setParseError("Please paste JSON first");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const result = validateLessonJson(parsed);
      setValidation(result);
    } catch (err) {
      setParseError(`Invalid JSON: ${err instanceof Error ? err.message : 'Parse error'}`);
    }
  }, [jsonInput]);

  const handleContinue = useCallback(() => {
    if (!validation?.isValid) return;

    // Store the import data in sessionStorage so the editor can pick it up
    sessionStorage.setItem('lesson-import-data', jsonInput);

    // Navigate to editor with import flag
    const hsk = validation.hskLevel || defaultHskLevel;
    const type = validation.lessonType || 'lesson';
    navigate(`/lessons/new/edit?type=${type}&hsk=${hsk}&import=true`);
    
    toast.success('Importing lesson...', 'Opening editor with your blocks');
    onClose();
  }, [jsonInput, validation, defaultHskLevel, navigate, onClose]);

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(EMPTY_TEMPLATE);
      toast.success('Template copied!', 'Paste it in your code editor and customize');
    } catch {
      toast.error('Failed to copy', 'Please copy manually');
    }
  };

  const handleClear = () => {
    setJsonInput("");
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
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <FileJson size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Import Lesson from JSON</h2>
              <p className="text-sm text-gray-500">Paste JSON → Validate → Edit in Portal</p>
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
          {/* Quick Actions */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Need a starting point?</p>
              <p className="text-xs text-gray-500">Copy our template and customize it in your code editor</p>
            </div>
            <button
              onClick={handleCopyTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Copy size={16} />
              Copy Template
            </button>
          </div>

          {/* JSON Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                Lesson JSON
              </label>
              {jsonInput && (
                <button
                  onClick={handleClear}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setValidation(null);
                setParseError(null);
              }}
              placeholder='{"title": "...", "blocks": [...]}'
              className={cn(
                "w-full h-56 p-4 font-mono text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500",
                parseError ? "border-red-300 bg-red-50" : "border-gray-200"
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
              "p-4 rounded-xl border",
              validation.isValid 
                ? "bg-green-50 border-green-200" 
                : "bg-amber-50 border-amber-200"
            )}>
              <div className="flex items-start gap-3">
                {validation.isValid ? (
                  <Check size={20} className="text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={cn(
                    "font-semibold",
                    validation.isValid ? "text-green-800" : "text-amber-800"
                  )}>
                    {validation.isValid 
                      ? `✅ Valid! Ready to import "${validation.lessonTitle}"` 
                      : "Validation Failed"}
                  </p>

                  {validation.isValid && (
                    <p className="text-sm text-green-700 mt-1">
                      {validation.blockCount} blocks • HSK {validation.hskLevel || defaultHskLevel} • {validation.lessonType || 'lesson'}
                    </p>
                  )}

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

          {/* Block Types Reference */}
          <details className="bg-gray-50 rounded-xl border border-gray-200">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              Supported Block Types ({VALID_BLOCK_TYPES.length})
            </summary>
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2 mt-2">
                {VALID_BLOCK_TYPES.map((type) => (
                  <code 
                    key={type} 
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                  >
                    {type}
                  </code>
                ))}
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleValidate}
              disabled={!jsonInput.trim()}
              className={cn(
                "px-5 py-2.5 rounded-xl font-medium transition-colors",
                jsonInput.trim()
                  ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              Validate
            </button>
            <button
              onClick={handleContinue}
              disabled={!validation?.isValid}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all",
                validation?.isValid
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:scale-105"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              Continue to Editor
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

