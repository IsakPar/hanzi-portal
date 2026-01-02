/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HeroHanziEditor - Edit hero hanzi block properties
 * 
 * Audio is saved to VOCABULARY (not lesson blocks) to ensure
 * vocabulary is the single source of truth for word audio.
 */

import { FormField } from '../shared/FormField';
import { VocabAudioUploader } from '../audio/VocabAudioUploader';
import type { HeroHanziBlock } from '@/types/lesson';

interface HeroHanziEditorProps {
  block: HeroHanziBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function HeroHanziEditor({ block, onChange }: HeroHanziEditorProps) {
  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Chinese Character"
        required
        value={block.content.hanzi || ''}
        onChange={(value) => updateContent('hanzi', value)}
        placeholder="e.g., 你好"
      />
      <FormField
        label="Pinyin"
        required
        value={block.content.pinyin || ''}
        onChange={(value) => updateContent('pinyin', value)}
        placeholder="e.g., nǐ hǎo"
      />
      <FormField
        label="English Translation"
        required
        value={block.content.translation || ''}
        onChange={(value) => updateContent('translation', value)}
        placeholder="e.g., Hello"
      />
      
      {/* AUDIO - Saves to VOCABULARY (single source of truth) */}
      {block.content.hanzi && (
        <VocabAudioUploader
          hanzi={block.content.hanzi}
          label="Word Audio"
        />
      )}
    </div>
  );
}
