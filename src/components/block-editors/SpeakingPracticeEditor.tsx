/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SpeakingPracticeEditor - Edit speaking practice block properties
 */

import { FormField } from '../shared/FormField';
import { AudioUploader } from '../audio/AudioUploader';
import type { SpeakingPracticeBlock } from '@/types/lesson';
import { Label } from '@/components/ui/label';

interface SpeakingPracticeEditorProps {
  block: SpeakingPracticeBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function SpeakingPracticeEditor({ block, onChange, lessonId }: SpeakingPracticeEditorProps) {
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Instruction"
        value={block.content.instruction || 'Repeat this sentence'}
        onChange={(value) => updateContent('instruction', value)}
        placeholder="Repeat this sentence"
      />
      <FormField
        label="Target Text (Chinese)"
        required
        value={block.content.target_text || ''}
        onChange={(value) => updateContent('target_text', value)}
        placeholder="你好"
      />
      <FormField
        label="Target Pinyin"
        required
        value={block.content.target_pinyin || ''}
        onChange={(value) => updateContent('target_pinyin', value)}
        placeholder="Nǐ hǎo"
      />
      <FormField
        label="Target English"
        required
        value={block.content.target_english || ''}
        onChange={(value) => updateContent('target_english', value)}
        placeholder="Hello"
      />

      {/* AUDIO UPLOADER */}
      {lessonId && (
        <AudioUploader
          audioUrl={block.content.reference_audio_url}
          lessonId={lessonId}
          context={`speaking_${block.id}`}
          onChange={(url) => updateContent('reference_audio_url', url || '')}
          label="Reference Audio"
          helperText="Model pronunciation (MP3, max 5MB)"
        />
      )}

      <FormField
        label="Hint"
        value={block.content.hint || ''}
        onChange={(value) => updateContent('hint', value)}
        placeholder="Optional hint..."
      />
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="mandatory-check"
          checked={block.content.is_mandatory || false}
          onChange={(e) => updateContent('is_mandatory', e.target.checked)}
          className="rounded border-input"
        />
        <Label htmlFor="mandatory-check" className="text-sm font-normal cursor-pointer">
          This exercise is mandatory (user must pass to continue)
        </Label>
      </div>
    </div>
  );
}
