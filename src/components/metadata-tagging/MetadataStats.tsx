import type { MetadataStats } from '@/services/distractorsAPI';

interface MetadataStatsProps {
  stats: MetadataStats;
  secondaryStats: { total: number; withSecondary: number; percent: number } | null;
  needsTaggingCount: number;
}

export function MetadataStatsSection({ stats, secondaryStats, needsTaggingCount }: MetadataStatsProps) {
  return (
    <div className="mb-6 grid grid-cols-5 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-500">Total Words</div>
      </div>
      <div className="bg-white rounded-xl border border-green-200 p-4">
        <div className="text-3xl font-bold text-green-600">{stats.coverage.pos.count}</div>
        <div className="text-sm text-gray-500">
          With POS ({stats.coverage.pos.percent}%)
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${stats.coverage.pos.percent}%` }}
          />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-blue-200 p-4">
        <div className="text-3xl font-bold text-blue-600">{stats.coverage.tonePattern.count}</div>
        <div className="text-sm text-gray-500">
          With Tone ({stats.coverage.tonePattern.percent}%)
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${stats.coverage.tonePattern.percent}%` }}
          />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-pink-200 p-4">
        <div className="text-3xl font-bold text-pink-600">{secondaryStats?.withSecondary || 0}</div>
        <div className="text-sm text-gray-500">
          With Secondary ({secondaryStats?.percent || 0}%)
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-pink-500 rounded-full transition-all"
            style={{ width: `${secondaryStats?.percent || 0}%` }}
          />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-amber-200 p-4">
        <div className="text-3xl font-bold text-amber-600">{needsTaggingCount}</div>
        <div className="text-sm text-gray-500">
          Need Tagging
        </div>
      </div>
    </div>
  );
}

