/**
 * Lesson Alternatives API Service
 * 
 * Bridge between portal and backend for:
 * - lesson_block_slots
 * - slot_alternatives
 * - block_connected_words
 */

import api from './api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface SlotWord {
  wordId: string;
  hanzi: string;
}

export interface Slot {
  id: string;
  blockId: string;
  position: number;
  wordId: string;
  hanzi: string;
  isFocus: boolean;
  alternatives?: SlotAlternative[];
}

export interface SlotAlternative {
  id: string;
  slotId: string;
  wordId: string;
  hanzi: string;
  isApproved: boolean;
  approvedBy?: string;
  aiSuggested: boolean;
}

export interface ConnectedWord {
  id: string;
  blockId: string;
  wordId: string;
  hanzi: string;
  inferredCategory?: string;
  isApproved: boolean;
}

export interface WordSuggestion {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category?: string;
}

export interface SuggestForWordResponse {
  word: string;
  sourceWord: {
    id: string;
    hanzi: string;
    pinyin: string;
    english: string;
    category: string;
  } | null;
  suggestions: WordSuggestion[];
}

// ═══════════════════════════════════════════════════════════
// SLOT MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Get all slots for a block
 */
export async function getBlockSlots(blockId: string): Promise<{ slots: Slot[] }> {
  return api.get<{ slots: Slot[] }>(`/v1/lesson-alternatives/blocks/${blockId}/slots`);
}

/**
 * Create/replace slots for a block (parse words into slots)
 */
export async function createBlockSlots(
  blockId: string, 
  words: SlotWord[]
): Promise<{ slots: Slot[]; message: string }> {
  return api.post<{ slots: Slot[]; message: string }>(
    `/v1/lesson-alternatives/blocks/${blockId}/slots`,
    { words }
  );
}

/**
 * Toggle focus status for a slot
 */
export async function setSlotFocus(
  slotId: string, 
  isFocus: boolean
): Promise<{ message: string; isFocus: boolean }> {
  return api.put<{ message: string; isFocus: boolean }>(
    `/v1/lesson-alternatives/slots/${slotId}/focus`,
    { isFocus }
  );
}

/**
 * Delete a slot
 */
export async function deleteSlot(slotId: string): Promise<{ message: string }> {
  return api.delete<{ message: string }>(`/v1/lesson-alternatives/slots/${slotId}`);
}

// ═══════════════════════════════════════════════════════════
// ALTERNATIVES MANAGEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Get AI-suggested alternatives for a slot
 */
export async function suggestSlotAlternatives(
  slotId: string, 
  limit = 10
): Promise<{
  slot: Slot;
  originalWord: WordSuggestion;
  suggestions: Array<WordSuggestion & { similarity: number }>;
}> {
  return api.get(`/v1/lesson-alternatives/slots/${slotId}/suggest-alternatives?limit=${limit}`);
}

/**
 * Add/approve alternatives for a slot
 */
export async function addSlotAlternatives(
  slotId: string,
  alternatives: Array<{ wordId: string; hanzi: string }>,
  approvedBy?: string
): Promise<{ message: string; count: number }> {
  return api.post(`/v1/lesson-alternatives/slots/${slotId}/alternatives`, {
    alternatives,
    approvedBy,
  });
}

/**
 * Update alternative approval status
 */
export async function updateAlternativeApproval(
  altId: string,
  isApproved: boolean,
  approvedBy?: string
): Promise<{ message: string; isApproved: boolean }> {
  return api.put(`/v1/lesson-alternatives/alternatives/${altId}/approve`, {
    isApproved,
    approvedBy,
  });
}

/**
 * Delete an alternative
 */
export async function deleteAlternative(altId: string): Promise<{ message: string }> {
  return api.delete(`/v1/lesson-alternatives/alternatives/${altId}`);
}

// ═══════════════════════════════════════════════════════════
// WORD SUGGESTIONS (Simple inline [+] button)
// ═══════════════════════════════════════════════════════════

/**
 * Get suggestions for a single word (used by inline [+] button)
 */
export async function suggestForWord(
  word: string, 
  limit = 8
): Promise<SuggestForWordResponse> {
  const params = new URLSearchParams({ word, limit: limit.toString() });
  return api.get<SuggestForWordResponse>(`/v1/lesson-alternatives/suggest-for-word?${params}`);
}

// ═══════════════════════════════════════════════════════════
// CONNECTED WORDS (Block-level related vocabulary)
// ═══════════════════════════════════════════════════════════

/**
 * Get connected words for a block
 */
export async function getBlockConnectedWords(
  blockId: string
): Promise<{ connectedWords: ConnectedWord[] }> {
  return api.get(`/v1/lesson-alternatives/blocks/${blockId}/connected`);
}

/**
 * Suggest connected words via RAG for a block
 */
export async function suggestBlockConnectedWords(
  blockId: string,
  limit = 10
): Promise<{
  blockId: string;
  slotWords: Array<{ id: string; hanzi: string }>;
  suggestions: WordSuggestion[];
  byCategory: Record<string, WordSuggestion[]>;
}> {
  return api.get(`/v1/lesson-alternatives/blocks/${blockId}/suggest-connected?limit=${limit}`);
}

