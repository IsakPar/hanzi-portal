/**
 * Content Export Service
 * Handles exporting content (vocabulary, lessons, stories) to JSON for R2 upload
 */

import { generateHash, bumpVersion } from './chineseNLP';
import type { VocabularyEntry } from './vocabularyAPI';
import type { Lesson } from '@/types/lesson';
import type { StoryWithDetails } from './storiesAPI';

// --- EXPORT TYPES ---

export interface VocabularyExport {
  version: string;
  hskLevel: number;
  generatedAt: string;
  totalWords: number;
  vocabulary: Array<{
    hanzi: string;
    pinyin: string;
    english: string;
    category: string;
    hskLevel: number;
    tags: string[];
  }>;
}

export interface LessonExport {
  version: string;
  hskLevel: number;
  generatedAt: string;
  totalLessons: number;
  lessons: Array<{
    id: string;
    title: string;
    description: string;
    hskLevel: number;
    difficulty: string;
    lessonNumber: number;
    blocks: Array<{
      type: string;
      content: Record<string, unknown>;
    }>;
  }>;
}

export interface StoryExport {
  version: string;
  hskLevel: number;
  accessTier: 'free' | 'premium';
  generatedAt: string;
  totalStories: number;
  stories: Array<{
    id: string;
    title: string;
    subtitle?: string;
    author?: string;
    description?: string;
    topic?: string;
    hskLevel: number;
    difficulty: string;
    estimatedMinutes?: number;
    accessTier: 'free' | 'premium';
    sentences: Array<{
      chinese: string;
      pinyin: string;
      english: string;
      audioUrl: string | null;
      vocabulary: Array<{
        hanzi: string;
        pinyin: string;
        english: string;
        hskLevel: number;
      }>;
    }>;
    practiceBlocks: Array<{
      type: string;
      content: Record<string, unknown>;
    }>;
  }>;
}

export interface ManifestExport {
  version: string;
  generatedAt: string;
  content: {
    vocabulary: Record<string, { version: string; hash: string; url: string }>;
    lessons: Record<string, { version: string; hash: string; url: string }>;
    stories: {
      free: Record<string, { version: string; hash: string; url: string }>;
      premium: Record<string, { version: string; hash: string; url: string }>;
    };
  };
}

export interface ExportResult {
  contentType: 'vocabulary' | 'lessons' | 'stories' | 'manifest';
  hskLevel?: number;
  accessTier?: 'free' | 'premium';
  version: string;
  hash: string;
  json: string;
  sizeBytes: number;
  recordCount: number;
}

// --- EXPORT FUNCTIONS ---

/**
 * Export vocabulary for a specific HSK level
 */
