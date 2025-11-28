/**
 * Analytics API Tests
 * Tests for analytics dashboard data fetching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getUserStats,
  getContentOverview,
  getHskBreakdown,
} from '@/services/analyticsAPI';
import { setTokenProvider } from '@/services/api';

describe('Analytics API', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
    setTokenProvider(async () => 'test-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getUserStats', () => {
    it('should fetch user statistics', async () => {
      const mockStats = {
        totalUsers: 1500,
        activeUsers: 450,
        newUsersToday: 25,
        newUsersThisWeek: 150,
        tierBreakdown: {
          free: 1200,
          premium: 250,
          pro: 50,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await getUserStats();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/analytics/users'),
        expect.any(Object)
      );
      expect(result.totalUsers).toBe(1500);
    });
  });

  describe('getContentOverview', () => {
    it('should fetch content statistics', async () => {
      const mockStats = {
        totalLessons: 50,
        totalStories: 20,
        totalVocabulary: 500,
        publishedLessons: 45,
        publishedStories: 18,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await getContentOverview();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/analytics/content/overview'),
        expect.any(Object)
      );
      expect(result.totalLessons).toBe(50);
    });
  });

  describe('getHskBreakdown', () => {
    it('should fetch HSK level breakdown', async () => {
      const mockBreakdown = [
        { hskLevel: 1, lessons: 15, stories: 5, vocabulary: 150 },
        { hskLevel: 2, lessons: 12, stories: 4, vocabulary: 150 },
        { hskLevel: 3, lessons: 10, stories: 3, vocabulary: 200 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ breakdown: mockBreakdown }),
      });

      const result = await getHskBreakdown();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/analytics/content/hsk-breakdown'),
        expect.any(Object)
      );
      expect(result).toHaveLength(3);
      expect(result[0].hskLevel).toBe(1);
    });
  });
});
