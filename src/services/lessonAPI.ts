/**
 * 📚 Lesson API Service
 * CRUD operations for lesson management
 * 
 * Backend Routes:
 * - GET /v1/lessons - Public, returns published lessons only
 * - GET /v1/lessons/:id - Returns lesson with blocks (published or by ID)
 * - POST /v1/admin/lessons - Create new lesson (admin auth required)
 * 
 * TODO: Backend needs these admin endpoints:
 * - GET /v1/admin/lessons - List all lessons (including unpublished)
 * - PUT /v1/admin/lessons/:id - Update lesson
 * - DELETE /v1/admin/lessons/:id - Delete lesson
 * - POST /v1/admin/lessons/:id/publish - Publish lesson
 * - POST /v1/admin/lessons/:id/unpublish - Unpublish lesson
 */

import { api } from './api';
import type { Lesson, ContentBlock } from '@/types/lesson';

export interface LessonListResponse {
  lessons: Lesson[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LessonFilters {
  hskLevel?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  isPublished?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateLessonPayload {
  title: string;
  subtitle?: string;
  hskLevel: number;
  lessonNumber?: number;
  lessonType?: 'lesson' | 'speaking' | 'mini_test' | 'hsk_test';
  difficulty?: 'easy' | 'medium' | 'hard';
  description?: string;
  estimatedMinutes?: number;
  grammarPoints?: string[];
  tags?: string[];
  targetVocabulary?: string[];
  blocks: Array<{
    type: string;
    content: Record<string, unknown>;
  }>;
}

export interface CreateLessonResponse {
  success: boolean;
  id: string;
  lessonNumber: number;
}

/**
 * Lesson API methods
 * All methods accept optional AbortSignal for request cancellation
 */
export const lessonAPI = {
  /**
   * Get all lessons (currently returns published only via public endpoint)
   * TODO: Backend needs admin endpoint for all lessons
   */
  getAll: async (filters?: LessonFilters, signal?: AbortSignal): Promise<LessonListResponse> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    // Use admin endpoint to get ALL lessons (including drafts)
    const endpoint = `/v1/admin/lessons${queryString ? `?${queryString}` : ''}`;
    
    // Backend returns { lessons: [...] } object
    const response = await api.get<{ lessons: Lesson[] }>(endpoint, signal);
    return {
      lessons: response.lessons,
      total: response.lessons.length,
      page: 1,
      pageSize: response.lessons.length,
    };
  },

  /**
   * Get single lesson by ID with blocks
   */
  getById: async (id: string, signal?: AbortSignal): Promise<Lesson> => {
    return api.get<Lesson>(`/v1/lessons/${id}`, signal);
  },

  /**
   * Create new lesson with blocks
   */
  create: async (payload: CreateLessonPayload): Promise<CreateLessonResponse> => {
    return api.post<CreateLessonResponse>('/v1/admin/lessons', payload);
  },

  /**
   * Update existing lesson
   * TODO: Backend endpoint not implemented yet
   */
  update: async (id: string, lesson: Partial<Lesson>): Promise<Lesson> => {
    // When backend is ready: return api.put<Lesson>(`/v1/admin/lessons/${id}`, lesson);
    return api.put<Lesson>(`/v1/admin/lessons/${id}`, lesson);
  },

  /**
   * Delete lesson
   * TODO: Backend endpoint not implemented yet
   */
  delete: async (id: string): Promise<void> => {
    return api.delete(`/v1/admin/lessons/${id}`);
  },

  /**
   * Publish lesson (make it available to students)
   * TODO: Backend endpoint not implemented yet
   */
  publish: async (id: string): Promise<Lesson> => {
    return api.post<Lesson>(`/v1/admin/lessons/${id}/publish`);
  },

  /**
   * Unpublish lesson (hide from students)
   * TODO: Backend endpoint not implemented yet
   */
  unpublish: async (id: string): Promise<Lesson> => {
    return api.post<Lesson>(`/v1/admin/lessons/${id}/unpublish`);
  },

  /**
   * Duplicate lesson
   * TODO: Backend endpoint not implemented yet
   */
  duplicate: async (id: string): Promise<Lesson> => {
    return api.post<Lesson>(`/v1/admin/lessons/${id}/duplicate`);
  },

  /**
   * Get lesson blocks only
   * Note: getById already returns blocks, this is for partial updates
   */
  getBlocks: async (lessonId: string): Promise<ContentBlock[]> => {
    const lesson = await api.get<Lesson>(`/v1/lessons/${lessonId}`);
    return lesson.blocks || [];
  },

  /**
   * Update lesson blocks (reorder, add, remove)
   * TODO: Backend endpoint not implemented yet
   */
  updateBlocks: async (lessonId: string, blocks: ContentBlock[]): Promise<ContentBlock[]> => {
    return api.put<ContentBlock[]>(`/v1/admin/lessons/${lessonId}/blocks`, { blocks });
  },
};

export default lessonAPI;

