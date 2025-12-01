/**
 * 📖 Lesson Types
 * Synced with Backend V2 Schema & Mobile App Block Types
 */

// ==================== BLOCK TYPES ====================

export type BlockType =
  | 'intro'
  | 'hero_hanzi'
  | 'explain'
  | 'tip'
  | 'pattern'
  | 'exercise_drag_sentence'
  | 'exercise_multiple_choice'
  | 'exercise_spot_error'
  | 'exercise_build_sentence'
  | 'reading_passage'
  | 'reading_comprehension'
  | 'speaking_practice'
  | 'speech_practice_v2'  // NEW: Advanced speech with tone scoring
  | 'dialogue'
  | 'celebration';

export interface BaseBlock {
  id: string;
  type: BlockType;
  // orderIndex is handled by the array order in the UI, but stored explicitly in DB
  orderIndex?: number; 
}

// ==================== INTRO BLOCK ====================

export interface IntroBlock extends BaseBlock {
  type: 'intro';
  content: {
    heroHanzi?: string;
    titleEn: string;
    introText: string;
    exampleSentence?: {
      hanzi: string;
      pinyin?: string;
      translation: string;
      audioUrl?: string;
    };
    primaryLabel?: string;
    secondaryAction?: {
      label: string;
    };
  };
}

// ==================== HERO HANZI BLOCK ====================

export interface HeroHanziBlock extends BaseBlock {
  type: 'hero_hanzi';
  content: {
    hanzi: string;
    pinyin: string;
    translation: string;
    audioUrl?: string;
  };
}

// ==================== EXPLAIN BLOCK ====================

export interface ExplainBlock extends BaseBlock {
  type: 'explain';
  content: {
    title: string;
    markdown: string; // Changed from 'content' to avoid naming collision
    icon?: string;
  };
}

// ==================== TIP BLOCK ====================

export interface TipBlock extends BaseBlock {
  type: 'tip';
  content: {
    markdown: string;
    icon?: string;
  };
}

// ==================== PATTERN BLOCK ====================

export interface PatternBlock extends BaseBlock {
  type: 'pattern';
  content: {
    title: string;
    template: string;
    examples: Array<{
      hanzi: string;
      pinyin: string;
      translation: string;
      audioUrl?: string;
    }>;
  };
}

// ==================== EXERCISE BLOCKS ====================

export interface ExerciseMultipleChoiceBlock extends BaseBlock {
  type: 'exercise_multiple_choice';
  content: {
    question: string;
    questionHanzi?: string;
    questionPinyin?: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      audioUrl?: string; // ElevenLabs generated audio for this option
    }>;
    explanation?: string;
  };
}

export interface ExerciseDragSentenceBlock extends BaseBlock {
  type: 'exercise_drag_sentence';
  content: {
    instruction: string;
    correctOrder: string[];
    wordPool: string[];
    hint?: string;
    explanation?: string;
  };
}

export interface ExerciseSpotErrorBlock extends BaseBlock {
  type: 'exercise_spot_error';
  content: {
    question: string;
    words: string[];
    incorrectWordIndex: number;
    hint?: string;
    explanation?: string;
  };
}

export interface SentenceSlot {
  content: string | null;
  isFixed: boolean;
}

export interface ExerciseBuildSentenceBlock extends BaseBlock {
  type: 'exercise_build_sentence';
  content: {
    instruction: string;
    slots: SentenceSlot[];
    correctSentence: string[];
    phrasePool: string[];
    hint?: string;
    explanation?: string;
  };
}

// ==================== READING BLOCKS ====================

export interface TextParagraph {
  hanzi: string;
  pinyin?: string;
  translation: string;
  audioUrl?: string;
}

export interface ReadingPassageBlock extends BaseBlock {
  type: 'reading_passage';
  content: {
    instruction: string;
    paragraphs: TextParagraph[];
  };
}

export interface ComprehensionChoice {
  text: string;
  isCorrect: boolean;
  audioUrl?: string;
}

export interface ComprehensionQuestion {
  question: string;
  choices: ComprehensionChoice[];
}

export interface ReadingComprehensionBlock extends BaseBlock {
  type: 'reading_comprehension';
  content: {
    instruction: string;
    questions: ComprehensionQuestion[];
    explanation?: string;
  };
}

// ==================== SPEAKING & DIALOGUE ====================

export interface SpeakingPracticeBlock extends BaseBlock {
  type: 'speaking_practice';
  content: {
    instruction: string;
    target_text: string;
    target_pinyin: string;
    target_english: string;
    reference_audio_url?: string;
    hint?: string;
    is_mandatory?: boolean;
  };
}

// ==================== SPEECH PRACTICE V2 (Advanced with Tone Scoring) ====================

/**
 * Speech segment with timestamps for per-word tone analysis.
 * Timestamps are marked via waveform editor in the portal.
 */
