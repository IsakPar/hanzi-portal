import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, BookOpen, ChevronDown, ChevronRight, GripVertical, ArrowLeft } from "lucide-react";
import type { Unit } from "@/types/unit";
import type { Lesson } from "@/types/lesson";
import { LESSON_TYPE_CONFIG } from "@/types/lesson";
import { getUnits, getUnitLessons, deleteUnit } from "@/services/unitsAPI";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";
import { useGlobalConfirm } from "@/hooks/useConfirm";
import { SkeletonList } from "@/components/ui/skeleton";

export function UnitsList() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [hskFilter, setHskFilter] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [unitLessons, setUnitLessons] = useState<Record<string, Lesson[]>>({});
  const navigate = useNavigate();
  const confirm = useGlobalConfirm();

  useEffect(() => {
    loadUnits();
  }, [hskFilter]);

  const loadUnits = async () => {
    setLoading(true);
    try {
      const data = await getUnits(hskFilter);
      setUnits(data);
    } catch (error) {
      logger.error('Failed to load units:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = async (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
      // Load lessons if not already loaded
      if (!unitLessons[unitId]) {
        try {
          const lessons = await getUnitLessons(unitId);
          setUnitLessons(prev => ({ ...prev, [unitId]: lessons }));
        } catch (error) {
          logger.error('Failed to load unit lessons:', error);
        }
      }
    }
    setExpandedUnits(newExpanded);
  };

  const handleDelete = async (unitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Delete Unit?",
      description: "Delete this unit? Lessons will be unassigned but not deleted.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    
    if (confirmed) {
      try {
        await deleteUnit(unitId);
        loadUnits();
      } catch (error) {
        logger.error('Failed to delete unit:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/lessons")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Lessons"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              📦 Units
            </h1>
            <p className="text-gray-600 mt-1">Organize lessons into curriculum units</p>
          </div>
        </div>
        <button 
          onClick={() => navigate("/units/new")}
          className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all hover:scale-105 flex items-center gap-2"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          Create Unit
        </button>
      </div>

      {/* HSK Level Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">HSK Level:</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <button
                key={level}
                onClick={() => setHskFilter(level)}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                  hskFilter === level
                    ? "bg-indigo-600 text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {level}
                {level > 6 && <span className="text-xs block">3.0</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-900">{units.length}</div>
              <div className="text-xs text-indigo-600">Total Units</div>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">{units.filter(u => u.isPublished).length}</div>
              <div className="text-xs text-green-600">Published</div>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-900">{units.filter(u => !u.isPublished).length}</div>
              <div className="text-xs text-amber-600">Drafts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Units List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : units.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            No units for HSK {hskFilter}
          </h3>
          <p className="text-gray-500 mb-4">Create your first unit to get started</p>
          <button 
            onClick={() => navigate("/units/new")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Create First Unit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {units.map((unit) => {
            const isExpanded = expandedUnits.has(unit.id);
            const lessons = unitLessons[unit.id] || [];
            const lessonsByType = lessons.reduce((acc, lesson) => {
              if (!acc[lesson.lessonType]) acc[lesson.lessonType] = [];
              acc[lesson.lessonType].push(lesson);
              return acc;
            }, {} as Record<string, Lesson[]>);

            return (
              <div key={unit.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Unit Header */}
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  style={{
                    background: `linear-gradient(135deg, ${unit.gradientStart}, ${unit.gradientEnd})`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {isExpanded ? <ChevronDown size={24} color={unit.accentColor} /> : <ChevronRight size={24} color={unit.accentColor} />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: unit.accentColor }}
                          >
                            UNIT {unit.unitNumber}
                          </span>
                          {!unit.isPublished && (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-white/60 text-gray-700">
                              Draft
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{unit.title}</h3>
                        {unit.description && (
                          <p className="text-sm text-gray-700">{unit.description}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-600">
                          {lessons.length} lessons
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/units/${unit.id}/edit`);
                        }}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        title="Edit Unit"
                      >
                        <Edit size={18} color={unit.accentColor} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(unit.id, e)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Unit"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                      <div className="p-2 cursor-grab" title="Drag to reorder">
                        <GripVertical size={18} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Lessons List */}
                {isExpanded && (
                  <div className="p-6 bg-white border-t border-gray-200">
                    {lessons.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No lessons in this unit yet</p>
                        <button
                          onClick={() => navigate(`/units/${unit.id}/edit`)}
                          className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                        >
                          Add lessons →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.keys(lessonsByType).map((type) => {
                          const typeLessons = lessonsByType[type];
                          const config = LESSON_TYPE_CONFIG[type as keyof typeof LESSON_TYPE_CONFIG];
                          
                          return (
                            <div key={type}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{config.icon}</span>
                                <h4 className="text-sm font-semibold text-gray-700">{config.label}</h4>
                                <span className="text-xs text-gray-500">({typeLessons.length})</span>
                              </div>
                              <div className="space-y-2">
                                {typeLessons.map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    onClick={() => navigate(`/lessons/${lesson.id}/edit`)}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer"
                                  >
                                    <span className="text-sm font-bold text-gray-500">#{lesson.orderInUnit}</span>
                                    <div className="flex-1">
                                      <h5 className="text-sm font-semibold text-gray-900">{lesson.title}</h5>
                                      {lesson.subtitle && (
                                        <p className="text-xs text-gray-600">{lesson.subtitle}</p>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500">{lesson.estimatedMinutes} min</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

