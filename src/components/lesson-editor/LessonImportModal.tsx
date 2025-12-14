/**
 * Lesson Import Modal
 * 
 * Allows importing a lesson structure from JSON.
 * Validates the JSON and populates the lesson editor with blocks.
 */

import { useState, useCallback } from "react";
import { X, Upload, Check, AlertCircle, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson, ContentBlock, BlockType } from "@/types/lesson";
import { cn } from "@/lib/utils";

interface LessonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (lesson: Partial<Lesson>) => void;
  currentHskLevel?: number;
}

// Valid block types from the portal
const VALID_BLOCK_TYPES: BlockType[] = [
  'intro',
  'hero_hanzi',
  'explain',
  'tip',
  'pattern',
  'exercise_drag_sentence',
  'exercise_multiple_choice',
  'exercise_spot_error',
  'exercise_build_sentence',
  'reading_passage',
  'reading_comprehension',
  'speaking_practice',
  'speech_practice_v2',
  'dialogue',
  'celebration',
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  blockCount: number;
}

// Helper: Check if text uses comma-delimited format
function isCommaDelimited(text: string): boolean {
  return text.includes(',');
}

function validateLessonJson(json: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let blockCount = 0;

  if (typeof json !== 'object' || json === null) {
    return { isValid: false, errors: ['JSON must be an object'], warnings: [], blockCount: 0 };
  }

  const data = json as Record<string, unknown>;

  // Required fields
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Missing or invalid "title" (string required)');
  }

  // Optional but recommended
  if (!data.subtitle) {
    warnings.push('No "subtitle" provided');
  }

  if (!data.hskLevel || typeof data.hskLevel !== 'number') {
    warnings.push('No "hskLevel" provided, will use current level');
  }

  // Blocks validation
  if (!data.blocks || !Array.isArray(data.blocks)) {
    errors.push('Missing or invalid "blocks" (array required)');
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

      // ═══════════════════════════════════════════════════════════════
      // COMMA-DELIMITED FORMAT VALIDATION
      // ═══════════════════════════════════════════════════════════════
      const content = b.content as Record<string, unknown> | undefined;
      
      // Validate reading_passage uses comma-delimited format
      if (b.type === 'reading_passage' && content) {
        const paragraphs = content.paragraphs as Array<Record<string, unknown>> | undefined;
        if (paragraphs && Array.isArray(paragraphs)) {
          paragraphs.forEach((p, pIdx) => {
            const hanzi = p.hanzi as string | undefined;
            if (hanzi && !isCommaDelimited(hanzi)) {
              errors.push(
                `Block ${index + 1} (reading_passage), Paragraph ${pIdx + 1}: ` +
                `Must use comma-delimited format. Example: "你好,！,我,是,老师,。" ` +
                `Got: "${hanzi.substring(0, 30)}..."`
              );
            }
          });
        }
      }

      // Validate dialogue uses comma-delimited format
      if (b.type === 'dialogue' && content) {
        const exchanges = content.exchanges as Array<Record<string, unknown>> | undefined;
        if (exchanges && Array.isArray(exchanges)) {
          exchanges.forEach((ex, exIdx) => {
            const text = (ex.text || ex.hanzi) as string | undefined;
            if (text && !isCommaDelimited(text)) {
              errors.push(
                `Block ${index + 1} (dialogue), Exchange ${exIdx + 1}: ` +
                `Must use comma-delimited format. Example: "你好,！,我,叫,小明,。" ` +
                `Got: "${text.substring(0, 30)}..."`
              );
            }
          });
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    blockCount,
  };
}

// Example JSON for the placeholder - Uses comma-delimited format for perfect pinyin alignment
const EXAMPLE_JSON = `{
  "title": "Hello & Goodbye",
  "subtitle": "Master Chinese greetings",
  "hskLevel": 1,
  "lessonType": "lesson",
  "difficulty": "easy",
  "estimatedMinutes": 5,
  "targetVocabulary": ["你好", "我", "是", "老师"],
  "blocks": [
    {
      "type": "intro",
      "content": {
        "titleEn": "你好",
        "introText": "Learn to greet in Chinese",
        "heroHanzi": "你好"
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
      "type": "reading_passage",
      "_comment": "Use comma-delimited words for perfect pinyin alignment!",
      "content": {
        "instruction": "Read the passage",
        "paragraphs": [
          {
            "hanzi": "你好,！,我,是,老师,。",
            "translation": "Hello! I am a teacher."
          }
        ]
      }
    },
    {
      "type": "dialogue",
      "_comment": "Comma-delimited format for dialogues too!",
      "content": {
        "scenario": "Meeting someone",
        "exchanges": [
          {
            "speaker": "A",
            "text": "你好,！,我,叫,小明,。",
            "translation": "Hello! My name is Xiaoming."
          },
          {
            "speaker": "B",
            "text": "你好,！,我,是,老师,。",
            "translation": "Hello! I am a teacher."
          }
        ]
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
      "content": { "message": "Well done! 🎉" }
    }
  ]
}`;

export function LessonImportModal({ isOpen, onClose, onImport, currentHskLevel = 1 }: LessonImportModalProps) {
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

  const handleImport = useCallback(() => {
    if (!validation?.isValid) return;

    try {
      const parsed = JSON.parse(jsonInput);
      
      // Generate IDs for blocks if missing
      const blocks: ContentBlock[] = (parsed.blocks || []).map((block: any, index: number) => ({
        id: block.id || crypto.randomUUID(),
        type: block.type,
        orderIndex: index,
        content: block.content,
      }));

      const lessonData: Partial<Lesson> = {
        title: parsed.title || "Imported Lesson",
        subtitle: parsed.subtitle || "",
        hskLevel: parsed.hskLevel || currentHskLevel,
        lessonType: parsed.lessonType || "lesson",
        difficulty: parsed.difficulty || "easy",
        estimatedMinutes: parsed.estimatedMinutes || 15,
        grammarPoints: parsed.grammarPoints || [],
        tags: parsed.tags || [],
        targetVocabulary: parsed.targetVocabulary || [],
        blocks,
      };

      onImport(lessonData);
      setJsonInput("");
      setValidation(null);
      onClose();
    } catch (err) {
      setParseError("Failed to process JSON");
    }
  }, [jsonInput, validation, currentHskLevel, onImport, onClose]);

  const handlePasteExample = () => {
    setJsonInput(EXAMPLE_JSON);
    setValidation(null);
    setParseError(null);
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
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <FileJson size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Import Lesson from JSON</h2>
              <p className="text-sm text-gray-500">Paste your lesson JSON to quickly populate the editor</p>
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
                Lesson JSON
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
              placeholder="Paste your lesson JSON here..."
              className={cn(
                "w-full h-64 p-4 font-mono text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500",
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
                      ? `Valid! ${validation.blockCount} blocks ready to import` 
                      : "Validation Failed"}
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
              Import {validation?.blockCount ? `(${validation.blockCount} blocks)` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

