/**
 * Chinese NLP Utilities
 * Provides pinyin conversion and word segmentation using pinyin-pro
 * NOTE: Word segmentation is disabled in browser - use backend API instead
 */

import { pinyin } from 'pinyin-pro';
import { logger } from '@/utils/logger';

/**
 * Check if a string contains pinyin (lowercase letters with optional numbers/tone marks)
 */
export function isPinyin(input: string): boolean {
  // Pinyin contains only: a-z, spaces, tone marks (āáǎà), and optional tone numbers (1-4)
  const pinyinRegex = /^[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ\s1-4]+$/;
  return pinyinRegex.test(input.trim());
}

/**
 * Check if a string contains Chinese characters
 */
export function hasChinese(input: string): boolean {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(input);
}

/**
 * Convert hanzi to pinyin with tone marks
 */
export function hanziToPinyin(hanzi: string, options?: {
  toneType?: 'symbol' | 'num' | 'none';
  separator?: string;
}): string {
  return pinyin(hanzi, {
    toneType: options?.toneType || 'symbol',
    separator: options?.separator || ' ',
  });
}

/**
 * Get pinyin suggestions for a given pinyin input
 * Returns possible hanzi characters with their pinyin and frequency
 * NOTE: Currently returns empty array - database lookup is prioritized in HanziInput component
 */
export function getPinyinSuggestions(): Array<{
  hanzi: string;
  pinyin: string;
  frequency: 'common' | 'uncommon' | 'rare';
}> {
  // pinyin-pro doesn't have a direct "pinyin to hanzi" function
  // We use database lookup in HanziInput component instead
  return [];
}

/**
 * Segment Chinese text into words
 * BROWSER VERSION: Simple character-based segmentation
 * For production, use backend API with proper NLP
 */
export function segmentChinese(text: string): Array<{
  text: string;
  start: number;
  end: number;
}> {
  if (!text || !hasChinese(text)) {
    return [];
  }

  try {
    // Simple character-based segmentation for browser
    // In production, this should call the backend API
    const chars = text.split('');
    return chars.map((char, i) => ({
      text: char,
      start: i,
      end: i + 1
    }));
  } catch (error) {
    logger.error('Error segmenting Chinese text:', error);
    return [];
  }
}

/**
 * Extract unique words from multiple sentences
 */
export function extractUniqueWords(sentences: string[]): string[] {
  const allWords = sentences.flatMap(sentence => 
    segmentChinese(sentence).map(seg => seg.text)
  );
  
  // Filter out punctuation and single-character particles
  const filtered = allWords.filter(word => {
    if (!hasChinese(word)) return false;
    // Keep all multi-character words
    if (word.length > 1) return true;
    // Filter out common single-character particles
    const particles = ['的', '了', '吗', '呢', '啊', '吧', '呀', '啦'];
    return !particles.includes(word);
  });
  
  return [...new Set(filtered)];
}

/**
 * Generate pinyin with tone numbers from pinyin with tone marks
 * Example: "nǐ hǎo" → "ni3 hao3"
 */
export function toneMarksToNumbers(pinyinWithMarks: string): string {
  const toneMap: Record<string, string> = {
    'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
    'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
    'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
    'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
    'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
    'ǖ': 'u:1', 'ǘ': 'u:2', 'ǚ': 'u:3', 'ǜ': 'u:4',
  };
  
  let result = pinyinWithMarks;
  for (const [mark, num] of Object.entries(toneMap)) {
    result = result.replace(new RegExp(mark, 'g'), num);
  }
  return result;
}

/**
 * Validate pinyin format
 */
export function validatePinyin(input: string): {
  valid: boolean;
  error?: string;
} {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Pinyin cannot be empty' };
  }
  
  if (!isPinyin(input)) {
    return { valid: false, error: 'Invalid pinyin format. Use letters a-z with tone marks or numbers.' };
  }
  
  return { valid: true };
}

/**
 * Format pinyin for display (ensure consistent spacing and capitalization)
 */
export function formatPinyin(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
}

/**
 * Calculate similarity between two pinyin strings (for fuzzy matching)
 * Returns a score between 0 (no match) and 1 (perfect match)
 */
export function pinyinSimilarity(pinyin1: string, pinyin2: string): number {
  const p1 = formatPinyin(pinyin1);
  const p2 = formatPinyin(pinyin2);
  
  if (p1 === p2) return 1;
  if (p1.startsWith(p2) || p2.startsWith(p1)) return 0.8;
  
  // Simple Levenshtein distance for fuzzy matching
  const len1 = p1.length;
  const len2 = p2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = p1[i - 1] === p2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Generate a SHA-256 hash of a string (for content versioning)
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Bump semantic version (for exports)
 * Examples: '1.0.0' → '1.0.1', '1.0.9' → '1.0.10'
 */
export function bumpVersion(currentVersion: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

