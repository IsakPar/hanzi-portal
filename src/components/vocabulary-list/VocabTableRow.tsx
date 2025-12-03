import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Trash2,
  Volume2,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { HSK_LEVELS, type VocabularyEntry } from "@/services/vocabularyAPI";

interface VocabTableRowProps {
  entry: VocabularyEntry;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onTagsClick: (e: React.MouseEvent, entry: VocabularyEntry) => void;
}

export function VocabTableRow({
  entry,
  isSelected,
  onToggleSelect,
  onDelete,
  onTagsClick,
}: VocabTableRowProps) {
  const navigate = useNavigate();
  
  const getHSKColor = (level: number) => {
    return HSK_LEVELS.find((h) => h.value === level)?.color || "bg-gray-100 text-gray-700";
  };

  const hasAudio = !!entry.wordAudioR2Key;
  const hasExample = !!entry.exampleChinese;
  const isComplete = hasAudio && hasExample;
  const tags = entry.secondaryCategories || [];

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-pink-50' : ''}`}>
      <td className="px-3 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(entry.id)}
          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
        />
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
          {entry.rowNum || '—'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-2xl font-medium text-gray-900">
          {entry.hanzi}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-700">{entry.pinyin}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-gray-700">{entry.english}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
          {entry.category}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`text-xs px-2 py-1 rounded font-medium ${getHSKColor(entry.hskLevel)}`}>
          HSK {entry.hskLevel}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={(e) => onTagsClick(e, entry)}
          className="text-left hover:bg-pink-50 rounded px-1 py-0.5 -mx-1 transition-colors cursor-pointer"
        >
          {tags.length === 0 ? (
            <span className="text-gray-400 text-xs italic">+ Add tags</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-xs text-gray-500">+{tags.length - 2}</span>
              )}
            </div>
          )}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className={`${hasAudio ? 'text-emerald-500' : 'text-gray-300'}`} title={hasAudio ? 'Has audio' : 'No audio'}>
            <Volume2 className="w-4 h-4" />
          </span>
          <span className={`${hasExample ? 'text-blue-500' : 'text-gray-300'}`} title={hasExample ? 'Has example' : 'No example'}>
            <MessageSquare className="w-4 h-4" />
          </span>
          <span title={isComplete ? 'Complete' : 'Incomplete'}>
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/vocabulary/${entry.id}/edit`)}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(entry.id)}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

