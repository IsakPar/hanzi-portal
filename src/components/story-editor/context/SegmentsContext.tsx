/**
 * SegmentsContext
 * Manages segment state and operations, eliminating prop drilling
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { bulkSaveSegments, type BulkSegment } from '@/services/storiesAPI';
import { generateSpeech } from '@/services/speechAPI';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/useToast';
import type { EditableSegment, SegmentFormData } from '../types/segment';
import { createEditableSegment, createNewSegment, isTemporaryId } from '../types/segment';
import type { StorySentence } from '@/services/storiesAPI';
import type { Voice } from '@/services/speechAPI';

// ═══════════════════════════════════════════════════════════
// CONTEXT TYPE
// ═══════════════════════════════════════════════════════════

interface SegmentsContextValue {
  // State
  segments: EditableSegment[];
  hasChanges: boolean;
  isSaving: boolean;
  isGeneratingAll: boolean;
  
  // Voice settings
  defaultVoice: string;
  setDefaultVoice: (voice: string) => void;
  defaultSpeed: number;
  setDefaultSpeed: (speed: number) => void;
  voices: Voice[];
  setVoices: (voices: Voice[]) => void;
  
  // CRUD operations
  addSegment: () => void;
  editSegment: (id: string) => void;
  saveSegment: (id: string, data: SegmentFormData) => void;
  cancelEdit: (id: string) => void;
  deleteSegment: (id: string) => Promise<boolean>;
  
  // Drag & drop
  handleDragEnd: (event: DragEndEvent) => void;
  
  // Audio operations
  updateAudioState: (id: string, updates: Partial<EditableSegment>) => void;
  updateVoice: (id: string, voice: string) => void;
  updatePlaybackSpeed: (id: string, speed: number) => void;
  applyVoiceToAll: (voice: string) => void;
  generateAllAudio: () => Promise<void>;
  
  // Persistence
  saveAllChanges: () => Promise<boolean>;
  
  // Stats
  stats: {
    withAudio: number;
    withPreview: number;
    withoutAudio: number;
    withAnyAudio: number;
  };
}

const SegmentsContext = createContext<SegmentsContextValue | null>(null);

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useSegments(): SegmentsContextValue {
  const context = useContext(SegmentsContext);
  if (!context) {
    throw new Error('useSegments must be used within a SegmentsProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════

interface SegmentsProviderProps {
  children: ReactNode;
  storyId: string;
  initialSentences: StorySentence[];
  onUpdate: () => void;
  onConfirm: (options: {
    title: string;
    description: string;
    confirmLabel: string;
    variant?: 'default' | 'destructive';
  }) => Promise<boolean>;
}

export function SegmentsProvider({
  children,
  storyId,
  initialSentences,
  onUpdate,
  onConfirm,
}: SegmentsProviderProps) {
  // Core state
  const [segments, setSegments] = useState<EditableSegment[]>(() =>
    initialSentences.map(createEditableSegment)
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  
  // Voice settings
  const [defaultVoice, setDefaultVoice] = useState('chinese-female-1');
  const [defaultSpeed, setDefaultSpeed] = useState(0.7);
  const [voices, setVoices] = useState<Voice[]>([]);

  // ─────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────
  
  const addSegment = useCallback(() => {
    const newSegment = createNewSegment(storyId, segments.length);
    setSegments(prev => [...prev, newSegment]);
  }, [storyId, segments.length]);

  const editSegment = useCallback((id: string) => {
    setSegments(prev => prev.map(s => 
      s.id === id ? { ...s, isEditing: true } : s
    ));
  }, []);

  const saveSegment = useCallback((id: string, data: SegmentFormData) => {
    setSegments(prev => prev.map(s =>
      s.id === id
        ? { ...s, ...data, isEditing: false, isNew: false }
        : s
    ));
    setHasChanges(true);
  }, []);

  const cancelEdit = useCallback((id: string) => {
    setSegments(prev => {
      const segment = prev.find(s => s.id === id);
      if (segment?.isNew) {
        return prev.filter(s => s.id !== id);
      }
      return prev.map(s => s.id === id ? { ...s, isEditing: false } : s);
    });
  }, []);

  const deleteSegment = useCallback(async (id: string): Promise<boolean> => {
    const confirmed = await onConfirm({
      title: 'Delete Segment?',
      description: 'Are you sure you want to delete this segment?',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    
    if (confirmed) {
      setSegments(prev => prev.filter(s => s.id !== id));
      setHasChanges(true);
      return true;
    }
    return false;
  }, [onConfirm]);

  // ─────────────────────────────────────────────────────────
  // Drag & Drop
  // ─────────────────────────────────────────────────────────
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSegments(prev => {
      const oldIndex = prev.findIndex(item => item.id === active.id);
      const newIndex = prev.findIndex(item => item.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setHasChanges(true);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Audio Operations
  // ─────────────────────────────────────────────────────────
  
  const updateAudioState = useCallback((id: string, updates: Partial<EditableSegment>) => {
    setSegments(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
    if (updates.audioR2Key) {
      setHasChanges(true);
    }
  }, []);

  const updateVoice = useCallback((id: string, voice: string) => {
    setSegments(prev => prev.map(s =>
      s.id === id ? { ...s, selectedVoice: voice } : s
    ));
  }, []);

  const updatePlaybackSpeed = useCallback((id: string, speed: number) => {
    const roundedSpeed = Math.round(speed * 10) / 10;
    setSegments(prev => prev.map(s =>
      s.id === id ? { ...s, playbackSpeed: roundedSpeed } : s
    ));
  }, []);

  const applyVoiceToAll = useCallback((voice: string) => {
    setSegments(prev => prev.map(s => ({ ...s, selectedVoice: voice })));
    const voiceName = voices.find(v => v.id === voice)?.name || voice;
    toast.success('Voice applied', `All segments set to ${voiceName}`);
  }, [voices]);

  const generateAllAudio = useCallback(async () => {
    const segmentsWithoutAudio = segments.filter(s => 
      s.audioState === 'none' && s.chinese.trim()
    );
    
    if (segmentsWithoutAudio.length === 0) {
      toast.info('No segments to generate', 'All segments already have audio');
      return;
    }

    const confirmed = await onConfirm({
      title: `Generate Audio for ${segmentsWithoutAudio.length} Segments?`,
      description: `This will generate audio using ElevenLabs. You'll need to approve each one before saving.`,
      confirmLabel: 'Generate',
    });

    if (!confirmed) return;

    setIsGeneratingAll(true);

    for (const segment of segmentsWithoutAudio) {
      try {
        setSegments(prev => prev.map(s =>
          s.id === segment.id ? { ...s, audioState: 'generating' } : s
        ));

        const voiceToUse = segment.selectedVoice || defaultVoice;
        const result = await generateSpeech(segment.chinese, voiceToUse, defaultSpeed);

        setSegments(prev => prev.map(s =>
          s.id === segment.id
            ? {
                ...s,
                audioState: 'preview',
                previewAudioBase64: result.audioBase64,
                previewDurationMs: result.durationMs,
              }
            : s
        ));
      } catch (error) {
        logger.error(`Failed to generate audio for segment ${segment.id}:`, error);
        setSegments(prev => prev.map(s =>
          s.id === segment.id ? { ...s, audioState: 'none' } : s
        ));
      }
    }

    setIsGeneratingAll(false);
    toast.success('Generation complete!', 'Review and approve each audio segment below');
  }, [segments, defaultVoice, defaultSpeed, onConfirm]);

  // ─────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────
  
  const saveAllChanges = useCallback(async (): Promise<boolean> => {
    if (storyId === 'new') {
      toast.error('Save story first', 'Please save the story before adding segments');
      return false;
    }

    setIsSaving(true);
    try {
      const bulkSegments: BulkSegment[] = segments.map(s => ({
        id: isTemporaryId(s.id) ? undefined : s.id,
        chinese: s.chinese,
        pinyin: s.pinyin,
        english: s.english,
        audioR2Key: s.audioR2Key,
        audioDurationMs: s.audioDurationMs,
      }));

      const result = await bulkSaveSegments(storyId, bulkSegments);
      
      toast.success(
        'Segments saved!',
        `Created: ${result.created}, Updated: ${result.updated}, Deleted: ${result.deleted}`
      );
      setHasChanges(false);
      onUpdate();
      return true;
    } catch (error) {
      logger.error('Failed to save segments:', error);
      toast.error('Save failed', 'Could not save segments. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [storyId, segments, onUpdate]);

  // ─────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────
  
  const stats = useMemo(() => ({
    withAudio: segments.filter(s => s.audioState === 'saved').length,
    withPreview: segments.filter(s => s.audioState === 'preview').length,
    withoutAudio: segments.filter(s => s.audioState === 'none').length,
    withAnyAudio: segments.filter(s => 
      s.audioState === 'saved' || s.audioState === 'preview'
    ).length,
  }), [segments]);

  // ─────────────────────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────────────────────
  
  const value: SegmentsContextValue = {
    segments,
    hasChanges,
    isSaving,
    isGeneratingAll,
    defaultVoice,
    setDefaultVoice,
    defaultSpeed,
    setDefaultSpeed,
    voices,
    setVoices,
    addSegment,
    editSegment,
    saveSegment,
    cancelEdit,
    deleteSegment,
    handleDragEnd,
    updateAudioState,
    updateVoice,
    updatePlaybackSpeed,
    applyVoiceToAll,
    generateAllAudio,
    saveAllChanges,
    stats,
  };

  return (
    <SegmentsContext.Provider value={value}>
      {children}
    </SegmentsContext.Provider>
  );
}

