/**
 * Release Manager API Service
 * Handles content shipping workflow
 */

import api from './api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface LessonPreview {
  id: string;
  title: string;
  lessonNumber: number;
  status?: string;
  vocabCount?: number;
  contentHash?: string;
}

export interface VocabPreview {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hasAudio: boolean;
  hasExample: boolean;
  usedInLesson: boolean;
  isComplete?: boolean;
}

export interface PreviewReleaseResponse {
  hskLevel: number;
  currentLive: {
    lessons: LessonPreview[];
    lessonCount: number;
    version: string;
    lastUpdated: string | null;
  };
  pendingChanges: {
    newLessons: LessonPreview[];
    updatedLessons: LessonPreview[];
    unchangedLessons: LessonPreview[];
    stayingLessons: LessonPreview[];
  };
  vocabulary: {
    total: number;
    withAudio: number;
    missingAudio: number;
    inLessons: number;
    notInLessons: number;
    complete?: number;
    incomplete?: number;
    items: VocabPreview[];
  };
  suggestedVersion: string;
  previewHash: string;
  hasChanges: boolean;
  canForceShip?: boolean;
  summary: {
    totalNew: number;
    totalUpdated: number;
    totalStaying: number;
    totalLive?: number;
  };
}

export type VocabMode = 'all' | 'lessons_only' | 'selected';

export interface ShipRequest {
  hskLevel: number;
  lessonIds: string[];
  version: string;
  releaseNotes?: string;
  vocabMode?: VocabMode;
  selectedVocabIds?: string[];
}

export interface ShipResponse {
  success: boolean;
  release: {
    id: string;
    version: string;
    hskLevel: number;
    lessonsShipped: number;
    lessonsAdded: number;
    lessonsUpdated: number;
    vocabShipped: number;
    vocabMode: VocabMode;
  };
}

export interface Release {
  id: string;
  version: string;
  releaseNotes: string | null;
  lessonsAdded: number;
  lessonsUpdated: number;
  lessonsRemoved: number;
  lessonIds: string[];
  releasedAt: string;
}

export interface ReleaseHistoryResponse {
  hskLevel: number;
  releases: Release[];
  totalReleases: number;
}

export interface HskLevelStatus {
  draft: number;
  staging: number;
  live: number;
  latestVersion: string | null;
  lastRelease: string | null;
  hasUnshippedChanges: boolean;
}

export interface AllHskStatusResponse {
  hskStatus: Record<number, HskLevelStatus>;
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Preview what would change if we ship content for an HSK level
 */
export async function previewRelease(hskLevel: number): Promise<PreviewReleaseResponse> {
  return api.get<PreviewReleaseResponse>(`/v1/control-center/preview-release/${hskLevel}`);
}

/**
 * Ship selected lessons to mobile (make them live)
 */
export async function shipRelease(request: ShipRequest): Promise<ShipResponse> {
  return api.post<ShipResponse>('/v1/control-center/ship', request);
}

/**
 * Get release history for an HSK level
 */
export async function getReleaseHistory(hskLevel: number): Promise<ReleaseHistoryResponse> {
  return api.get<ReleaseHistoryResponse>(`/v1/control-center/releases/${hskLevel}`);
}

/**
 * Get status for all HSK levels
 */
export async function getAllHskStatus(): Promise<AllHskStatusResponse> {
  return api.get<AllHskStatusResponse>('/v1/control-center/all-hsk-status');
}

/**
 * Sync vocabulary for all lessons in an HSK level
 * Extracts vocabulary from lesson content and populates targetVocabulary
 */
export interface SyncVocabResponse {
  success: boolean;
  hskLevel: number;
  lessonsSynced: number;
  totalVocabMatched: number;
  errors: string[];
}

export async function syncVocabulary(hskLevel: number): Promise<SyncVocabResponse> {
  return api.post<SyncVocabResponse>(`/v1/control-center/sync-vocab/${hskLevel}`, {});
}

/**
 * Debug vocabulary extraction for lessons
 */
export interface DebugVocabResponse {
  hskLevel: number;
  lessonCount: number;
  vocabInHskLevel: number;
  vocabSample: string[];
  allExtractedHanzi: string[];
  foundInVocab: string[];
  notFoundInVocab: string[];
  matchingSummary: {
    totalExtracted: number;
    foundCount: number;
    notFoundCount: number;
    wrongHskLevel: string[];
  };
  lessons: Array<{
    lessonId: string;
    title: string;
    lessonNumber: number;
    blockCount: number;
    blockTypes: string[];
    extractedHanzi: string[];
    currentTargetVocab: string[] | null;
  }>;
}

export async function debugVocabulary(hskLevel: number): Promise<DebugVocabResponse> {
  return api.get<DebugVocabResponse>(`/v1/control-center/debug-vocab/${hskLevel}`);
}

// ═══════════════════════════════════════════════════════════
// BUNDLE GENERATION (for mobile offline use)
// ═══════════════════════════════════════════════════════════

export interface BundleManifest {
  version: string;
  hskLevel: number;
  createdAt: string;
  bundleSize: number;
  curriculumFile: string;
  stats: {
    unitCount: number;
    lessonCount: number;
    vocabCount: number;
    audioFileCount: number;
  };
  audioFiles: Array<{
    path: string;
    r2Key: string;
    size: number;
  }>;
}

export interface GenerateBundleResponse {
  success: boolean;
  hskLevel: number;
  version: string;
  manifest: BundleManifest;
  errors: string[];
  downloadUrls: {
    manifest: string;
    curriculum: string;
  };
}

/**
 * Generate an offline bundle for mobile app download
 */
export async function generateBundle(hskLevel: number, version: string): Promise<GenerateBundleResponse> {
  return api.post<GenerateBundleResponse>(`/v1/releases/${hskLevel}/generate`, { version });
}

export const releaseAPI = {
  previewRelease,
  shipRelease,
  getReleaseHistory,
  getAllHskStatus,
  generateBundle,
  syncVocabulary,
  debugVocabulary,
};

export default releaseAPI;

