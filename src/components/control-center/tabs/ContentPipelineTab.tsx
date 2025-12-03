import { BookOpen, BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Overview, StagedLesson, StagedStory } from '../types';

interface ContentPipelineTabProps {
  overview: Overview | null;
  stagedLessons: StagedLesson[];
  stagedStories: StagedStory[];
  totalStaged: number;
  promoting: string | null;
  loading: boolean;
  promoteToLive: (type: 'lesson' | 'story', id: string) => void;
  promoteAll: () => void;
}

export function ContentPipelineTab({
  overview,
  stagedLessons,
  stagedStories,
  totalStaged,
  promoting,
  loading,
  promoteToLive,
  promoteAll,
}: ContentPipelineTabProps) {
  return (
    <div className="space-y-6">
      {overview && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">Draft</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{overview.total.draft}</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <div className="text-sm font-medium text-amber-600">Staging</div>
            <div className="text-3xl font-bold text-amber-700 mt-1">{overview.total.staging}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
            <div className="text-sm font-medium text-emerald-600">Live</div>
            <div className="text-3xl font-bold text-emerald-700 mt-1">{overview.total.live}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Staged Content</h2>
          {totalStaged > 0 && (
            <Button onClick={promoteAll} disabled={promoting !== null} className="bg-emerald-600 hover:bg-emerald-700">
              Push All Live
            </Button>
          )}
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : totalStaged === 0 ? (
          <div className="p-8 text-center text-gray-500">No content in staging</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stagedLessons.map((lesson) => (
              <div key={lesson.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">{lesson.title}</span>
                </div>
                <Button size="sm" onClick={() => promoteToLive('lesson', lesson.id)} className="bg-emerald-600">
                  Push Live
                </Button>
              </div>
            ))}
            {stagedStories.map((story) => (
              <div key={story.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <BookText className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">{story.title}</span>
                </div>
                <Button size="sm" onClick={() => promoteToLive('story', story.id)} className="bg-emerald-600">
                  Push Live
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

