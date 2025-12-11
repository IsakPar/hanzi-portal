/**
 * Vocab Validator API Service
 * Communicates with the Python vocab-validator microservice for:
 * - Chinese text segmentation
 * - Vocabulary validation
 * - Curriculum sync status
 */

// Validator service URL (Sevalla deployment)
const VALIDATOR_URL = import.meta.env.VITE_VALIDATOR_URL || 'https://hanzi-vocab-val-u53gq.sevalla.app';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface SegmentedText {
  text: string;
  words: string[];
}

export interface SegmentResponse {
  segments: SegmentedText[];
  all_words: string[];
  words_filtered: string[];  // After removing always_safe
  always_safe_removed: string[];
  curriculum_words: string[];  // Words in curriculum
  unknown_words: string[];  // Words NOT in curriculum
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unreachable';
  curriculum_loaded: boolean;
  word_count: number;
  version: string;
  environment: string;
  error?: string;
}

// Alias for backwards compatibility
export type ValidatorHealth = HealthResponse;

export interface SyncResponse {
  success: boolean;
  version: string;
  word_count: number;
  lesson_count: number;
  changed: boolean;
  error?: string;
}

export interface ValidationRequest {
  text: string;
  user_position: { hsk: number; lesson: number };
  target_words: string[];
}

export interface ValidationResult {
  valid: boolean;
  words_found: string[];
  safe_words: string[];
  target_words: string[];
  forbidden_words: string[];
  unknown_words: string[];
  stats: {
    total_words: number;
    unique_words: number;
    safe_percentage: number;
  };
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Check validator service health and sync status
 */
export async function getHealth(): Promise<HealthResponse> {
  console.log('[ValidatorAPI] Checking health at:', VALIDATOR_URL);
  
  try {
    const response = await fetch(`${VALIDATOR_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.error('[ValidatorAPI] Health check failed:', response.status);
      throw new Error(`Validator health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ValidatorAPI] Health response:', data);
    return data;
  } catch (error) {
    console.error('[ValidatorAPI] Health check error:', error);
    throw error;
  }
}

// Alias for backwards compatibility
export const getValidatorHealth = getHealth;

/**
 * Segment Chinese text into individual words
 * Used by health check to identify vocabulary in lesson content
 */
export async function segmentText(texts: string[]): Promise<SegmentResponse> {
  console.log('[ValidatorAPI] Segmenting texts:', texts.length, 'items');
  
  try {
    const response = await fetch(`${VALIDATOR_URL}/segment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
    });
    
    if (!response.ok) {
      console.error('[ValidatorAPI] Segmentation failed:', response.status);
      throw new Error(`Segmentation failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[ValidatorAPI] Segmentation result:', {
      all_words: data.all_words?.length,
      unknown_words: data.unknown_words?.length,
      curriculum_words: data.curriculum_words?.length
    });
    return data;
  } catch (error) {
    console.error('[ValidatorAPI] Segmentation error:', error);
    throw error;
  }
}

/**
 * Trigger curriculum sync via backend proxy
 * Uses authenticated backend endpoint which has the API key
 */
export async function triggerSync(): Promise<SyncResponse> {
  console.log('[ValidatorAPI] Triggering sync via backend proxy...');
  
  try {
    // Use backend proxy which has the API key configured
    const { default: api } = await import('./api');
    const result = await api.post<SyncResponse>('/v1/validator/sync', {});
    console.log('[ValidatorAPI] Sync result:', result);
    return result;
  } catch (error) {
    console.error('[ValidatorAPI] Sync failed:', error);
    throw error;
  }
}

/**
 * Test validation of Chinese text against user position
 */
export async function testValidation(request: ValidationRequest): Promise<ValidationResult> {
  const response = await fetch(`${VALIDATOR_URL}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Validation failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Extract all Chinese text from lesson blocks for segmentation
 */
export function extractChineseFromBlocks(blocks: unknown[]): string[] {
  const texts: string[] = [];
  
  const addIfChinese = (text: unknown) => {
    if (typeof text === 'string' && /[\u4e00-\u9fff]/.test(text)) {
      texts.push(text);
    }
  };
  
  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const content = b.content as Record<string, unknown> | undefined;
    
    if (!content) continue;
    
    // Extract based on block type
    switch (b.type) {
      case 'intro':
        addIfChinese(content.heroHanzi);
        if (content.exampleSentence) {
          addIfChinese((content.exampleSentence as Record<string, unknown>).hanzi);
        }
        break;
        
      case 'hero_hanzi':
        addIfChinese(content.hanzi);
        break;
        
      case 'pattern':
        if (Array.isArray(content.examples)) {
          for (const ex of content.examples) {
            addIfChinese((ex as Record<string, unknown>).hanzi);
          }
        }
        break;
        
      case 'exercise_multiple_choice':
        addIfChinese(content.questionHanzi);
        if (Array.isArray(content.options)) {
          for (const opt of content.options) {
            addIfChinese((opt as Record<string, unknown>).text);
          }
        }
        break;
        
      case 'exercise_build_sentence':
        if (Array.isArray(content.wordPool)) {
          for (const word of content.wordPool) {
            addIfChinese(word);
          }
        }
        if (Array.isArray(content.correctOrder)) {
          for (const word of content.correctOrder) {
            addIfChinese(word);
          }
        }
        break;
        
      case 'exercise_drag_sentence':
        addIfChinese(content.sentenceHanzi);
        if (Array.isArray(content.segments)) {
          for (const seg of content.segments) {
            addIfChinese((seg as Record<string, unknown>).hanzi);
          }
        }
        break;
        
      case 'dialogue':
        if (Array.isArray(content.lines)) {
          for (const line of content.lines) {
            addIfChinese((line as Record<string, unknown>).hanzi);
          }
        }
        break;
        
      case 'reading_passage':
        if (Array.isArray(content.paragraphs)) {
          for (const p of content.paragraphs) {
            addIfChinese((p as Record<string, unknown>).hanzi);
          }
        }
        break;
        
      case 'speaking_practice':
      case 'speech_practice_v2':
        addIfChinese(content.text);
        break;
        
      case 'explain':
        if (Array.isArray(content.examples)) {
          for (const ex of content.examples) {
            addIfChinese((ex as Record<string, unknown>).hanzi);
          }
        }
        break;
    }
  }
  
  // Deduplicate
  return [...new Set(texts)];
}
