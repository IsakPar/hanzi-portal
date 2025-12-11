/**
 * Vocabulary API Tests
 * Tests for vocabulary CRUD operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  searchVocabulary, 
  getVocabulary, 
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
} from '@/services/vocabularyAPI';

describe('Vocabulary API', () => {
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

  describe('searchVocabulary', () => {
    it('should search vocabulary with query params', async () => {
      const mockResponse = {
        results: [
          { id: '1', hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello', hskLevel: 1, category: 'greetings' },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await searchVocabulary({ query: '你好', hsk_level: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/vocabulary'),
        expect.any(Object)
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0].hanzi).toBe('你好');
    });

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 0, limit: 20, offset: 0 }),
      });

      const result = await searchVocabulary({ query: 'nonexistent' });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should support pagination params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 100, limit: 10, offset: 20 }),
      });

      await searchVocabulary({ limit: 10, offset: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.any(Object)
      );
    });
  });

  describe('getVocabulary', () => {
    it('should fetch single vocabulary entry', async () => {
      const mockVocab = {
        id: 'vocab-123',
        hanzi: '谢谢',
        pinyin: 'xiè xie',
        english: 'thank you',
        hskLevel: 1,
        category: 'politeness',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVocab,
      });

      const result = await getVocabulary('vocab-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/vocabulary/vocab-123'),
        expect.any(Object)
      );
      expect(result.hanzi).toBe('谢谢');
    });

    it('should throw on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      await expect(getVocabulary('nonexistent')).rejects.toThrow();
    });
  });

  describe('createVocabulary', () => {
    it('should create vocabulary entry', async () => {
      const newVocab = {
        hanzi: '学习',
        pinyin: 'xué xí',
        english: 'to study',
        hskLevel: 2,
        category: 'education',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-vocab-id', ...newVocab }),
      });

      const result = await createVocabulary(newVocab);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/vocabulary/admin'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newVocab),
        })
      );
      expect(result.id).toBe('new-vocab-id');
    });
  });

  describe('updateVocabulary', () => {
    it('should update vocabulary entry', async () => {
      const updates = { english: 'updated translation' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'vocab-123', ...updates }),
      });

      await updateVocabulary('vocab-123', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/vocabulary/admin/vocab-123'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('deleteVocabulary', () => {
    it('should delete vocabulary entry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await deleteVocabulary('vocab-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/vocabulary/admin/vocab-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});
