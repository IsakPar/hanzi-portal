/**
 * Chinese Tone Sandhi Detection
 * 
 * Automatically detects and applies tone sandhi rules to pinyin.
 * Sandhi = tone changes that occur when certain tones are spoken together.
 */

import type { SpeechSegment } from '@/types/lesson';

/**
 * Common Chinese tone sandhi rules:
 * 
 * 1. Third tone sandhi: When two 3rd tones occur in sequence,
 *    the first one changes to 2nd tone.
 *    Example: 你好 (nǐ hǎo) → ní hǎo
 * 
 * 2. 不 (bù) sandhi: Before a 4th tone, 不 changes to 2nd tone.
 *    Example: 不是 (bù shì) → bú shì
 * 
 * 3. 一 (yī) sandhi:
 *    - Before 4th tone → 2nd tone: 一个 (yī gè) → yí gè
 *    - Before 1st/2nd/3rd tone → 4th tone: 一天 (yī tiān) → yì tiān
 */

/**
 * Extract tone number from pinyin syllable.
 * Uses the tone marks: ā(1), á(2), ǎ(3), à(4), a(0/5)
 */
export function extractToneFromPinyin(pinyin: string): 0 | 1 | 2 | 3 | 4 {
  const toneMarks: Record<string, number> = {
    'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4,
    'ē': 1, 'é': 2, 'ě': 3, 'è': 4,
    'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
    'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
    'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4,
    'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4,
  };
  
  for (const char of pinyin) {
    if (toneMarks[char] !== undefined) {
      return toneMarks[char] as 0 | 1 | 2 | 3 | 4;
    }
  }
  
  // No tone mark found - neutral tone
  return 0;
}

/**
 * Apply tone sandhi rules to a sequence of segments.
 * Updates the actualTone field based on context.
 */
export function applySandhiRules(segments: SpeechSegment[]): SpeechSegment[] {
  if (segments.length === 0) return segments;
  
  const result = segments.map(seg => ({ ...seg }));
  
  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    const next = result[i + 1];
    
    // Start with written tone as actual
    current.actualTone = current.writtenTone;
    
    // Rule 1: Third tone sandhi (3 + 3 → 2 + 3)
    if (current.writtenTone === 3 && next?.writtenTone === 3) {
      current.actualTone = 2;
    }
    
    // Rule 2: 不 (bù) sandhi - before 4th tone becomes 2nd
    if (current.word === '不' && current.writtenTone === 4 && next?.writtenTone === 4) {
      current.actualTone = 2;
    }
    
    // Rule 3: 一 (yī) sandhi
    if (current.word === '一' && current.writtenTone === 1 && next) {
      if (next.writtenTone === 4) {
        // Before 4th tone → 2nd tone
        current.actualTone = 2;
      } else if (next.writtenTone === 1 || next.writtenTone === 2 || next.writtenTone === 3) {
        // Before 1st/2nd/3rd tone → 4th tone
        current.actualTone = 4;
      }
    }
  }
  
  return result;
}

/**
 * Check if sandhi was applied to a segment.
 */
export function hasSandhiApplied(segment: SpeechSegment): boolean {
  return segment.writtenTone !== segment.actualTone;
}

/**
 * Get a description of the sandhi rule applied.
 */
export function getSandhiDescription(segment: SpeechSegment): string | null {
  if (!hasSandhiApplied(segment)) return null;
  
  if (segment.writtenTone === 3 && segment.actualTone === 2) {
    return 'Third tone sandhi: tone 3 → tone 2 (before another tone 3)';
  }
  
  if (segment.word === '不' && segment.actualTone === 2) {
    return '不 sandhi: tone 4 → tone 2 (before tone 4)';
  }
  
  if (segment.word === '一') {
    if (segment.actualTone === 2) {
      return '一 sandhi: tone 1 → tone 2 (before tone 4)';
    }
    if (segment.actualTone === 4) {
      return '一 sandhi: tone 1 → tone 4 (before tone 1/2/3)';
    }
  }
  
  return `Tone changed: ${segment.writtenTone} → ${segment.actualTone}`;
}

/**
 * Split Chinese text into individual characters.
 */
export function splitChineseText(text: string): string[] {
  // Filter out whitespace and punctuation
  return text.split('').filter(char => {
    const code = char.charCodeAt(0);
    // Chinese characters range: 0x4E00 - 0x9FFF
    return code >= 0x4E00 && code <= 0x9FFF;
  });
}

/**
 * Split pinyin string into syllables.
 * Handles space-separated and continuous pinyin.
 */
export function splitPinyin(pinyin: string): string[] {
  // If space-separated, use that
  const spaceSplit = pinyin.trim().split(/\s+/);
  if (spaceSplit.length > 1) {
    return spaceSplit;
  }
  
  // Otherwise, try to split by tone marks or capitals
  // This is a simplified approach - real pinyin parsing is complex
  const syllables: string[] = [];
  let current = '';
  
  for (let i = 0; i < pinyin.length; i++) {
    const char = pinyin[i];
    
    // Check if this is a tone mark (end of syllable)
    const isToneMark = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'.includes(char);
    
    current += char;
    
    // If we hit a tone mark or the next char is uppercase, end syllable
    if (isToneMark) {
      // Include any trailing consonant (n, ng, r)
      while (i + 1 < pinyin.length && 'ngrNGR'.includes(pinyin[i + 1])) {
        i++;
        current += pinyin[i];
      }
      syllables.push(current);
      current = '';
    }
  }
  
  if (current) {
    syllables.push(current);
  }
  
  return syllables;
}

/**
 * Generate initial segments from text and pinyin.
 * Distributes timing evenly across the audio duration.
 */
export function generateInitialSegments(
  text: string,
  pinyin: string,
  durationMs: number
): SpeechSegment[] {
  const characters = splitChineseText(text);
  const pinyinSyllables = splitPinyin(pinyin);
  
  // Ensure we have matching counts (use min if mismatched)
  const count = Math.min(characters.length, pinyinSyllables.length);
  
  if (count === 0) return [];
  
  const segmentDuration = durationMs / count;
  
  const segments: SpeechSegment[] = [];
  
  for (let i = 0; i < count; i++) {
    const syllable = pinyinSyllables[i] || '';
    const tone = extractToneFromPinyin(syllable);
    
    segments.push({
      word: characters[i],
      pinyin: syllable,
      writtenTone: tone,
      actualTone: tone, // Will be updated by sandhi
      startMs: Math.round(i * segmentDuration),
      endMs: Math.round((i + 1) * segmentDuration),
    });
  }
  
  // Apply sandhi rules
  return applySandhiRules(segments);
}

