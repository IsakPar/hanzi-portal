import { Filter, Zap, Bot, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type FilterMode = 'missing-pos' | 'missing-tone' | 'missing-secondary' | 'missing-any' | 'all';

interface MetadataFiltersProps {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  hskFilter: number | null;
  setHskFilter: (hsk: number | null) => void;
  batchProcessing: boolean;
  batchSecondaryProcessing: boolean;
  onComputeTones: () => void;
  onTagSecondary: () => void;
  onRefresh: () => void;
}

export function MetadataFilters({
  filterMode,
  setFilterMode,
  hskFilter,
  setHskFilter,
  batchProcessing,
  batchSecondaryProcessing,
  onComputeTones,
  onTagSecondary,
  onRefresh,
}: MetadataFiltersProps) {
  return (
    <div className="mb-6 flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <Label className="text-sm font-medium">Filter:</Label>
      </div>
      
      <select
        value={filterMode}
        onChange={(e) => setFilterMode(e.target.value as FilterMode)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
      >
        <option value="missing-any">Missing Any Metadata</option>
        <option value="missing-pos">Missing POS</option>
        <option value="missing-tone">Missing Tone Pattern</option>
        <option value="missing-secondary">Missing Secondary Categories</option>
        <option value="all">All Vocabulary</option>
      </select>

      <select
        value={hskFilter || ''}
        onChange={(e) => setHskFilter(e.target.value ? Number(e.target.value) : null)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
      >
        <option value="">All HSK Levels</option>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
          <option key={level} value={level}>HSK {level}</option>
        ))}
      </select>

      <div className="flex-1" />

      <Button
        variant="outline"
        onClick={onComputeTones}
        disabled={batchProcessing}
        className="border-blue-300 text-blue-700"
      >
        {batchProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Zap className="w-4 h-4 mr-2" />
        )}
        Compute Tones
      </Button>

      <Button
        variant="outline"
        onClick={onTagSecondary}
        disabled={batchSecondaryProcessing}
        className="border-pink-300 text-pink-700"
      >
        {batchSecondaryProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Bot className="w-4 h-4 mr-2" />
        )}
        AI Tag Secondary (This Page)
      </Button>

      <Button variant="outline" onClick={onRefresh}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}

