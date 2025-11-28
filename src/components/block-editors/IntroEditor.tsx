/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * IntroEditor - Edit intro block properties
 */

import { FormField } from '../shared/FormField';
import type { IntroBlock } from '@/types/lesson';

interface IntroEditorProps {
  block: IntroBlock;
  onChange: (field: string, value: any) => void;
}

export function IntroEditor({ block, onChange }: IntroEditorProps) {
  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateExample = (field: string, value: string) => {
    onChange('content', {
      ...block.content,
      exampleSentence: {
        ...block.content.exampleSentence,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Hero Hanzi (optional)"
        value={block.content.heroHanzi || ''}
        onChange={(value) => updateContent('heroHanzi', value)}
        placeholder="你"
        helpText="Large character to display at top"
      />
      
      <FormField
        label="English Title"
        required
        value={block.content.titleEn || ''}
        onChange={(value) => updateContent('titleEn', value)}
        placeholder="Self Introduction"
      />
      
      <FormField
        label="Introduction Text"
        required
        value={block.content.introText || ''}
        onChange={(value) => updateContent('introText', value)}
        placeholder="Learn essential greetings..."
        multiline
        helpText={`${(block.content.introText || '').length}/150 characters (30-second read max)`}
      />
      
      {/* Example Sentence */}
      <div className="border rounded-md p-4 space-y-4 bg-muted/30">
        <div className="text-sm font-medium">
          Example Sentence (optional)
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <FormField
            label="Hanzi"
            value={block.content.exampleSentence?.hanzi || ''}
            onChange={(value) => updateExample('hanzi', value)}
            placeholder="你好！我是学生。"
          />
          
          <FormField
            label="Pinyin"
            value={block.content.exampleSentence?.pinyin || ''}
            onChange={(value) => updateExample('pinyin', value)}
            placeholder="Nǐ hǎo! Wǒ shì xuéshēng."
          />
          
          <FormField
            label="Translation"
            value={block.content.exampleSentence?.translation || ''}
            onChange={(value) => updateExample('translation', value)}
            placeholder="Hello! I'm a student."
          />
        </div>
      </div>
      
      <FormField
        label="Primary Button Label"
        required
        value={block.content.primaryLabel || ''}
        onChange={(value) => updateContent('primaryLabel', value)}
        placeholder="Let's Start"
      />
    </div>
  );
}
