/**
 * Distractors API Service
 * Fetch pedagogically-correct word alternatives
 */

import api from './api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface VocabWord {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  pos?: string | null;
  tonePattern?: string | null;
}

export interface DistractorSource {
  id: string;
  word: string;
  pinyin: string;
  english: string;
  category: string;
  pos?: string | null;
  tonePattern?: string | null;
  hskLevel: number;
}

export interface DistractorResponse {
  source: DistractorSource;
  distractors: {
    sameCategory: VocabWord[];
    samePos: VocabWord[];
    sameTone: VocabWord[];
    similarLength: VocabWord[];
    semantic: VocabWord[];
  };
  total: number;
}

export interface DistractorRequest {
  wordId?: string;
  word?: string;
  maxHskLevel?: number;
  count?: number;
  strategies?: ('same-category' | 'same-pos' | 'same-tone' | 'similar-length' | 'semantic')[];
}

export interface TagRequest {
  wordId: string;
  field: 'pos' | 'tonePattern' | 'category';
}

export interface TagResponse {
  success: boolean;
  wordId: string;
  field: string;
  value: string;
  computed?: boolean;
  error?: string;
}

export interface MetadataStats {
  total: number;
  coverage: {
    pos: { count: number; percent: number };
    tonePattern: { count: number; percent: number };
  };
  byCategory: { category: string; count: number }[];
  byPos: { pos: string; count: number }[];
}

// ═══════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get distractors for a word
 */
export async function getDistractors(params: DistractorRequest): Promise<DistractorResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.wordId) searchParams.set('wordId', params.wordId);
  if (params.word) searchParams.set('word', params.word);
  if (params.maxHskLevel) searchParams.set('maxHskLevel', params.maxHskLevel.toString());
  if (params.count) searchParams.set('count', params.count.toString());
  if (params.strategies) {
    params.strategies.forEach(s => searchParams.append('strategies', s));
  }

  return api.get<DistractorResponse>(`/v1/distractors?${searchParams.toString()}`);
}

/**
 * AI-tag a word's metadata (pos, tonePattern, category)
 */
export async function tagWord(params: TagRequest): Promise<TagResponse> {
  return api.post<TagResponse>('/v1/distractors/tag', params);
}

/**
 * Get vocabulary metadata coverage stats
 */
export async function getMetadataStats(): Promise<MetadataStats> {
  return api.get<MetadataStats>('/v1/distractors/stats');
}

/**
 * Flatten all distractors into a single ordered array
 * Prioritizes: sameCategory → samePos → sameTone → similarLength → semantic
 */
export function flattenDistractors(distractors: DistractorResponse['distractors']): VocabWord[] {
  const seen = new Set<string>();
  const result: VocabWord[] = [];

  const addUnique = (words: VocabWord[]) => {
    for (const word of words) {
      if (seen.has(word.id)) continue;
      seen.add(word.id);
      result.push(word);
    }
  };

  addUnique(distractors.sameCategory);
  addUnique(distractors.samePos);
  addUnique(distractors.sameTone);
  addUnique(distractors.similarLength);
  addUnique(distractors.semantic);

  return result;
}

