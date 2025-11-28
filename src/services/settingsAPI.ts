/**
 * Settings API Service
 * Manages AI models and system configuration
 */

import { api } from './api';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  status: 'active' | 'inactive';
  isFallback: boolean;
  costPer1kTokens: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierLimits {
  tier: 'free' | 'premium' | 'pro';
  requests_per_day: number;
  tokens_per_day: number;
  max_parallel_generations: number;
  content_downloads_per_day: number;
  offline_packages_allowed: number;
  can_access_premium_content: boolean;
}

export interface CreateModelInput {
  id: string;
  name: string;
  provider: string;
  costPer1kTokens: number;
  metadata?: Record<string, unknown>;
}

/**
 * Get all AI models
 */
export async function getModels(): Promise<AIModel[]> {
  const response = await api.get<{ models: AIModel[] }>('/v1/models/models');
  return response.models;
}

/**
 * Get the currently active model
 */
export async function getActiveModel(): Promise<AIModel | null> {
  const response = await api.get<{ model: AIModel | null }>('/v1/models/models/active');
  return response.model;
}

/**
 * Create a new AI model (admin only)
 */
export async function createModel(
  data: CreateModelInput
): Promise<{ id: string; success: boolean }> {
  return api.post<{ id: string; success: boolean }>('/v1/models/models', data);
}

/**
 * Activate a model (makes it the primary model for AI generation)
 */
export async function activateModel(modelId: string): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(`/v1/models/models/${modelId}/activate`);
}

/**
 * Deactivate a model
 */
export async function deactivateModel(modelId: string): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(`/v1/models/models/${modelId}/deactivate`);
}

/**
 * Set a model as fallback (used when primary model fails)
 */
export async function setFallbackModel(modelId: string): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(`/v1/models/models/${modelId}/set-fallback`);
}

/**
 * Delete a model
 */
export async function deleteModel(modelId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/v1/models/models/${modelId}`);
}

/**
 * Common AI model presets (Together.ai)
 */
export const MODEL_PRESETS = [
  { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', provider: 'together.ai', cost: 0.80 },
  { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B', name: 'DeepSeek R1 14B', provider: 'together.ai', cost: 0.18 },
] as const;

/**
 * Tier limits defaults (used as fallback)
 */
export const DEFAULT_TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    tier: 'free',
    requests_per_day: 10,
    tokens_per_day: 5000,
    max_parallel_generations: 1,
    content_downloads_per_day: 5,
    offline_packages_allowed: 0,
    can_access_premium_content: false,
  },
  premium: {
    tier: 'premium',
    requests_per_day: 100,
    tokens_per_day: 50000,
    max_parallel_generations: 3,
    content_downloads_per_day: 50,
    offline_packages_allowed: 3,
    can_access_premium_content: true,
  },
  pro: {
    tier: 'pro',
    requests_per_day: 1000,
    tokens_per_day: 500000,
    max_parallel_generations: 10,
    content_downloads_per_day: 999999,
    offline_packages_allowed: 999999,
    can_access_premium_content: true,
  },
};

// ========================================
// TIER LIMITS API
// ========================================

export interface TierLimitsResponse {
  limits: Record<string, {
    tier: string;
    requestsPerDay: number;
    tokensPerDay: number;
    maxParallelGenerations: number;
    contentDownloadsPerDay: number;
    offlinePackagesAllowed: number;
    canAccessPremiumContent: boolean;
    updatedAt?: string;
  }>;
  source: 'database' | 'defaults';
}

export interface UpdateTierLimitsInput {
  requestsPerDay: number;
  tokensPerDay: number;
  maxParallelGenerations: number;
  contentDownloadsPerDay: number;
  offlinePackagesAllowed: number;
  canAccessPremiumContent: boolean;
}

/**
 * Get all tier limits from the backend
 */
export async function getTierLimits(): Promise<TierLimitsResponse> {
  return api.get<TierLimitsResponse>('/v1/admin/tier-limits');
}

/**
 * Update limits for a specific tier
 */
export async function updateTierLimits(
  tier: 'free' | 'premium' | 'pro',
  limits: UpdateTierLimitsInput
): Promise<{ success: boolean; tier: string; limits: UpdateTierLimitsInput }> {
  return api.put<{ success: boolean; tier: string; limits: UpdateTierLimitsInput }>(
    `/v1/admin/tier-limits/${tier}`,
    limits
  );
}

/**
 * Reset all tier limits to defaults
 */
export async function resetTierLimits(): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>('/v1/admin/tier-limits/reset');
}

