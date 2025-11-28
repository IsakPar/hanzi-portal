import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import type { LessonType } from "@/types/lesson";
import { LESSON_TYPE_CONFIG } from "@/types/lesson";
import { cn } from "@/lib/utils";

interface LessonTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  hskLevel?: number;
}

export function LessonTypeModal({ isOpen, onClose, hskLevel }: LessonTypeModalProps) {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<LessonType>("lesson");
  const [selectedHsk, setSelectedHsk] = useState<number>(hskLevel || 1);

  if (!isOpen) return null;

  const handleCreate = () => {
    // Navigate to lesson editor with query params for type and HSK
    navigate(`/lessons/new/edit?type=${selectedType}&hsk=${selectedHsk}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Lesson</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* HSK Level Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select HSK Level
            </label>
            <div className="grid grid-cols-9 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedHsk(level)}
                  className={cn(
                    "px-3 py-2 rounded-lg font-semibold text-sm transition-all",
                    selectedHsk === level
                      ? "bg-purple-600 text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {level}
                  {level > 6 && <span className="text-xs block">3.0</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Lesson Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(LESSON_TYPE_CONFIG) as LessonType[]).map((type) => {
                const config = LESSON_TYPE_CONFIG[type];
                const isSelected = selectedType === type;
                
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-purple-500 bg-purple-50 shadow-lg scale-[1.02]"
                        : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{config.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {config.label.replace(/^[^\s]+\s/, '')} {/* Remove emoji from label */}
                        </h3>
                        <p className="text-sm text-gray-600">{config.description}</p>
                        
                        {/* Block Info */}
                        {config.allowedBlocks !== 'all' && (
                          <div className="mt-2 text-xs text-gray-500">
                            {config.allowedBlocks.length} block types available
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">What happens next?</h4>
                <p className="text-sm text-blue-700">
                  The lesson number will be auto-assigned based on existing lessons in <strong>HSK {selectedHsk}</strong>.
                  You can change it later in the lesson settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all hover:scale-105"
          >
            Create {LESSON_TYPE_CONFIG[selectedType].label}
          </button>
        </div>
      </div>
    </div>
  );
}

