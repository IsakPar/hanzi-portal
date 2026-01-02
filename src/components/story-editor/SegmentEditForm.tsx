/**
 * SegmentEditForm
 * Edit mode UI for segment content (Chinese, Pinyin, English)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Check, X } from 'lucide-react';
import { hanziToPinyin } from '@/services/chineseNLP';
import type { SegmentFormData } from './types/segment';

interface SegmentEditFormProps {
  initialData: SegmentFormData;
  onSave: (data: SegmentFormData) => void;
  onCancel: () => void;
}

export function SegmentEditForm({
  initialData,
  onSave,
  onCancel,
}: SegmentEditFormProps) {
  const [formData, setFormData] = useState<SegmentFormData>(initialData);

  const handleAutoSegment = () => {
    if (!formData.chinese) return;
    const autoPinyin = hanziToPinyin(formData.chinese);
    setFormData(prev => ({ ...prev, pinyin: autoPinyin }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="bg-white border-2 border-purple-300 rounded-xl p-6 shadow-md">
      <div className="space-y-4">
        {/* Chinese */}
        <div>
          <Label>Chinese Text *</Label>
          <Textarea
            value={formData.chinese}
            onChange={(e) => setFormData(prev => ({ ...prev, chinese: e.target.value }))}
            placeholder="输入中文句子"
            className="text-xl font-medium"
            rows={2}
          />
        </div>

        {/* Pinyin */}
        <div>
          <Label>Pinyin</Label>
          <div className="flex gap-2">
            <Input
              value={formData.pinyin}
              onChange={(e) => setFormData(prev => ({ ...prev, pinyin: e.target.value }))}
              placeholder="Enter pinyin or auto-generate"
            />
            <Button
              type="button"
              onClick={handleAutoSegment}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Auto
            </Button>
          </div>
        </div>

        {/* English */}
        <div>
          <Label>English Translation *</Label>
          <Textarea
            value={formData.english}
            onChange={(e) => setFormData(prev => ({ ...prev, english: e.target.value }))}
            placeholder="Enter English translation"
            rows={2}
          />
        </div>

        {/* Speaker (for dialogues) */}
        <div>
          <Label>Speaker <span className="text-gray-400 font-normal">(optional, for dialogues)</span></Label>
          <Input
            value={formData.speaker || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, speaker: e.target.value || undefined }))}
            placeholder="e.g., 妈妈, 小明, Narrator"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            size="sm"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

