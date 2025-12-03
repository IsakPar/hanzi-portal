import { useEffect, useRef, useCallback, useState } from 'react';
import type { Lesson } from '@/types/lesson';

interface AutoSaveOptions {
  /** Key for localStorage */
  storageKey: string;
  /** Data to save */
  data: Lesson | null;
  /** Whether the data has changed since last save */
  isDirty: boolean;
  /** Whether this is a new item (not yet saved to backend) */
  isNew: boolean;
  /** Debounce delay for localStorage saves (ms) */
  localDebounceMs?: number;
  /** Callback when recovering from localStorage */
  onRecover?: (data: Lesson) => void;
}

interface AutoSaveState {
  lastLocalSave: Date | null;
  hasRecoveredData: boolean;
  recoveryData: Lesson | null;
}

export function useAutoSave({
  storageKey,
  data,
  isDirty,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isNew: _isNew, // Reserved for future server auto-save
  localDebounceMs = 2000,
  onRecover,
}: AutoSaveOptions) {
  const [state, setState] = useState<AutoSaveState>({
    lastLocalSave: null,
    hasRecoveredData: false,
    recoveryData: null,
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
        lessonId: data.id || 'new',
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      setState(prev => ({ ...prev, lastLocalSave: new Date() }));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }, [data, storageKey, isDirty]);

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
          setState(prev => ({ 
            ...prev, 
            hasRecoveredData: true,
            recoveryData: parsed.data,
          }));
        } else {
          // Clear old data
          localStorage.removeItem(storageKey);
        }
      }
    } catch (err) {
      console.error('Failed to check for recovered data:', err);
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
    setState(prev => ({ ...prev, hasRecoveredData: false, recoveryData: null }));
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
    saveToLocal,
    clearStorage,
    recoverData,
    dismissRecovery,
  };
}
