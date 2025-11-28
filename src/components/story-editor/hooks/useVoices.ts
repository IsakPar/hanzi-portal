/**
 * useVoices Hook
 * Manages voice loading and ElevenLabs configuration status
 */

import { useState, useEffect, useCallback } from 'react';
import { getVoices, getSpeechStatus, type Voice } from '@/services/speechAPI';
import { logger } from '@/utils/logger';

export interface UseVoicesReturn {
  voices: Voice[];
  isConfigured: boolean | null;
  isLoading: boolean;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  refreshVoices: () => Promise<void>;
}

const DEFAULT_VOICE = 'chinese-female-1';

export function useVoices(): UseVoicesReturn {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE);

  const loadVoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statusResult, voicesResult] = await Promise.all([
        getSpeechStatus(),
        getVoices(),
      ]);
      
      setIsConfigured(statusResult.configured);
      setVoices(voicesResult.voices);
      
      // Set default voice if available
      if (voicesResult.voices.length > 0 && !voicesResult.voices.find(v => v.id === selectedVoice)) {
        setSelectedVoice(voicesResult.voices[0].id);
      }
    } catch (error) {
      logger.error('Failed to load voices:', error);
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVoice]);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  return {
    voices,
    isConfigured,
    isLoading,
    selectedVoice,
    setSelectedVoice,
    refreshVoices: loadVoices,
  };
}

