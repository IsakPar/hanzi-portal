/**
 * Story Practice Block Adapter
 * 
 * Converts between Story's simpler practice block format
 * and Lesson's ContentBlock format for reusing BlockEditor.
 * 
 * Story Format → Lesson Format (for editing)
 * Lesson Format → Story Format (for saving)
 */

import type { ContentBlock, ExerciseMultipleChoiceBlock, ExerciseDragSentenceBlock, ExerciseSpotErrorBlock, ReadingComprehensionBlock } from '@/types/lesson';

// ═══════════════════════════════════════════════════════════
// STORY PRACTICE BLOCK TYPES
// ═══════════════════════════════════════════════════════════

export interface StoryMultipleChoice {
  id: string;
  type: 'exercise_multiple_choice';
  content: {
    question: string;
    questionChinese?: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
  };
}

export interface StoryDragSentence {
  id: string;
  type: 'exercise_drag_sentence';
  content: {
    targetSentence: string;
    translation: string;
    words?: string[];
  };
}

export interface StorySpotError {
  id: string;
  type: 'exercise_spot_error';
  content: {
    sentence: string;
    errorWord: string;
    correctWord: string;
    explanation?: string;
  };
}

export interface StoryReadingComprehension {
  id: string;
  type: 'reading_comprehension';
  content: {
    questions: Array<{
      question: string;
      questionChinese?: string;
      answer: string;
    }>;
  };
}

export type StoryPracticeBlock = 
  | StoryMultipleChoice 
  | StoryDragSentence 
  | StorySpotError 
  | StoryReadingComprehension;

// ═══════════════════════════════════════════════════════════
// STORY → LESSON CONVERSION
// ═══════════════════════════════════════════════════════════

const nanoid = () => Math.random().toString(36).substring(2, 12);

/**
 * Convert a Story practice block to a Lesson ContentBlock for editing
 */
export function storyToLessonBlock(storyBlock: StoryPracticeBlock): ContentBlock {
  switch (storyBlock.type) {
    case 'exercise_multiple_choice': {
      const { content } = storyBlock;
      return {
        id: storyBlock.id,
        type: 'exercise_multiple_choice',
        content: {
          question: content.question,
          questionHanzi: content.questionChinese,
          options: (content.options || []).map((text, idx) => ({
            id: nanoid(),
            text,
            isCorrect: idx === content.correctIndex,
          })),
          explanation: content.explanation,
        },
      } as ExerciseMultipleChoiceBlock;
    }

    case 'exercise_drag_sentence': {
      const { content } = storyBlock;
      // Split target sentence into individual words for the lesson format
      // Use stored words if available, otherwise segment the sentence
      const words = content.words && content.words.length > 0 
        ? content.words 
        : segmentIntoWords(content.targetSentence);
      return {
        id: storyBlock.id,
        type: 'exercise_drag_sentence',
        content: {
          instruction: content.translation,
          correctOrder: words,
          wordPool: [...words].sort(() => Math.random() - 0.5), // Shuffle
          hint: content.translation,
        },
      } as ExerciseDragSentenceBlock;
    }

    case 'exercise_spot_error': {
      const { content } = storyBlock;
      // Split sentence into words and find error index
      const words = segmentChinese(content.sentence);
      const errorIdx = words.findIndex(w => w === content.errorWord);
      return {
        id: storyBlock.id,
        type: 'exercise_spot_error',
        content: {
          question: content.sentence,
          words,
          incorrectWordIndex: errorIdx >= 0 ? errorIdx : 0,
          explanation: content.explanation,
        },
      } as ExerciseSpotErrorBlock;
    }

    case 'reading_comprehension': {
      const { content } = storyBlock;
      return {
        id: storyBlock.id,
        type: 'reading_comprehension',
        content: {
          instruction: 'Answer the following questions:',
          questions: (content.questions || []).map(q => ({
            question: q.question,
            choices: [
              { text: q.answer, isCorrect: true },
              { text: 'Other option...', isCorrect: false },
            ],
          })),
        },
      } as ReadingComprehensionBlock;
    }

    default:
      // Return as-is if unknown type
      return storyBlock as unknown as ContentBlock;
  }
}

