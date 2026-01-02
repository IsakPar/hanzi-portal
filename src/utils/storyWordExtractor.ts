/**
 * Story Word Extractor
 * 
 * Extracts unique Chinese words from story sentences for vocabulary health checking.
 * Uses vocab-validator /segment endpoint for proper jieba segmentation.
 */

import type { StoryWithDetails } from '@/services/storiesAPI';

// Regex to match Chinese characters (CJK Unified Ideographs)
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]+/g;

/**
 * Extract all unique Chinese text strings from story sentences (raw, no segmentation)
 */
export function extractStoryWords(story: StoryWithDetails): string[] {
  const words = new Set<string>();
  const sentences = story.sentences || [];

  for (const sentence of sentences) {
    if (sentence.chinese) {
      const matches = sentence.chinese.match(CHINESE_CHAR_REGEX);
      if (matches) {
        matches.forEach(match => words.add(match));
      }
    }
  }

  // Also extract from practice blocks if they contain Chinese
  const practiceBlocks = story.practiceBlocks || [];
  for (const block of practiceBlocks) {
    const content = (block as any).content;
    if (content) {
      extractFromObject(content, words);
    }
  }

  return Array.from(words).sort();
}

/**
 * Extract and SEGMENT Chinese text from story using vocab-validator.
 * Returns properly segmented individual words (e.g., "我们是学生" → ["我们", "是", "学生"])
 */
export async function extractAndSegmentStoryWords(story: StoryWithDetails): Promise<{
  rawTexts: string[];
  segmentedWords: string[];
  unknownWords: string[];
  curriculumWords: string[];
}> {
  // First, extract raw Chinese text
  const rawTexts = extractStoryWords(story);
  
  if (rawTexts.length === 0) {
    return { rawTexts: [], segmentedWords: [], unknownWords: [], curriculumWords: [] };
  }
  
  // Call vocab-validator to segment
  try {
    const { segmentText } = await import('@/services/validatorAPI');
    const result = await segmentText(rawTexts);
    
    return {
      rawTexts,
      segmentedWords: result.words_filtered,  // Individual words after filtering always_safe
      unknownWords: result.unknown_words,
      curriculumWords: result.curriculum_words,
    };
  } catch (err) {
    console.warn('[storyExtractor] Segmentation failed, falling back to raw extraction:', err);
    // Fallback: return raw texts (old behavior)
    return { rawTexts, segmentedWords: rawTexts, unknownWords: [], curriculumWords: [] };
  }
}

/**
 * Recursively extract Chinese text from any object
 */
function extractFromObject(obj: any, words: Set<string>): void {
  if (!obj) return;

  if (typeof obj === 'string') {
    // Extract Chinese characters from string
    const matches = obj.match(CHINESE_CHAR_REGEX);
    if (matches) {
      matches.forEach(match => words.add(match));
    }
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractFromObject(item, words);
    }
    return;
  }

  if (typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      extractFromObject(value, words);
    }
  }
}

/**
 * Get a summary of vocabulary coverage for a story
 */
export function getStoryCoverage(story: StoryWithDetails): {
  totalSentences: number;
  totalCharacters: number;
  uniqueTexts: number;
} {
  const sentences = story.sentences || [];
  const uniqueWords = extractStoryWords(story);
  
  let totalCharacters = 0;
  for (const sentence of sentences) {
    if (sentence.chinese) {
      totalCharacters += sentence.chinese.replace(/[^\u4e00-\u9fff]/g, '').length;
    }
  }

  return {
    totalSentences: sentences.length,
    totalCharacters,
    uniqueTexts: uniqueWords.length,
  };
}

