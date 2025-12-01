/**
 * AI Suggest API Service
 * RAG-powered content suggestions
 */

import { api } from './api';

export type SuggestContext = 'mcq-wrong-option' | 'distractor-word' | 'alternative-phrase' | 'similar-word';

export interface SuggestRequest {
  context: SuggestContext;
  correctAnswer?: string;
  hskLevel?: number;
  exclude?: string[];
  count?: number;
  searchQuery?: string;
}

export interface Suggestion {
  id: string;
  text: string;
  pinyin?: string;
  score: number;
  hskLevel?: number;
}

export interface SuggestResponse {
  suggestions: Suggestion[];
  error?: string;
  message?: string;
}

/**
 * Get AI-powered suggestions using RAG
 */
export async function getSuggestions(request: SuggestRequest): Promise<SuggestResponse> {
  return api.post<SuggestResponse>('/v1/ai/suggest', request);
}

