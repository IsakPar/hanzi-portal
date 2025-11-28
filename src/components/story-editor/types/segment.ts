/**
 * Story Segment Types
 * Separates domain model from UI state for clarity
 */

import type { StorySentence } from '@/services/storiesAPI';

// ═══════════════════════════════════════════════════════════
// AUDIO STATE MACHINE
// ═══════════════════════════════════════════════════════════

/**
 * Audio state machine for segment audio workflow:
 * none → generating → preview → saving → saved
 *                  ↘ (discard) → none
 *                  ↘ (regenerate) → generating
 */
export type AudioState = 'none' | 'generating' | 'preview' | 'saving' | 'saved';

// ═══════════════════════════════════════════════════════════
// UI STATE EXTENSIONS
// ═══════════════════════════════════════════════════════════

/**
 * UI-only state for segment editing/preview
 * Not persisted to backend
 */
export interface SegmentUIState {
  isNew: boolean;
  isEditing: boolean;
  audioState: AudioState;
  previewAudioBase64?: string;
  previewDurationMs?: number;
  selectedVoice?: string;
  playbackSpeed: number;
}

/**
 * Combined segment with domain + UI state
 * Used within the sentences tab for editing workflow
 */
export interface EditableSegment extends StorySentence, SegmentUIState {}

// ═══════════════════════════════════════════════════════════
// EDITABLE SEGMENT FACTORY
// ═══════════════════════════════════════════════════════════

/**
 * Create an EditableSegment from a StorySentence
 */
export function createEditableSegment(sentence: StorySentence): EditableSegment {
  return {
    ...sentence,
    isNew: false,
    isEditing: false,
    audioState: sentence.audioR2Key ? 'saved' : 'none',
    playbackSpeed: 0.7,
  };
}

/**
 * Create a new empty EditableSegment
 */
export function createNewSegment(storyId: string, orderIndex: number): EditableSegment {
  return {
    id: `temp-${Date.now()}`,
    storyId,
    orderIndex,
    chinese: '',
    pinyin: '',
    english: '',
    audioUrl: null,
    createdAt: new Date(),
    isNew: true,
    isEditing: true,
    audioState: 'none',
    playbackSpeed: 0.7,
  };
}

/**
 * Check if a segment ID is temporary (new segment)
 */
export function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

// ═══════════════════════════════════════════════════════════
// SEGMENT EDIT FORM
// ═══════════════════════════════════════════════════════════

/**
 * Form state for editing a segment's content
 */
export interface SegmentFormData {
  chinese: string;
  pinyin: string;
  english: string;
}

/**
 * Extract form data from an EditableSegment
 */
export function extractFormData(segment: EditableSegment): SegmentFormData {
  return {
    chinese: segment.chinese,
    pinyin: segment.pinyin,
    english: segment.english,
  };
}

