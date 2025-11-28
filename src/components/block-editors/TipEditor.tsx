/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * TipEditor - Edit tip block properties
 */

import { FormField } from '../shared/FormField';
import type { TipBlock } from '@/types/lesson';

interface TipEditorProps {
  block: TipBlock;
  onChange: (field: string, value: any) => void;
}

export function TipEditor({ block, onChange }: TipEditorProps) {
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Tip Text"
        required
        value={block.content.markdown || ''}
        onChange={(value) => updateContent('markdown', value)}
        placeholder="💡 Remember: Use 的 (de) to show possession"
        multiline
      />
      <FormField
        label="Icon (emoji)"
        value={block.content.icon || '💡'}
        onChange={(value) => updateContent('icon', value)}
        placeholder="💡"
      />
    </div>
  );
}
