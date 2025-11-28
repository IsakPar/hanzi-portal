/**
 * Prompts API Tests
 * Tests for AI prompt management and pipeline operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getPromptVersions,
  promotePrompt,
  testPrompt,
  createPipeline,
} from '@/services/promptsAPI';
import { setTokenProvider } from '@/services/api';

describe('Prompts API', () => {
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

  describe('getPromptVersions', () => {
    it('should fetch prompt versions for a slug', async () => {
      const mockVersions = [
        { version: 3, status: 'active', body: 'Latest prompt...', createdAt: '2024-01-15' },
        { version: 2, status: 'inactive', body: 'Old prompt...', createdAt: '2024-01-10' },
        { version: 1, status: 'inactive', body: 'Original prompt...', createdAt: '2024-01-01' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: mockVersions }),
      });

      const result = await getPromptVersions('lesson-generator');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ai/prompts/lesson-generator/versions'),
        expect.any(Object)
      );
      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('active');
    });

    it('should handle empty versions list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ versions: [] }),
      });

      const result = await getPromptVersions('new-prompt');

      expect(result).toHaveLength(0);
    });
  });

  describe('promotePrompt', () => {
    it('should promote a version to active', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await promotePrompt('lesson-generator', { fromVersion: 2, toVersion: 3 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ai/prompts/lesson-generator/promote'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('testPrompt', () => {
    it('should test a prompt with sample data', async () => {
      const mockResult = {
        success: true,
        output: 'Generated lesson content...',
        debug: {
          model: 'gpt-5-nano',
          latency_ms: 1840,
          input_tokens: 500,
          output_tokens: 1200,
          estimated_cost: 0.0012,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await testPrompt({
        slug: 'lesson-generator',
        version: 3,
        model: 'gpt-5-nano',
        variables: {
          targets: ['你好', '谢谢'],
          grammar: ['是'],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ai/test-prompt'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.success).toBe(true);
      expect(result.debug?.model).toBe('gpt-5-nano');
    });

    it('should handle test failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Rate limit exceeded',
          debug: {},
        }),
      });

      const result = await testPrompt({
        slug: 'lesson-generator',
        version: 1,
        model: 'gpt-4',
        variables: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('createPipeline', () => {
    it('should create a multi-step pipeline prompt', async () => {
      const pipelineConfig = {
        slug: 'lesson-pipeline',
        name: 'Lesson Pipeline',
        steps: [
          {
            name: 'Generate Content',
            model: 'gpt-5-nano',
            promptBody: 'Create lesson content for {{targets}}...',
            maxInputTokens: 1000,
            maxOutputTokens: 2000,
          },
          {
            name: 'Validate',
            model: 'gpt-5-mini',
            promptBody: 'Validate the content: {{previous_output}}...',
            maxInputTokens: 2000,
            maxOutputTokens: 500,
          },
        ],
        costLimits: {
          maxCostPerStep: 0.01,
          maxTotalCost: 0.05,
          maxTotalTokens: 5000,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          template: {
            id: 'pipeline-123',
            slug: 'lesson-pipeline',
            version: 1,
          },
        }),
      });

      const result = await createPipeline(pipelineConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/ai/prompts/pipeline'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('lesson-pipeline'),
        })
      );
      expect(result.id).toBe('pipeline-123');
    });

    it('should include cost limits in pipeline config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: { id: 'p-1', slug: 'test', version: 1 } }),
      });

      await createPipeline({
        slug: 'test-pipeline',
        name: 'Test Pipeline',
        steps: [{ 
          name: 'Step 1', 
          model: 'gpt-5-nano', 
          promptBody: 'Test',
          maxInputTokens: 100,
          maxOutputTokens: 100,
        }],
        costLimits: { maxCostPerStep: 0.01, maxTotalCost: 0.10, maxTotalTokens: 10000 },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.costLimits.maxTotalCost).toBe(0.10);
    });
  });
});
