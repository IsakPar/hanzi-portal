/**
 * Lesson Audio API Service
 * Handles ElevenLabs audio generation for lesson blocks
 * 
 * Flow:
 * 1. previewLessonAudio() - Generate audio, returns base64 for preview
 * 2. saveLessonAudio() - Save approved base64 to R2 (backend extracts MFCC via TTS service)
 */

import { api } from './api';

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
  durationMs?: number
): Promise<SaveAudioResult> {
  console.log('[LessonAudio] Saving to R2 (MFCC extracted by backend)...');
  
  // Send to backend - it will extract MFCC via TTS service
  return api.post<SaveAudioResult>('/v1/speech/save-for-lesson', {
    audioBase64,
    lessonId,
    blockId,
    durationMs,
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

