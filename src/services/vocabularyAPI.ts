/**
 * Vocabulary API Service
 * Manages Chinese vocabulary entries
 */

import { api } from './api';

export interface VocabularyEntry {
  id: string;
  rowNum?: number | null; // Human-readable numeric ID (1, 2, 3...)
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  tags?: string[] | null;
  // Audio and examples
  wordAudioR2Key?: string | null;
  exampleChinese?: string | null;
  examplePinyin?: string | null;
  exampleEnglish?: string | null;
  exampleAudioR2Key?: string | null;
}

export interface VocabularySearchParams {
  query?: string;
  hsk_level?: number;
  category?: string;
  limit?: number;
  offset?: number;
  sort?: 'hanzi' | 'pinyin' | 'hsk_level' | 'category';
  order?: 'asc' | 'desc';
}

export interface VocabularySearchResponse {
  results: VocabularyEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateVocabularyInput {
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  tags?: string[];
  // Audio and examples
  wordAudioR2Key?: string;
  exampleChinese?: string;
  examplePinyin?: string;
  exampleEnglish?: string;
  exampleAudioR2Key?: string;
}

export interface BulkImportInput {
  entries: CreateVocabularyInput[];
}

/**
 * Search and filter vocabulary entries
 * @param params - Search parameters
 * @param signal - Optional AbortSignal for request cancellation
 */
export async function searchVocabulary(
  params: VocabularySearchParams,
  signal?: AbortSignal
): Promise<VocabularySearchResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.set('query', params.query);
  if (params.hsk_level) searchParams.set('hsk_level', params.hsk_level.toString());
  if (params.category) searchParams.set('category', params.category);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);

  const queryString = searchParams.toString();
  const endpoint = `/v1/vocabulary${queryString ? `?${queryString}` : ''}`;

  return api.get<VocabularySearchResponse>(endpoint, signal);
}

/**
 * Get a single vocabulary entry by ID
 */
export async function getVocabulary(id: string): Promise<VocabularyEntry> {
  return api.get<VocabularyEntry>(`/v1/vocabulary/${id}`);
}

/**
 * Get all unique categories
 */
export async function getCategories(): Promise<string[]> {
  const response = await api.get<{ categories: string[] }>(
    '/v1/vocabulary/admin/categories'
  );
  return response.categories;
}

/**
 * Create a new vocabulary entry (admin only)
 */
export async function createVocabulary(
  data: CreateVocabularyInput
): Promise<{ id: string; success: boolean }> {
  return api.post<{ id: string; success: boolean }>('/v1/vocabulary/admin', data);
}

/**
 * Update an existing vocabulary entry (admin only)
 */
export async function updateVocabulary(
  id: string,
  data: Partial<CreateVocabularyInput>
): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>(`/v1/vocabulary/admin/${id}`, data);
}

/**
 * Delete a vocabulary entry (admin only)
 */
