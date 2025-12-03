/**
 * VocabMetadataSection
 * 
 * Section 3 of VocabularyEditor: POS, Tone Pattern, Secondary Categories, Status
 */

import { Loader2, Sparkles, Bot, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SecondaryCategoryPicker } from "@/components/forms";
import { POS_OPTIONS } from "@/services/vocabularyAPI";

interface AISuggestions {
  pos?: { value: string; suggested: boolean };
  tonePattern?: { value: string; computed: boolean };
}

interface VocabMetadataSectionProps {
  pos: string;
  onPosChange: (value: string) => void;
  tonePattern: string;
  onTonePatternChange: (value: string) => void;
  secondaryCategories: string[];
  onSecondaryCategoriesChange: (cats: string[]) => void;
  isNew: boolean;
  aiTagging: boolean;
  aiSuggestions: AISuggestions | null;
  onAiSuggestMetadata: () => void;
  onComputeTonePattern: () => void;
  onAiSuggestSecondaryCategories: () => Promise<string[]>;
}

export function VocabMetadataSection({
  pos,
  onPosChange,
  tonePattern,
  onTonePatternChange,
  secondaryCategories,
  onSecondaryCategoriesChange,
  isNew,
  aiTagging,
  aiSuggestions,
  onAiSuggestMetadata,
  onComputeTonePattern,
  onAiSuggestSecondaryCategories,
}: VocabMetadataSectionProps) {
  return (
    <div className="space-y-6">
      {/* AI Fill All Button */}
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-purple-900">AI Metadata Assistant</h3>
            <p className="text-sm text-purple-700">
              Auto-fill POS and compute tone pattern
            </p>
          </div>
          <Button
            onClick={onAiSuggestMetadata}
            disabled={aiTagging || isNew}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {aiTagging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Fill Metadata
              </>
            )}
          </Button>
        </div>
        {isNew && (
          <p className="text-xs text-purple-600 mt-2">
            💡 Save the entry first to use AI tagging
          </p>
        )}
      </div>

      {/* Metadata Fields */}
      <div className="space-y-4">
        {/* POS & Tone Pattern */}
        <div className="grid grid-cols-2 gap-4">
          {/* Part of Speech */}
          <div>
            <Label className="flex items-center gap-2">
              Part of Speech
              {aiSuggestions?.pos?.suggested && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  AI
                </span>
              )}
            </Label>
            <select
              value={pos}
              onChange={(e) => onPosChange(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Select POS...</option>
              {POS_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} ({p.example})
                </option>
              ))}
            </select>
          </div>

          {/* Tone Pattern */}
          <div>
            <Label className="flex items-center gap-2">
              Tone Pattern
              <button
                type="button"
                onClick={onComputeTonePattern}
                className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-200"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Compute
              </button>
              {aiSuggestions?.tonePattern?.computed && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  ✓
                </span>
              )}
            </Label>
            <Input
              value={tonePattern}
              onChange={(e) => onTonePatternChange(e.target.value)}
              placeholder="3-3"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: tone numbers separated by dashes (1-4 for tones, 5 for neutral)
            </p>
          </div>
        </div>

        {/* Secondary Categories */}
        <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4">
          <SecondaryCategoryPicker
            value={secondaryCategories}
            onChange={onSecondaryCategoriesChange}
            label="Secondary Categories"
            showAISuggest={true}
            onAISuggest={onAiSuggestSecondaryCategories}
            canUseAI={!isNew}
          />
          <p className="text-xs text-pink-700 mt-2">
            Select additional semantic categories for better distractor generation
          </p>
        </div>

        {/* Metadata Status Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <Label className="text-green-900 flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4" />
            Metadata Status
          </Label>
          <div className="flex gap-4 text-sm">
            <StatusItem label="POS" value={pos} />
            <StatusItem label="Tone" value={tonePattern} />
            <StatusItem
              label="Categories"
              value={secondaryCategories.length > 0 ? `${secondaryCategories.length}` : ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <span className={`flex items-center gap-1 ${value ? "text-green-700" : "text-gray-400"}`}>
      {value ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <span className="w-3 h-3 rounded-full border border-gray-300" />
      )}
      {label}
    </span>
  );
}

export default VocabMetadataSection;

