/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ExplainEditor - Edit explain block properties
 */

import { FormField } from '../shared/FormField';
import type { ExplainBlock } from '@/types/lesson';

interface ExplainEditorProps {
  block: ExplainBlock;
  onChange: (field: string, value: any) => void;
}

export function ExplainEditor({ block, onChange }: ExplainEditorProps) {
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
        label="Title"
        value={block.content.title || ''}
        onChange={(value) => updateContent('title', value)}
        placeholder="e.g., Grammar Point"
      />
      <FormField
        label="Content (Markdown)"
        required
        value={block.content.markdown || ''}
        onChange={(value) => updateContent('markdown', value)}
        placeholder="Explanation text..."
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
