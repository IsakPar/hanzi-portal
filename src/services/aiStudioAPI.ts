/**
 * AI Studio API Service
 * 
 * Frontend API client for the AI Lesson Generation Studio.
 */

import { api } from './api';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GenerateLessonRequest {
  prompt: string;
  hskLevel: number;
  lessonNumber?: number;
  lessonType?: 'lesson' | 'speaking' | 'mini_test' | 'hsk_test';
  useContext?: boolean;
}

export interface GenerateLessonResponse {
  success: boolean;
  draftId: string;
  lesson: LessonJson;
  generation: {
    tokensUsed: number;
    durationMs: number;
    model: string;
  };
  status: DraftStatus;
}

export interface LessonJson {
  title: string;
  subtitle?: string;
  hskLevel: number;
  lessonNumber?: number;
  lessonType: string;
  blocks: unknown[];
}

export type DraftStatus = 
  | 'generating' 
  | 'validating' 
  | 'checking' 
  | 'ready' 
  | 'needs_review'
  | 'approved' 
  | 'rejected'
  | 'error';

export interface LessonDraft {
  id: string;
  title: string;
  subtitle?: string;
  hskLevel: number;
  lessonNumber?: number;
  lessonType: string;
  blocks?: unknown[];
  blocksJson?: string;
  prompt: string;
  contextUsed?: string;
  status: DraftStatus;
  validationPassed?: number;
  validationErrors?: string[];
  qualityScore?: number;
  qualityReport?: QualityReport;
  generatorModel?: string;
  generatedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedLessonId?: string;
  createdAt: string;
}

export interface QualityReport {
  score: number;
  passed: boolean;
  chineseAccuracy: {
    score: number;
    issues: ChineseIssue[];
  };
  pedagogyQuality: {
    score: number;
    feedback: string[];
  };
  suggestions: string[];
}

export interface ChineseIssue {
  text: string;
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning';
}

export interface CurriculumContext {
  lessons: LessonContext[];
  vocabulary: VocabContext[];
  patterns: PatternContext[];
  summary: string;
}

export interface LessonContext {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
  summary: string;
}

export interface VocabContext {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  hskLevel: number;
}

export interface PatternContext {
  name: string;
  template: string;
  examples: string[];
}

export interface StudioStats {
  totalDrafts: number;
  byStatus: Record<string, number>;
  avgQualityScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a new lesson
 */
export async function generateLesson(
  request: GenerateLessonRequest
): Promise<GenerateLessonResponse> {
  return api.post<GenerateLessonResponse>('/v1/ai-studio/generate/lesson', request);
}

/**
 * Get all drafts
 */
export async function getDrafts(): Promise<{ drafts: LessonDraft[] }> {
  return api.get<{ drafts: LessonDraft[] }>('/v1/ai-studio/drafts');
}

/**
 * Get a single draft with full content
 */
export async function getDraft(id: string): Promise<{ draft: LessonDraft }> {
  return api.get<{ draft: LessonDraft }>(`/v1/ai-studio/drafts/${id}`);
}

/**
 * Approve a draft (creates actual lesson)
 */
export async function approveDraft(
  id: string, 
  reviewNotes?: string
): Promise<{ success: boolean; lessonId: string }> {
  return api.post<{ success: boolean; lessonId: string }>(
    `/v1/ai-studio/drafts/${id}/approve`,
    { reviewNotes }
  );
}

/**
 * Reject a draft
 */
export async function rejectDraft(
  id: string, 
  reviewNotes?: string
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(
    `/v1/ai-studio/drafts/${id}/reject`,
    { reviewNotes }
  );
}

/**
 * Regenerate a draft
 */
export async function regenerateDraft(
  id: string
): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(
    `/v1/ai-studio/drafts/${id}/regenerate`,
    {}
  );
}

/**
 * Get curriculum context for a prompt
 */
export async function getContext(
  prompt: string,
  hskLevel: number
): Promise<{ context: CurriculumContext }> {
  const params = new URLSearchParams({ prompt, hskLevel: String(hskLevel) });
  return api.get<{ context: CurriculumContext }>(`/v1/ai-studio/context?${params}`);
}

/**
 * Sync curriculum to Vectorize
 */
export async function syncCurriculum(): Promise<{ 
  success: boolean; 
  indexed: { lessonsIndexed: number; vocabIndexed: number; patternsIndexed: number };
}> {
  return api.post('/v1/ai-studio/sync-curriculum', {});
}

/**
 * Get studio statistics
 */
export async function getStats(): Promise<StudioStats> {
  return api.get<StudioStats>('/v1/ai-studio/stats');
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCE LESSON
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhanceLessonRequest {
  lessonId?: string;
  lessonJson?: Record<string, unknown>;
  instructions: string;
  useVocabDb?: boolean;
  hskLevel?: number;
}

export interface EnhanceLessonResponse {
  success: boolean;
  original: Record<string, unknown>;
  enhanced: Record<string, unknown>;
  instructions: string;
  generation: {
    tokensUsed: number;
    durationMs: number;
    model: string;
  };
}

/**
 * Enhance an existing lesson with AI
 */
export async function enhanceLesson(
  request: EnhanceLessonRequest
): Promise<EnhanceLessonResponse> {
  return api.post<EnhanceLessonResponse>('/v1/ai-studio/enhance', request);
}

export interface VocabularyItem {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category?: string;
}

/**
 * Get vocabulary for a specific HSK level
 */
export async function getVocabulary(level: number): Promise<{
  vocabulary: VocabularyItem[];
  total: number;
  level: number;
}> {
  return api.get(`/v1/ai-studio/vocabulary?level=${level}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get status badge color
 */
export function getStatusColor(status: DraftStatus): string {
  switch (status) {
    case 'generating':
    case 'validating':
    case 'checking':
      return 'yellow';
    case 'ready':
      return 'green';
    case 'needs_review':
      return 'orange';
    case 'approved':
      return 'blue';
    case 'rejected':
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get status display text
 */
export function getStatusText(status: DraftStatus): string {
  switch (status) {
    case 'generating':
      return 'Generating...';
    case 'validating':
      return 'Validating...';
    case 'checking':
      return 'Quality Check...';
    case 'ready':
      return 'Ready for Review';
    case 'needs_review':
      return 'Needs Attention';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

