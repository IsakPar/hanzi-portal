/**
 * VocabLessonsSection
 * 
 * Section 4 of VocabularyEditor: Shows which lessons use this word
 */

import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Star } from "lucide-react";
import { Label } from "@/components/ui/label";

interface VocabLesson {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
  contentStatus: string;
}

interface VocabLessonsSectionProps {
  lessons: VocabLesson[];
  firstLessonId: string | null;
}

export function VocabLessonsSection({
  lessons,
  firstLessonId,
}: VocabLessonsSectionProps) {
  const navigate = useNavigate();

  if (lessons.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">This word isn't used in any lessons yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-gray-700 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Used in {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
      </Label>

      <div className="space-y-2">
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {lesson.id === firstLessonId && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
              <div>
                <div className="font-medium text-gray-900">{lesson.title}</div>
                <div className="text-xs text-gray-500">
                  HSK {lesson.hskLevel} • Lesson {lesson.lessonNumber}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  lesson.contentStatus === "live"
                    ? "bg-green-100 text-green-700"
                    : lesson.contentStatus === "staging"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {lesson.contentStatus}
              </span>
              <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
            </div>
          </button>
        ))}
      </div>

      {firstLessonId && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          First introduced in this lesson
        </p>
      )}
    </div>
  );
}

export default VocabLessonsSection;

