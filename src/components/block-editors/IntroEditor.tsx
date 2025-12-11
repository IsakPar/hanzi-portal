/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * IntroEditor - Edit intro block properties
 */

import { FormField } from '../shared/FormField';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import type { IntroBlock } from '@/types/lesson';

interface IntroEditorProps {
  block: IntroBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function IntroEditor({ block, onChange, lessonId = '' }: IntroEditorProps) {
  // Ensure content exists
  const content = block.content || {};
  
  // Helper to update nested content
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...content,
      [field]: value
    });
  };

  const updateExample = (field: string, value: string) => {
    onChange('content', {
      ...content,
      exampleSentence: {
        ...(content.exampleSentence || {}),
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Hero Hanzi (optional)"
        value={content.heroHanzi || ''}
        onChange={(value) => updateContent('heroHanzi', value)}
        placeholder="你"
        helpText="Large character to display at top"
      />
      
      <FormField
        label="English Title"
        required
        value={content.titleEn || ''}
        onChange={(value) => updateContent('titleEn', value)}
        placeholder="Self Introduction"
      />
      
      <FormField
        label="Introduction Text"
        required
        value={content.introText || ''}
        onChange={(value) => updateContent('introText', value)}
        placeholder="Learn essential greetings..."
        multiline
        helpText={`${(content.introText || '').length}/150 characters (30-second read max)`}
      />
      
      {/* Example Sentence */}
      <div className="border rounded-md p-4 space-y-4 bg-muted/30">
        <div className="text-sm font-medium">
          Example Sentence (optional)
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hanzi</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={content.exampleSentence?.hanzi || ''}
                onChange={(e) => updateExample('hanzi', e.target.value)}
                placeholder="你好！我是学生。"
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <InlineAudioStatus
                text={content.exampleSentence?.hanzi || ''}
                audioUrl={content.exampleSentence?.audioUrl}
                lessonId={lessonId || 'draft'}
                blockId={block.id}
                optionId="example-sentence"
                onAudioSaved={(url) => updateExample('audioUrl', url)}
                disabled={!lessonId}
              />
            </div>
          </div>
          
          <FormField
            label="Pinyin"
            value={content.exampleSentence?.pinyin || ''}
            onChange={(value) => updateExample('pinyin', value)}
            placeholder="Nǐ hǎo! Wǒ shì xuéshēng."
          />
          
          <FormField
            label="Translation"
            value={content.exampleSentence?.translation || ''}
            onChange={(value) => updateExample('translation', value)}
            placeholder="Hello! I'm a student."
          />
        </div>
      </div>
      
      <FormField
        label="Primary Button Label"
        required
        value={content.primaryLabel || ''}
        onChange={(value) => updateContent('primaryLabel', value)}
        placeholder="Let's Start"
      />
    </div>
  );
}
