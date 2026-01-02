/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SpeechPracticeV2Editor - Advanced speech practice block with MFCC extraction
 * 
 * Simplified flow:
 * 1. Enter text/pinyin/meaning
 * 2. Generate audio → MFCC auto-extracted
 * 3. Segments auto-generated from text
 * 
 * Status badges show: Audio / MFCC / Segments ready state
 */

import { useState, useEffect } from 'react';
import { FormField } from '../shared/FormField';
import { applySandhiRules } from '../speech/SandhiDetector';
import { SpeechAudioUploader } from '../audio/SpeechAudioUploader';
import type { SpeechPracticeV2Block, SpeechSegment } from '@/types/lesson';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wand2, CheckCircle2, XCircle, Circle, Volume2, Cpu, ListChecks, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeechPracticeV2EditorProps {
  block: SpeechPracticeV2Block;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface StatusBadgeProps {
  label: string;
  status: 'ready' | 'missing' | 'optional';
  icon: React.ReactNode;
  detail?: string;
}

function StatusBadge({ label, status, icon, detail }: StatusBadgeProps) {
  const styles = {
    ready: 'bg-green-50 border-green-200 text-green-700',
    missing: 'bg-red-50 border-red-200 text-red-700',
    optional: 'bg-slate-50 border-slate-200 text-slate-500',
  };
  
  const StatusIcon = status === 'ready' ? CheckCircle2 : status === 'missing' ? XCircle : Circle;
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
      styles[status]
    )}>
      <StatusIcon className="h-4 w-4" />
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      {detail && <span className="text-xs opacity-70">({detail})</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEGMENT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auto-generate segments from Chinese text and pinyin
 * No timing info - app will estimate based on audio duration
 */
function generateSegmentsFromText(text: string, pinyin: string): SpeechSegment[] {
  if (!text || !pinyin) return [];
  
  // Split Chinese characters
  const chars = text.split('');
  
  // Split pinyin by spaces (simplified - assumes space-separated)
  const pinyinParts = pinyin.trim().split(/\s+/);
  
  // Match them up
  const segments: SpeechSegment[] = chars.map((char, i) => {
    const py = pinyinParts[i] || '';
    const tone = extractToneNumber(py) as 0 | 1 | 2 | 3 | 4;
    
    return {
      word: char,
      pinyin: py,
      writtenTone: tone,
      actualTone: tone, // Will be updated by sandhi
      startMs: 0,       // App will estimate
      endMs: 0,         // App will estimate
    };
  });
  
  return segments;
}

/**
 * Extract tone number from pinyin (e.g., "nǐ" → 3)
 */
function extractToneNumber(pinyin: string): 0 | 1 | 2 | 3 | 4 {
  const toneMarks: Record<string, 1 | 2 | 3 | 4> = {
    'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
    'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
    'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
    'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
    'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
    'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4,
  };
  
  for (const char of pinyin) {
    if (toneMarks[char]) {
      return toneMarks[char];
    }
  }
  
  // Check for number suffix (e.g., "ni3")
  const match = pinyin.match(/[1-4]$/);
  if (match) {
    return parseInt(match[0]) as 1 | 2 | 3 | 4;
  }
  
  // Check for explicit neutral tone (5)
  if (pinyin.endsWith('5')) {
    return 0; // Neutral tone
  }
  
  return 0; // Default to neutral tone
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SpeechPracticeV2Editor({ block, onChange, lessonId }: SpeechPracticeV2EditorProps) {
  const [isGeneratingSegments, setIsGeneratingSegments] = useState(false);
  
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
   * Update multiple fields at once
   */
  const updateContentMultiple = (updates: Record<string, any>) => {
    onChange('content', {
      ...block.content,
      ...updates
    });
  };

  /**
   * Auto-generate segments when text/pinyin changes
   */
  const handleGenerateSegments = () => {
    setIsGeneratingSegments(true);
    
    const segments = generateSegmentsFromText(
      block.content.text || '',
      block.content.pinyin || ''
    );
    
    // Apply sandhi rules
    const withSandhi = applySandhiRules(segments);
    
    updateContent('segments', withSandhi);
    setIsGeneratingSegments(false);
  };

  /**
   * Handle audio saved from ElevenLabsGenerator
   */
  const handleAudioSaved = (audioUrl: string, audioDurationMs: number, mfccUrl?: string) => {
    updateContentMultiple({
      audioUrl,
      audioDurationMs,
      ...(mfccUrl && { mfccUrl }),
    });
    
    console.log('[SpeechPracticeV2] Audio saved:', { audioUrl, audioDurationMs, mfccUrl });
  };

  /**
   * Handle audio deleted
   */
  const handleAudioDeleted = () => {
    updateContentMultiple({
      audioUrl: '',
      audioDurationMs: 0,
      mfccUrl: '',
    });
  };

  // Auto-generate segments when text/pinyin changes (if no segments yet)
  useEffect(() => {
    const hasText = block.content.text?.trim();
    const hasPinyin = block.content.pinyin?.trim();
    const hasSegments = (block.content.segments?.length || 0) > 0;
    
    if (hasText && hasPinyin && !hasSegments) {
      handleGenerateSegments();
    }
  }, [block.content.text, block.content.pinyin]);

  // Status checks
  const hasAudio = !!block.content.audioUrl;
  const hasMfcc = !!block.content.mfccUrl;
  const hasSegments = (block.content.segments?.length || 0) > 0;
  const segmentCount = block.content.segments?.length || 0;
  const effectiveLessonId = lessonId || 'draft';

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATUS BADGES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2">
        <StatusBadge
          label="Audio"
          status={hasAudio ? 'ready' : 'missing'}
          icon={<Volume2 className="h-3.5 w-3.5" />}
          detail={hasAudio ? 'saved' : 'generate below'}
        />
        <StatusBadge
          label="MFCC"
          status={hasMfcc ? 'ready' : hasAudio ? 'missing' : 'optional'}
          icon={<Cpu className="h-3.5 w-3.5" />}
          detail={hasMfcc ? 'extracted' : hasAudio ? 're-save audio' : 'auto-extracted'}
        />
        <StatusBadge
          label="Segments"
          status={hasSegments ? 'ready' : 'optional'}
          icon={<ListChecks className="h-3.5 w-3.5" />}
          detail={hasSegments ? `${segmentCount} words` : 'auto-generated'}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTENT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* AUDIO SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          🎵 Reference Audio
          {hasMfcc && (
            <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              MFCC ready ✓
            </span>
          )}
        </h4>
        
        <SpeechAudioUploader
          text={block.content.text || ''}
          label=""
          savedAudioUrl={block.content.audioUrl}
          lessonId={effectiveLessonId}
          blockId={block.id}
          onSaved={handleAudioSaved}
          onDeleted={handleAudioDeleted}
        />
        
        {hasAudio && !hasMfcc && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-start gap-2">
            <Cpu className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>MFCC not extracted.</strong> Re-generate and save the audio to extract speech features for comparison scoring.
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEGMENTS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            📊 Word Segments
            <span className="text-xs font-normal text-muted-foreground">(for per-word scoring)</span>
          </h4>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSegments}
            disabled={!block.content.text || !block.content.pinyin || isGeneratingSegments}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isGeneratingSegments && "animate-spin")} />
            Regenerate
          </Button>
        </div>

        {hasSegments ? (
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {block.content.segments?.map((seg, i) => (
                <div 
                  key={i}
                  className="px-3 py-2 bg-white border rounded-lg text-center min-w-[60px] shadow-sm"
                >
                  <div className="text-xl font-medium">{seg.word}</div>
                  <div className="text-xs text-primary font-medium">{seg.pinyin}</div>
                  <div className="text-[10px] text-muted-foreground">
                    T{seg.actualTone}
                    {seg.writtenTone !== seg.actualTone && (
                      <span className="text-amber-600 ml-1">(sandhi)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const withSandhi = applySandhiRules(block.content.segments || []);
                updateContent('segments', withSandhi);
              }}
              className="mt-3 text-xs"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Re-apply Sandhi Rules
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 text-center">
            Enter Chinese text and pinyin above to auto-generate segments
          </div>
        )}
      </div>
    </div>
  );
}