export interface SpeechSegment {
  word: string;                        // Single character: "你"
  pinyin: string;                      // With tone marks: "nǐ"
  writtenTone: 0 | 1 | 2 | 3 | 4;     // Tone as written (0 = neutral)
  actualTone: 0 | 1 | 2 | 3 | 4;      // Actual spoken tone (after sandhi)
  startMs: number;                     // Start time in audio (ms)
  endMs: number;                       // End time in audio (ms)
}

/**
 * Speech Practice V2 Block
 * 
 * Advanced pronunciation practice with:
 * - Per-word timestamps for scoring
 * - Tone sandhi handling
 * - Pre-computed pitch data for comparison
 */
export interface SpeechPracticeV2Block extends BaseBlock {
  type: 'speech_practice_v2';
  content: {
    // Basic content
    instruction: string;               // "Repeat this phrase"
    text: string;                      // Full Chinese text: "你好"
    pinyin: string;                    // Full pinyin: "nǐ hǎo"
    meaning: string;                   // English meaning: "Hello"
    
    // Audio
    audioUrl?: string;                 // ElevenLabs reference audio
    audioDurationMs?: number;          // Duration of audio in ms
    
    // Segments for scoring (marked via waveform editor)
    segments: SpeechSegment[];
    
    // Optional
    hint?: string;
    isMandatory?: boolean;             // Must pass to continue
  };
}

export interface DialogueBlock extends BaseBlock {
  type: 'dialogue';
  content: {
    scenario?: string;
    scenario_icon?: string;
    exchanges: Array<{
      speaker: string;
      text: string;
      pinyin: string;
      translation: string;
      audioUrl?: string;
    }>;
  };
}

// ==================== CELEBRATION ====================

export interface CelebrationBlock extends BaseBlock {
  type: 'celebration';
  content: {
    message?: string;
  };
}

// ==================== UNION TYPE ====================

export type ContentBlock =
  | IntroBlock
  | HeroHanziBlock
  | ExplainBlock
  | TipBlock
  | PatternBlock
  | ExerciseDragSentenceBlock
  | ExerciseMultipleChoiceBlock
  | ExerciseSpotErrorBlock
  | ExerciseBuildSentenceBlock
  | ReadingPassageBlock
  | ReadingComprehensionBlock
  | SpeakingPracticeBlock
  | SpeechPracticeV2Block
  | DialogueBlock
  | CelebrationBlock;

// ==================== LESSON TYPES ====================

export type LessonType = 'lesson' | 'speaking' | 'mini_test' | 'hsk_test';

// ==================== LESSON ENTITY (DB MATCH) ====================

export interface Lesson {
  id: string;
  
  // Unit relationship
  unitId?: string | null;
  orderInUnit?: number | null;
  
  // Identification
  title: string;
  subtitle?: string;
  lessonNumber: number; // Auto-increment per HSK level
  lessonType: LessonType;
  
  // Classification
  hskLevel: number; // 1-9 (HSK 3.0)
  difficulty: 'easy' | 'medium' | 'hard';
  displayOrder?: number; // Legacy field, kept for compatibility
  
  // Content metadata
  description?: string;
  estimatedMinutes: number;
  grammarPoints?: string[]; // ["是", "Subject + 是 + Noun"]
  tags?: string[]; // ["beginner", "introduction"]
  targetVocabulary?: string[]; // Array of vocabulary IDs
  
  // Publishing
  isPublished: boolean;
  version: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  
  // Joined data
  blocks?: ContentBlock[];
}

// ==================== LESSON DISPLAY HELPERS ====================

export const LESSON_TYPE_CONFIG = {
  lesson: {
    label: '📘 Lesson',
    description: 'Regular grammar lesson',
    icon: '📘',
    color: 'blue',
    allowedBlocks: 'all' as const,
  },
  speaking: {
    label: '🎤 Speaking Practice',
    description: 'Pronunciation focus',
    icon: '🎤',
    color: 'purple',
    allowedBlocks: ['hero_hanzi', 'speaking_practice', 'speech_practice_v2', 'dialogue', 'tip', 'celebration'] as BlockType[],
  },
  mini_test: {
    label: '✏️ Mini Test',
    description: '5-10 questions',
    icon: '✏️',
    color: 'green',
    allowedBlocks: ['exercise_multiple_choice', 'exercise_spot_error', 'exercise_build_sentence', 'reading_comprehension'] as BlockType[],
  },
  hsk_test: {
    label: '🎯 HSK Test',
    description: 'Full exam simulation',
    icon: '🎯',
    color: 'red',
    allowedBlocks: ['exercise_multiple_choice', 'exercise_spot_error', 'exercise_build_sentence', 'reading_comprehension', 'reading_passage'] as BlockType[],
  },
} as const;

export function getLessonDisplayName(lesson: Lesson): string {
  const typeConfig = LESSON_TYPE_CONFIG[lesson.lessonType];
  return `HSK ${lesson.hskLevel} - ${typeConfig.label} ${lesson.lessonNumber}: ${lesson.title}`;
}

