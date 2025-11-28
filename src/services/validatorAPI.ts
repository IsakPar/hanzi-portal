/**
 * Validator API Service
 * Frontend service for interacting with vocab-validator via backend proxy
 * 
 * 65 LOC
 */

import api from './api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ValidatorHealth {
  status: 'healthy' | 'unreachable';
  curriculum_loaded: boolean;
  word_count: number;
  version: string;
  environment: string;
  error?: string;
}

export interface ValidatorVersion {
  version: string;
  word_count: number;
  loaded: boolean;
}

export interface SyncResult {
  success: boolean;
  version: string;
  word_count: number;
  lesson_count: number;
  changed: boolean;
  error?: string;
}

export interface ValidationRequest {
  text: string;
  user_position: {
    hsk: number;
    lesson: number;
  };
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
    safe_count: number;
    target_count: number;
    forbidden_count: number;
    unknown_count: number;
    safe_percentage: number;
  };
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

export async function getValidatorHealth(): Promise<ValidatorHealth> {
  return api.get<ValidatorHealth>('/v1/validator/health');
}

export async function getValidatorVersion(): Promise<ValidatorVersion> {
  return api.get<ValidatorVersion>('/v1/validator/version');
}

export async function triggerSync(): Promise<SyncResult> {
  return api.post<SyncResult>('/v1/validator/sync', {});
}

export async function testValidation(request: ValidationRequest): Promise<ValidationResult> {
  return api.post<ValidationResult>('/v1/validator/test', request);
}

