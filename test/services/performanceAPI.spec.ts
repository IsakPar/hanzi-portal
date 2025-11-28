/**
 * Performance API Tests
 * Tests for performance analytics data fetching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  fetchPerformanceOverview,
  fetchLatencyTrend,
  fetchErrorBreakdown,
  fetchTopEndpoints,
  fetchModelPerformance,
} from '@/services/performanceAPI';
import { setTokenProvider } from '@/services/api';

describe('Performance API', () => {
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

  describe('fetchPerformanceOverview', () => {
    it('should fetch performance overview', async () => {
      const mockOverview = {
        totalRequests: 125400,
        avgLatencyMs: 145,
        errorRate: 0.8,
        totalErrors: 1003,
        systemEvents: 5420,
        uptime: 99.95,
        period: '7 days',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockOverview,
      });

      const result = await fetchPerformanceOverview(7);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/analytics/performance/overview?days=7'),
        expect.any(Object)
      );
      expect(result.totalRequests).toBe(125400);
      expect(result.uptime).toBe(99.95);
    });

    it('should use default days if not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await fetchPerformanceOverview();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=7'),
        expect.any(Object)
      );
    });
  });

  describe('fetchLatencyTrend', () => {
    it('should fetch hourly latency data', async () => {
      const mockLatency = [
        { hour: '2024-01-01 00:00', p50: 120, p95: 280, p99: 450, requests: 500 },
        { hour: '2024-01-01 01:00', p50: 125, p95: 290, p99: 460, requests: 480 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ latency: mockLatency }),
      });

      const result = await fetchLatencyTrend(24);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/analytics/performance/latency?hours=24'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].p50).toBe(120);
    });
  });

  describe('fetchErrorBreakdown', () => {
    it('should fetch error breakdown by status code', async () => {
      const mockErrors = {
        byStatusCode: [
          { code: '400', count: 45, description: 'Bad Request' },
          { code: '500', count: 12, description: 'Server Error' },
        ],
        byEventType: [
          { eventType: 'auth_error', count: 30 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrors,
      });

      const result = await fetchErrorBreakdown(7);

      expect(result.byStatusCode).toHaveLength(2);
      expect(result.byStatusCode[0].code).toBe('400');
    });
  });

  describe('fetchTopEndpoints', () => {
    it('should fetch top endpoints by traffic', async () => {
      const mockEndpoints = [
        { endpoint: '/v1/lessons', requests: 4520, avgMs: 145, errorRate: '0.5' },
        { endpoint: '/v1/stories', requests: 2180, avgMs: 168, errorRate: '0.8' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ endpoints: mockEndpoints }),
      });

      const result = await fetchTopEndpoints(7, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('days=7'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0].requests).toBe(4520);
    });
  });

  describe('fetchModelPerformance', () => {
    it('should fetch AI model performance stats', async () => {
      const mockModels = [
        { 
          model: 'gpt-5-nano', 
          requests: 1250, 
          avgLatencyMs: 1840, 
          totalTokens: 250000,
          totalCost: '12.50',
          errorRate: '0.5',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: mockModels }),
      });

      const result = await fetchModelPerformance(7);

      expect(result).toHaveLength(1);
      expect(result[0].model).toBe('gpt-5-nano');
      expect(result[0].totalCost).toBe('12.50');
    });
  });
});
