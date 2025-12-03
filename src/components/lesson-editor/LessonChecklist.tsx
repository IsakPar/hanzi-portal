import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, AlertCircle, Volume2, Tag, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

interface ChecklistData {
  vocabulary: {
    total: number;
    withAudio: number;
    withSecondary: number;
    complete: boolean;
  };
  blocks: {
    total: number;
    withAudio: number;
    complete: boolean;
  };
  overallComplete: boolean;
}

interface LessonChecklistProps {
  lessonId: string;
}

export function LessonChecklist({ lessonId }: LessonChecklistProps) {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChecklist = async () => {
    if (!lessonId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.get<{ checklist: ChecklistData }>(`/v1/lessons/${lessonId}/checklist`);
      setChecklist(data.checklist);
    } catch (err) {
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading checklist...</span>
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Checklist unavailable</span>
        </div>
      </div>
    );
  }

  const items = [
    {
      label: 'Vocabulary linked',
      complete: checklist.vocabulary.total > 0,
      detail: `${checklist.vocabulary.total} words`,
      icon: BookOpen,
    },
    {
      label: 'Vocab has audio',
      complete: checklist.vocabulary.total > 0 && checklist.vocabulary.withAudio === checklist.vocabulary.total,
      detail: `${checklist.vocabulary.withAudio}/${checklist.vocabulary.total}`,
      icon: Volume2,
    },
    {
      label: 'Vocab has secondary tags',
      complete: checklist.vocabulary.complete,
      detail: `${checklist.vocabulary.withSecondary}/${checklist.vocabulary.total}`,
      icon: Tag,
      actionLabel: checklist.vocabulary.total - checklist.vocabulary.withSecondary > 0 ? 'Tag in Vocab' : undefined,
      action: () => navigate(`/vocabulary?lesson_id=${lessonId}`),
    },
    {
      label: 'Blocks created',
      complete: checklist.blocks.total > 0,
      detail: `${checklist.blocks.total} blocks`,
      icon: BookOpen,
    },
    {
      label: 'Blocks have audio',
      complete: checklist.blocks.complete,
      detail: `${checklist.blocks.withAudio}/${checklist.blocks.total}`,
      icon: Volume2,
    },
  ];

  const completedCount = items.filter(i => i.complete).length;
  const totalCount = items.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        checklist.overallComplete 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-2">
          {checklist.overallComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600" />
          )}
          <span className={`font-medium ${checklist.overallComplete ? 'text-green-900' : 'text-amber-900'}`}>
            Lesson Checklist
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            {completedCount}/{totalCount}
          </span>
          <button
            onClick={loadChecklist}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completionPercent === 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-gray-100">
        {items.map((item, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.complete ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <div>
                <div className={`text-sm ${item.complete ? 'text-gray-700' : 'text-gray-500'}`}>
                  {item.label}
                </div>
                <div className="text-xs text-gray-400">{item.detail}</div>
              </div>
            </div>
            {item.actionLabel && !item.complete && (
              <Button
                size="sm"
                variant="outline"
                onClick={item.action}
                className="text-xs"
              >
                {item.actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

