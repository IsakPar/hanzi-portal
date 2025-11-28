/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SpeechPracticeV2Editor - Advanced speech practice block with tone scoring
 * 
 * Features:
 * - Audio generation via ElevenLabs with preview/approval flow
 * - Waveform timestamp editor for marking word boundaries
 * - Automatic sandhi detection
 * - Per-segment tone configuration
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import { WaveformTimestampEditor } from '../speech/WaveformTimestampEditor';
import { applySandhiRules } from '../speech/SandhiDetector';
import { ElevenLabsGenerator } from '../audio/ElevenLabsGenerator';
import type { SpeechPracticeV2Block, SpeechSegment } from '@/types/lesson';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wand2, Info } from 'lucide-react';

interface SpeechPracticeV2EditorProps {
  block: SpeechPracticeV2Block;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function SpeechPracticeV2Editor({ block, onChange, lessonId }: SpeechPracticeV2EditorProps) {
  const [showTimestampEditor, setShowTimestampEditor] = useState(false);
  
  /**
   * Update a single field in block.content
   */
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  /**
   * Update multiple fields at once (prevents race conditions)
   */
  const updateContentMultiple = (updates: Record<string, any>) => {
    onChange('content', {
      ...block.content,
      ...updates
    });
  };

  const handleSegmentsChange = (segments: SpeechSegment[]) => {
    updateContent('segments', segments);
  };

  const handleDurationChange = (durationMs: number) => {
    updateContent('audioDurationMs', durationMs);
  };

  const handleApplySandhi = () => {
    const updatedSegments = applySandhiRules(block.content.segments || []);
    updateContent('segments', updatedSegments);
  };

  /**
   * Handle audio saved from ElevenLabsGenerator
   */
  const handleAudioSaved = (audioUrl: string, audioDurationMs: number) => {
    // Update both fields at once to prevent race condition
    updateContentMultiple({
      audioUrl,
      audioDurationMs,
    });
  };

  /**
   * Handle audio deleted
   */
  const handleAudioDeleted = () => {
    updateContentMultiple({
      audioUrl: '',
      audioDurationMs: 0,
    });
  };

  const hasAudio = !!block.content.audioUrl;
  const hasSegments = (block.content.segments?.length || 0) > 0;
  const effectiveLessonId = lessonId || 'draft';

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          📝 Content
        </h4>
        
        <FormField
          label="Instruction"
          value={block.content.instruction || 'Listen and repeat'}
          onChange={(value) => updateContent('instruction', value)}
          placeholder="Listen and repeat this phrase"
        />
        
        {/* Chinese Text */}
        <FormField
          label="Chinese Text"
          required
          value={block.content.text || ''}
          onChange={(value) => updateContent('text', value)}
          placeholder="你好"
        />
        
        <FormField
          label="Pinyin"
          required
          value={block.content.pinyin || ''}
          onChange={(value) => updateContent('pinyin', value)}
          placeholder="nǐ hǎo"
        />
        
        <FormField
          label="English Meaning"
          required
          value={block.content.meaning || ''}
          onChange={(value) => updateContent('meaning', value)}
          placeholder="Hello"
        />

        <FormField
          label="Hint (optional)"
          value={block.content.hint || ''}
          onChange={(value) => updateContent('hint', value)}
          placeholder="Pay attention to the tones..."
        />
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="mandatory-check-v2"
            checked={block.content.isMandatory || false}
            onChange={(e) => updateContent('isMandatory', e.target.checked)}
            className="rounded border-input"
          />
          <Label htmlFor="mandatory-check-v2" className="text-sm font-normal cursor-pointer">
            This exercise is mandatory (user must pass to continue)
          </Label>
        </div>
      </div>

      {/* Audio Generation Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          🎵 Reference Audio
        </h4>
        
        <ElevenLabsGenerator
          text={block.content.text || ''}
          label=""
          savedAudioUrl={block.content.audioUrl}
          lessonId={effectiveLessonId}
          blockId={block.id}
          onSaved={handleAudioSaved}
          onDeleted={handleAudioDeleted}
        />
      </div>

      {/* Timestamp Editor Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            ⏱️ Word Timestamps
            <span className="text-xs font-normal text-muted-foreground">(for tone scoring)</span>
          </h4>
          
          {hasAudio && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimestampEditor(!showTimestampEditor)}
            >
              {showTimestampEditor ? 'Hide Editor' : 'Show Editor'}
            </Button>
          )}
        </div>

        {!hasAudio && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Generate audio first to add word timestamps. Timestamps enable per-word tone scoring in the mobile app.</span>
          </div>
        )}

        {hasAudio && showTimestampEditor && (
          <div className="border rounded-lg p-4 bg-white">
            <WaveformTimestampEditor
              audioUrl={block.content.audioUrl!}
              text={block.content.text || ''}
              pinyin={block.content.pinyin || ''}
              segments={block.content.segments || []}
              onSegmentsChange={handleSegmentsChange}
              onDurationChange={handleDurationChange}
            />
          </div>
        )}

        {hasAudio && !showTimestampEditor && hasSegments && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ {block.content.segments?.length} segments configured 
            ({Math.round((block.content.audioDurationMs || 0) / 1000 * 10) / 10}s total)
          </div>
        )}

        {hasAudio && hasSegments && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplySandhi}
            className="w-full"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Re-apply Sandhi Rules
          </Button>
        )}
      </div>

      {/* Preview Section */}
      {hasSegments && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">Preview</h4>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {block.content.segments?.map((seg, i) => (
                <div 
                  key={i}
                  className="px-3 py-2 bg-white border rounded-lg text-center min-w-[60px]"
                >
                  <div className="text-xl font-medium">{seg.word}</div>
                  <div className="text-xs text-primary">{seg.pinyin}</div>
                  <div className="text-[10px] text-muted-foreground">
                    T{seg.actualTone}
                    {seg.writtenTone !== seg.actualTone && (
                      <span className="text-amber-600"> (was {seg.writtenTone})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
