import { Bot, CheckCircle2, X, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { POS_OPTIONS, type VocabularyEntry } from '@/services/vocabularyAPI';

export interface VocabWithMeta extends VocabularyEntry {
  pos?: string | null;
  tonePattern?: string | null;
  secondaryCategories?: string[] | null;
}

interface MetadataTableRowProps {
  vocab: VocabWithMeta;
  localChanges?: { pos?: string; tonePattern?: string };
  taggingId: string | null;
  savingId: string | null;
  onLocalChange: (vocabId: string, field: 'pos' | 'tonePattern', value: string) => void;
  onAiTag: (vocabId: string) => void;
  onSave: (vocabId: string) => void;
  onSkip: (vocabId: string) => void;
}

export function MetadataTableRow({
  vocab,
  localChanges,
  taggingId,
  savingId,
  onLocalChange,
  onAiTag,
  onSave,
  onSkip,
}: MetadataTableRowProps) {
  const hasLocalChanges = !!localChanges;
  const displayPos = localChanges?.pos ?? vocab.pos;
  const displayTone = localChanges?.tonePattern ?? vocab.tonePattern;

  return (
    <tr className="hover:bg-gray-50">
      {/* Word */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">{vocab.hanzi}</span>
          <a
            href={`/vocabulary/${vocab.id}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="text-xs text-gray-500">{vocab.english}</div>
      </td>
      
      {/* Pinyin */}
      <td className="px-4 py-3 text-gray-600">{vocab.pinyin}</td>
      
      {/* Category */}
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
          {vocab.category}
        </span>
      </td>
      
      {/* POS */}
      <td className="px-4 py-3">
        {hasLocalChanges ? (
          <select
            value={displayPos || ''}
            onChange={(e) => onLocalChange(vocab.id, 'pos', e.target.value)}
            className="text-sm px-2 py-1 border border-green-300 rounded bg-green-50"
          >
            <option value="">Select...</option>
            {POS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : displayPos ? (
          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
            {displayPos}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      
      {/* Tone */}
      <td className="px-4 py-3">
        {hasLocalChanges ? (
          <input
            value={displayTone || ''}
            onChange={(e) => onLocalChange(vocab.id, 'tonePattern', e.target.value)}
            className="text-sm px-2 py-1 border border-blue-300 rounded bg-blue-50 font-mono w-20"
            placeholder="1-1"
          />
        ) : displayTone ? (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-mono">
            {displayTone}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      
      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {hasLocalChanges ? (
            <>
              <Button
                size="sm"
                onClick={() => onSave(vocab.id)}
                disabled={savingId === vocab.id}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingId === vocab.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSkip(vocab.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAiTag(vocab.id)}
              disabled={taggingId === vocab.id}
              className="border-green-300 text-green-700"
            >
              {taggingId === vocab.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Bot className="w-3 h-3" />
              )}
              <span className="ml-1">AI Tag</span>
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

