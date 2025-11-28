/**
 * Text splitter for story segments
 * 
 * Splits text on sentence-ending punctuation:
 * - Chinese: 。 ！ ？
 * - English: . ! ?
 * 
 * Does NOT split on commas (，,) by default.
 */

// Sentence-ending punctuation
const SPLIT_CHARS = /([。！？.!?])/;

/**
 * Split text into segments based on sentence-ending punctuation
 * Keeps the punctuation attached to the sentence
 */
export function splitIntoSegments(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Split by punctuation but keep the delimiters
  const parts = text.split(SPLIT_CHARS);
  
  const segments: string[] = [];
  let current = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (SPLIT_CHARS.test(part)) {
      // This is a punctuation mark - attach to current segment
      current += part;
      const trimmed = current.trim();
      if (trimmed) {
        segments.push(trimmed);
      }
      current = '';
    } else {
      // This is text content
      current += part;
    }
  }
  
  // Handle any remaining text without ending punctuation
  const remaining = current.trim();
  if (remaining) {
    segments.push(remaining);
  }
  
  return segments;
}

/**
 * Check if text contains Chinese characters
 */
export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Estimate segment count without splitting
 */
export function estimateSegmentCount(text: string): number {
  if (!text || !text.trim()) return 0;
  
  const matches = text.match(/[。！？.!?]/g);
  return matches ? matches.length : 1;
}

