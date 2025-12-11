/**
 * 📖 Vocabulary Enhancement Workflow Tests
 * 
 * Tests the complete vocabulary lifecycle:
 * 1. Create vocab → 2. AI translate → 3. Generate example → 4. Generate audio → 5. Health check
 * 
 * These tests verify the full "vocab enrichment" pipeline that transforms
 * a simple hanzi entry into a complete vocabulary card with audio.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchVocabulary,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  checkVocabularyHealth,
  translateHanzi,
  generateExampleSentence,
  previewWordAudio,
  saveWordAudio,
  getSuggestions,
} from '@/services/vocabularyAPI';
import { setupMockFetch, mockVocabulary, testId } from './test-utils';

describe('📖 Vocabulary Enhancement Workflow', () => {
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
  // WORKFLOW 1: CREATE NEW VOCABULARY
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 1: Create New Vocabulary Entry', () => {
    it('should create vocabulary with basic fields', async () => {
      const newId = testId('vocab');
      mockFetch.respondWith({ id: newId, success: true });

      const result = await createVocabulary({
        hanzi: '学习',
        pinyin: 'xuéxí',
        english: 'to study',
        category: 'verbs',
        hskLevel: 2,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe(newId);

      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('POST');
      expect(call?.url).toContain('/v1/vocabulary/admin');
      expect(call?.body).toMatchObject({
        hanzi: '学习',
        pinyin: 'xuéxí',
        hskLevel: 2,
      });
    });

    it('should create vocabulary with all optional fields', async () => {
      mockFetch.respondWith({ id: 'v1', success: true });

      await createVocabulary({
        hanzi: '苹果',
        pinyin: 'píngguǒ',
        english: 'apple',
        category: 'food',
        hskLevel: 1,
        tags: ['fruit', 'common'],
        wordAudioR2Key: 'audio/pingguo.mp3',
        exampleChinese: '我喜欢吃苹果。',
        examplePinyin: 'Wǒ xǐhuān chī píngguǒ.',
        exampleEnglish: 'I like to eat apples.',
      });

      const call = mockFetch.getLastCall();
      expect(call?.body).toMatchObject({
        tags: ['fruit', 'common'],
        exampleChinese: '我喜欢吃苹果。',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 2: AI TRANSLATION
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 2: AI Translation (Hanzi → English + Pinyin)', () => {
    it('should translate hanzi to English and pinyin', async () => {
      mockFetch.respondWith({
        success: true,
        english: 'computer',
        pinyin: 'diànnǎo',
        tokensUsed: 45,
      });

      const result = await translateHanzi('电脑');

      expect(result.success).toBe(true);
      expect(result.english).toBe('computer');
      expect(result.pinyin).toBe('diànnǎo');
      expect(result.tokensUsed).toBeGreaterThan(0);

      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('POST');
      expect(call?.url).toContain('/translate');
      expect(call?.body).toMatchObject({ hanzi: '电脑' });
    });

    it('should handle multi-character phrases', async () => {
      mockFetch.respondWith({
        success: true,
        english: 'to learn Chinese',
        pinyin: 'xué zhōngwén',
        tokensUsed: 52,
      });

      const result = await translateHanzi('学中文');

      expect(result.english).toBe('to learn Chinese');
      expect(result.pinyin).toBe('xué zhōngwén');
    });

    it('should handle translation errors gracefully', async () => {
      mockFetch.failWith('Rate limit exceeded', 429);

      await expect(translateHanzi('测试')).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 3: AI EXAMPLE SENTENCE GENERATION
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 3: Generate Example Sentence', () => {
    it('should generate example sentence for vocabulary', async () => {
      mockFetch.respondWith({
        success: true,
        sentence: {
          chinese: '他每天早上喝咖啡。',
          pinyin: 'Tā měitiān zǎoshang hē kāfēi.',
          english: 'He drinks coffee every morning.',
        },
        tokensUsed: 120,
        cached: false,
      });

      const result = await generateExampleSentence('vocab-123');

      expect(result.success).toBe(true);
      expect(result.sentence.chinese).toBe('他每天早上喝咖啡。');
      expect(result.sentence.pinyin).toContain('kāfēi');
      expect(result.sentence.english).toContain('coffee');
    });

    it('should return cached example on subsequent calls', async () => {
      mockFetch.respondWith({
        success: true,
        sentence: {
          chinese: '我喜欢学习。',
          pinyin: 'Wǒ xǐhuān xuéxí.',
          english: 'I like to study.',
        },
        tokensUsed: 0,
        cached: true,
      });

      const result = await generateExampleSentence('vocab-123');

      expect(result.cached).toBe(true);
      expect(result.tokensUsed).toBe(0);
    });

    it('should regenerate example when requested', async () => {
      mockFetch.respondWith({
        success: true,
        sentence: {
          chinese: '她正在学习中文。',
          pinyin: 'Tā zhèngzài xuéxí zhōngwén.',
          english: 'She is studying Chinese.',
        },
        tokensUsed: 150,
        cached: false,
      });

      const result = await generateExampleSentence('vocab-123', true);

      expect(result.cached).toBe(false);
      expect(result.tokensUsed).toBeGreaterThan(0);

      const call = mockFetch.getLastCall();
      expect(call?.body).toMatchObject({ regenerate: true });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 4: AUDIO GENERATION (TTS)
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 4: Audio Generation Pipeline', () => {
    it('should preview word audio via TTS', async () => {
      mockFetch.respondWith({
        success: true,
        audioBase64: 'SGVsbG8gV29ybGQ=', // Base64 encoded audio
        text: '你好',
        charactersUsed: 2,
      });

      const result = await previewWordAudio('vocab-123', 'chinese-female-1', 0.8);

      expect(result.success).toBe(true);
      expect(result.audioBase64).toBeTruthy();
      expect(result.text).toBe('你好');
      expect(result.charactersUsed).toBe(2);

      const call = mockFetch.getLastCall();
      expect(call?.body).toMatchObject({
        voice: 'chinese-female-1',
        speed: 0.8,
      });
    });

    it('should save approved audio to R2', async () => {
      mockFetch.respondWith({
        success: true,
        r2Key: 'audio/vocab/vocab-123-word.mp3',
      });

      const result = await saveWordAudio(
        'vocab-123',
        'SGVsbG8gV29ybGQ=', // Base64 audio
        1500 // Duration in ms
      );

      expect(result.success).toBe(true);
      expect(result.r2Key).toContain('vocab-123');

      const call = mockFetch.getLastCall();
      expect(call?.body).toMatchObject({
        audioBase64: 'SGVsbG8gV29ybGQ=',
        durationMs: 1500,
      });
    });

    it('should complete full audio workflow: preview → approve → save', async () => {
      // Step 1: Preview
      mockFetch.respondWith({
        success: true,
        audioBase64: 'YXVkaW9fY29udGVudA==',
        text: '学习',
        charactersUsed: 2,
      });

      const preview = await previewWordAudio('vocab-123');
      expect(preview.success).toBe(true);

      // Step 2: User approves, save to R2
      mockFetch.respondWith({
        success: true,
        r2Key: 'audio/vocab/vocab-123-word.mp3',
      });

      const saved = await saveWordAudio('vocab-123', preview.audioBase64);
      expect(saved.success).toBe(true);

      // Step 3: Update vocabulary with audio key
      mockFetch.respondWith({ success: true });

      await updateVocabulary('vocab-123', {
        wordAudioR2Key: saved.r2Key,
      });

      const updateCall = mockFetch.getLastCall();
      expect(updateCall?.body).toMatchObject({
        wordAudioR2Key: 'audio/vocab/vocab-123-word.mp3',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 5: VOCABULARY HEALTH CHECK
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 5: Vocabulary Health Check', () => {
    it('should check health for multiple words', async () => {
      mockFetch.respondWith({
        results: [
          {
            hanzi: '你好',
            exists: true,
            id: 'v1',
            pinyin: 'nǐ hǎo',
            english: 'hello',
            hasAudio: true,
            hasCategory: true,
            hasExample: true,
            hasTags: true,
            hasSecondaryCategories: false,
          },
          {
            hanzi: '再见',
            exists: true,
            id: 'v2',
            pinyin: 'zàijiàn',
            english: 'goodbye',
            hasAudio: false, // Missing!
            hasCategory: true,
            hasExample: false, // Missing!
            hasTags: false,
            hasSecondaryCategories: false,
          },
          {
            hanzi: '新词',
            exists: false, // Not in database!
            hasAudio: false,
            hasCategory: false,
            hasExample: false,
            hasTags: false,
            hasSecondaryCategories: false,
          },
        ],
        summary: {
          total: 3,
          existing: 2,
          missing: 1,
          missingAudio: 2,
          missingCategory: 1,
          missingExample: 2,
          missingTags: 2,
          missingSecondaryCategories: 3,
        },
        totalIssues: 10,
      });

      const result = await checkVocabularyHealth(['你好', '再见', '新词']);

      expect(result.summary.total).toBe(3);
      expect(result.summary.existing).toBe(2);
      expect(result.summary.missing).toBe(1);
      expect(result.totalIssues).toBe(10);

      // Check individual results
      expect(result.results[0].hasAudio).toBe(true);
      expect(result.results[1].hasAudio).toBe(false);
      expect(result.results[2].exists).toBe(false);
    });

    it('should identify words missing audio', async () => {
      mockFetch.respondWith({
        results: [
          { hanzi: '电脑', exists: true, hasAudio: false, hasCategory: true, hasExample: true, hasTags: true, hasSecondaryCategories: true },
        ],
        summary: { total: 1, existing: 1, missing: 0, missingAudio: 1, missingCategory: 0, missingExample: 0, missingTags: 0, missingSecondaryCategories: 0 },
        totalIssues: 1,
      });

      const result = await checkVocabularyHealth(['电脑']);

      expect(result.summary.missingAudio).toBe(1);
      expect(result.results[0].hasAudio).toBe(false);
    });

    it('should return perfect health for complete vocabulary', async () => {
      mockFetch.respondWith({
        results: [
          { hanzi: '你好', exists: true, hasAudio: true, hasCategory: true, hasExample: true, hasTags: true, hasSecondaryCategories: true },
        ],
        summary: { total: 1, existing: 1, missing: 0, missingAudio: 0, missingCategory: 0, missingExample: 0, missingTags: 0, missingSecondaryCategories: 0 },
        totalIssues: 0,
      });

      const result = await checkVocabularyHealth(['你好']);

      expect(result.totalIssues).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 6: VOCABULARY SUGGESTIONS (NO AI)
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 6: DB-Based Suggestions', () => {
    it('should get suggestions by HSK level', async () => {
      mockFetch.respondWith({
        suggestions: [
          { id: 'v1', hanzi: '好', pinyin: 'hǎo', english: 'good', category: 'adjectives', pos: 'adj' },
          { id: 'v2', hanzi: '大', pinyin: 'dà', english: 'big', category: 'adjectives', pos: 'adj' },
          { id: 'v3', hanzi: '小', pinyin: 'xiǎo', english: 'small', category: 'adjectives', pos: 'adj' },
        ],
        hskLevel: 1,
        requestedCategory: null,
        requestedPos: null,
        totalPool: 150,
      });

      const result = await getSuggestions({ hskLevel: 1 });

      expect(result.suggestions).toHaveLength(3);
      expect(result.hskLevel).toBe(1);

      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('hskLevel=1');
    });

    it('should filter by category and POS', async () => {
      mockFetch.respondWith({
        suggestions: [
          { id: 'v1', hanzi: '吃', pinyin: 'chī', english: 'to eat', category: 'food', pos: 'verb' },
          { id: 'v2', hanzi: '喝', pinyin: 'hē', english: 'to drink', category: 'food', pos: 'verb' },
        ],
        hskLevel: 1,
        requestedCategory: 'food',
        requestedPos: 'verb',
        totalPool: 25,
      });

      const result = await getSuggestions({
        hskLevel: 1,
        category: 'food',
        pos: 'verb',
      });

      expect(result.suggestions).toHaveLength(2);
      expect(result.requestedCategory).toBe('food');
      expect(result.requestedPos).toBe('verb');
    });

    it('should exclude specified words', async () => {
      mockFetch.respondWith({
        suggestions: [
          { id: 'v3', hanzi: '小', pinyin: 'xiǎo', english: 'small' },
        ],
        hskLevel: 1,
        requestedCategory: null,
        requestedPos: null,
        totalPool: 148,
      });

      await getSuggestions({
        hskLevel: 1,
        exclude: ['好', '大'],
        count: 1,
      });

      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('exclude=');
      expect(call?.url).toContain('count=1');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // WORKFLOW 7: SEARCH & CRUD
  // ═══════════════════════════════════════════════════════════

  describe('Workflow 7: Search & CRUD Operations', () => {
    it('should search vocabulary with multiple filters', async () => {
      mockFetch.respondWith({
        results: [mockVocabulary({ hanzi: '你好' })],
        total: 1,
        limit: 20,
        offset: 0,
      });

      const result = await searchVocabulary({
        query: '你好',
        hsk_level: 1,
        category: 'greetings',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].hanzi).toBe('你好');

      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('query=');
      expect(call?.url).toContain('hsk_level=1');
      expect(call?.url).toContain('category=greetings');
    });

    it('should paginate results', async () => {
      mockFetch.respondWith({
        results: [],
        total: 500,
        limit: 20,
        offset: 100,
      });

      await searchVocabulary({ limit: 20, offset: 100 });

      const call = mockFetch.getLastCall();
      expect(call?.url).toContain('limit=20');
      expect(call?.url).toContain('offset=100');
    });

    it('should update vocabulary entry', async () => {
      mockFetch.respondWith({ success: true });

      await updateVocabulary('vocab-123', {
        english: 'updated translation',
        tags: ['updated', 'test'],
      });

      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('PUT');
      expect(call?.url).toContain('/vocab-123');
      expect(call?.body).toMatchObject({
        english: 'updated translation',
        tags: ['updated', 'test'],
      });
    });

    it('should delete vocabulary entry', async () => {
      mockFetch.respondWith({ success: true });

      await deleteVocabulary('vocab-to-delete');

      const call = mockFetch.getLastCall();
      expect(call?.method).toBe('DELETE');
      expect(call?.url).toContain('/vocab-to-delete');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // FULL ENHANCEMENT WORKFLOW
  // ═══════════════════════════════════════════════════════════

  describe('Full Enhancement Workflow: Empty → Complete', () => {
    it('should complete full vocab enhancement pipeline', async () => {
      // Step 1: Create basic entry with just hanzi
      mockFetch.respondWith({ id: 'vocab-new', success: true });
      const created = await createVocabulary({
        hanzi: '咖啡',
        pinyin: '',
        english: '',
        category: 'food',
        hskLevel: 2,
      });
      expect(created.success).toBe(true);

      // Step 2: AI translate to get English + Pinyin
      mockFetch.respondWith({
        success: true,
        english: 'coffee',
        pinyin: 'kāfēi',
        tokensUsed: 35,
      });
      const translation = await translateHanzi('咖啡');
      expect(translation.english).toBe('coffee');

      // Step 3: Update with translation
      mockFetch.respondWith({ success: true });
      await updateVocabulary('vocab-new', {
        english: translation.english,
        pinyin: translation.pinyin,
      });

      // Step 4: Generate example sentence
      mockFetch.respondWith({
        success: true,
        sentence: {
          chinese: '我喜欢喝咖啡。',
          pinyin: 'Wǒ xǐhuān hē kāfēi.',
          english: 'I like to drink coffee.',
        },
        tokensUsed: 80,
        cached: false,
      });
      const example = await generateExampleSentence('vocab-new');
      expect(example.sentence.chinese).toContain('咖啡');

      // Step 5: Update with example
      mockFetch.respondWith({ success: true });
      await updateVocabulary('vocab-new', {
        exampleChinese: example.sentence.chinese,
        examplePinyin: example.sentence.pinyin,
        exampleEnglish: example.sentence.english,
      });

      // Step 6: Generate word audio
      mockFetch.respondWith({
        success: true,
        audioBase64: 'base64audio',
        text: '咖啡',
        charactersUsed: 2,
      });
      const audioPreview = await previewWordAudio('vocab-new');
      expect(audioPreview.success).toBe(true);

      // Step 7: Save audio
      mockFetch.respondWith({
        success: true,
        r2Key: 'audio/vocab/vocab-new-word.mp3',
      });
      const savedAudio = await saveWordAudio('vocab-new', audioPreview.audioBase64);
      expect(savedAudio.r2Key).toBeTruthy();

      // Step 8: Final update with audio
      mockFetch.respondWith({ success: true });
      await updateVocabulary('vocab-new', {
        wordAudioR2Key: savedAudio.r2Key,
      });

      // Step 9: Health check - should be complete!
      mockFetch.respondWith({
        results: [{
          hanzi: '咖啡',
          exists: true,
          hasAudio: true,
          hasCategory: true,
          hasExample: true,
          hasTags: false,
          hasSecondaryCategories: false,
        }],
        summary: {
          total: 1,
          existing: 1,
          missing: 0,
          missingAudio: 0,
          missingCategory: 0,
          missingExample: 0,
          missingTags: 1,
          missingSecondaryCategories: 1,
        },
        totalIssues: 2, // Only missing tags and secondary categories
      });

      const health = await checkVocabularyHealth(['咖啡']);
      expect(health.results[0].hasAudio).toBe(true);
      expect(health.results[0].hasExample).toBe(true);
      expect(health.summary.missingAudio).toBe(0);
    });
  });
});

