/**
 * Azure TTS API Service
 * 
 * Calls the HanziMaster TTS microservice (Azure-based) for word and sentence audio.
 * Much better quality for Chinese than ElevenLabs, especially for single characters.
 */

// TTS Microservice URL
const TTS_SERVICE_URL = 'https://hanzi-tts-46ze0.sevalla.app';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface AzureVoice {
  id: string;
  key: string;
  name: string;
  gender: 'male' | 'female';
  description: string;
  language: string;
}

export interface SynthesizeRequest {
  text: string;
  voice?: string;
  pinyin?: string;
}

export interface SynthesizeResponse {
  audioBase64: string;
  format: string;
  charactersUsed: number;
  voice: string;
  latencyMs: number;
  usedPhoneme: boolean;
}

export interface HealthResponse {
  status: string;
  configured: boolean;
  provider: string;
  region: string;
  voiceCount: number;
}

// ═══════════════════════════════════════════════════════════
// AVAILABLE VOICES
// ═══════════════════════════════════════════════════════════

export const AZURE_VOICES: AzureVoice[] = [
  {
    id: 'zh-CN-XiaoxiaoNeural',
    key: 'xiaoxiao',
    name: 'Xiaoxiao',
    gender: 'female',
    description: 'Young female, natural and clear',
    language: 'zh-CN',
  },
  {
    id: 'zh-CN-XiaoyiNeural',
    key: 'xiaoyi',
    name: 'Xiaoyi',
    gender: 'female',
    description: 'Warm female voice',
    language: 'zh-CN',
  },
  {
    id: 'zh-CN-YunxiNeural',
    key: 'yunxi',
    name: 'Yunxi',
    gender: 'male',
    description: 'Young male voice',
    language: 'zh-CN',
  },
  {
    id: 'zh-CN-YunyangNeural',
    key: 'yunyang',
    name: 'Yunyang',
    gender: 'male',
    description: 'Professional male narrator',
    language: 'zh-CN',
  },
  {
    id: 'zh-CN-XiaomoNeural',
    key: 'xiaomo',
    name: 'Xiaomo',
    gender: 'female',
    description: 'Gentle female voice',
    language: 'zh-CN',
  },
];

export const DEFAULT_AZURE_VOICE = 'xiaoxiao';

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Check if Azure TTS service is healthy and configured
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${TTS_SERVICE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Get available voices from the TTS service
 */
export async function getVoices(): Promise<AzureVoice[]> {
  const response = await fetch(`${TTS_SERVICE_URL}/voices`);
  if (!response.ok) {
    throw new Error(`Failed to get voices: ${response.status}`);
  }
  return response.json();
}

/**
 * Synthesize speech from Chinese text
 * 
 * @param text - Chinese text to synthesize
 * @param voice - Voice key (default: xiaoxiao)
 * @param pinyin - Optional pinyin for pronunciation hints
 * @returns Base64 encoded MP3 audio
 */
export async function synthesize(
  text: string,
  voice: string = DEFAULT_AZURE_VOICE,
  pinyin?: string
): Promise<SynthesizeResponse> {
  const response = await fetch(`${TTS_SERVICE_URL}/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice,
      pinyin,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Synthesis failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate audio preview (just wraps synthesize for consistency with old API)
 */
export async function generatePreview(
  text: string,
  voice: string = DEFAULT_AZURE_VOICE
): Promise<{ audioBase64: string; charactersUsed: number }> {
  const result = await synthesize(text, voice);
  return {
    audioBase64: result.audioBase64,
    charactersUsed: result.charactersUsed,
  };
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Format cost estimate (Azure is much cheaper than ElevenLabs)
 * Azure Neural TTS: ~$16 per 1M characters
 */
export function estimateCost(characters: number): number {
  return (characters / 1_000_000) * 16;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(3)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}