export async function deleteVocabulary(id: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/v1/vocabulary/admin/${id}`);
}

/**
 * Bulk import vocabulary entries (admin only)
 */
export async function bulkImportVocabulary(
  data: BulkImportInput
): Promise<{ success: boolean; imported: number }> {
  return api.post<{ success: boolean; imported: number }>(
    '/v1/vocabulary/admin/bulk-import',
    data
  );
}

/**
 * Export all vocabulary as JSON (admin only)
 */
export async function exportVocabulary(): Promise<{
  exported_at: string;
  count: number;
  entries: VocabularyEntry[];
}> {
  return api.get<{
    exported_at: string;
    count: number;
    entries: VocabularyEntry[];
  }>('/v1/vocabulary/admin/export');
}

/**
 * Upload audio for a vocabulary word (admin only)
 */
export async function uploadWordAudio(id: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('audio', file);
  
  const response = await api.post<{ success: boolean; r2Key: string }>(
    `/v1/vocabulary/admin/${id}/word-audio`,
    formData
  );
  
  return response.r2Key;
}

/**
 * Upload audio for an example sentence (admin only)
 */
export async function uploadExampleAudio(id: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('audio', file);
  
  const response = await api.post<{ success: boolean; r2Key: string }>(
    `/v1/vocabulary/admin/${id}/example-audio`,
    formData
  );
  
  return response.r2Key;
}

// ═══════════════════════════════════════════════════════════
// AI ENHANCEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════

export interface ExampleSentence {
  chinese: string;
  pinyin: string;
  english: string;
}

export interface GenerateExampleResult {
  success: boolean;
  sentence: ExampleSentence;
  tokensUsed?: number;
  cached?: boolean;
}

export interface AudioPreviewResult {
  success: boolean;
  audioBase64: string;
  text: string;
  charactersUsed: number;
}

export interface AudioSaveResult {
  success: boolean;
  r2Key: string;
}

/**
 * Generate example sentence using AI
 */
export async function generateExampleSentence(
  id: string,
  regenerate: boolean = false
): Promise<GenerateExampleResult> {
  return api.post<GenerateExampleResult>(
    `/v1/vocabulary/admin/${id}/generate-example`,
    { regenerate }
  );
}

/**
 * Generate preview audio for word (ElevenLabs)
 */
export async function previewWordAudio(
  id: string,
  voice: string = 'chinese-female-1',
  speed: number = 0.8
): Promise<AudioPreviewResult> {
  return api.post<AudioPreviewResult>(
    `/v1/vocabulary/admin/${id}/preview-word-audio`,
    { voice, speed }
  );
}

/**
 * Generate preview audio for example sentence (ElevenLabs)
 */
export async function previewExampleAudio(
  id: string,
  voice: string = 'chinese-female-1',
  speed: number = 0.8
): Promise<AudioPreviewResult> {
  return api.post<AudioPreviewResult>(
    `/v1/vocabulary/admin/${id}/preview-example-audio`,
    { voice, speed }
  );
}

/**
 * Save approved word audio to R2
 */
export async function saveWordAudio(
  id: string,
  audioBase64: string,
  durationMs?: number
): Promise<AudioSaveResult> {
  return api.post<AudioSaveResult>(
    `/v1/vocabulary/admin/${id}/save-word-audio`,
    { audioBase64, durationMs }
  );
}

/**
 * Save approved example audio to R2
 */
export async function saveExampleAudio(
  id: string,
  audioBase64: string,
  durationMs?: number
): Promise<AudioSaveResult> {
  return api.post<AudioSaveResult>(
    `/v1/vocabulary/admin/${id}/save-example-audio`,
    { audioBase64, durationMs }
  );
}

/**
 * HSK level metadata (HSK 3.0 standard with levels 1-9)
 */
export const HSK_LEVELS = [
  { value: 1, label: 'HSK 1', words: 500, color: 'bg-green-100 text-green-700' },
  { value: 2, label: 'HSK 2', words: 750, color: 'bg-blue-100 text-blue-700' },
  { value: 3, label: 'HSK 3', words: 1000, color: 'bg-yellow-100 text-yellow-700' },
  { value: 4, label: 'HSK 4', words: 1500, color: 'bg-orange-100 text-orange-700' },
  { value: 5, label: 'HSK 5', words: 2000, color: 'bg-red-100 text-red-700' },
  { value: 6, label: 'HSK 6', words: 2500, color: 'bg-purple-100 text-purple-700' },
  { value: 7, label: 'HSK 7 Advanced', words: 3000, color: 'bg-pink-200 text-pink-800' },
  { value: 8, label: 'HSK 8 Expert', words: 4000, color: 'bg-indigo-200 text-indigo-800' },
  { value: 9, label: 'HSK 9 Native', words: 5000, color: 'bg-gray-800 text-white' },
] as const;

/**
 * Common vocabulary categories
 */
export const COMMON_CATEGORIES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'measure_word',
  'pronoun',
  'preposition',
  'conjunction',
  'particle',
  'number',
  'time',
  'place',
  'food',
  'family',
  'body',
  'color',
  'weather',
  'travel',
  'business',
  'education',
] as const;

