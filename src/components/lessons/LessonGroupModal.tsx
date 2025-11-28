/**
 * LessonGroupModal Component
 * Create or edit a lesson group (unit)
 */

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { Unit } from '@/types/unit';
import { UNIT_COLOR_SCHEMES } from '@/services/unitsAPI';

interface LessonGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: GroupFormData) => Promise<void>;
  group?: Unit | null; // If provided, we're editing
  defaultHskLevel?: number;
}

export interface GroupFormData {
  title: string;
  description: string;
  hskLevel: number;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
}

export function LessonGroupModal({
  isOpen,
  onClose,
  onSave,
  group,
  defaultHskLevel = 1,
}: LessonGroupModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<GroupFormData>({
    title: '',
    description: '',
    hskLevel: defaultHskLevel,
    gradientStart: UNIT_COLOR_SCHEMES[0].gradientStart,
    gradientEnd: UNIT_COLOR_SCHEMES[0].gradientEnd,
    accentColor: UNIT_COLOR_SCHEMES[0].accent,
  });

  // Reset form when modal opens/closes or group changes
  useEffect(() => {
    if (isOpen) {
      if (group) {
        setFormData({
          title: group.title,
          description: group.description || '',
          hskLevel: group.hskLevel,
          gradientStart: group.gradientStart || UNIT_COLOR_SCHEMES[0].gradientStart,
          gradientEnd: group.gradientEnd || UNIT_COLOR_SCHEMES[0].gradientEnd,
          accentColor: group.accentColor || UNIT_COLOR_SCHEMES[0].accent,
        });
      } else {
        setFormData({
          title: '',
          description: '',
          hskLevel: defaultHskLevel,
          gradientStart: UNIT_COLOR_SCHEMES[0].gradientStart,
          gradientEnd: UNIT_COLOR_SCHEMES[0].gradientEnd,
          accentColor: UNIT_COLOR_SCHEMES[0].accent,
        });
      }
    }
  }, [isOpen, group, defaultHskLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectColorScheme = (scheme: typeof UNIT_COLOR_SCHEMES[number]) => {
    setFormData({
      ...formData,
      gradientStart: scheme.gradientStart,
      gradientEnd: scheme.gradientEnd,
      accentColor: scheme.accent,
    });
  };

  if (!isOpen) return null;

  const isEditing = !!group;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header with preview gradient */}
        <div 
          className="rounded-t-xl px-6 py-4"
          style={{
            background: `linear-gradient(135deg, ${formData.gradientStart} 0%, ${formData.gradientEnd} 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span 
                className="px-2 py-0.5 rounded text-xs font-bold bg-white/60"
                style={{ color: formData.accentColor }}
              >
                PREVIEW
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                {formData.title || 'New Lesson Group'}
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-700" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Greetings & Introductions"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what lessons this group contains..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* HSK Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HSK Level
            </label>
            <select
              value={formData.hskLevel}
              onChange={(e) => setFormData({ ...formData, hskLevel: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <option key={level} value={level}>
                  HSK {level} {level > 6 && '(3.0)'}
                </option>
              ))}
            </select>
          </div>

          {/* Color Scheme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {UNIT_COLOR_SCHEMES.map((scheme) => {
                const isSelected = 
                  formData.gradientStart === scheme.gradientStart &&
                  formData.accentColor === scheme.accent;
                
                return (
                  <button
                    key={scheme.name}
                    type="button"
                    onClick={() => selectColorScheme(scheme)}
                    className={`relative rounded-lg p-3 transition-all ${
                      isSelected 
                        ? 'ring-2 ring-offset-2 scale-105' 
                        : 'hover:scale-105'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${scheme.gradientStart} 0%, ${scheme.gradientEnd} 100%)`,
                      // @ts-expect-error - CSS variable for ring color
                      '--tw-ring-color': scheme.accent,
                    }}
                  >
                    <div 
                      className="w-full h-1 rounded-full mb-1"
                      style={{ backgroundColor: scheme.accent }}
                    />
                    <span className="text-[10px] font-medium text-gray-700">{scheme.name}</span>
                    {isSelected && (
                      <div 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: scheme.accent }}
                      >
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title.trim()}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LessonGroupModal;

