/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ReadingPassageEditor - Edit reading passage block with audio
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import { AudioUploader } from '../audio/AudioUploader';
// import { RemixPreview } from '../shared/RemixPreview'; // TODO: Migrate RemixPreview
import type { ReadingPassageBlock } from '@/types/lesson';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ReadingPassageEditorProps {
  block: ReadingPassageBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function ReadingPassageEditor({ block, onChange, lessonId }: ReadingPassageEditorProps) {
  const [paragraphs, setParagraphs] = useState(
    block.content.paragraphs || [{ hanzi: '', pinyin: '', translation: '', audioUrl: '' }]
  );
  // const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);

  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateParagraphs = (newParagraphs: any[]) => {
    setParagraphs(newParagraphs);
    updateContent('paragraphs', newParagraphs);
  };

  const updateParagraphAudio = (index: number, audioUrl: string | undefined) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index].audioUrl = audioUrl || '';
    updateParagraphs(newParagraphs);
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Instruction"
        required
        value={block.content.instruction || ''}
        onChange={(value) => updateContent('instruction', value)}
        placeholder="Read the text. Tap play to listen."
      />

      {/* Paragraphs */}
      <div className="space-y-4">
        <Label>
          Paragraphs <span className="text-destructive">*</span>
        </Label>

        <div className="space-y-4">
          {paragraphs.map((paragraph: any, index: number) => (
            <div
              key={index}
              className={cn(
                "p-4 border rounded-lg bg-card shadow-sm space-y-4 transition-all"
                // currentParagraphIndex === index && "border-primary bg-primary/5"
              )}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold flex items-center gap-2">
                  Paragraph {index + 1}
                  {/* {currentParagraphIndex === index && <span className="text-primary text-xs animate-pulse">🔊 Playing...</span>} */}
                </span>
                <button
                  onClick={() => updateParagraphs(paragraphs.filter((_, i) => i !== index))}
                  className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                  title="Remove paragraph"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Chinese Text <span className="text-destructive">*</span></Label>
                  <Textarea
                    value={paragraph.hanzi}
                    onChange={(e) => {
                      const newParagraphs = [...paragraphs];
                      newParagraphs[index].hanzi = e.target.value;
                      updateParagraphs(newParagraphs);
                    }}
                    placeholder="我今天很忙..."
                    rows={3}
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Pinyin</Label>
                  <Input
                    value={paragraph.pinyin || ''}
                    onChange={(e) => {
                      const newParagraphs = [...paragraphs];
                      newParagraphs[index].pinyin = e.target.value;
                      updateParagraphs(newParagraphs);
                    }}
                    placeholder="wǒ jīntiān hěn máng..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">English Translation <span className="text-destructive">*</span></Label>
                  <Input
                    value={paragraph.translation || ''}
                    onChange={(e) => {
                      const newParagraphs = [...paragraphs];
                      newParagraphs[index].translation = e.target.value;
                      updateParagraphs(newParagraphs);
                    }}
                    placeholder="I'm very busy today..."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Used for click-to-reveal translation overlay in the app
                  </p>
                </div>

                {/* AUDIO UPLOADER */}
                {lessonId && (
                  <AudioUploader
                    audioUrl={paragraph.audioUrl}
                    lessonId={lessonId}
                    context={`paragraph_${index}`}
                    onChange={(url) => updateParagraphAudio(index, url)}
                    label="Audio File"
                    helperText="Per-sentence audio (MP3, max 5MB)"
                    mini
                  />
                )}
              </div>
            </div>
          ))}
          
          <button
            onClick={() =>
              updateParagraphs([
                ...paragraphs,
                { hanzi: '', pinyin: '', translation: '', audioUrl: '' },
              ])
            }
            className="flex items-center justify-center gap-2 w-full p-4 border border-dashed rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Paragraph
          </button>
        </div>
      </div>

      {/* REMIX PREVIEW PLACEHOLDER */}
      {/* {paragraphs.some((p: any) => p.audioUrl) && (
        <div className="p-4 border rounded-md bg-muted text-center text-sm text-muted-foreground">
          Remix Preview Component Coming Soon
        </div>
      )} */}
    </div>
  );
}
