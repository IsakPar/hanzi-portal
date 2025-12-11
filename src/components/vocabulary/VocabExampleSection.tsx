/**
 * VocabExampleSection
 * 
 * Section 2 of VocabularyEditor: Example sentence with AI generation
 */

import { Loader2, Sparkles, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AudioPreviewApproval } from "@/components/audio/AudioPreviewApproval";
import type { VocabularyEntry } from "@/services/vocabularyAPI";

interface VocabExampleSectionProps {
  entry: Partial<VocabularyEntry>;
  onChange: (updates: Partial<VocabularyEntry>) => void;
  isNew: boolean;
  generatingExample: boolean;
  onGenerateExample: () => void;
  onGenerateAudio: () => Promise<{ base64: string; needsTrim?: boolean }>;
  onSaveAudio: (base64: string) => Promise<number | void>;
}

export function VocabExampleSection({
  entry,
  onChange,
  isNew: _isNew, // No longer used to block generation
  generatingExample,
  onGenerateExample,
  onGenerateAudio,
  onSaveAudio,
}: VocabExampleSectionProps) {
  // Check if minimum required fields are filled (for auto-save)
  const canGenerate = !!(
    entry.hanzi?.trim() &&
    entry.pinyin?.trim() &&
    entry.english?.trim() &&
    entry.category?.trim()
  );
  
  return (
    <div className="space-y-4">
      {/* AI Generate Button */}
      <Button
        onClick={onGenerateExample}
        disabled={generatingExample || !canGenerate}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
      >
        {generatingExample ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {generatingExample ? "Generating..." : "✨ Generate Example with AI"}
      </Button>

      {!canGenerate && (
        <p className="text-xs text-blue-600 text-center">
          💡 Fill in Hanzi, Pinyin, English & Category first
        </p>
      )}

      <div>
        <Label htmlFor="exampleChinese">Chinese Sentence</Label>
        <Textarea
          id="exampleChinese"
          value={entry.exampleChinese || ""}
          onChange={(e) => onChange({ exampleChinese: e.target.value })}
          placeholder="你好，我叫李明。"
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="examplePinyin">Pinyin</Label>
        <Input
          id="examplePinyin"
          value={entry.examplePinyin || ""}
          onChange={(e) => onChange({ examplePinyin: e.target.value })}
          placeholder="nǐ hǎo, wǒ jiào lǐ míng"
        />
      </div>

      <div>
        <Label htmlFor="exampleEnglish">English Translation</Label>
        <Input
          id="exampleEnglish"
          value={entry.exampleEnglish || ""}
          onChange={(e) => onChange({ exampleEnglish: e.target.value })}
          placeholder="Hello, my name is Li Ming."
        />
      </div>

      {/* Example Audio Section */}
      {entry.exampleChinese && (
        <AudioPreviewApproval
          label="Sentence Audio"
          icon={<Music className="w-4 h-4" />}
          colorTheme="blue"
          savedAudioKey={entry.exampleAudioR2Key}
          audioUpdatedAt={entry.exampleAudioUpdatedAt}
          canGenerate={!!entry.exampleChinese?.trim()}
          disabledHint="💡 Enter example sentence first to generate audio"
          onGenerate={onGenerateAudio}
          onSave={onSaveAudio}
        />
      )}
    </div>
  );
}

export default VocabExampleSection;

