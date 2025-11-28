/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CelebrationEditor - Edit celebration block properties
 */

import { FormField } from '../shared/FormField';
import type { CelebrationBlock } from '@/types/lesson';
import { Info } from 'lucide-react';

interface CelebrationEditorProps {
  block: CelebrationBlock;
  onChange: (field: string, value: any) => void;
}

export function CelebrationEditor({ block, onChange }: CelebrationEditorProps) {
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Completion Message"
        value={block.content.message || ''}
        onChange={(value) => updateContent('message', value)}
        placeholder="Great job! You've finished the lesson."
        multiline
        helpText="Optional custom message to show on completion"
      />
      
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm">
        <Info size={20} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Automatic Results</p>
          The celebration screen will automatically display:
          <ul className="list-disc list-inside mt-1 space-y-0.5 opacity-90">
            <li>Score / Accuracy</li>
            <li>XP Gained</li>
            <li>Streak Status</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
