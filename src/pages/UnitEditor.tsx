import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Unit } from "@/types/unit";
import type { Lesson } from "@/types/lesson";
import { LESSON_TYPE_CONFIG } from "@/types/lesson";
import {
  getUnit,
  getUnitLessons,
  createUnit,
  updateUnit,
  addLessonToUnit,
  removeLessonFromUnit,
  // reorderUnitLessons,
  UNIT_COLOR_SCHEMES,
} from "@/services/unitsAPI";
import { lessonAPI } from "@/services/lessonAPI";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

export function UnitEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [unit, setUnit] = useState<Partial<Unit>>({
    hskLevel: 1,
    unitNumber: 1,
    title: "",
    description: "",
    gradientStart: "#EEF2FF",
    gradientEnd: "#C7D2FE",
    accentColor: "#4F46E5",
    isPublished: false,
  });

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, set to true only when loading existing unit
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showLessonPicker, setShowLessonPicker] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      loadUnit();
    } else if (isNew) {
      // For new units, just load available lessons
      loadAvailableLessons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadUnit = async () => {
    if (!id) return;
    try {
      const [unitData, lessonData] = await Promise.all([
        getUnit(id),
        getUnitLessons(id),
      ]);
      setUnit(unitData);
      setLessons(lessonData);
      await loadAvailableLessons(unitData.hskLevel);
    } catch (error) {
      logger.error("Failed to load unit:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableLessons = async (hskLevel?: number) => {
    try {
      const response = await lessonAPI.getAll({ hskLevel: hskLevel || unit.hskLevel });
      // lessonAPI.getAll returns { results: Lesson[] }, not { lessons: Lesson[] }
      const allLessons = (response as any).results || (response as any).lessons || [];
      // Filter out lessons already in this unit
      const available = allLessons.filter(
        (l: Lesson) => !l.unitId || l.unitId === id
      );
      setAvailableLessons(available);
    } catch (error) {
      logger.error("Failed to load lessons:", error);
      setAvailableLessons([]); // Set empty array on error
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const { id: newId } = await createUnit({
          hskLevel: unit.hskLevel!,
          unitNumber: unit.unitNumber,
          title: unit.title!,
          description: unit.description,
          gradientStart: unit.gradientStart,
          gradientEnd: unit.gradientEnd,
          accentColor: unit.accentColor,
        });
        
        // Add lessons to the new unit
        for (let i = 0; i < lessons.length; i++) {
          await addLessonToUnit(newId, lessons[i].id);
        }
        
        navigate(`/units/${newId}/edit`);
      } else if (id) {
        await updateUnit(id, {
          title: unit.title,
          description: unit.description,
          gradientStart: unit.gradientStart,
          gradientEnd: unit.gradientEnd,
          accentColor: unit.accentColor,
          isPublished: unit.isPublished,
        });
      }
      setIsDirty(false);
    } catch (error) {
      logger.error("Failed to save unit:", error);
      alert("Failed to save unit");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLesson = async (lesson: Lesson) => {
    if (!id || isNew) {
      // For new units, just add to local state
      setLessons([...lessons, lesson]);
      setIsDirty(true);
    } else {
      // For existing units, add via API
      try {
        await addLessonToUnit(id, lesson.id);
        await loadUnit();
      } catch (error) {
        logger.error("Failed to add lesson:", error);
      }
    }
    setShowLessonPicker(false);
  };

  const handleRemoveLesson = async (lessonId: string) => {
    if (!id || isNew) {
      setLessons(lessons.filter((l) => l.id !== lessonId));
      setIsDirty(true);
    } else {
      try {
        await removeLessonFromUnit(id, lessonId);
        await loadUnit();
      } catch (error) {
        logger.error("Failed to remove lesson:", error);
      }
    }
  };

  // Reorder handler (for future drag-and-drop implementation)
  // const _handleReorder = async (_fromIndex: number, _toIndex: number) => {
  //   const newLessons = [...lessons];
  //   const [moved] = newLessons.splice(_fromIndex, 1);
  //   newLessons.splice(_toIndex, 0, moved);
  //   setLessons(newLessons);

  //   if (!isNew && id) {
  //     try {
  //       await reorderUnitLessons(
  //         id,
  //         newLessons.map((l) => l.id)
  //       );
  //     } catch (error) {
  //       logger.error("Failed to reorder lessons:", error);
  //     }
  //   }
  // };

  const selectedScheme = UNIT_COLOR_SCHEMES.find(
    (s) => s.accent === unit.accentColor
  ) || UNIT_COLOR_SCHEMES[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600 mb-4" />
          <p className="text-gray-600">Loading unit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/units")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isNew ? "Create New Unit" : `Edit Unit ${unit.unitNumber}`}
              </h1>
              <p className="text-sm text-gray-600">HSK {unit.hskLevel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-sm text-orange-600 mr-2">Unsaved changes</span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !unit.title}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save size={16} className="mr-2" />
              {saving ? "Saving..." : "Save Unit"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column: Unit Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Unit Details</h2>

              <div className="space-y-4">
                {/* HSK Level */}
                <div>
                  <Label htmlFor="hskLevel">HSK Level *</Label>
                  <select
                    id="hskLevel"
                    value={unit.hskLevel}
                    onChange={(e) => {
                      setUnit({ ...unit, hskLevel: Number(e.target.value) });
                      setIsDirty(true);
                      loadAvailableLessons(Number(e.target.value));
                    }}
                    className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                      <option key={level} value={level}>
                        HSK {level} {level > 6 ? "(3.0)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={unit.title}
                    onChange={(e) => {
                      setUnit({ ...unit, title: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="e.g., Essentials & Greetings"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={unit.description}
                    onChange={(e) => {
                      setUnit({ ...unit, description: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Describe what students will learn..."
                    rows={3}
                  />
                </div>

                {/* Color Scheme */}
                <div>
                  <Label>Color Scheme</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {UNIT_COLOR_SCHEMES.map((scheme) => (
                      <button
                        key={scheme.name}
                        onClick={() => {
                          setUnit({
                            ...unit,
                            gradientStart: scheme.gradientStart,
                            gradientEnd: scheme.gradientEnd,
                            accentColor: scheme.accent,
                          });
                          setIsDirty(true);
                        }}
                        className={cn(
                          "h-12 rounded-lg border-2 transition-all",
                          scheme.accent === unit.accentColor
                            ? "border-gray-900 scale-105"
                            : "border-gray-200 hover:border-gray-400"
                        )}
                        style={{
                          background: `linear-gradient(135deg, ${scheme.gradientStart}, ${scheme.gradientEnd})`,
                        }}
                        title={scheme.name}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {selectedScheme.name}
                  </p>
                </div>

                {/* Preview */}
                <div>
                  <Label>Preview</Label>
                  <div
                    className="mt-2 p-6 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${unit.gradientStart}, ${unit.gradientEnd})`,
                    }}
                  >
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold inline-block mb-2"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.6)",
                        color: unit.accentColor,
                      }}
                    >
                      UNIT {unit.unitNumber}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {unit.title || "Unit Title"}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {unit.description || "Unit description will appear here..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Lessons */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Lessons in Unit ({lessons.length})
                </h2>
                <Button
                  onClick={() => setShowLessonPicker(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus size={16} className="mr-2" />
                  Add Lesson
                </Button>
              </div>

              {lessons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No lessons in this unit yet</p>
                  <p className="text-sm">Click "Add Lesson" to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson, index) => {
                    const config = LESSON_TYPE_CONFIG[lesson.lessonType];
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <div className="cursor-grab">
                          <GripVertical size={16} className="text-gray-400" />
                        </div>
                        <span className="text-sm font-bold text-gray-500">
                          #{index + 1}
                        </span>
                        <span className="text-xl">{config.icon}</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {lesson.title}
                          </h4>
                          {lesson.subtitle && (
                            <p className="text-xs text-gray-600">{lesson.subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {lesson.estimatedMinutes} min
                        </span>
                        <button
                          onClick={() => handleRemoveLesson(lesson.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <X size={16} className="text-red-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Picker Modal */}
      {showLessonPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Add Lessons to Unit</h3>
              <button
                onClick={() => setShowLessonPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-2">
              {availableLessons.filter((l) => !lessons.find((ul) => ul.id === l.id)).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>All lessons are already in this unit</p>
                </div>
              ) : (
                availableLessons
                  .filter((l) => !lessons.find((ul) => ul.id === l.id))
                  .map((lesson) => {
                    const config = LESSON_TYPE_CONFIG[lesson.lessonType];
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleAddLesson(lesson)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                      >
                        <span className="text-xl">{config.icon}</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {lesson.title}
                          </h4>
                          {lesson.subtitle && (
                            <p className="text-xs text-gray-600">{lesson.subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {lesson.estimatedMinutes} min
                        </span>
                      </button>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

