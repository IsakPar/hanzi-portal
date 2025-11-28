/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SpeechPracticeV2Editor - Advanced speech practice block with tone scoring
 * 
 * Features:
 * - One-click audio generation via ElevenLabs
 * - Waveform timestamp editor for marking word boundaries
 * - Automatic sandhi detection
 * - Per-segment tone configuration
 */

import { useState, useRef } from 'react';
import { FormField } from '../shared/FormField';
import { WaveformTimestampEditor } from '../speech/WaveformTimestampEditor';
import { applySandhiRules } from '../speech/SandhiDetector';
import { generateLessonBlockAudio } from '@/services/speechAPI';
import type { SpeechPracticeV2Block, SpeechSegment } from '@/types/lesson';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Wand2, Info, Volume2, Loader2, Play, Pause, 
  CheckCircle2, RotateCcw, Trash2 
} from 'lucide-react';
import { toast } from '@/hooks/useToast';

// Voice options for ElevenLabs
const VOICES = [
  { id: 'chinese-female-1', name: 'Mei Lin (Female)' },
  { id: 'chinese-female-2', name: 'Xiao Mei (Female)' },
  { id: 'chinese-male-1', name: 'Wei Chen (Male)' },
  { id: 'chinese-male-2', name: 'Zhang Wei (Male)' },
];

interface SpeechPracticeV2EditorProps {
  block: SpeechPracticeV2Block;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

export function SpeechPracticeV2Editor({ block, onChange, lessonId }: SpeechPracticeV2EditorProps) {
  const [showTimestampEditor, setShowTimestampEditor] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('chinese-female-1');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
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

  const handleGenerateAudio = async () => {
    if (!block.content.text?.trim()) {
      toast.error('Missing text', 'Enter Chinese text first');
      return;
    }

    try {
      setGenerating(true);
      
      // Use lessonId or 'draft' for unsaved lessons
      const effectiveLessonId = lessonId || 'draft';
      
      const result = await generateLessonBlockAudio(
        block.content.text,
        effectiveLessonId,
        block.id,
        selectedVoice,
        0.8 // Default speed
      );
      
      updateContent('audioUrl', result.audioUrl);
      updateContent('audioDurationMs', result.durationMs);
      
      toast.success(
        'Audio generated!', 
        `${result.charactersUsed} chars • $${result.estimatedCost.toFixed(3)}`
      );
    } catch (err: any) {
      toast.error('Generation failed', err.message || 'Please try again');
    } finally {
      setGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDeleteAudio = () => {
    updateContent('audioUrl', '');
    updateContent('audioDurationMs', 0);
    setIsPlaying(false);
  };

  const hasAudio = !!block.content.audioUrl;
  const hasSegments = (block.content.segments?.length || 0) > 0;
  const hasText = !!block.content.text?.trim();

  return (
    <div className="space-y-6">
      {/* Hidden audio element for playback */}
      {hasAudio && (
        <audio 
          ref={audioRef} 
          src={block.content.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

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
        
        {/* Chinese Text with Generate Button */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground/90">
            Chinese Text <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <input
              type="text"
              value={block.content.text || ''}
              onChange={(e) => updateContent('text', e.target.value)}
              placeholder="你好"
              className="flex-1 px-3 py-2 text-lg border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={handleGenerateAudio}
              disabled={generating || !hasText}
              variant="outline"
              className="shrink-0 border-primary/50 text-primary hover:bg-primary/10"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span className="ml-2">{generating ? 'Generating...' : 'Generate'}</span>
            </Button>
          </div>
          
          {/* Voice selector (compact) */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Voice:</span>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="text-xs px-2 py-0.5 border rounded bg-background"
            >
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
        
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

      {/* Audio Status Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          🎵 Reference Audio
        </h4>
        
        {hasAudio ? (
          <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-green-700">Audio ready</div>
              <div className="text-xs text-green-600/80">
                {block.content.audioDurationMs 
                  ? `${(block.content.audioDurationMs / 1000).toFixed(1)}s` 
                  : 'Duration unknown'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePlayPause}
                className="text-green-700 hover:bg-green-100"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGenerateAudio}
                disabled={generating}
                className="text-green-700 hover:bg-green-100"
                title="Regenerate audio"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteAudio}
                className="text-destructive hover:bg-destructive/10"
                title="Remove audio"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Enter Chinese text above and click "Generate" to create audio via ElevenLabs.</span>
          </div>
        )}
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