/**
 * Add connected words to a block
 */
export async function addBlockConnectedWords(
  blockId: string,
  words: Array<{ wordId: string; hanzi: string; category?: string }>,
  approvedBy?: string
): Promise<{ message: string; count: number }> {
  return api.post(`/v1/lesson-alternatives/blocks/${blockId}/connected`, {
    words,
    approvedBy,
  });
}

/**
 * Update connected word approval
 */
export async function updateConnectedWordApproval(
  connId: string,
  isApproved: boolean,
  approvedBy?: string
): Promise<{ message: string; isApproved: boolean }> {
  return api.put(`/v1/lesson-alternatives/connected/${connId}/approve`, {
    isApproved,
    approvedBy,
  });
}

/**
 * Delete connected word
 */
export async function deleteConnectedWord(connId: string): Promise<{ message: string }> {
  return api.delete(`/v1/lesson-alternatives/connected/${connId}`);
}

// ═══════════════════════════════════════════════════════════
// LESSON-LEVEL OPERATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get connected words for entire lesson
 */
export async function getLessonConnectedWords(
  lessonId: string,
  limit = 20
): Promise<{
  lessonId: string;
  usedWords: string[];
  usedVocab: Array<{ id: string; hanzi: string; pinyin: string; english: string; category: string }>;
  relatedWords: Array<{ id: string; hanzi: string; pinyin: string; english: string; category: string }>;
  byCategory: Record<string, Array<{ id: string; hanzi: string; pinyin: string; english: string }>>;
}> {
  return api.get(`/v1/lesson-alternatives/lessons/${lessonId}/connected-words?limit=${limit}`);
}

/**
 * Save connected words for a lesson
 */
export async function saveLessonConnectedWords(
  lessonId: string,
  wordIds: string[]
): Promise<{ message: string; lessonId: string; wordCount: number }> {
  return api.post(`/v1/lesson-alternatives/lessons/${lessonId}/connected-words`, { wordIds });
}

// ═══════════════════════════════════════════════════════════
// EXPORT FOR MOBILE
// ═══════════════════════════════════════════════════════════

export interface ExportedBlock {
  id: string;
  type: string;
  orderIndex: number;
  content: Record<string, unknown>;
  slots: Array<{
    position: number;
    wordId: string;
    hanzi: string;
    isFocus: boolean;
    alternatives: string[]; // Word IDs
  }>;
  connectedWords: string[]; // Word IDs
}

export interface LessonExport {
  lesson: {
    id: string;
    title: string;
    hskLevel: number;
    lessonType: string;
  };
  blocks: ExportedBlock[];
}

/**
 * Get full lesson data with alternatives and connected words for mobile export
 */
export async function exportLessonForMobile(lessonId: string): Promise<LessonExport> {
  return api.get<LessonExport>(`/v1/lesson-alternatives/lessons/${lessonId}/export`);
}

// ═══════════════════════════════════════════════════════════
// SYNC HELPERS (Bridge portal state to backend)
// ═══════════════════════════════════════════════════════════

/**
 * Sync word alternatives from portal block content to backend slot_alternatives table
 * 
 * This bridges the gap between:
 * - Portal: block.content.wordAlternatives (local JSON)
 * - Backend: lesson_block_slots + slot_alternatives (DB tables)
 */
export async function syncBlockAlternatives(
  blockId: string,
  correctOrder: string[],
  wordAlternatives: Record<number, Array<{ id: string; hanzi: string; pinyin?: string; english?: string }>>
): Promise<{ success: boolean; slotsCreated: number; alternativesAdded: number }> {
  // 1. First, we need to look up vocabulary IDs for each word
  // This is a simplified sync - in production you might batch this
  
  let slotsCreated = 0;
  let alternativesAdded = 0;
  
  try {
    // Create slots from correctOrder (mapping hanzi to vocab IDs)
    const slotWords: SlotWord[] = [];
    
    for (const hanzi of correctOrder) {
      if (!hanzi.trim()) continue;
      
      // We'll create with a placeholder ID - backend will resolve
      // In practice, you'd look up the vocab ID first
      slotWords.push({
        wordId: `lookup:${hanzi}`, // Backend will need to resolve this
        hanzi,
      });
    }
    
    if (slotWords.length > 0) {
      const slotsResult = await createBlockSlots(blockId, slotWords);
      slotsCreated = slotsResult.slots.length;
      
      // 2. Add alternatives for each slot
      for (const slot of slotsResult.slots) {
        const alternatives = wordAlternatives[slot.position];
        if (alternatives && alternatives.length > 0) {
          const altPayload = alternatives.map(alt => ({
            wordId: alt.id,
            hanzi: alt.hanzi,
          }));
          
          const altResult = await addSlotAlternatives(slot.id, altPayload);
          alternativesAdded += altResult.count;
        }
      }
    }
    
    return { success: true, slotsCreated, alternativesAdded };
  } catch (error) {
    console.error('[syncBlockAlternatives] Failed:', error);
    return { success: false, slotsCreated, alternativesAdded };
  }
}

