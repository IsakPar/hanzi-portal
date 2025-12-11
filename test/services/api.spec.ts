import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, APIError } from '@/services/api';

describe('API Service', () => {
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

  describe('api.get', () => {
    it('should make a GET request with auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      const result = await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should throw APIError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      await expect(api.get('/test')).rejects.toThrow(APIError);
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

      await expect(api.get('/test', controller.signal)).rejects.toMatchObject({
        isAborted: true,
      });
    });
  });

  describe('api.post', () => {
    it('should make a POST request with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await api.post('/test', { foo: 'bar' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ foo: 'bar' }),
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('api.put', () => {
    it('should make a PUT request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
      });

      await api.put('/test/1', { name: 'updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('api.delete', () => {
    it('should make a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      await api.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('APIError', () => {
    it('should have correct properties', () => {
      const error = new APIError('Test error', 404, { detail: 'not found' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.response).toEqual({ detail: 'not found' });
      expect(error.isAborted).toBe(false);
    });

    it('should set isAborted flag', () => {
      const error = new APIError('Cancelled', 0, undefined, true);

      expect(error.isAborted).toBe(true);
    });
  });
});

