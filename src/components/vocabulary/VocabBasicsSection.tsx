/**
 * VocabBasicsSection
 * 
 * Section 1 of VocabularyEditor: Hanzi, Pinyin, English, Category, HSK, Tags
 */

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HanziInput } from "@/components/shared/HanziInput";
import { COMMON_CATEGORIES, HSK_LEVELS } from "@/components/forms";
import { Sparkles, Loader2 } from "lucide-react";
import type { VocabularyEntry } from "@/services/vocabularyAPI";

interface VocabBasicsSectionProps {
  entry: Partial<VocabularyEntry>;
  onChange: (updates: Partial<VocabularyEntry>) => void;
  tagsInput: string;
  onTagsInputChange: (value: string) => void;
  onAiTranslate?: () => Promise<{ english: string; pinyin: string } | void>;
}

export function VocabBasicsSection({
  entry,
  onChange,
  tagsInput,
  onTagsInputChange,
  onAiTranslate,
}: VocabBasicsSectionProps) {
  const [isTranslating, setIsTranslating] = useState(false);

  const handleAiTranslate = async () => {
    if (!onAiTranslate) return;
    setIsTranslating(true);
    try {
      const result = await onAiTranslate();
      if (result) {
        onChange({ english: result.english, pinyin: result.pinyin });
      }
    } finally {
      setIsTranslating(false);
    }
  };
  return (
    <div className="space-y-4">
      {/* Hanzi */}
      <div>
        <Label>
          Hanzi <span className="text-red-500">*</span>
        </Label>
        <HanziInput
          value={entry.hanzi || ""}
          onChange={(value) => onChange({ hanzi: value })}
          placeholder="你好"
          className="text-3xl font-bold py-3"
        />
      </div>

      {/* Pinyin & English */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pinyin">
            Pinyin <span className="text-red-500">*</span>
          </Label>
          <Input
            id="pinyin"
            value={entry.pinyin || ""}
            onChange={(e) => onChange({ pinyin: e.target.value })}
            placeholder="nǐ hǎo"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="english">
              English <span className="text-red-500">*</span>
            </Label>
            {onAiTranslate && entry.hanzi && !entry.english && (
              <button
                onClick={handleAiTranslate}
                disabled={isTranslating}
                className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
              >
                {isTranslating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                AI Suggest
              </button>
            )}
          </div>
          <Input
            id="english"
            value={entry.english || ""}
            onChange={(e) => onChange({ english: e.target.value })}
            placeholder="hello"
          />
        </div>
      </div>

      {/* Category & HSK */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">
            Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="category"
            value={entry.category || ""}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Select category...</option>
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="hskLevel">HSK Level</Label>
          <select
            id="hskLevel"
            value={entry.hskLevel || 1}
            onChange={(e) => onChange({ hskLevel: Number(e.target.value) })}
            className="w-full border rounded-md px-3 py-2"
          >
            {HSK_LEVELS.map((hsk) => (
              <option key={hsk.value} value={hsk.value}>
                {hsk.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label htmlFor="tags">Tags (Optional)</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => onTagsInputChange(e.target.value)}
          placeholder="greeting, formal, common"
        />
      </div>
    </div>
  );
}

export default VocabBasicsSection;

