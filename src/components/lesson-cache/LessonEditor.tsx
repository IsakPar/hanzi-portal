/**
 * Lesson Editor Modal
 * Create or edit a cached lesson
 */

import { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { logger } from '@/utils/logger';
import {
  lessonCacheAPI,
  type CachedLesson,
  getLessonHSK,
} from '@/services/lessonCacheAPI';

interface LessonEditorProps {
  lessonNumber: number;
  existingLesson: CachedLesson | null;
  onClose: () => void;
  onSave: () => void;
}

export function LessonEditor({
  lessonNumber,
  existingLesson,
  onClose,
  onSave,
}: LessonEditorProps) {
  const [saving, setSaving] = useState(false);
  const [chinese, setChinese] = useState(existingLesson?.chinese || '');
  const [pinyin, setPinyin] = useState(existingLesson?.pinyin || '');
  const [english, setEnglish] = useState(existingLesson?.english || '');
  const [focusWords, setFocusWords] = useState(
    existingLesson?.focusWords.join(', ') || ''
  );
  const [status, setStatus] = useState<'draft' | 'approved'>(
    (existingLesson?.status as 'draft' | 'approved') || 'draft'
  );

  const handleSave = async () => {
    if (!chinese.trim() || !pinyin.trim() || !english.trim()) {
      toast.error('Missing fields', 'Please fill in all content fields');
      return;
    }

    setSaving(true);
    try {
      const focusWordsArray = focusWords
        .split(',')
        .map(w => w.trim())
        .filter(Boolean);

      if (existingLesson) {
        // Update existing
        await lessonCacheAPI.update(
          lessonNumber,
          { chinese, pinyin, english, status },
          existingLesson.focusWords.length > 0 ? existingLesson.focusWords : undefined
        );
        toast.success('Lesson updated');
      } else {
        // Create new
        await lessonCacheAPI.create({
          lessonNumber,
          hskLevel: getLessonHSK(lessonNumber),
          focusWords: focusWordsArray,
          chinese,
          pinyin,
          english,
          status,
        });
        toast.success('Lesson created');
      }
      onSave();
    } catch (err) {
      logger.error('Failed to save lesson:', err);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {existingLesson ? 'Edit Lesson' : 'Create Lesson'} {lessonNumber}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Focus Words */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Focus Words (comma-separated, optional)
            </label>
            <input
              type="text"
              value={focusWords}
              onChange={(e) => setFocusWords(e.target.value)}
              placeholder="你好, 谢谢"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!!existingLesson} // Can't change focus words on edit
            />
            {existingLesson && (
              <p className="text-xs text-gray-500 mt-1">
                Focus words cannot be changed after creation
              </p>
            )}
          </div>

          {/* Chinese */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chinese Text *
            </label>
            <textarea
              value={chinese}
              onChange={(e) => setChinese(e.target.value)}
              placeholder="你好！我叫小明。谢谢你！"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
            />
          </div>

          {/* Pinyin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pinyin *
            </label>
            <textarea
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              placeholder="Nǐ hǎo! Wǒ jiào Xiǎomíng. Xièxiè nǐ!"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* English */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              English Translation *
            </label>
            <textarea
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="Hello! My name is Xiaoming. Thank you!"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'approved')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="draft">Draft (needs review)</option>
              <option value="approved">Approved (ready for use)</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

