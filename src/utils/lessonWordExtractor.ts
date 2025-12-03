/**
 * Lesson Word Extractor
 * 
 * Scans all blocks in a lesson and extracts unique Chinese characters/words
 * for vocabulary health checking.
 */

import type { ContentBlock } from '@/types/lesson';

// Regex to match Chinese characters (CJK Unified Ideographs)
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]+/g;

/**
 * Extract all unique Chinese words/characters from a lesson's blocks
 */
export function extractLessonWords(blocks: ContentBlock[]): string[] {
  const words = new Set<string>();

  for (const block of blocks) {
    const content = (block as any).content;
    if (!content) continue;

    // Recursively extract Chinese text from content
    extractFromObject(content, words);
  }

  return Array.from(words).sort();
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
    obj.forEach(item => extractFromObject(item, words));
    return;
  }

  if (typeof obj === 'object') {
    // Skip certain keys that shouldn't be processed
    const skipKeys = ['id', 'audioUrl', 'audioR2Key', 'imageUrl', 'icon', 'type'];
    
    for (const [key, value] of Object.entries(obj)) {
      if (skipKeys.includes(key)) continue;
      extractFromObject(value, words);
    }
  }
}

/**
 * Extract words with their source block info (for debugging)
 */
export function extractLessonWordsWithSource(blocks: ContentBlock[]): Array<{
  word: string;
  blockId: string;
  blockType: string;
  field: string;
}> {
  const results: Array<{
    word: string;
    blockId: string;
    blockType: string;
    field: string;
  }> = [];

  for (const block of blocks) {
    const content = (block as any).content;
    if (!content) continue;

    extractFromObjectWithPath(content, '', block.id, block.type, results);
  }

  return results;
}

function extractFromObjectWithPath(
  obj: any,
  path: string,
  blockId: string,
  blockType: string,
  results: Array<{ word: string; blockId: string; blockType: string; field: string }>
): void {
  if (!obj) return;

  if (typeof obj === 'string') {
    const matches = obj.match(CHINESE_CHAR_REGEX);
    if (matches) {
      matches.forEach(match => {
        results.push({
          word: match,
          blockId,
          blockType,
          field: path,
        });
      });
    }
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      extractFromObjectWithPath(item, `${path}[${idx}]`, blockId, blockType, results);
    });
    return;
  }

  if (typeof obj === 'object') {
    const skipKeys = ['id', 'audioUrl', 'audioR2Key', 'imageUrl', 'icon', 'type'];
    
    for (const [key, value] of Object.entries(obj)) {
      if (skipKeys.includes(key)) continue;
      const newPath = path ? `${path}.${key}` : key;
      extractFromObjectWithPath(value, newPath, blockId, blockType, results);
    }
  }
}

