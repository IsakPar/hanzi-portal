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

export interface SpeechStatus {
  configured: boolean;
  defaultVoice: string;
  voiceCount: number;
}

export interface GenerateSpeechResult {
  audioBase64: string;
  durationMs: number;
  format: string;
  charactersUsed: number;
  estimatedCost: number;
  needsTrim?: boolean; // True for single-char audio that has pinyin context
}

export interface BatchSegment {
  id: string;
  text: string;
}

export interface BatchResult {
  id: string;
  audioBase64?: string;
  durationMs?: number;
  error?: string;
}

export interface GenerateBatchResult {
  results: BatchResult[];
  totalCharacters: number;
  estimatedTotalCost: number;
  successCount: number;
  failedCount: number;
}

export interface SaveSpeechResult {
  success: boolean;
  r2Key: string;
  audioUrl: string;
  audioDurationMs?: number;
}

export interface TestResult {
  configured: boolean;
  working?: boolean;
  error?: string;
  testText?: string;
  audioBytes?: number;
  durationMs?: number;
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get available voices
 */
export async function getVoices(): Promise<{ voices: Voice[] }> {
  return api.get<{ voices: Voice[] }>('/v1/speech/voices');
}

/**
 * Check if ElevenLabs is configured
 */
export async function getSpeechStatus(): Promise<SpeechStatus> {
  return api.get<SpeechStatus>('/v1/speech/status');
}

/**
 * Generate speech from text (preview only, not saved)
 * @param text - Chinese text to speak
 * @param voice - Voice ID
 * @param speed - Playback speed
 * @param pinyin - Optional pinyin for single-character pronunciation guidance
 */
export async function generateSpeech(
  text: string,
  voice: string = 'chinese-female-1',
  speed: number = 1.0,
  pinyin?: string
): Promise<GenerateSpeechResult> {
  return api.post<GenerateSpeechResult>('/v1/speech/generate', { text, voice, speed, pinyin });
}

/**
 * Generate speech for multiple segments
 */
export async function generateSpeechBatch(
  segments: BatchSegment[],
  voice: string = 'chinese-female-1',
  speed: number = 1.0
): Promise<GenerateBatchResult> {
  return api.post<GenerateBatchResult>('/v1/speech/generate-batch', { segments, voice, speed });
}

/**
 * Save approved audio to R2
 */
export async function saveSpeech(
  audioBase64: string,
  storyId: string,
  segmentId: string,
  durationMs?: number
): Promise<SaveSpeechResult> {
  return api.post<SaveSpeechResult>('/v1/speech/save', {
    audioBase64,
    storyId,
    segmentId,
    durationMs,
  });
}

/**
 * Test ElevenLabs connection
 */
export async function testSpeech(): Promise<TestResult> {
  return api.post<TestResult>('/v1/speech/test', {});
}

// ═══════════════════════════════════════════════════════════
// LESSON AUDIO
// ═══════════════════════════════════════════════════════════

export interface GenerateLessonAudioResult {
  success: boolean;
  audioUrl: string;
  durationMs: number;
  charactersUsed: number;
  estimatedCost: number;
}

/**
 * Generate audio for a lesson block (generates + saves to R2 in one call)
 */
export async function generateLessonBlockAudio(
  text: string,
  lessonId: string,
  blockId: string,
  voice: string = 'chinese-female-1',
  speed: number = 0.8
): Promise<GenerateLessonAudioResult> {
  return api.post<GenerateLessonAudioResult>('/v1/speech/generate-for-lesson', {
    text,
    lessonId,
    blockId,
    voice,
    speed,
  });
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Create a playable audio URL from base64
 */
export function createAudioUrl(audioBase64: string, format = 'audio/mpeg'): string {
  return `data:${format};base64,${audioBase64}`;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`;
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
