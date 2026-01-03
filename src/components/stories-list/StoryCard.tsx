import { Clock, Star, BookOpen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Story } from '@/services/storiesAPI';

interface StoryCardProps {
  story: Story;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const difficultyColors = {
  easy: "from-green-500 to-emerald-500",
  medium: "from-yellow-500 to-orange-500",
  hard: "from-red-500 to-rose-500",
};

export function StoryCard({ story, onClick, onDelete }: StoryCardProps) {
  const practiceCount = story.practiceBlocks?.length || 0;

  return (
    <div 
      onClick={onClick}
      className="group relative overflow-hidden bg-white rounded-2xl border border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]"
    >
      {/* Delete Button - Top Right */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-3 right-3 z-20 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          title="Delete story"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Gradient Header with optional Cover Image */}
      <div className={cn(
        "h-32 bg-gradient-to-br p-6 relative overflow-hidden",
        difficultyColors[story.difficulty]
      )}>
        {/* Cover image background */}
        {story.coverImageR2Key && (
          <img
            src={`https://content.hanzimaster.com/${story.coverImageR2Key}`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm bg-white/20 text-white">
              HSK {story.hskLevel}
            </span>
            {story.isPublished ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm flex items-center gap-1">
                <Star size={12} fill="currentColor" />
                Published
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                Draft
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white line-clamp-2 drop-shadow-lg">{story.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{story.description || 'No description'}</p>
        
        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{story.estimatedMinutes || 15} min</span>
          </div>
          {practiceCount > 0 && (
            <div className="flex items-center gap-1">
              <BookOpen size={14} />
              <span>{practiceCount} practice</span>
            </div>
          )}
        </div>

        {/* Difficulty Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500">Difficulty:</span>
          <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold capitalize",
            story.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
            story.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          )}>
            {story.difficulty}
          </span>
        </div>

        {/* Topic */}
        {story.topic && (
          <div className="mb-4">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              {story.topic}
            </span>
          </div>
        )}
      </div>

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 border-2 border-purple-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

