/**
 * Lesson Audio API Service
 * Handles ElevenLabs audio generation for lesson blocks
 * 
 * Flow:
 * 1. previewLessonAudio() - Generate audio, returns base64 for preview
 * 2. saveLessonAudio() - Save approved base64 to R2 + extract MFCC features
 */

import { api } from './api';
import { extractMFCCFromBase64, type MFCCResult } from './mfccExtractor';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  description: string;
}

export interface PreviewAudioResult {
  success: boolean;
  audioBase64: string;
  durationMs: number;
  charactersUsed: number;
  estimatedCost: number;
}

export interface SaveAudioResult {
  success: boolean;
  r2Key: string;
  audioUrl: string;
  audioDurationMs?: number;
  mfccUrl?: string;
  mfccExtracted?: boolean;
}

// ═══════════════════════════════════════════════════════════
// VOICE OPTIONS
// ═══════════════════════════════════════════════════════════

export const VOICES: Voice[] = [
  { id: 'chinese-female-1', name: 'Mei Lin (Female)', gender: 'female', description: 'Clear, natural' },
  { id: 'chinese-female-2', name: 'Xiao Mei (Female)', gender: 'female', description: 'Younger, friendly' },
  { id: 'chinese-male-1', name: 'Wei Chen (Male)', gender: 'male', description: 'Clear, natural' },
  { id: 'chinese-male-2', name: 'Zhang Wei (Male)', gender: 'male', description: 'Deeper voice' },
];

export const DEFAULT_VOICE = 'chinese-female-1';
export const DEFAULT_SPEED = 0.7;

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get available voices from backend
 */
export async function getVoices(): Promise<{ voices: Voice[] }> {
  return api.get<{ voices: Voice[] }>('/v1/speech/voices');
}

/**
 * Preview audio for lesson block (generates, does NOT save)
 * Returns base64 for client-side playback and approval
 */
export async function previewLessonAudio(
  text: string,
  voice: string = DEFAULT_VOICE
): Promise<PreviewAudioResult> {
  return api.post<PreviewAudioResult>('/v1/speech/preview-for-lesson', {
    text,
    voice,
  });
}

/**
 * Save approved audio to R2 with MFCC feature extraction
 * Called after user approves preview
 * 
 * Flow:
 * 1. Extract MFCC features from audio (client-side)
 * 2. Send audio + MFCC to backend
 * 3. Backend saves both to R2
 */
export async function saveLessonAudio(
  audioBase64: string,
  lessonId: string,
  blockId: string,
  durationMs?: number,
  skipMfcc: boolean = false
): Promise<SaveAudioResult> {
  // Extract MFCC features from the audio (client-side)
  // Use timeout to prevent hanging
  let mfccData: MFCCResult | null = null;
  
  if (!skipMfcc) {
    try {
      console.log('[LessonAudio] Extracting MFCC features...');
      
      // Wrap extraction with 5s timeout (should be < 1s normally)
      const extractPromise = extractMFCCFromBase64(audioBase64);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('MFCC extraction timeout (5s)')), 5000);
      });
      
      mfccData = await Promise.race([extractPromise, timeoutPromise]);
      console.log('[LessonAudio] MFCC extraction complete:', {
        frames: mfccData.numFrames,
        coeffs: mfccData.numCoeffs,
        durationMs: mfccData.durationMs,
      });
    } catch (error) {
      console.error('[LessonAudio] MFCC extraction failed:', error);
      // Continue without MFCC - audio will still be saved
    }
  } else {
    console.log('[LessonAudio] Skipping MFCC extraction (user requested)');
  }
  
  console.log('[LessonAudio] Saving to R2...', mfccData ? 'with MFCC' : 'without MFCC');
  
  // Send to backend with MFCC data
  return api.post<SaveAudioResult>('/v1/speech/save-for-lesson', {
    audioBase64,
    lessonId,
    blockId,
    durationMs,
    mfccData: mfccData ? {
      coefficients: mfccData.coefficients,
      sampleRate: mfccData.sampleRate,
      hopMs: mfccData.hopMs,
      numCoeffs: mfccData.numCoeffs,
      durationMs: mfccData.durationMs,
      numFrames: mfccData.numFrames,
    } : undefined,
  });
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Create a playable audio URL from base64
 */
export function createAudioDataUrl(audioBase64: string, format = 'audio/mpeg'): string {
  return `data:${format};base64,${audioBase64}`;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `${(cost * 100).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(3)}`;
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}:${remainingSeconds.padStart(2, '0')}`;
}

