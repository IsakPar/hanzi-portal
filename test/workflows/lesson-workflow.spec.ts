/**
 * 📚 Lesson CRUD Workflow Tests
 * 
 * Tests the complete lesson lifecycle:
 * 1. Create lesson → 2. Add blocks → 3. Save → 4. Update → 5. Publish
 * 
 * These tests verify the API contract without hitting real servers,
 * ensuring the portal correctly orchestrates lesson creation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lessonAPI } from '@/services/lessonAPI';
import { 
  mockLesson, 
  testId, 
  setupMockFetch,
} from './test-utils';

describe('📚 Lesson CRUD Workflow', () => {
  const originalFetch = global.fetch;
  let mockFetch: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockFetch = setupMockFetch();
    global.fetch = mockFetch.mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    mockFetch.reset();
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 1: CREATE NEW LESSON
  // ═══════════════════════════════════════════════════════════
  
  describe('Workflow 1: Create New Lesson', () => {
    it('should create a lesson with vocabulary and blocks', async () => {
      // Setup: Mock successful creation response
      const newLessonId = testId('lesson');
      mockFetch.respondWith({
        success: true,
        id: newLessonId,
        lessonNumber: 1,
      });

      // Execute: Create lesson with full payload
      const payload = {
        title: 'Lesson 1: Hello & Goodbye',
        subtitle: 'Learn basic greetings',
        hskLevel: 1,
        lessonType: 'lesson' as const,
        difficulty: 'easy' as const,
        estimatedMinutes: 15,
        grammarPoints: ['Basic greetings'],
        tags: ['beginner', 'greetings'],
        targetVocabulary: ['vocab-1', 'vocab-2', 'vocab-3'],
        blocks: [
          { type: 'intro', content: { title: 'Welcome' } },
          { type: 'vocabulary', content: { words: ['你好', '再见'] } },
        ],
      };

      const result = await lessonAPI.create(payload);

      // Verify: Response structure
      expect(result.success).toBe(true);
      expect(result.id).toBe(newLessonId);
      expect(result.lessonNumber).toBe(1);

      // Verify: Request was made correctly
      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('POST');
      expect(call?.url).toContain('/v1/admin/lessons');
      expect(call?.body).toMatchObject({
        title: 'Lesson 1: Hello & Goodbye',
        hskLevel: 1,
        targetVocabulary: ['vocab-1', 'vocab-2', 'vocab-3'],
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: 'intro' }),
          expect.objectContaining({ type: 'vocabulary' }),
        ]),
      });
    });

    it('should include all metadata in creation payload', async () => {
      mockFetch.respondWith({ success: true, id: 'test-id', lessonNumber: 1 });

      const payload = {
        title: 'Grammar Lesson',
        subtitle: 'Learning 是',
        hskLevel: 1,
        lessonType: 'lesson' as const,
        difficulty: 'medium' as const,
        estimatedMinutes: 20,
        grammarPoints: ['是 verb conjugation', 'Subject + 是 + Noun'],
        tags: ['grammar', 'intermediate'],
        targetVocabulary: ['vocab-a'],
        blocks: [],
      };

      await lessonAPI.create(payload);

      const call = mockFetch.getLastCall();
      expect(call?.body).toMatchObject({
        subtitle: 'Learning 是',
        difficulty: 'medium',
        estimatedMinutes: 20,
        grammarPoints: expect.arrayContaining(['是 verb conjugation']),
        tags: expect.arrayContaining(['grammar']),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 2: FETCH & EDIT LESSON
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 2: Fetch & Edit Lesson', () => {
    it('should fetch lesson with all blocks intact', async () => {
      const lesson = mockLesson({
        id: 'lesson-123',
        title: 'Existing Lesson',
        blocks: [
          { id: 'b1', type: 'intro', orderIndex: 0, content: { title: 'Hi' } },
          { id: 'b2', type: 'mcq', orderIndex: 1, content: { question: 'Test?' } },
          { id: 'b3', type: 'reading', orderIndex: 2, content: { text: '...' } },
        ],
      });

      mockFetch.respondWith(lesson);

      const result = await lessonAPI.getById('lesson-123');

      expect(result.id).toBe('lesson-123');
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0].type).toBe('intro');
      expect(result.blocks[1].type).toBe('mcq');
      expect(result.blocks[2].type).toBe('reading');
    });

    it('should update lesson title and metadata', async () => {
      const updated = mockLesson({
        id: 'lesson-123',
        title: 'Updated Title',
        estimatedMinutes: 25,
      });

      mockFetch.respondWith(updated);

      const result = await lessonAPI.update('lesson-123', {
        id: 'lesson-123',
        title: 'Updated Title',
        estimatedMinutes: 25,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.estimatedMinutes).toBe(25);

      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('PUT');
      expect(call?.url).toContain('/v1/admin/lessons/lesson-123');
    });

    it('should update targetVocabulary array', async () => {
      mockFetch.respondWith(mockLesson({ targetVocabulary: ['v1', 'v2', 'v3', 'v4'] }));

      await lessonAPI.update('lesson-123', {
        id: 'lesson-123',
        targetVocabulary: ['v1', 'v2', 'v3', 'v4'],
      });

      const call = mockFetch.getLastCall();
      expect(call?.body).toHaveProperty('targetVocabulary');
      expect((call.body as { targetVocabulary: string[] }).targetVocabulary).toHaveLength(4);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 3: BLOCK OPERATIONS
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 3: Block Operations', () => {
    it('should add new block to lesson', async () => {
      const newBlocks = [
        { id: 'b1', type: 'intro', orderIndex: 0, content: {} },
        { id: 'b2', type: 'vocabulary', orderIndex: 1, content: {} },
        { id: 'b3', type: 'mcq', orderIndex: 2, content: { question: 'New question' } }, // New!
      ];

      mockFetch.respondWith(newBlocks);

      const result = await lessonAPI.updateBlocks('lesson-123', newBlocks as never);

      expect(result).toHaveLength(3);
      
      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('PUT');
      expect(call?.url).toContain('/blocks');
    });

    it('should reorder blocks correctly', async () => {
      // Simulate drag-and-drop reorder: MCQ moved from position 2 to 1
      const reorderedBlocks = [
        { id: 'b1', type: 'intro', orderIndex: 0, content: {} },
        { id: 'b3', type: 'mcq', orderIndex: 1, content: {} },     // Was 2, now 1
        { id: 'b2', type: 'vocabulary', orderIndex: 2, content: {} }, // Was 1, now 2
      ];

      mockFetch.respondWith(reorderedBlocks);

      await lessonAPI.updateBlocks('lesson-123', reorderedBlocks as never);

      const call = mockFetch.getLastCall();
      const body = call?.body as { blocks: typeof reorderedBlocks };
      expect(body.blocks[1].type).toBe('mcq');
      expect(body.blocks[1].orderIndex).toBe(1);
    });

    it('should handle complex block content (MCQ with distractors)', async () => {
      const mcqBlock = {
        id: 'mcq-1',
        type: 'mcq',
        orderIndex: 0,
        content: {
          question: 'How do you say "hello"?',
          questionAudio: null,
          correctAnswer: '你好',
          correctAnswerAudio: 'r2://audio/nihao.mp3',
          distractors: [
            { text: '再见', audio: 'r2://audio/zaijian.mp3' },
            { text: '谢谢', audio: 'r2://audio/xiexie.mp3' },
          ],
          hint: 'Think about greeting someone',
        },
      };

      mockFetch.respondWith([mcqBlock]);

      await lessonAPI.updateBlocks('lesson-123', [mcqBlock] as never);

      const call = mockFetch.getLastCall();
      const body = call?.body as { blocks: typeof mcqBlock[] };
      expect(body.blocks[0].content).toMatchObject({
        question: 'How do you say "hello"?',
        correctAnswer: '你好',
        distractors: expect.arrayContaining([
          expect.objectContaining({ text: '再见' }),
        ]),
      });
    });

    it('should handle drag sentence block with segments', async () => {
      const dragBlock = {
        id: 'drag-1',
        type: 'drag_sentence',
        orderIndex: 0,
        content: {
          targetSentence: '我是学生',
          targetPinyin: 'wǒ shì xuéshēng',
          translation: 'I am a student',
          segments: [
            { id: 's1', text: '我', pinyin: 'wǒ', order: 0 },
            { id: 's2', text: '是', pinyin: 'shì', order: 1 },
            { id: 's3', text: '学生', pinyin: 'xuéshēng', order: 2 },
          ],
          distractorSegments: [
            { id: 'd1', text: '你', pinyin: 'nǐ' },
          ],
        },
      };

      mockFetch.respondWith([dragBlock]);

      await lessonAPI.updateBlocks('lesson-123', [dragBlock] as never);

      const call = mockFetch.getLastCall();
      const body = call?.body as { blocks: typeof dragBlock[] };
      expect(body.blocks[0].content.segments).toHaveLength(3);
      expect(body.blocks[0].content.distractorSegments).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 4: PUBLISH/UNPUBLISH
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 4: Publish & Unpublish', () => {
    it('should publish a lesson', async () => {
      const publishedLesson = mockLesson({ isPublished: true });
      mockFetch.respondWith(publishedLesson);

      const result = await lessonAPI.publish('lesson-123');

      expect(result.isPublished).toBe(true);
      
      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('POST');
      expect(call?.url).toContain('/publish');
    });

    it('should unpublish a lesson', async () => {
      const unpublishedLesson = mockLesson({ isPublished: false });
      mockFetch.respondWith(unpublishedLesson);

      const result = await lessonAPI.unpublish('lesson-123');

      expect(result.isPublished).toBe(false);
      
      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('/unpublish');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 5: LIST & FILTER
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 5: List & Filter Lessons', () => {
    it('should list all lessons for HSK level', async () => {
      const lessons = [
        mockLesson({ id: 'l1', title: 'Lesson 1', hskLevel: 1, lessonNumber: 1 }),
        mockLesson({ id: 'l2', title: 'Lesson 2', hskLevel: 1, lessonNumber: 2 }),
        mockLesson({ id: 'l3', title: 'Lesson 3', hskLevel: 1, lessonNumber: 3 }),
      ];

      mockFetch.respondWith({ lessons });

      const result = await lessonAPI.getAll({ hskLevel: 1 });

      expect(result.lessons).toHaveLength(3);
      expect(result.total).toBe(3);
      
      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('hskLevel=1');
    });

    it('should filter by difficulty', async () => {
      mockFetch.respondWith({ lessons: [] });

      await lessonAPI.getAll({ hskLevel: 1, difficulty: 'hard' });

      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('difficulty=hard');
    });

    it('should filter by publish status', async () => {
      mockFetch.respondWith({ lessons: [] });

      await lessonAPI.getAll({ isPublished: true });

      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('isPublished=true');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 6: DELETE & DUPLICATE
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 6: Delete & Duplicate', () => {
    it('should delete a lesson', async () => {
      mockFetch.respondWith({ success: true });

      await lessonAPI.delete('lesson-to-delete');

      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('DELETE');
      expect(call?.url).toContain('/lesson-to-delete');
    });

    it('should duplicate a lesson with new ID', async () => {
      const duplicated = mockLesson({
        id: 'new-duplicate-id',
        title: 'Lesson 1 (Copy)',
        isPublished: false,
      });

      mockFetch.respondWith(duplicated);

      const result = await lessonAPI.duplicate('original-lesson');

      expect(result.id).not.toBe('original-lesson');
      expect(result.title).toContain('Copy');
      expect(result.isPublished).toBe(false);
      
      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('POST');
      expect(call?.url).toContain('/duplicate');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    it('should handle validation errors on create', async () => {
      mockFetch.failWith('Title is required', 400);

      await expect(
        lessonAPI.create({
          title: '', // Invalid: empty title
          hskLevel: 1,
          lessonType: 'lesson',
          blocks: [],
        })
      ).rejects.toThrow();
    });

    it('should handle not found errors', async () => {
      mockFetch.failWith('Lesson not found', 404);

      await expect(lessonAPI.getById('nonexistent')).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(lessonAPI.getAll()).rejects.toThrow('Network error');
    });
  });
});

