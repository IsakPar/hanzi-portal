/**
 * AI Prompts API Service
 * Manages prompt templates for AI generation
 */

import { api } from './api';

export type TemplateStatus = 'draft' | 'active' | 'archived';

// Pipeline step configuration
export interface PipelineStep {
  order: number;
  name: string;
  modelId: string;
  promptBody: string;
  input: {
    includeTargets: boolean;
    includeGrammar: boolean;
    includeKnownVocab: boolean;
    includePreviousOutput: boolean;
  };
  output: {
    format: 'json' | 'text';
    schema?: string;
  };
  settings: {
    temperature: number;
    maxInputTokens: number;
    maxOutputTokens: number;
  };
  onFailure: {
    fallbackModelId?: string;
    maxRetries: number;
  };
}

// Cost limits configuration
export interface CostLimits {
  maxCostPerRun: number;
  maxInputTokensPerStep: number;
  maxOutputTokensPerStep: number;
  abortOnExceed: boolean;
}

// Quality gate configuration
export interface QualityGate {
  minValidationScore: number;
  returnUnavailableBelow: number;
  requireValidation: boolean;
}

export interface PromptTemplate {
  id: string;
  slug: string;
  version: number;
  status: TemplateStatus;
  body?: string | null; // Legacy single-prompt (nullable for pipelines)
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  // Pipeline support
  steps?: PipelineStep[] | null;
  costLimits?: CostLimits | null;
  qualityGate?: QualityGate | null;
  createdBy?: string | null;
  promotedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptInput {
  slug: string;
  body: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ClonePromptInput {
  version: number;
}

export interface PromotePromptInput {
  version: number;
  reason?: string;
}

export interface RollbackPromptInput {
  reason?: string;
}

/**
 * Get all versions of a prompt template by slug
 */
export async function getPromptVersions(slug: string): Promise<PromptTemplate[]> {
  const response = await api.get<{ versions: PromptTemplate[] }>(
    `/v1/ai/prompts/${slug}/versions`
  );
  return response.versions;
}

/**
 * Create a new draft prompt template
 */
export async function createPrompt(data: CreatePromptInput): Promise<PromptTemplate> {
  const response = await api.post<{ template: PromptTemplate }>(
    '/v1/ai/prompts',
    data
  );
  return response.template;
}

/**
 * Clone an existing prompt version to create a new draft
 */
export async function clonePrompt(
  slug: string,
  data: ClonePromptInput
): Promise<PromptTemplate> {
  const response = await api.post<{ template: PromptTemplate }>(
    `/v1/ai/prompts/${slug}/clone`,
    data
  );
  return response.template;
}

/**
 * Promote a draft version to active (makes it the current production prompt)
 */
export async function promotePrompt(
  slug: string,
  data: PromotePromptInput
): Promise<void> {
  await api.post<{ success: boolean }>(
    `/v1/ai/prompts/${slug}/promote`,
    data
  );
}

/**
 * Rollback to the previous active version
 */
export async function rollbackPrompt(
  slug: string,
  data: RollbackPromptInput
): Promise<void> {
  await api.post<{ success: boolean }>(
    `/v1/ai/prompts/${slug}/rollback`,
    data
  );
}

// ========================================
// PIPELINE API
// ========================================

export interface CreatePipelineInput {
  slug: string;
  steps: PipelineStep[];
  costLimits?: CostLimits;
  qualityGate?: QualityGate;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePipelineInput {
  steps?: PipelineStep[];
  costLimits?: CostLimits;
  qualityGate?: QualityGate;
  notes?: string;
}

/**
 * Create a new pipeline-based prompt
 */
export async function createPipeline(data: CreatePipelineInput): Promise<PromptTemplate> {
  const response = await api.post<{ template: PromptTemplate }>(
    '/v1/ai/prompts/pipeline',
    data
  );
  return response.template;
}

/**
 * Update an existing pipeline draft
 */
export async function updatePipeline(
  slug: string,
  version: number,
  data: UpdatePipelineInput
): Promise<void> {
  await api.put<{ success: boolean }>(
    `/v1/ai/prompts/${slug}/versions/${version}/pipeline`,
    data
  );
}

/**
 * Get all unique prompt slugs (derived from versions list)
 * Note: Backend doesn't have a dedicated endpoint, so we'll maintain a list
 */
export const KNOWN_PROMPT_SLUGS = [
  // Story & Practice
  'story-practice-generator',
  'ai-tutor-lesson-creation',
  // Legacy prompts
  'lesson-generator-v1',
  'vocabulary-explainer',
  'dialogue-creator',
  'grammar-simplifier',
] as const;

export type KnownPromptSlug = typeof KNOWN_PROMPT_SLUGS[number];

// ========================================
// PROMPT TESTING API
// ========================================

export interface TestPromptInput {
  prompt_slug: string;
  prompt_version?: number;
  model_id?: string; // For legacy prompts only
  test_input: {
    targets: string[];
    grammar?: string[];
    known_vocabulary?: string[]; // For i+1 testing
  };
}

// Step result for pipeline execution
export interface StepResult {
  order: number;
  name: string;
  status: 'success' | 'failed' | 'skipped';
  model_used: string;
  output?: unknown;
  error?: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  latency_ms: number;
  retry_count: number;
}

export interface TestPromptResult {
  success: boolean;
  is_pipeline?: boolean;
  output?: Record<string, unknown>;
  // Pipeline-specific results
  steps?: StepResult[];
  // Legacy prompt results
  prompt_used?: {
    body: string;
    full_length: number;
  };
  debug?: {
    request_id: string;
    model_used?: string; // Legacy only
    prompt_slug: string;
    prompt_version: number;
    prompt_status: TemplateStatus;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    total_tokens?: number; // Pipeline total
    total_cost?: number; // Pipeline total
    total_latency_ms?: number; // Pipeline total
    latency_ms?: number; // Legacy
    estimated_cost?: number; // Legacy
    quality_score?: number;
    abort_reason?: string;
  };
  error?: string;
  message?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tier: 'nano' | 'mini' | 'standard' | 'premium';
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  is_active: boolean;
}

export interface ModelsResponse {
  models: AIModel[];
  active_model_id: string | null;
}

/**
 * Test a prompt template with sample data
 * Does not affect production or count against rate limits
 */
export async function testPrompt(data: TestPromptInput): Promise<TestPromptResult> {
  return api.post<TestPromptResult>('/v1/ai/test-prompt', data);
}

/**
 * Get available AI models for testing
 */
export async function getAIModels(): Promise<ModelsResponse> {
  return api.get<ModelsResponse>('/v1/ai/models');
}

// ========================================
// PIPELINE IMPORT
// ========================================

export interface PipelineImportInput {
  slug: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  steps: PipelineStep[];
  costLimits: CostLimits;
  qualityGate: QualityGate;
}

export interface PipelineImportResult {
  success: boolean;
  pipeline?: {
    id: string;
    slug: string;
    version: number;
    status: TemplateStatus;
    stepCount: number;
  };
  message?: string;
  error?: string;
  details?: string;
}

/**
 * Import a full pipeline from JSON
 * Creates as draft - use promote to activate
 */
export async function importPipeline(data: PipelineImportInput): Promise<PipelineImportResult> {
  return api.post<PipelineImportResult>('/v1/prompts/import-pipeline', data);
}

/**
 * Get blank pipeline template for copying
 */
export async function getPipelineTemplate(): Promise<PipelineImportInput> {
  return api.get<PipelineImportInput>('/v1/prompts/template');
}

