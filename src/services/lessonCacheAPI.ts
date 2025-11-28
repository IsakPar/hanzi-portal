/**
 * Lesson Cache API Service
 * Manages pre-generated lessons for early learners (lessons 1-20)
 */

import { api } from './api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type LessonStatus = 'draft' | 'approved' | 'rejected';
export type LessonCreator = 'ai' | 'manual';

// Practice block types
export interface PracticeQuestion {
  question: string;
  questionHanzi?: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation?: string;
}

export interface PracticeBuildSentence {
  instruction: string;
  correctOrder: string[];
  wordPool: string[];
  hint?: string;
}

export interface PracticeBlocks {
  multipleChoice?: PracticeQuestion[];
  buildSentence?: PracticeBuildSentence[];
  quiz?: PracticeQuestion[];
}

export interface CachedLesson {
  id: string;
  lessonNumber: number;
  hskLevel: number;
  focusWords: string[];
  chinese: string;
  pinyin: string;
  english: string;
  practice?: PracticeBlocks;
  createdAt: string;
  updatedAt: string;
  createdBy: LessonCreator;
  reviewedBy?: string;
  reviewedAt?: string;
  status: LessonStatus;
  version: number;
}

export interface LessonCacheSummary {
  lessonNumber: number;
  hskLevel: number;
  variantCount: number;
  approvedCount: number;
  draftCount: number;
}

export interface ListResponse {
  success: boolean;
  lessons: LessonCacheSummary[];
  total: number;
  approved: number;
  pending: number;
  empty: number;
}

export interface LessonVariantsResponse {
  success: boolean;
  lessonNumber: number;
  hskLevel: number;
  variants: CachedLesson[];
  variantCount: number;
  approvedCount: number;
}

export interface CreateLessonInput {
  lessonNumber: number;
  hskLevel?: number;
  focusWords?: string[];
  chinese: string;
  pinyin: string;
  english: string;
  status?: LessonStatus;
}

export interface UpdateLessonInput {
  chinese?: string;
  pinyin?: string;
  english?: string;
  status?: LessonStatus;
}

export interface GenerateOptions {
  focusWords?: string[];
  autoApprove?: boolean;
  includePractice?: boolean;
}

export interface GeneratePracticeOptions {
  questionCount?: number;
}

export interface BulkGenerateInput {
  lessons: {
    lessonNumber: number;
    focusWords?: string[];
  }[];
  autoApprove?: boolean;
}

export interface GenerateResponse {
  success: boolean;
  lesson?: CachedLesson;
  error?: string;
  generation?: {
    attempts: number;
    cost: number;
    latencyMs: number;
  };
}

export interface BulkGenerateResponse {
  success: boolean;
  results: Array<{
    lessonNumber: number;
    success: boolean;
    error?: string;
    cost?: number;
  }>;
  totalCost: number;
  generated: number;
  failed: number;
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

export const lessonCacheAPI = {
  /**
   * List all cached lessons summary
   */
  async list(): Promise<ListResponse> {
    return api.get<ListResponse>('/v1/lesson-cache');
  },

  /**
   * Get all variants for a specific lesson
   */
  async getLesson(lessonNumber: number): Promise<LessonVariantsResponse> {
    return api.get<LessonVariantsResponse>(`/v1/lesson-cache/${lessonNumber}`);
  },

  /**
   * Create a new cached lesson
   */
  async create(input: CreateLessonInput): Promise<{ success: boolean; lesson: CachedLesson }> {
    return api.post(`/v1/lesson-cache/${input.lessonNumber}`, input);
  },

  /**
   * Update an existing cached lesson
   */
  async update(
    lessonNumber: number,
    input: UpdateLessonInput,
    focusWords?: string[]
  ): Promise<{ success: boolean; lesson: CachedLesson }> {
    const queryParams = focusWords ? `?focusWords=${focusWords.join(',')}` : '';
    return api.patch(`/v1/lesson-cache/${lessonNumber}${queryParams}`, input);
  },

  /**
   * Delete a cached lesson
   */
  async delete(
    lessonNumber: number,
    focusWords?: string[]
  ): Promise<{ success: boolean; message: string }> {
    const queryParams = focusWords ? `?focusWords=${focusWords.join(',')}` : '';
    return api.delete(`/v1/lesson-cache/${lessonNumber}${queryParams}`);
  },

  /**
   * Approve a lesson
   */
  async approve(
    lessonNumber: number,
    focusWords?: string[]
  ): Promise<{ success: boolean; lesson: CachedLesson }> {
    const queryParams = focusWords ? `?focusWords=${focusWords.join(',')}` : '';
    return api.post(`/v1/lesson-cache/${lessonNumber}/approve${queryParams}`, {});
  },

  /**
   * Reject a lesson
   */
  async reject(
    lessonNumber: number,
    focusWords?: string[]
  ): Promise<{ success: boolean; lesson: CachedLesson }> {
    const queryParams = focusWords ? `?focusWords=${focusWords.join(',')}` : '';
    return api.post(`/v1/lesson-cache/${lessonNumber}/reject${queryParams}`, {});
  },

  /**
   * Generate a lesson using AI and save to cache
   */
  async generate(
    lessonNumber: number,
    options?: GenerateOptions
  ): Promise<GenerateResponse> {
    return api.post(`/v1/lesson-cache/${lessonNumber}/generate`, options || {});
  },

  /**
   * Bulk generate multiple lessons
   */
  async bulkGenerate(input: BulkGenerateInput): Promise<BulkGenerateResponse> {
    return api.post('/v1/lesson-cache/bulk-generate', input);
  },

  /**
   * Generate practice for an existing lesson
   */
  async generatePractice(
    lessonNumber: number,
    options?: GeneratePracticeOptions,
    focusWords?: string[]
  ): Promise<{ success: boolean; lesson: CachedLesson; generation: { cost: number; questionCount: number } }> {
    const queryParams = focusWords ? `?focusWords=${focusWords.join(',')}` : '';
    return api.post(`/v1/lesson-cache/${lessonNumber}/generate-practice${queryParams}`, options || { questionCount: 3 });
  },
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

export const MIN_LESSON_FOR_AI = 20;
export const MAX_CACHED_LESSON = 20;

export function getLessonHSK(lessonNumber: number): number {
  return Math.floor((lessonNumber - 1) / 10) + 1;
}

export function getLessonInHSK(lessonNumber: number): number {
  return ((lessonNumber - 1) % 10) + 1;
}

export function getStatusColor(status: LessonStatus): string {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-100';
    case 'draft':
      return 'text-yellow-600 bg-yellow-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusEmoji(summary: LessonCacheSummary): string {
  if (summary.approvedCount > 0) return '✅';
  if (summary.draftCount > 0) return '⚠️';
  return '❌';
}

