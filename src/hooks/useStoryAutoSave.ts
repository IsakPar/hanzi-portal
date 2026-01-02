/**
 * useStoryAutoSave - Auto-save hook for Story Editor
 * 
 * Persists story state to localStorage to prevent data loss on refresh.
 * Especially important when audio has been generated but story not yet saved.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { StoryWithDetails } from '@/services/storiesAPI';
import { logger } from '@/utils/logger';

interface StoryAutoSaveOptions {
  /** Key for localStorage */
  storageKey: string;
  /** Data to save */
  data: StoryWithDetails | null;
  /** Whether the data has changed since last save */
  isDirty: boolean;
  /** Whether this is a new story (not yet saved to backend) */
  isNew: boolean;
  /** Debounce delay for localStorage saves (ms) */
  localDebounceMs?: number;
  /** Callback when recovering from localStorage */
  onRecover?: (data: StoryWithDetails) => void;
}

interface StoryAutoSaveState {
  lastLocalSave: Date | null;
  hasRecoveredData: boolean;
  recoveryData: StoryWithDetails | null;
  recoveryTimestamp: Date | null;
}

export function useStoryAutoSave({
  storageKey,
  data,
  isDirty,
  isNew,
  localDebounceMs = 2000,
  onRecover,
}: StoryAutoSaveOptions) {
  const [state, setState] = useState<StoryAutoSaveState>({
    lastLocalSave: null,
    hasRecoveredData: false,
    recoveryData: null,
    recoveryTimestamp: null,
  });
  
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // Save to localStorage with debounce
  const saveToLocal = useCallback(() => {
    if (!data) return;
    
    try {
      const saveData = {
        data,
        savedAt: new Date().toISOString(),
        isDirty,
        storyId: data.id || 'new',
        isNew,
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      setState(prev => ({ ...prev, lastLocalSave: new Date() }));
      logger.log(`[AutoSave] Saved story draft to localStorage (${storageKey})`);
    } catch (err) {
      logger.error('Failed to save story to localStorage:', err);
    }
  }, [data, storageKey, isDirty, isNew]);

  // Check for recovered data on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const savedAt = new Date(parsed.savedAt);
        const now = new Date();
        const ageMinutes = (now.getTime() - savedAt.getTime()) / (1000 * 60);
        
        // Only recover if less than 24 hours old and was dirty
        if (ageMinutes < 24 * 60 && parsed.isDirty && parsed.data) {
          logger.log(`[AutoSave] Found recoverable story draft (${Math.round(ageMinutes)} min old)`);
          setState(prev => ({ 
            ...prev, 
            hasRecoveredData: true,
            recoveryData: parsed.data,
            recoveryTimestamp: savedAt,
          }));
        } else {
          // Clear old data
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err) {
      logger.error('Failed to check for recovered story data:', err);
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Auto-save to localStorage on data changes (debounced)
  useEffect(() => {
    if (!data || !isDirty) return;
    
    // Clear previous timeout
    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current);
    }
    
    // Set new timeout
    localSaveTimeoutRef.current = setTimeout(() => {
      saveToLocal();
    }, localDebounceMs);
    
    return () => {
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
    };
  }, [data, isDirty, localDebounceMs, saveToLocal]);

  // Save to localStorage before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && data) {
        saveToLocal();
        // Show browser's native "unsaved changes" prompt
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, data, saveToLocal]);

  // Clear storage
  const clearStorage = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState(prev => ({ ...prev, hasRecoveredData: false, recoveryData: null, recoveryTimestamp: null }));
    logger.log(`[AutoSave] Cleared story draft from localStorage (${storageKey})`);
  }, [storageKey]);

  // Recover the saved data
  const recoverData = useCallback(() => {
    if (state.recoveryData && onRecover) {
      onRecover(state.recoveryData);
      clearStorage();
    }
  }, [state.recoveryData, onRecover, clearStorage]);

  // Dismiss recovery (don't restore)
  const dismissRecovery = useCallback(() => {
    clearStorage();
  }, [clearStorage]);

  return {
    lastLocalSave: state.lastLocalSave,
    hasRecoveredData: state.hasRecoveredData,
    recoveryData: state.recoveryData,
    recoveryTimestamp: state.recoveryTimestamp,
    saveToLocal,
    clearStorage,
    recoverData,
    dismissRecovery,
  };
}

