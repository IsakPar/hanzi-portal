/**
 * AlternativesPanel - Categorized word alternatives display
 * 
 * Shows suggestions grouped by strategy:
 * - Same Category (best)
 * - Same Type/POS (good)
 * - Similar Sound (hard)
 * - Similar Length (visual)
 * - Related Meaning (AI)
 */

import { X, Folder, Type, Music, Ruler, Sparkles, RefreshCw } from 'lucide-react';
import type { DistractorSource, VocabWord, DistractorResponse } from '@/services/distractorsAPI';
import { cn } from '@/lib/utils';

interface AlternativesPanelProps {
  source: DistractorSource;
  distractors: DistractorResponse['distractors'];
  onSelect: (word: string, vocabWord?: VocabWord) => void;
  onClose: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  words: VocabWord[];
  onSelect: (word: string, vocabWord: VocabWord) => void;
  color: 'green' | 'blue' | 'amber' | 'gray' | 'purple';
}

const colorClasses = {
  green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
  blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
  gray: 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200',
  purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
};

function CategorySection({ title, subtitle, icon, words, onSelect, color }: CategorySectionProps) {
  if (words.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
        {icon}
        <span className="font-medium">{title}</span>
        {subtitle && <span className="text-gray-400">• {subtitle}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word) => (
          <button
            key={word.id}
            onClick={() => onSelect(word.hanzi, word)}
            className={cn(
              "px-2.5 py-1 rounded-md text-sm font-medium transition-colors border",
              colorClasses[color]
            )}
            title={`${word.pinyin} - ${word.english}`}
          >
            {word.hanzi}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AlternativesPanel({
  source,
  distractors,
  onSelect,
  onClose,
  onRefresh,
  loading = false,
}: AlternativesPanelProps) {
  const hasAny = 
    distractors.sameCategory.length > 0 ||
    distractors.samePos.length > 0 ||
    distractors.sameTone.length > 0 ||
    distractors.similarLength.length > 0 ||
    distractors.semantic.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{source.word}</h3>
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
              HSK{source.hskLevel}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {source.pinyin} • {source.english}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
              title="Refresh suggestions"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-72 overflow-y-auto space-y-4">
        {!hasAny ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No alternatives found</p>
            <p className="text-xs mt-1">Try a different word or HSK level</p>
          </div>
        ) : (
          <>
            {/* Same Category - Best */}
            <CategorySection
              title="Same Category"
              subtitle={source.category}
              icon={<Folder size={14} />}
              words={distractors.sameCategory}
              onSelect={onSelect}
              color="green"
            />

            {/* Same POS */}
            <CategorySection
              title="Same Type"
              subtitle={source.pos || undefined}
              icon={<Type size={14} />}
              words={distractors.samePos}
              onSelect={onSelect}
              color="blue"
            />

            {/* Same Tone - Hard mode */}
            <CategorySection
              title="Similar Sound"
              subtitle={source.tonePattern ? `Tone: ${source.tonePattern}` : undefined}
              icon={<Music size={14} />}
              words={distractors.sameTone}
              onSelect={onSelect}
              color="amber"
            />

            {/* Similar Length */}
            <CategorySection
              title="Similar Length"
              subtitle={`${source.word.length} char${source.word.length > 1 ? 's' : ''}`}
              icon={<Ruler size={14} />}
              words={distractors.similarLength}
              onSelect={onSelect}
              color="gray"
            />

            {/* Semantic Fallback */}
            <CategorySection
              title="Related Meaning"
              subtitle="AI suggestions"
              icon={<Sparkles size={14} />}
              words={distractors.semantic}
              onSelect={onSelect}
              color="purple"
            />
          </>
        )}
      </div>

      {/* Footer - Quick actions */}
      {source.category && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            🎲 Random HSK{source.hskLevel}
          </button>
          <button className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            📚 All {source.category}
          </button>
        </div>
      )}
    </div>
  );
}

export default AlternativesPanel;

