/**
 * 🧪 E2E Workflow Test Utilities
 * 
 * Shared helpers for testing content creation workflows.
 * These tests verify the full API contract without hitting real servers.
 */

import { vi, type Mock } from 'vitest';

// ═══════════════════════════════════════════════════════════
// MOCK FACTORIES
// ═══════════════════════════════════════════════════════════

/**
 * Generate a unique test ID
 */
export function testId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a mock vocabulary entry
 */
export function mockVocabulary(overrides: Partial<MockVocab> = {}): MockVocab {
  return {
    id: testId('vocab'),
    hanzi: '你好',
    pinyin: 'nǐ hǎo',
    english: 'hello',
    category: 'greetings',
    hskLevel: 1,
    tags: ['common', 'greeting'],
    pos: 'interjection',
    tonePattern: '3-3',
    wordAudioR2Key: null,
    exampleChinese: '你好，很高兴认识你。',
    examplePinyin: 'Nǐ hǎo, hěn gāoxìng rènshi nǐ.',
    exampleEnglish: 'Hello, nice to meet you.',
    exampleAudioR2Key: null,
    ...overrides,
  };
}

export interface MockVocab {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  tags: string[] | null;
  pos: string | null;
  tonePattern: string | null;
  wordAudioR2Key: string | null;
  exampleChinese: string | null;
  examplePinyin: string | null;
  exampleEnglish: string | null;
  exampleAudioR2Key: string | null;
}

/**
 * Create a mock lesson
 */
export function mockLesson(overrides: Partial<MockLesson> = {}): MockLesson {
  const id = testId('lesson');
  return {
    id,
    title: 'Test Lesson',
    subtitle: 'A test lesson for workflow validation',
    lessonNumber: 1,
    lessonType: 'lesson',
    hskLevel: 1,
    difficulty: 'easy',
    estimatedMinutes: 15,
    grammarPoints: ['Basic greetings'],
    tags: ['test', 'beginner'],
    isPublished: false,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetVocabulary: [],
    blocks: [
      {
        id: testId('block'),
        type: 'intro',
        orderIndex: 0,
        content: {
          title: 'Welcome',
          subtitle: 'Let\'s learn Chinese!',
        },
      },
    ],
    ...overrides,
  };
}

export interface MockLesson {
  id: string;
  title: string;
  subtitle: string;
  lessonNumber: number;
  lessonType: 'lesson' | 'speaking' | 'mini_test' | 'hsk_test';
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  grammarPoints: string[];
  tags: string[];
  isPublished: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  targetVocabulary: string[];
  blocks: MockBlock[];
}

export interface MockBlock {
  id: string;
  type: string;
  orderIndex: number;
  content: Record<string, unknown>;
}

/**
 * Create a mock release
 */
export function mockRelease(overrides: Partial<MockRelease> = {}): MockRelease {
  return {
    id: testId('release'),
    version: '1.0.0',
    hskLevel: 1,
    releaseNotes: 'Initial release',
    lessonsAdded: 5,
    lessonsUpdated: 0,
    lessonsRemoved: 0,
    lessonIds: [],
    releasedAt: new Date().toISOString(),
    ...overrides,
  };
}

export interface MockRelease {
  id: string;
  version: string;
  hskLevel: number;
  releaseNotes: string | null;
  lessonsAdded: number;
  lessonsUpdated: number;
  lessonsRemoved: number;
  lessonIds: string[];
  releasedAt: string;
}

// ═══════════════════════════════════════════════════════════
// SIMPLE FETCH MOCK HELPER
// ═══════════════════════════════════════════════════════════

export interface MockFetchCall {
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Simple mock fetch that tracks calls
 * Usage:
 *   const { mockFetch, getLastCall, respondWith } = setupMockFetch();
 *   respondWith({ success: true });
 *   await someAPICall();
 *   expect(getLastCall().url).toContain('/endpoint');
 */
export function setupMockFetch() {
  const calls: MockFetchCall[] = [];
  const mockFn = vi.fn();

  // Default implementation that tracks calls and returns success
  mockFn.mockImplementation(async (url: string, options?: RequestInit) => {
    const call: MockFetchCall = {
      url,
      method: options?.method || 'GET',
      body: options?.body ? JSON.parse(options.body as string) : undefined,
      headers: options?.headers as Record<string, string>,
    };
    calls.push(call);
    
    // Default empty response (tests should use respondWith)
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
    };
  });

  return {
    mockFetch: mockFn as Mock,
    calls,
    getLastCall: () => calls[calls.length - 1],
    getAllCalls: () => [...calls],
    
    /**
     * Set response for the NEXT fetch call
     */
    respondWith: (data: unknown) => {
      mockFn.mockImplementationOnce(async (url: string, options?: RequestInit) => {
        const call: MockFetchCall = {
          url,
          method: options?.method || 'GET',
          body: options?.body ? JSON.parse(options.body as string) : undefined,
          headers: options?.headers as Record<string, string>,
        };
        calls.push(call);
        
        return {
          ok: true,
          status: 200,
          json: async () => data,
        };
      });
    },
    
    /**
     * Set error response for the NEXT fetch call
     */
    failWith: (error: string, status = 400) => {
      mockFn.mockImplementationOnce(async (url: string, options?: RequestInit) => {
        const call: MockFetchCall = {
          url,
          method: options?.method || 'GET',
          body: options?.body ? JSON.parse(options.body as string) : undefined,
          headers: options?.headers as Record<string, string>,
        };
        calls.push(call);
        
        return {
          ok: false,
          status,
          json: async () => ({ error }),
        };
      });
    },
    
    reset: () => {
      calls.length = 0;
      mockFn.mockReset();
    },
  };
}

// ═══════════════════════════════════════════════════════════
// SAMPLE DATA FOR REALISTIC TESTS
// ═══════════════════════════════════════════════════════════

export const SAMPLE_HSK1_VOCAB = [
  mockVocabulary({ hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello', category: 'greetings' }),
  mockVocabulary({ hanzi: '再见', pinyin: 'zàijiàn', english: 'goodbye', category: 'greetings' }),
  mockVocabulary({ hanzi: '谢谢', pinyin: 'xièxie', english: 'thank you', category: 'politeness' }),
  mockVocabulary({ hanzi: '我', pinyin: 'wǒ', english: 'I/me', category: 'pronouns', pos: 'pronoun' }),
  mockVocabulary({ hanzi: '你', pinyin: 'nǐ', english: 'you', category: 'pronouns', pos: 'pronoun' }),
];

export const SAMPLE_LESSON = mockLesson({
  title: 'Lesson 1: Hello & Goodbye',
  subtitle: 'Learn basic greetings in Chinese',
  targetVocabulary: SAMPLE_HSK1_VOCAB.slice(0, 3).map(v => v.id),
  blocks: [
    {
      id: testId('block'),
      type: 'intro',
      orderIndex: 0,
      content: {
        title: 'Hello & Goodbye',
        subtitle: 'Your first Chinese words!',
        targetVocabulary: ['你好', '再见'],
      },
    },
    {
      id: testId('block'),
      type: 'vocabulary',
      orderIndex: 1,
      content: {
        words: ['你好', '再见', '谢谢'],
        showPinyin: true,
        showEnglish: true,
      },
    },
    {
      id: testId('block'),
      type: 'mcq',
      orderIndex: 2,
      content: {
        question: 'How do you say "hello" in Chinese?',
        correctAnswer: '你好',
        distractors: ['再见', '谢谢'],
      },
    },
  ],
});
