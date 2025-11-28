/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DialogueEditor - Edit dialogue block with exchanges
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import { AudioUploader } from '../audio/AudioUploader';
import type { DialogueBlock } from '@/types/lesson';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DialogueEditorProps {
  block: DialogueBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function DialogueEditor({ block, onChange, lessonId }: DialogueEditorProps) {
  const [exchanges, setExchanges] = useState<any[]>(block.content.exchanges || []);

  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateExchanges = (newExchanges: any[]) => {
    setExchanges(newExchanges);
    updateContent('exchanges', newExchanges);
  };

  const addExchange = () => {
    updateExchanges([...exchanges, { speaker: '', hanzi: '', pinyin: '', translation: '', audioUrl: '' }]);
  };

  const updateExchange = (index: number, field: string, value: string) => {
    const newExchanges = [...exchanges];
    newExchanges[index] = { ...newExchanges[index], [field]: value };
    updateExchanges(newExchanges);
  };

  const removeExchange = (index: number) => {
    updateExchanges(exchanges.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Scenario"
          value={block.content.scenario || ''}
          onChange={(value) => updateContent('scenario', value)}
          placeholder="At a restaurant"
        />
        <FormField
          label="Scenario Icon"
          value={block.content.scenario_icon || '💬'}
          onChange={(value) => updateContent('scenario_icon', value)}
          placeholder="💬"
        />
      </div>

      {/* Dialogue Exchanges */}
      <div className="space-y-4">
        <Label>
          Dialogue Exchanges
        </Label>
        <div className="space-y-4">
          {exchanges.map((exchange, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg bg-card shadow-sm space-y-3"
            >
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-semibold text-muted-foreground">Line {index + 1}</span>
                <button
                  onClick={() => removeExchange(index)}
                  className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                  title="Remove line"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Speaker</Label>
                    <Input
                      value={exchange.speaker || ''}
                      onChange={(e) => updateExchange(index, 'speaker', e.target.value)}
                      placeholder="Li Ming"
                    />
                  </div>
                  <div className="col-span-3">
                     <Label className="text-xs text-muted-foreground mb-1 block">Chinese Text</Label>
                     <Input
                      value={exchange.text || exchange.hanzi || ''} // Handle both legacy 'text' and new 'hanzi' keys if needed
                      onChange={(e) => updateExchange(index, 'text', e.target.value)}
                      placeholder="你好！"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Pinyin</Label>
                    <Input
                      value={exchange.pinyin || ''}
                      onChange={(e) => updateExchange(index, 'pinyin', e.target.value)}
                      placeholder="Nǐ hǎo!"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Translation</Label>
                    <Input
                      value={exchange.translation || ''}
                      onChange={(e) => updateExchange(index, 'translation', e.target.value)}
                      placeholder="Hello!"
                    />
                  </div>
                </div>

                {/* AUDIO UPLOADER */}
                {lessonId && (
                  <AudioUploader
                    audioUrl={exchange.audioUrl}
                    lessonId={lessonId}
                    context={`dialogue_${index}`}
                    onChange={(url) => updateExchange(index, 'audioUrl', url || '')}
                    label="Audio File"
                    helperText="Per-line audio (MP3, max 5MB)"
                    mini
                  />
                )}
              </div>
            </div>
          ))}
          
          <button
            onClick={addExchange}
            className="flex items-center justify-center gap-2 w-full p-3 border border-dashed rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Exchange
          </button>
        </div>
      </div>
    </div>
  );
}
