/**
 * Lesson API Tests
 * Tests for lesson CRUD operations including targetVocabulary
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lessonAPI } from '@/services/lessonAPI';

describe('Lesson API', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
    // Token provider is mocked globally in test/setup.ts via @/lib/authClient mock
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('lessonAPI.getAll', () => {
    it('should list lessons with filters', async () => {
      const mockLessons = [
        { id: '1', title: 'Lesson 1', hskLevel: 1, lessonNumber: 1 },
        { id: '2', title: 'Lesson 2', hskLevel: 1, lessonNumber: 2 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lessons: mockLessons }), // Backend returns { lessons: [...] }
      });

      const result = await lessonAPI.getAll({ hskLevel: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/admin/lessons'),
        expect.any(Object)
      );
      expect(result.lessons).toHaveLength(2);
    });

    it('should filter by HSK level', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lessons: [] }), // Backend returns { lessons: [...] }
      });

      await lessonAPI.getAll({ hskLevel: 3 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('hskLevel=3'),
        expect.any(Object)
      );
    });
  });

  describe('lessonAPI.getById', () => {
    it('should fetch lesson with blocks', async () => {
      const mockLesson = {
        id: 'lesson-123',
        title: 'Introduction',
        hskLevel: 1,
        lessonNumber: 1,
        targetVocabulary: ['vocab-1', 'vocab-2'],
        blocks: [
          { id: 'block-1', type: 'intro', content: {} },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLesson,
      });

      const result = await lessonAPI.getById('lesson-123');

      expect(result.id).toBe('lesson-123');
      expect(result.targetVocabulary).toHaveLength(2);
      expect(result.blocks).toHaveLength(1);
    });
  });

  describe('lessonAPI.create', () => {
    it('should create lesson with targetVocabulary', async () => {
      const payload = {
        title: 'New Lesson',
        hskLevel: 1,
        lessonType: 'lesson' as const,
        targetVocabulary: ['vocab-1', 'vocab-2', 'vocab-3'],
        blocks: [{ type: 'intro', content: {} }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'new-lesson-id', lessonNumber: 5 }),
      });

      const result = await lessonAPI.create(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/admin/lessons'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('targetVocabulary'),
        })
      );
      expect(result.id).toBe('new-lesson-id');
    });

    it('should include all lesson metadata', async () => {
      const payload = {
        title: 'Grammar Lesson',
        subtitle: 'Learning 是',
        hskLevel: 1,
        lessonType: 'lesson' as const,
        difficulty: 'easy' as const,
        estimatedMinutes: 15,
        grammarPoints: ['是', 'Subject + 是 + Noun'],
        tags: ['beginner', 'grammar'],
        targetVocabulary: ['vocab-1'],
        blocks: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'new-id', lessonNumber: 1 }),
      });

      await lessonAPI.create(payload);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.title).toBe('Grammar Lesson');
      expect(callBody.grammarPoints).toContain('是');
      expect(callBody.targetVocabulary).toContain('vocab-1');
    });
  });

  describe('lessonAPI.update', () => {
    it('should update lesson', async () => {
      const updates = {
        id: 'lesson-123',
        title: 'Updated Title',
        targetVocabulary: ['vocab-1', 'vocab-2', 'vocab-3', 'vocab-4'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updates,
      });

      await lessonAPI.update('lesson-123', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/admin/lessons/lesson-123'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });
});
