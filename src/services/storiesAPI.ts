import { api, API_BASE_URL } from './api';
import { getAccessToken } from '@/lib/authClient';
import type { ContentBlock } from '@/types/lesson';

export interface Story {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  contentLibraryId?: string;
  description?: string;
  topic?: string;
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  coverImageR2Key?: string;
  storyType?: 'text' | 'dialogue'; // 'text' for narration, 'dialogue' for conversations
  practiceBlocks?: ContentBlock[];
  // Series relationship
  seriesId?: string | null;
  seriesOrder?: number;
  isFeatured?: boolean;
  // Publishing
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorySentence {
  id: string;
  storyId: string;
  orderIndex: number;
  chinese: string;
  pinyin: string;
  english: string;
  speaker?: string | null; // For dialogue stories
  audioR2Key?: string;
  audioUrl?: string | null; // For frontend display
  audioDurationMs?: number;
  createdAt: string | Date;
}

export interface BulkSegment {
  id?: string;
  chinese: string;
  pinyin: string;
  english: string;
  speaker?: string | null;
  audioR2Key?: string;
  audioDurationMs?: number;
}

export interface StoryVocabulary {
  storyId: string;
  vocabId: string;
  contextSentence?: string;
  hanzi?: string;
  pinyin?: string;
  english?: string;
  hskLevel?: number;
}

export interface StoryQuestion {
  id: string;
  storyId: string;
  orderIndex: number;
  question: string;
  questionEnglish?: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  createdAt: string;
}

export interface StoryWithDetails extends Story {
  sentences: StorySentence[];
  vocabulary: StoryVocabulary[];
  questions: StoryQuestion[];
}

export interface CreateStoryParams {
  title: string;
  subtitle?: string;
  author?: string;
  contentLibraryId?: string;
  description?: string;
  topic?: string;
  hskLevel: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  practiceBlocks?: ContentBlock[];
}

export interface UpdateStoryParams {
  title?: string;
  subtitle?: string;
  author?: string;
  contentLibraryId?: string;
  description?: string;
  topic?: string;
  hskLevel?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  isPublished?: boolean;
  practiceBlocks?: ContentBlock[];
}

export interface CreateSentenceParams {
  chinese: string;
  pinyin: string;
  english: string;
  audioR2Key?: string;
}

export interface CreateQuestionParams {
  question: string;
  questionEnglish?: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface SearchStoriesParams {
  hskLevel?: number;
  difficulty?: string;
  topic?: string;
  query?: string;
  published?: boolean;
  limit?: number;
  offset?: number;
}

// Story CRUD
export async function searchStories(params?: SearchStoriesParams): Promise<Story[]> {
  const queryParams = new URLSearchParams();
  if (params?.hskLevel) queryParams.append('hsk_level', params.hskLevel.toString());
  if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
  if (params?.topic) queryParams.append('topic', params.topic);
  if (params?.query) queryParams.append('query', params.query);
  if (params?.published !== undefined) queryParams.append('published', params.published.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const data = await api.get<{ stories: Story[] }>(`/v1/stories?${queryParams.toString()}`);
  return data.stories;
}

export async function createStory(params: CreateStoryParams): Promise<Story> {
  const data = await api.post<{ story: Story }>('/v1/stories', params);
  return data.story;
}

export async function getStory(id: string, signal?: AbortSignal): Promise<StoryWithDetails> {
  const data = await api.get<{ story: StoryWithDetails }>(`/v1/stories/${id}`, signal);
  return data.story;
}

export async function updateStory(id: string, params: UpdateStoryParams): Promise<void> {
  await api.put(`/v1/stories/${id}`, params);
}

export async function deleteStory(id: string): Promise<void> {
  await api.delete(`/v1/stories/${id}`);
}

// Sentences
export async function addSentence(storyId: string, params: CreateSentenceParams): Promise<StorySentence> {
  const data = await api.post<{ sentence: StorySentence }>(`/v1/stories/${storyId}/sentences`, params);
  return data.sentence;
}

export async function updateSentence(storyId: string, sentenceId: string, params: Partial<CreateSentenceParams>): Promise<void> {
  await api.put(`/v1/stories/${storyId}/sentences/${sentenceId}`, params);
}

export async function deleteSentence(storyId: string, sentenceId: string): Promise<void> {
  await api.delete(`/v1/stories/${storyId}/sentences/${sentenceId}`);
}

export async function reorderSentences(storyId: string, sentenceIds: string[]): Promise<void> {
  await api.post(`/v1/stories/${storyId}/sentences/reorder`, { sentenceIds });
}

export async function bulkSaveSegments(
  storyId: string, 
  segments: BulkSegment[]
): Promise<{ created: number; updated: number; deleted: number }> {
  const data = await api.post<{ success: boolean; created: number; updated: number; deleted: number }>(
    `/v1/stories/${storyId}/segments/bulk`,
    { segments }
  );
  return { created: data.created, updated: data.updated, deleted: data.deleted };
}

// Vocabulary
export async function addVocabulary(storyId: string, vocabId: string, contextSentence?: string): Promise<void> {
  await api.post(`/v1/stories/${storyId}/vocabulary`, { vocabId, contextSentence });
}

export async function removeVocabulary(storyId: string, vocabId: string): Promise<void> {
  await api.delete(`/v1/stories/${storyId}/vocabulary/${vocabId}`);
}

// Questions
export async function addQuestion(storyId: string, params: CreateQuestionParams): Promise<StoryQuestion> {
  const data = await api.post<{ question: StoryQuestion }>(`/v1/stories/${storyId}/questions`, params);
  return data.question;
}

export async function updateQuestion(storyId: string, questionId: string, params: Partial<CreateQuestionParams>): Promise<void> {
  await api.put(`/v1/stories/${storyId}/questions/${questionId}`, params);
}

export async function deleteQuestion(storyId: string, questionId: string): Promise<void> {
  await api.delete(`/v1/stories/${storyId}/questions/${questionId}`);
}

// File uploads (use Bearer token auth)
export async function uploadCover(storyId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('cover', file);

  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/v1/stories/${storyId}/cover`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  return data.r2Key;
}

export async function uploadSentenceAudio(storyId: string, sentenceId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('audio', file);

  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/v1/stories/${storyId}/sentences/${sentenceId}/audio`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  return data.r2Key;
}

export async function deleteSentenceAudio(storyId: string, sentenceId: string): Promise<void> {
  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/v1/stories/${storyId}/sentences/${sentenceId}/audio`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) throw new Error('Delete failed');
}

// ═══════════════════════════════════════════════════════════
// JSON IMPORT/EXPORT
// ═══════════════════════════════════════════════════════════

export interface StoryTemplate {
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  topic?: string;
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  pauseBetweenSegmentsMs?: number;
  estimatedMinutes?: number;
  segments: Array<{
    chinese: string;
    pinyin: string;
    english: string;
    speaker?: string;
  }>;
  practiceBlocks: Array<Record<string, unknown>>;
}

export interface StoryFullExport {
  schemaVersion: number;
  exportedAt: string;
  story: StoryTemplate & {
    id: string;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
    segments: Array<{
      id: string;
      orderIndex: number;
      chinese: string;
      pinyin: string;
      english: string;
      audioR2Key?: string;
      audioDurationMs?: number;
    }>;
  };
}

/**
 * Export story as JSON (clean template for authors)
 */
export async function exportStory(storyId: string): Promise<StoryTemplate> {
  return api.get<StoryTemplate>(`/v1/stories/${storyId}/export`);
}

/**
 * Export story as JSON (full backup with all fields)
 */
export async function exportStoryFull(storyId: string): Promise<StoryFullExport> {
  return api.get<StoryFullExport>(`/v1/stories/${storyId}/export?full=true`);
}

/**
 * Import story from JSON (creates new story)
 */
export async function importStory(template: StoryTemplate): Promise<{ success: boolean; story: { id: string; title: string }; segmentsCreated: number }> {
  return api.post('/v1/stories/import', template);
}

/**
 * Update existing story from JSON
 */
export async function updateStoryFromJson(storyId: string, template: StoryTemplate): Promise<{ success: boolean; story: { id: string; title: string }; segments: { created: number; updated: number; deleted: number } }> {
  return api.put(`/v1/stories/${storyId}/import`, template);
}

/**
 * Get importable template with example values
 */
export async function getStoryTemplate(): Promise<StoryTemplate> {
  return api.get<StoryTemplate>('/v1/stories/template');
}

// ============================================
// STORY SERIES API
// ============================================

export interface StorySeries {
  id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  coverImageR2Key?: string | null;
  coverImageUrl?: string | null;
  hskLevel?: number;
  orderIndex: number;
  isPublished: boolean;
  storyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesWithStories extends StorySeries {
  stories: Array<{
    id: string;
    title: string;
    subtitle?: string;
    hskLevel: number;
    difficulty: string;
    estimatedMinutes?: number;
    isPublished: boolean;
    seriesOrder: number;
    coverImageR2Key?: string;
  }>;
}

export interface CreateSeriesInput {
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  hskLevel?: number;
  isPublished?: boolean;
  accessTier?: 'free' | 'premium';
  tags?: string[];
  metadata?: {
    titleEn?: string;
    characters?: Array<{
      name: string;
      pinyin?: string;
      role?: string;
      traits?: string[];
    }>;
    parts?: Array<{
      order: number;
      file?: string;
      title: string;
      titleEn?: string;
    }>;
    [key: string]: unknown;
  };
}

// Type for importing series from content-planner JSON
export interface SeriesImportData {
  seriesId?: string;
  title: string;
  titleEn?: string;
  description?: string;
  author?: string;
  hskLevel?: number;
  difficulty?: string;
  totalParts?: number;
  estimatedTotalMinutes?: number;
  accessTier?: 'free' | 'premium';
  tags?: string[];
  characters?: Array<{
    name: string;
    pinyin?: string;
    role?: string;
    traits?: string[];
  }>;
  parts?: Array<{
    order: number;
    file?: string;
    title: string;
    titleEn?: string;
  }>;
}

/**
 * Get all story series
 */
export async function getStorySeries(): Promise<{ series: StorySeries[] }> {
  return api.get<{ series: StorySeries[] }>('/v1/story-series');
}

/**
 * Get a single series with its stories
 */
export async function getSeriesById(id: string): Promise<SeriesWithStories> {
  return api.get<SeriesWithStories>(`/v1/story-series/${id}`);
}

/**
 * Create a new series
 */
export async function createSeries(input: CreateSeriesInput): Promise<{ success: boolean; series: StorySeries }> {
  return api.post('/v1/story-series', input);
}

/**
 * Update a series
 */
export async function updateSeries(id: string, updates: Partial<CreateSeriesInput>): Promise<{ success: boolean }> {
  return api.put(`/v1/story-series/${id}`, updates);
}

/**
 * Delete a series
 */
export async function deleteSeries(id: string): Promise<{ success: boolean }> {
  return api.delete(`/v1/story-series/${id}`);
}

/**
 * Reorder stories within a series
 */
export async function reorderSeriesStories(seriesId: string, storyIds: string[]): Promise<{ success: boolean }> {
  return api.put(`/v1/story-series/${seriesId}/stories`, { storyIds });
}

/**
 * Reorder series themselves
 */
export async function reorderSeries(seriesIds: string[]): Promise<{ success: boolean }> {
  return api.put('/v1/story-series/reorder', { seriesIds });
}

/**
 * Add a story to a series
 */
export async function addStoryToSeries(seriesId: string, storyId: string): Promise<{ success: boolean }> {
  return api.post(`/v1/story-series/${seriesId}/add-story/${storyId}`);
}

/**
 * Remove a story from a series
 */
export async function removeStoryFromSeries(seriesId: string, storyId: string): Promise<{ success: boolean }> {
  return api.post(`/v1/story-series/${seriesId}/remove-story/${storyId}`);
}

/**
 * Upload series cover image
 */
export async function uploadSeriesCover(seriesId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('cover', file);

  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/v1/story-series/${seriesId}/cover`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  return data.r2Key;
}

/**
 * Delete series cover image
 */
export async function deleteSeriesCover(seriesId: string): Promise<{ success: boolean }> {
  return api.delete(`/v1/story-series/${seriesId}/cover`);
}

/**
 * Get the full CDN URL for an R2 key
 * Returns null if no key provided - use this for graceful fallback
 */
export function getCoverUrl(r2Key?: string | null): string | null {
  if (!r2Key) return null;
  // Use CDN URL if available, otherwise construct from API
  const cdnUrl = import.meta.env.VITE_CDN_URL;
  if (cdnUrl) {
    return `${cdnUrl}/${r2Key}`;
  }
  // Fallback to direct R2 URL pattern
  return `https://pub-hanzimaster.r2.dev/${r2Key}`;
}

// ============================================
// STORY CATEGORIES API
// ============================================

export type CategoryDisplayType = 'horizontal' | 'grid' | 'featured' | 'series';
export type CategoryFilterType = 'recent' | 'popular' | 'manual' | 'hsk' | 'series';

export interface StoryCategory {
  id: string;
  title: string;
  slug: string;
  description?: string;
  displayType: CategoryDisplayType;
  filterType: CategoryFilterType;
  filterValue?: Record<string, unknown>;
  orderIndex: number;
  isPublished: boolean;
  seeAllEnabled: boolean;
  maxItems: number;
  storyCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithStories extends StoryCategory {
  stories: Array<{
    id: string;
    title: string;
    hskLevel: number;
    isPublished: boolean;
  }>;
}

export interface CreateCategoryInput {
  title: string;
  slug: string;
  description?: string;
  displayType?: CategoryDisplayType;
  filterType?: CategoryFilterType;
  filterValue?: Record<string, unknown>;
  isPublished?: boolean;
  seeAllEnabled?: boolean;
  maxItems?: number;
}

/**
 * Get all story categories
 */
export async function getStoryCategories(): Promise<{ categories: StoryCategory[] }> {
  return api.get<{ categories: StoryCategory[] }>('/v1/story-categories');
}

/**
 * Get home screen layout (for mobile app preview)
 */
export async function getHomeLayout(hskLevel?: number): Promise<{ categories: unknown[] }> {
  const params = hskLevel ? `?hskLevel=${hskLevel}` : '';
  return api.get<{ categories: unknown[] }>(`/v1/story-categories/home${params}`);
}

/**
 * Get a single category with its stories
 */
export async function getCategoryById(id: string): Promise<CategoryWithStories> {
  return api.get<CategoryWithStories>(`/v1/story-categories/${id}`);
}

/**
 * Create a new category
 */
export async function createCategory(input: CreateCategoryInput): Promise<{ success: boolean; category: StoryCategory }> {
  return api.post('/v1/story-categories', input);
}

/**
 * Update a category
 */
export async function updateCategory(id: string, updates: Partial<Omit<CreateCategoryInput, 'slug'>>): Promise<{ success: boolean }> {
  return api.put(`/v1/story-categories/${id}`, updates);
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<{ success: boolean }> {
  return api.delete(`/v1/story-categories/${id}`);
}

/**
 * Reorder categories
 */
export async function reorderCategories(categoryIds: string[]): Promise<{ success: boolean }> {
  return api.put('/v1/story-categories/reorder', { categoryIds });
}

/**
 * Set stories for a manual category
 */
export async function setCategoryStories(categoryId: string, storyIds: string[]): Promise<{ success: boolean }> {
  return api.put(`/v1/story-categories/${categoryId}/stories`, { storyIds });
}