// ═══════════════════════════════════════════════════════════
// LESSON → STORY CONVERSION
// ═══════════════════════════════════════════════════════════

/**
 * Convert a Lesson ContentBlock back to Story practice block format for saving
 */
export function lessonToStoryBlock(lessonBlock: ContentBlock): StoryPracticeBlock {
  switch (lessonBlock.type) {
    case 'exercise_multiple_choice': {
      const block = lessonBlock as ExerciseMultipleChoiceBlock;
      const correctIdx = block.content.options.findIndex(o => o.isCorrect);
      return {
        id: block.id,
        type: 'exercise_multiple_choice',
        content: {
          question: block.content.question,
          questionChinese: block.content.questionHanzi,
          options: block.content.options.map(o => o.text),
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          explanation: block.content.explanation,
        },
      };
    }

    case 'exercise_drag_sentence': {
      const block = lessonBlock as ExerciseDragSentenceBlock;
      return {
        id: block.id,
        type: 'exercise_drag_sentence',
        content: {
          targetSentence: block.content.correctOrder.join(''),
          translation: block.content.instruction || block.content.hint || '',
          words: block.content.correctOrder,
        },
      };
    }

    case 'exercise_spot_error': {
      const block = lessonBlock as ExerciseSpotErrorBlock;
      const errorWord = block.content.words[block.content.incorrectWordIndex] || '';
      return {
        id: block.id,
        type: 'exercise_spot_error',
        content: {
          sentence: block.content.question,
          errorWord,
          correctWord: '', // Need to keep this from the original
          explanation: block.content.explanation,
        },
      };
    }

    case 'reading_comprehension': {
      const block = lessonBlock as ReadingComprehensionBlock;
      return {
        id: block.id,
        type: 'reading_comprehension',
        content: {
          questions: (block.content.questions || []).map(q => ({
            question: q.question,
            answer: q.choices.find(c => c.isCorrect)?.text || '',
          })),
        },
      };
    }

    default:
      return lessonBlock as unknown as StoryPracticeBlock;
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Segment Chinese text into individual characters/words
 * For drag sentence exercises, we split character-by-character
 * (excluding punctuation) which works well for HSK1-3 content
 */
function segmentChinese(text: string): string[] {
  if (!text) return [];
  
  // Remove punctuation and whitespace
  const cleaned = text.replace(/[，。！？、：；""''（）,.\s!?]/g, '');
  
  if (!cleaned) return [];
  
  // Split into individual characters
  // This is appropriate for beginner Chinese (HSK1-3)
  // where learners arrange characters into words/sentences
  return cleaned.split('');
}

/**
 * Try to segment by common 2-3 character word patterns
 * Fallback: character-by-character
 */
function segmentIntoWords(text: string): string[] {
  if (!text) return [];
  
  // Remove punctuation
  const cleaned = text.replace(/[，。！？、：；""''（）,.\s!?]/g, '');
  
  if (!cleaned) return [];
  
  // Common HSK1-2 words to keep together
  const commonWords = [
    '早上', '晚上', '下午', '中午', '上午',
    '你好', '谢谢', '对不起', '没关系', '再见',
    '我们', '他们', '她们', '你们',
    '什么', '怎么', '为什么', '哪里', '那里', '这里',
    '喜欢', '可以', '知道', '学习', '工作',
    '早饭', '午饭', '晚饭', '吃饭',
    '学生', '老师', '朋友', '同学',
    '现在', '今天', '明天', '昨天',
    '高兴', '漂亮', '好吃',
  ];
  
  const words: string[] = [];
  let remaining = cleaned;
  
  while (remaining.length > 0) {
    let matched = false;
    
    // Try to match common 2-3 character words first
    for (const word of commonWords) {
      if (remaining.startsWith(word)) {
        words.push(word);
        remaining = remaining.slice(word.length);
        matched = true;
        break;
      }
    }
    
    // If no common word matched, take one character
    if (!matched) {
      words.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }
  
  return words;
}

/**
 * Check if a block type is supported for story practice
 */
export function isSupportedPracticeType(type: string): boolean {
  return [
    'exercise_multiple_choice',
    'reading_comprehension',
    'exercise_drag_sentence',
    'exercise_spot_error',
  ].includes(type);
}