export async function exportVocabularyJSON(
  vocabularyData: VocabularyEntry[],
  hskLevel: number,
  currentVersion: string = '1.0.0'
): Promise<ExportResult> {
  const exportData: VocabularyExport = {
    version: currentVersion,
    hskLevel,
    generatedAt: new Date().toISOString(),
    totalWords: vocabularyData.length,
    vocabulary: vocabularyData.map((v) => ({
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      english: v.english,
      category: v.category,
      hskLevel: v.hskLevel,
      tags: v.tags || [],
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const hash = await generateHash(json);
  const sizeBytes = new Blob([json]).size;

  return {
    contentType: 'vocabulary',
    hskLevel,
    version: currentVersion,
    hash,
    json,
    sizeBytes,
    recordCount: vocabularyData.length,
  };
}

/**
 * Export lessons for a specific HSK level
 */
export async function exportLessonsJSON(
  lessonsData: Lesson[],
  hskLevel: number,
  currentVersion: string = '1.0.0'
): Promise<ExportResult> {
  const exportData: LessonExport = {
    version: currentVersion,
    hskLevel,
    generatedAt: new Date().toISOString(),
    totalLessons: lessonsData.length,
    lessons: lessonsData
      .sort((a, b) => (a.lessonNumber || 0) - (b.lessonNumber || 0))
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || '',
        hskLevel: lesson.hskLevel,
        difficulty: lesson.difficulty || 'medium',
        lessonNumber: lesson.lessonNumber || 1,
        blocks: lesson.blocks || [],
      })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const hash = await generateHash(json);
  const sizeBytes = new Blob([json]).size;

  return {
    contentType: 'lessons',
    hskLevel,
    version: currentVersion,
    hash,
    json,
    sizeBytes,
    recordCount: lessonsData.length,
  };
}

/**
 * Export stories for a specific HSK level and access tier
 */
export async function exportStoriesJSON(
  storiesData: StoryWithDetails[],
  hskLevel: number,
  accessTier: 'free' | 'premium',
  currentVersion: string = '1.0.0'
): Promise<ExportResult> {
  const exportData: StoryExport = {
    version: currentVersion,
    hskLevel,
    accessTier,
    generatedAt: new Date().toISOString(),
    totalStories: storiesData.length,
    stories: storiesData.map((story) => ({
      id: story.id,
      title: story.title,
      subtitle: story.subtitle,
      author: story.author,
      description: story.description,
      topic: story.topic,
      hskLevel: story.hskLevel,
      difficulty: story.difficulty || 'medium',
      estimatedMinutes: story.estimatedMinutes,
      accessTier: ((story as unknown as { accessTier?: 'free' | 'premium' }).accessTier || 'premium'),
      sentences: (story.sentences || []).map((sentence) => ({
        chinese: sentence.chinese,
        pinyin: sentence.pinyin,
        english: sentence.english,
        audioUrl: sentence.audioUrl || null,
        vocabulary: (story.vocabulary || [])
          .filter((v) => sentence.chinese.includes((v as { hanzi: string }).hanzi))
          .map((v) => {
            const vocab = v as { hanzi: string; pinyin: string; english: string; hskLevel: number };
            return {
              hanzi: vocab.hanzi,
              pinyin: vocab.pinyin,
              english: vocab.english,
              hskLevel: vocab.hskLevel,
            };
          }),
      })),
      practiceBlocks: story.practiceBlocks || [],
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const hash = await generateHash(json);
  const sizeBytes = new Blob([json]).size;

  return {
    contentType: 'stories',
    hskLevel,
    accessTier,
    version: currentVersion,
    hash,
    json,
    sizeBytes,
    recordCount: storiesData.length,
  };
}

/**
 * Generate manifest.json with all content versions and hashes
 */
export async function exportManifest(
  exports: Array<ExportResult & { url: string }>
): Promise<ExportResult> {
  const manifestData: ManifestExport = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    content: {
      vocabulary: {},
      lessons: {},
      stories: {
        free: {},
        premium: {},
      },
    },
  };

  for (const exp of exports) {
    const key = `hsk${exp.hskLevel}`;

    if (exp.contentType === 'vocabulary') {
      manifestData.content.vocabulary[key] = {
        version: exp.version,
        hash: exp.hash,
        url: exp.url,
      };
    } else if (exp.contentType === 'lessons') {
      manifestData.content.lessons[key] = {
        version: exp.version,
        hash: exp.hash,
        url: exp.url,
      };
    } else if (exp.contentType === 'stories') {
      if (exp.accessTier === 'free') {
        manifestData.content.stories.free[key] = {
          version: exp.version,
          hash: exp.hash,
          url: exp.url,
        };
      } else {
        manifestData.content.stories.premium[key] = {
          version: exp.version,
          hash: exp.hash,
          url: exp.url,
        };
      }
    }
  }

  const json = JSON.stringify(manifestData, null, 2);
  const hash = await generateHash(json);
  const sizeBytes = new Blob([json]).size;

  return {
    contentType: 'manifest',
    version: '1.0.0',
    hash,
    json,
    sizeBytes,
    recordCount: exports.length,
  };
}

/**
 * Helper: Detect if content has changed by comparing hashes
 */
export function hasContentChanged(
  newHash: string,
  previousHash: string
): boolean {
  return newHash !== previousHash;
}

/**
 * Helper: Get suggested next version based on content change
 */
export function suggestNextVersion(
  currentVersion: string,
  hasChanged: boolean
): string {
  if (!hasChanged) return currentVersion;
  return bumpVersion(currentVersion, 'patch');
}

/**
 * Format file size for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

