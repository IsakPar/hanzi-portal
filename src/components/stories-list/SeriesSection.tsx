import { Library, BookOpen, Plus, ChevronRight } from 'lucide-react';
import type { StorySeries } from '@/services/storiesAPI';
import { Thumbnail } from '@/components/stories/ThumbnailUploader';

interface SeriesSectionProps {
  series: StorySeries[];
  onManageSeries: () => void;
}

export function SeriesSection({ series, onManageSeries }: SeriesSectionProps) {
  if (series.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Library className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Story Series</h2>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
            {series.length}
          </span>
        </div>
        <button
          onClick={onManageSeries}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
        >
          Manage
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {series.map((s) => (
          <button
            key={s.id}
            onClick={onManageSeries}
            className="flex-shrink-0 w-40 h-40 rounded-xl relative overflow-hidden transition-transform hover:scale-105 group"
          >
            {/* Background - Thumbnail or Color Fallback */}
            <div className="absolute inset-0">
              <Thumbnail
                r2Key={s.coverImageR2Key}
                fallbackColor={s.color}
                className="w-full h-full"
              />
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
            {/* Decorative circle (only on color fallback) */}
            {!s.coverImageR2Key && (
              <div className="absolute top-[-30px] right-[-30px] w-[100px] h-[100px] rounded-full bg-white/15" />
            )}
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <BookOpen className="w-6 h-6 text-white/90 mb-2" />
              <div className="text-white font-bold text-base truncate">{s.title}</div>
              <div className="text-white/80 text-sm">{s.storyCount} Stories</div>
            </div>
            {!s.isPublished && (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 text-white/90 text-xs rounded">Draft</div>
            )}
          </button>
        ))}
        <button
          onClick={onManageSeries}
          className="flex-shrink-0 w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
        >
          <Plus className="w-8 h-8 mb-2" />
          <span className="text-sm font-medium">New Series</span>
        </button>
      </div>
    </div>
  );
}

