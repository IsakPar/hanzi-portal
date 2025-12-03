import { useMemo, useCallback } from "react";
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
import { VirtualizedTable, type VirtualizedTableColumn } from "@/components/ui/virtualized-table";
import { VocabTableRow } from "./VocabTableRow";

interface VocabTableProps {
  vocabulary: VocabularyEntry[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: (id: string) => void;
  onTagsClick: (e: React.MouseEvent, entry: VocabularyEntry) => void;
  useVirtualization?: boolean;
}

export function VocabTable({
  vocabulary,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onDelete,
  onTagsClick,
  useVirtualization = false,
}: VocabTableProps) {
  const navigate = useNavigate();

  const getHSKColor = useCallback((level: number) => {
    return HSK_LEVELS.find((h) => h.value === level)?.color || "bg-gray-100 text-gray-700";
  }, []);

  const getCompletenessStatus = useCallback((entry: VocabularyEntry) => {
    const hasAudio = !!entry.wordAudioR2Key;
    const hasExample = !!entry.exampleChinese;
    return { hasAudio, hasExample, isComplete: hasAudio && hasExample };
  }, []);

  // Virtualized table columns
  const virtualizedColumns = useMemo<VirtualizedTableColumn<VocabularyEntry>[]>(() => [
    {
      key: 'select',
      header: '☑',
      width: '40px',
      render: (entry) => (
        <input
          type="checkbox"
          checked={selectedIds.has(entry.id)}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect(entry.id);
          }}
          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
        />
      ),
    },
    {
      key: 'rowNum',
      header: '#',
      width: '60px',
      render: (entry) => (
        <span className="text-sm font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
          {entry.rowNum || '—'}
        </span>
      ),
    },
    {
      key: 'hanzi',
      header: 'Hanzi',
      width: '120px',
      render: (entry) => (
        <span className="text-2xl font-medium text-gray-900">{entry.hanzi}</span>
      ),
    },
    {
      key: 'pinyin',
      header: 'Pinyin',
      width: '150px',
      render: (entry) => (
        <span className="text-sm text-gray-700">{entry.pinyin}</span>
      ),
    },
    {
      key: 'english',
      header: 'English',
      render: (entry) => (
        <span className="text-sm text-gray-700 truncate">{entry.english}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      width: '120px',
      render: (entry) => (
        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
          {entry.category}
        </span>
      ),
    },
    {
      key: 'hsk',
      header: 'HSK',
      width: '80px',
      render: (entry) => (
        <span className={`text-xs px-2 py-1 rounded font-medium ${getHSKColor(entry.hskLevel)}`}>
          HSK {entry.hskLevel}
        </span>
      ),
    },
    {
      key: 'secondaryCategories',
      header: 'Tags',
      width: '140px',
      render: (entry) => {
        const tags = entry.secondaryCategories || [];
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTagsClick(e, entry);
            }}
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
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (entry) => {
        const { hasAudio, hasExample, isComplete } = getCompletenessStatus(entry);
        return (
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
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      headerClassName: 'text-right',
      className: 'justify-end',
      render: (entry) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/vocabulary/${entry.id}/edit`);
            }}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ], [getHSKColor, getCompletenessStatus, navigate, onDelete, selectedIds, onToggleSelect, onTagsClick]);

  if (useVirtualization) {
    return (
      <VirtualizedTable
        data={vocabulary}
        columns={virtualizedColumns}
        getRowKey={(item) => item.id}
        rowHeight={56}
        maxHeight={600}
        onRowClick={(item) => navigate(`/vocabulary/${item.id}/edit`)}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === vocabulary.length && vocabulary.length > 0}
                  onChange={(e) => e.target.checked ? onSelectAll() : onClearSelection()}
                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hanzi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pinyin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                English
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                HSK
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vocabulary.map((entry) => (
              <VocabTableRow
                key={entry.id}
                entry={entry}
                isSelected={selectedIds.has(entry.id)}
                onToggleSelect={onToggleSelect}
                onDelete={onDelete}
                onTagsClick={onTagsClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

