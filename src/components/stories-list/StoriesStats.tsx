import { BookOpen, Star, TrendingUp } from 'lucide-react';

interface StoriesStatsProps {
  totalCount: number;
  publishedCount: number;
  draftCount: number;
}

export function StoriesStats({ totalCount, publishedCount, draftCount }: StoriesStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{totalCount}</div>
            <div className="text-xs text-blue-600">Total Stories</div>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500 rounded-lg">
            <Star size={20} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-900">{publishedCount}</div>
            <div className="text-xs text-green-600">Published</div>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500 rounded-lg">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-900">{draftCount}</div>
            <div className="text-xs text-purple-600">Drafts</div>
          </div>
        </div>
      </div>
    </div>
  );
}

