import type { BlockType, ContentBlock } from "@/types/lesson";

export const createDefaultBlock = (type: BlockType): ContentBlock => {
  const id = crypto.randomUUID();
  const base = { id, type };

  switch (type) {
    case 'intro':
      return {
        ...base,
        type: 'intro',
        content: {
          titleEn: 'New Lesson',
          introText: 'Introduction text here...',
          primaryLabel: 'Start Lesson'
        }
      };
    case 'hero_hanzi':
      return {
        ...base,
        type: 'hero_hanzi',
        content: {
          hanzi: '你好',
          pinyin: 'nǐ hǎo',
          translation: 'Hello'
        }
      };
    case 'explain':
      return {
        ...base,
        type: 'explain',
        content: {
          title: 'Explanation',
          markdown: 'Write your explanation here...'
        }
      };
    case 'tip':
      return {
        ...base,
        type: 'tip',
        content: {
          markdown: 'Helpful tip here...',
          icon: '💡'
        }
      };
    case 'pattern':
      return {
        ...base,
        type: 'pattern',
        content: {
          title: 'Grammar Pattern',
          template: 'Subject + Verb + Object',
          examples: []
        }
      };
    case 'exercise_multiple_choice':
      return {
        ...base,
        type: 'exercise_multiple_choice',
        content: {
          question: 'Question text?',
          options: [
            { id: crypto.randomUUID(), text: 'Option 1', isCorrect: true },
            { id: crypto.randomUUID(), text: 'Option 2', isCorrect: false }
          ]
        }
      };
    case 'exercise_drag_sentence':
      return {
        ...base,
        type: 'exercise_drag_sentence',
        content: {
          instruction: 'Arrange the words',
          correctOrder: ['Word 1', 'Word 2'],
          wordPool: ['Word 1', 'Word 2', 'Distractor']
        }
      };
    case 'exercise_spot_error':
      return {
        ...base,
        type: 'exercise_spot_error',
        content: {
          question: 'Find the incorrect word',
          words: ['This', 'is', 'wrong', 'sentence'],
          incorrectWordIndex: 2
        }
      };
    case 'exercise_build_sentence':
      return {
        ...base,
        type: 'exercise_build_sentence',
        content: {
          instruction: 'Fill in the blanks',
          slots: [{ content: null, isFixed: false }],
          correctSentence: ['Answer'],
          phrasePool: ['Answer']
        }
      };
    case 'reading_passage':
      return {
        ...base,
        type: 'reading_passage',
        content: {
          instruction: 'Read the text',
          paragraphs: [{ hanzi: '中文', pinyin: 'zhōng wén', translation: 'Chinese' }]
        }
      };
    case 'reading_comprehension':
      return {
        ...base,
        type: 'reading_comprehension',
        content: {
          instruction: 'Answer questions',
          questions: []
        }
      };
    case 'speaking_practice':
      return {
        ...base,
        type: 'speaking_practice',
        content: {
          instruction: 'Speak aloud',
          target_text: '你好',
          target_pinyin: 'nǐ hǎo',
          target_english: 'Hello'
        }
      };
    case 'speech_practice_v2':
      return {
        ...base,
        type: 'speech_practice_v2',
        content: {
          instruction: 'Listen and repeat',
          text: '你好',
          pinyin: 'nǐ hǎo',
          meaning: 'Hello',
          segments: [
            { word: '你', pinyin: 'nǐ', writtenTone: 3, actualTone: 2, startMs: 0, endMs: 400 },
            { word: '好', pinyin: 'hǎo', writtenTone: 3, actualTone: 3, startMs: 400, endMs: 800 }
          ],
          audioDurationMs: 800
        }
      };
    case 'dialogue':
      return {
        ...base,
        type: 'dialogue',
        content: {
          scenario: 'Conversation',
          exchanges: []
        }
      };
    case 'celebration':
      return {
        ...base,
        type: 'celebration',
        content: {
          message: 'Lesson Complete!'
        }
      };
    default:
      throw new Error(`Unknown block type: ${type}`);
  }
};

