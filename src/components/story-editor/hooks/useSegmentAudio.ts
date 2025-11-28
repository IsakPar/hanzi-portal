/**
 * useSegmentAudio Hook
 * Handles audio generation, preview, and save workflow for a single segment
 */

import { useState, useCallback } from 'react';
import { generateSpeech, saveSpeech } from '@/services/speechAPI';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/useToast';
import type { EditableSegment } from '../types/segment';

export interface AudioGenerationResult {
  audioBase64: string;
  durationMs: number;
  charactersUsed: number;
  estimatedCost: number;
}

export interface AudioSaveResult {
  r2Key: string;
  durationMs: number;
}

export interface UseSegmentAudioReturn {
  isGenerating: boolean;
  generate: (text: string, voice: string, speed: number) => Promise<AudioGenerationResult | null>;
  save: (
    audioBase64: string,
    storyId: string,
    segmentId: string,
    durationMs?: number
  ) => Promise<AudioSaveResult | null>;
}

export function useSegmentAudio(): UseSegmentAudioReturn {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(async (
    text: string,
    voice: string,
    speed: number
  ): Promise<AudioGenerationResult | null> => {
    if (!text.trim()) return null;
    
    setIsGenerating(true);
    try {
      const result = await generateSpeech(text, voice, speed);
      return {
        audioBase64: result.audioBase64,
        durationMs: result.durationMs,
        charactersUsed: result.charactersUsed,
        estimatedCost: result.estimatedCost,
      };
    } catch (error: unknown) {
      logger.error('Failed to generate speech:', error);
      const message = error instanceof Error ? error.message : 'Could not generate audio. Please try again.';
      toast.error('Generation failed', message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const save = useCallback(async (
    audioBase64: string,
    storyId: string,
    segmentId: string,
    durationMs?: number
  ): Promise<AudioSaveResult | null> => {
    try {
      const result = await saveSpeech(audioBase64, storyId, segmentId, durationMs);
      toast.success('Audio saved!');
      return {
        r2Key: result.r2Key,
        durationMs: result.audioDurationMs || durationMs || 0,
      };
    } catch (error) {
      logger.error('Failed to save audio:', error);
      toast.error('Save failed', 'Could not save audio. Please try again.');
      return null;
    }
  }, []);

  return {
    isGenerating,
    generate,
    save,
  };
}

/**
 * Helper to update segment with audio generation result
 */
export function applyAudioPreview(
  result: AudioGenerationResult
): Partial<EditableSegment> {
  return {
    audioState: 'preview',
    previewAudioBase64: result.audioBase64,
    previewDurationMs: result.durationMs,
  };
}

/**
 * Helper to update segment with saved audio
 */
export function applyAudioSaved(
  result: AudioSaveResult
): Partial<EditableSegment> {
  return {
    audioState: 'saved',
    audioR2Key: result.r2Key,
    audioDurationMs: result.durationMs,
    previewAudioBase64: undefined,
    previewDurationMs: undefined,
  };
}

/**
 * Helper to reset segment audio state
 */
export function resetAudioState(): Partial<EditableSegment> {
  return {
    audioState: 'none',
    previewAudioBase64: undefined,
    previewDurationMs: undefined,
  };
}

