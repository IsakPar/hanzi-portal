import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Volume2, Tag, AlertTriangle, Edit } from "lucide-react";
import type { LessonOption } from "./VocabFilters";

interface LessonStatsBarProps {
  lesson: LessonOption | undefined;
  onTagMissing: () => void;
}

export function LessonStatsBar({ lesson, onTagMissing }: LessonStatsBarProps) {
  const navigate = useNavigate();
  
  if (!lesson) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-indigo-900">
              HSK{lesson.hskLevel} L{lesson.lessonNumber}: {lesson.title}
            </h3>
            {lesson.contentStatus && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                lesson.contentStatus === 'live' ? 'bg-green-100 text-green-700' :
                lesson.contentStatus === 'staging' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {lesson.contentStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="font-medium text-indigo-700">{lesson.vocabCount || 0}</span> words
            </span>
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-medium">{lesson.withAudio || 0}</span> with audio
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-pink-500" />
              <span className="font-medium">{lesson.withSecondary || 0}</span> with tags
            </span>
            {lesson.untaggedCount && lesson.untaggedCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-medium">{lesson.untaggedCount}</span> need tagging
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lesson.untaggedCount && lesson.untaggedCount > 0 && (
            <Button
              size="sm"
              onClick={onTagMissing}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Tag className="w-3 h-3 mr-1" />
              AI Tag Missing ({lesson.untaggedCount})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit Lesson
          </Button>
        </div>
      </div>
    </div>
  );
}

