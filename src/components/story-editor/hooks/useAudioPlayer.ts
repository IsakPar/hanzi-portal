/**
 * useAudioPlayer Hook
 * Reusable audio playback control with playback rate support
 */

import { useRef, useState, useCallback, useEffect } from 'react';

export interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  play: (url: string, playbackRate?: number) => Promise<void>;
  stop: () => void;
  setPlaybackRate: (rate: number) => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const play = useCallback(async (url: string, playbackRate = 1.0): Promise<void> => {
    if (!audioRef.current) return;

    return new Promise((resolve) => {
      const audio = audioRef.current!;
      audio.src = url;
      audio.playbackRate = playbackRate;
      
      const handleEnded = () => {
        setIsPlaying(false);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        resolve();
      };
      
      const handleError = () => {
        setIsPlaying(false);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        resolve();
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      setIsPlaying(true);
      audio.play().catch(() => {
        setIsPlaying(false);
        resolve();
      });
    });
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return {
    audioRef,
    isPlaying,
    play,
    stop,
    setPlaybackRate,
  };
}

/**
 * Utility to create a playable URL from base64 or use existing URL
 */
export function getPlayableUrl(
  previewAudioBase64?: string,
  existingAudioUrl?: string | null
): string | null {
  if (previewAudioBase64) {
    return `data:audio/mpeg;base64,${previewAudioBase64}`;
  }
  return existingAudioUrl || null;
}

