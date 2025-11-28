import { useState, useEffect } from "react";
import type { Lesson, LessonType } from "@/types/lesson";
import type { Unit } from "@/types/unit";
import { LESSON_TYPE_CONFIG } from "@/types/lesson";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnits } from "@/services/unitsAPI";
import { logger } from "@/utils/logger";
import { VocabularyPicker } from "./VocabularyPicker";

interface LessonMetadataEditorProps {
  lesson: Lesson;
  onChange: (updates: Partial<Lesson>) => void;
}

export function LessonMetadataEditor({ lesson, onChange }: LessonMetadataEditorProps) {
  // Tag input
  const [tagInput, setTagInput] = useState("");
  const [grammarInput, setGrammarInput] = useState("");
  
  // Units
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    loadUnits();
  }, [lesson.hskLevel]);

  const loadUnits = async () => {
    setLoadingUnits(true);
    try {
      const data = await getUnits(lesson.hskLevel);
      setUnits(data);
    } catch (error) {
      logger.error('Failed to load units:', error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTags = [...(lesson.tags || []), tagInput.trim()];
      onChange({ tags: newTags });
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    const newTags = [...(lesson.tags || [])];
    newTags.splice(index, 1);
    onChange({ tags: newTags });
  };

  const handleAddGrammarPoint = () => {
    if (grammarInput.trim()) {
      const newGrammar = [...(lesson.grammarPoints || []), grammarInput.trim()];
      onChange({ grammarPoints: newGrammar });
      setGrammarInput("");
    }
  };

  const handleRemoveGrammarPoint = (index: number) => {
    const newGrammar = [...(lesson.grammarPoints || [])];
    newGrammar.splice(index, 1);
    onChange({ grammarPoints: newGrammar });
  };

  const lessonTypeConfig = LESSON_TYPE_CONFIG[lesson.lessonType];

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={lesson.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g., Introduction to Greetings"
          />
        </div>
        <div>
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={lesson.subtitle || ""}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="e.g., 你好 • nǐ hǎo"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={lesson.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Brief description of what students will learn..."
          rows={3}
        />
      </div>

      {/* HSK, Type, Number, Difficulty */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label htmlFor="hskLevel">HSK Level *</Label>
          <select
            id="hskLevel"
            value={lesson.hskLevel}
            onChange={(e) => {
              onChange({ hskLevel: Number(e.target.value) });
              loadUnits(); // Reload units for new HSK level
            }}
            className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <option key={level} value={level}>
                HSK {level} {level > 6 ? "(3.0)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="lessonType">Type *</Label>
          <select
            id="lessonType"
            value={lesson.lessonType}
            onChange={(e) => onChange({ lessonType: e.target.value as LessonType })}
            className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            {(Object.keys(LESSON_TYPE_CONFIG) as LessonType[]).map((type) => (
              <option key={type} value={type}>
                {LESSON_TYPE_CONFIG[type].icon} {LESSON_TYPE_CONFIG[type].label.replace(/^[^\s]+\s/, "")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="lessonNumber">Lesson # *</Label>
          <Input
            id="lessonNumber"
            type="number"
            min="1"
            value={lesson.lessonNumber}
            onChange={(e) => onChange({ lessonNumber: Number(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor="difficulty">Difficulty</Label>
          <select
            id="difficulty"
            value={lesson.difficulty}
            onChange={(e) => onChange({ difficulty: e.target.value as "easy" | "medium" | "hard" })}
            className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Unit Assignment */}
      <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">📦</div>
          <div className="flex-1">
            <Label htmlFor="unitId">Assign to Unit (Optional)</Label>
            <p className="text-xs text-gray-600 mb-2">
              Organize this lesson into a curriculum unit
            </p>
            {loadingUnits ? (
              <div className="text-sm text-gray-500">Loading units...</div>
            ) : units.length === 0 ? (
              <div className="text-sm text-gray-600">
                No lesson groups available for HSK {lesson.hskLevel}.{" "}
                <a href="/lessons" className="text-indigo-600 hover:text-indigo-700 font-medium underline">
                  Create one in Lessons →
                </a>
              </div>
            ) : (
              <select
                id="unitId"
                value={lesson.unitId || ""}
                onChange={(e) => onChange({ unitId: e.target.value || null })}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">No unit (standalone lesson)</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    Unit {unit.unitNumber}: {unit.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Estimated Minutes + Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimatedMinutes">Estimated Duration (minutes)</Label>
          <Input
            id="estimatedMinutes"
            type="number"
            min="1"
            max="120"
            value={lesson.estimatedMinutes}
            onChange={(e) => onChange({ estimatedMinutes: Number(e.target.value) })}
          />
        </div>
        <div className="flex items-end">
          <div className={cn(
            "px-4 py-2 rounded-lg border-2",
            lessonTypeConfig.color === "blue" ? "border-blue-200 bg-blue-50 text-blue-700" :
            lessonTypeConfig.color === "purple" ? "border-purple-200 bg-purple-50 text-purple-700" :
            lessonTypeConfig.color === "green" ? "border-green-200 bg-green-50 text-green-700" :
            "border-red-200 bg-red-50 text-red-700"
          )}>
            <span className="text-2xl mr-2">{lessonTypeConfig.icon}</span>
            <span className="font-semibold">{lessonTypeConfig.description}</span>
          </div>
        </div>
      </div>

      {/* Grammar Points */}
      <div>
        <Label>Grammar Points</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={grammarInput}
              onChange={(e) => setGrammarInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddGrammarPoint()}
              placeholder="e.g., 是, Subject + 是 + Noun"
            />
            <button
              onClick={handleAddGrammarPoint}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Add
            </button>
          </div>
          {lesson.grammarPoints && lesson.grammarPoints.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lesson.grammarPoints.map((point, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium"
                >
                  {point}
                  <button
                    onClick={() => handleRemoveGrammarPoint(i)}
                    className="hover:bg-blue-200 rounded p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="e.g., beginner, greetings, conversation"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              Add
            </button>
          </div>
          {lesson.tags && lesson.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {lesson.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(i)}
                    className="hover:bg-purple-200 rounded p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Target Vocabulary */}
      <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">📚</div>
          <div className="flex-1">
            <Label>Target Vocabulary</Label>
            <p className="text-xs text-gray-600 mb-3">
              Words that will be taught in this lesson. This determines their position in the curriculum.
            </p>
            <VocabularyPicker
              selectedIds={lesson.targetVocabulary || []}
              hskLevel={lesson.hskLevel}
              onChange={(ids) => onChange({ targetVocabulary: ids })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

