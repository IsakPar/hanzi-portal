/**
 * Practice Generator API
 * Calls AI (OpenRouter) to generate practice blocks for stories
 */

import { api } from './api';
import type { ContentBlock } from '@/types/lesson';

export type GeneratableBlockType = 
  | 'exercise_multiple_choice'
  | 'exercise_drag_sentence'
  | 'exercise_spot_error'
  | 'exercise_build_sentence'
  | 'reading_comprehension';

// ═══════════════════════════════════════════════════════════
// ALLOWED MODELS - ONLY THESE TWO, NO EXCEPTIONS
// ═══════════════════════════════════════════════════════════

export const OPENROUTER_MODELS = {
  // Single model for all tasks - Qwen 2.5 Coder 32B (different prompts)
  QWEN_CODER_32B: 'qwen/qwen-2.5-coder-32b-instruct',
} as const;

// Type-safe: only these two strings allowed
export type AIModel = typeof OPENROUTER_MODELS[keyof typeof OPENROUTER_MODELS];

// Helper: get generation model
export const getGenerationModel = (): AIModel => OPENROUTER_MODELS.QWEN_CODER_32B;

export interface GeneratePracticeParams {
  blockTypes: GeneratableBlockType[];
  model?: AIModel;
  count?: number;
}

export interface UsageInfo {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  actualCost: number;
  storiesPerDollar: number;
  latencyMs: number;
}

export interface GeneratePracticeResult {
  success: boolean;
  blocks: ContentBlock[];
  usage: UsageInfo;
}

/**
 * Generate practice blocks for a story using AI
 */
export async function generatePractice(
  storyId: string,
  params: GeneratePracticeParams
): Promise<GeneratePracticeResult> {
  return api.post<GeneratePracticeResult>(
    `/v1/stories/${storyId}/generate-practice`,
    {
      blockTypes: params.blockTypes,
      model: params.model || OPENROUTER_MODELS.QWEN_CODER_32B,
      count: params.count || 4,
    }
  );
}

/**
 * Format cost for display with stories-per-dollar metric
 */
export function formatCostDisplay(usage: UsageInfo): string {
  const costStr = usage.actualCost < 0.0001 
    ? '<$0.0001' 
    : `$${usage.actualCost.toFixed(4)}`;
  return `${costStr} (~${usage.storiesPerDollar.toLocaleString()} stories/$1)`;
}

/**
 * Get model display info
 */
export const MODEL_INFO: Record<string, { name: string; speed: string; quality: string; cost: string }> = {
  [OPENROUTER_MODELS.QWEN_CODER_32B]: {
    name: 'Qwen 2.5 Coder 32B',
    speed: '⚡ Fast',
    quality: 'JSON generation & validation',
    cost: '~$0.07-0.16/M tokens',
  },
};
