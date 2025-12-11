/**
 * Extract all Chinese vocabulary words from lesson blocks
 * Used to provide distractor suggestions from lesson content (even before DB save)
 */

import type { ContentBlock } from '@/types/lesson';

export interface LessonWord {
  hanzi: string;
  pinyin?: string;
  english?: string;
  source: 'lesson'; // Mark as from lesson, not DB
}

/**
 * Check if a string contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Extract Chinese text from a string, filtering out non-Chinese parts
 */
function extractChineseOnly(text: string): string {
  return text.replace(/[^\u4e00-\u9fff]/g, '');
}

/**
 * Extract all unique Chinese words from lesson blocks
 * Returns deduplicated array of LessonWord objects
 */
export function extractLessonVocab(blocks: ContentBlock[]): LessonWord[] {
  const seen = new Set<string>();
  const words: LessonWord[] = [];

  const addWord = (hanzi: string, pinyin?: string, english?: string) => {
    if (!hanzi || !containsChinese(hanzi)) return;
    
    // Clean the hanzi - extract only Chinese characters
    const cleanHanzi = extractChineseOnly(hanzi);
    if (!cleanHanzi || seen.has(cleanHanzi)) return;
    
    seen.add(cleanHanzi);
    words.push({
      hanzi: cleanHanzi,
      pinyin: pinyin?.trim(),
      english: english?.trim(),
      source: 'lesson',
    });
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'intro': {
        const content = block.content as {
          heroHanzi?: string;
          exampleSentence?: { hanzi: string; pinyin?: string; translation?: string };
        };
        if (content.heroHanzi) addWord(content.heroHanzi);
        if (content.exampleSentence?.hanzi) {
          addWord(content.exampleSentence.hanzi, content.exampleSentence.pinyin, content.exampleSentence.translation);
        }
        break;
      }

      case 'hero_hanzi': {
        const content = block.content as { hanzi: string; pinyin?: string; translation?: string };
        addWord(content.hanzi, content.pinyin, content.translation);
        break;
      }

      case 'pattern': {
        const content = block.content as {
          examples?: Array<{ hanzi: string; pinyin?: string; translation?: string }>;
        };
        content.examples?.forEach(ex => addWord(ex.hanzi, ex.pinyin, ex.translation));
        break;
      }

      case 'exercise_multiple_choice': {
        const content = block.content as {
          questionHanzi?: string;
          options?: Array<{ text: string }>;
        };
        if (content.questionHanzi) addWord(content.questionHanzi);
        content.options?.forEach(opt => {
          if (opt.text && containsChinese(opt.text)) {
            addWord(opt.text);
          }
        });
        break;
      }

      case 'exercise_build_sentence': {
        const content = block.content as {
          correctOrder?: string[];
          wordPool?: string[];
        };
        content.correctOrder?.forEach(word => addWord(word));
        content.wordPool?.forEach(word => addWord(word));
        break;
      }

      case 'exercise_spot_error': {
        const content = block.content as { words?: string[] };
        content.words?.forEach(word => addWord(word));
        break;
      }

      case 'exercise_drag_sentence': {
        const content = block.content as {
          sentenceHanzi?: string;
          segments?: Array<{ hanzi: string; pinyin?: string; english?: string }>;
        };
        if (content.sentenceHanzi) addWord(content.sentenceHanzi);
        content.segments?.forEach(seg => addWord(seg.hanzi, seg.pinyin, seg.english));
        break;
      }

      case 'dialogue': {
        const content = block.content as {
          lines?: Array<{ hanzi: string; pinyin?: string; translation?: string }>;
        };
        content.lines?.forEach(line => addWord(line.hanzi, line.pinyin, line.translation));
        break;
      }

      case 'reading_passage': {
        const content = block.content as {
          paragraphs?: Array<{ hanzi: string; pinyin?: string; translation?: string }>;
        };
        content.paragraphs?.forEach(p => addWord(p.hanzi, p.pinyin, p.translation));
        break;
      }

      case 'speaking_practice':
      case 'speech_practice_v2': {
        const content = block.content as { text?: string; pinyin?: string; meaning?: string };
        if (content.text) addWord(content.text, content.pinyin, content.meaning);
        break;
      }

      case 'explain': {
        const content = block.content as { 
          examples?: Array<{ hanzi: string; pinyin?: string; translation?: string }>;
        };
        content.examples?.forEach(ex => addWord(ex.hanzi, ex.pinyin, ex.translation));
        break;
      }
    }
  }

  return words;
}

/**
 * Filter lesson words by search query
 * Matches against hanzi, pinyin, or english
 */
export function filterLessonWords(words: LessonWord[], query: string): LessonWord[] {
  if (!query.trim()) return words;
  
  const q = query.toLowerCase().trim();
  
  return words.filter(w => 
    w.hanzi.includes(q) ||
    w.pinyin?.toLowerCase().includes(q) ||
    w.english?.toLowerCase().includes(q)
  );
}

