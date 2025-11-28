/**
 * LessonGroupCard Component
 * Collapsible card showing a lesson group with its lessons
 * Supports drag-drop for reordering (future)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, ChevronRight, Edit, Trash2, Plus,
  Clock, Star, GripVertical, MoreVertical
} from 'lucide-react';
import type { Unit } from '@/types/unit';
import type { Lesson } from '@/types/lesson';
import { LESSON_TYPE_CONFIG } from '@/types/lesson';
import { cn } from '@/lib/utils';

interface LessonGroupCardProps {
  group: Unit;
  lessons: Lesson[];
  defaultExpanded?: boolean;
  onEdit: (group: Unit) => void;
  onDelete: (groupId: string) => void;
  onRemoveLesson: (lessonId: string) => void;
}

export function LessonGroupCard({
  group,
  lessons,
  defaultExpanded = false,
  onEdit,
  onDelete,
  onRemoveLesson,
}: LessonGroupCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const publishedCount = lessons.filter(l => l.isPublished).length;
  const totalMinutes = lessons.reduce((sum, l) => sum + (l.estimatedMinutes || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header with gradient */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="cursor-pointer relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${group.gradientStart || '#EEF2FF'} 0%, ${group.gradientEnd || '#C7D2FE'} 100%)`,
        }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                className="p-1 hover:bg-white/30 rounded transition-colors"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              >
                {expanded ? (
                  <ChevronDown size={20} style={{ color: group.accentColor || '#4F46E5' }} />
                ) : (
                  <ChevronRight size={20} style={{ color: group.accentColor || '#4F46E5' }} />
                )}
              </button>
              
              <div>
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-bold bg-white/60"
                    style={{ color: group.accentColor || '#4F46E5' }}
                  >
                    GROUP {group.unitNumber}
                  </span>
                  <span className="text-xs font-medium text-gray-600 bg-white/40 px-2 py-0.5 rounded">
                    HSK {group.hskLevel}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{group.title}</h3>
                {group.description && (
                  <p className="text-sm text-gray-700 mt-0.5 line-clamp-1">{group.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm mr-2">
                <span className="flex items-center gap-1 text-gray-700">
                  <Star size={14} className="text-amber-500" />
                  {publishedCount}/{lessons.length}
                </span>
                <span className="flex items-center gap-1 text-gray-600">
                  <Clock size={14} />
                  {totalMinutes}m
                </span>
              </div>

              {/* Actions menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                  className="p-2 hover:bg-white/40 rounded-lg transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-600" />
                </button>
                
                {showMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                    />
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(group); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit size={14} />
                        Edit Group
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(group.id); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete Group
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div 
          className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-10"
          style={{ borderColor: group.accentColor || '#4F46E5', borderWidth: 3 }}
        />
        <div 
          className="absolute -top-4 right-20 w-16 h-16 rounded-full opacity-10"
          style={{ backgroundColor: group.accentColor || '#4F46E5' }}
        />
      </div>

      {/* Lessons list */}
      {expanded && (
        <div className="border-t border-gray-100">
          {lessons.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-gray-500 text-sm mb-3">No lessons in this group yet</p>
              <button
                onClick={() => navigate('/lessons/new/edit')}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: `${group.accentColor}15` || '#4F46E515',
                  color: group.accentColor || '#4F46E5'
                }}
              >
                <Plus size={14} className="inline mr-1" />
                Create Lesson
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {lessons.map((lesson, index) => (
                <LessonRow 
                  key={lesson.id} 
                  lesson={lesson} 
                  index={index}
                  accentColor={group.accentColor}
                  onRemove={() => onRemoveLesson(lesson.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonRow({ 
  lesson, 
  index,
  accentColor,
  onRemove,
}: { 
  lesson: Lesson; 
  index: number;
  accentColor?: string;
  onRemove: () => void;
}) {
  const navigate = useNavigate();
  const config = LESSON_TYPE_CONFIG[lesson.lessonType];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div 
      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
    >
      {/* Drag handle (future) */}
      <div className="text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical size={16} />
      </div>

      {/* Order number */}
      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
        {index + 1}
      </span>

      {/* Type icon */}
      <span className="text-xl">{config.icon}</span>

      {/* Lesson info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">{lesson.title}</h4>
          {lesson.isPublished ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
              Live
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
              Draft
            </span>
          )}
        </div>
        {lesson.subtitle && (
          <p className="text-xs text-gray-500 truncate">{lesson.subtitle}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {lesson.estimatedMinutes || 10}m
        </span>
        <span className={cn(
          "px-2 py-0.5 rounded font-medium capitalize",
          lesson.difficulty === 'easy' && "bg-green-100 text-green-700",
          lesson.difficulty === 'medium' && "bg-yellow-100 text-yellow-700",
          lesson.difficulty === 'hard' && "bg-red-100 text-red-700",
        )}>
          {lesson.difficulty || 'medium'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          style={{ color: accentColor || '#4F46E5' }}
        >
          <Edit size={14} />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <MoreVertical size={14} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => { onRemove(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Remove from group
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LessonGroupCard;

