/**
 * VocabPreviewCard
 * 
 * Preview card showing how the vocabulary entry will look
 */

import { HSK_LEVELS } from "@/components/forms";
import type { VocabularyEntry } from "@/services/vocabularyAPI";

interface VocabPreviewCardProps {
  entry: Partial<VocabularyEntry>;
  pos: string;
  tonePattern: string;
  secondaryCategories: string[];
}

export function VocabPreviewCard({
  entry,
  pos,
  tonePattern,
  secondaryCategories,
}: VocabPreviewCardProps) {
  const hskLevel = HSK_LEVELS.find((h) => h.value === entry.hskLevel);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Preview</h3>

      {/* Main Word */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold text-gray-900 mb-2">
          {entry.hanzi || "汉字"}
        </div>
        <div className="text-xl text-pink-600 mb-1">
          {entry.pinyin || "hàn zì"}
        </div>
        <div className="text-gray-600">{entry.english || "Chinese character"}</div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {entry.category && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            {entry.category}
          </span>
        )}
        {hskLevel && (
          <span className={`px-3 py-1 rounded-full text-sm ${hskLevel.color}`}>
            {hskLevel.label}
          </span>
        )}
        {pos && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            {pos}
          </span>
        )}
        {tonePattern && (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-mono">
            {tonePattern}
          </span>
        )}
      </div>

      {/* Secondary Categories */}
      {secondaryCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center mb-4">
          {secondaryCategories.map((cat) => (
            <span
              key={cat}
              className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded text-xs"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Example */}
      {entry.exampleChinese && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-lg text-gray-800 mb-1">{entry.exampleChinese}</p>
          {entry.examplePinyin && (
            <p className="text-sm text-pink-500 mb-1">{entry.examplePinyin}</p>
          )}
          {entry.exampleEnglish && (
            <p className="text-sm text-gray-500">{entry.exampleEnglish}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default VocabPreviewCard;

