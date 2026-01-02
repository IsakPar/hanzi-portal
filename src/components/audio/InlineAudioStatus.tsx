/**
 * InlineAudioStatus - Compact audio indicator for inline use
 * 
 * Shows whether audio exists for a piece of text.
 * Used in MCQ options, dialogue lines, etc.
 * 
 * NOTE: TTS generation has been removed. Audio should be uploaded manually
 * via the Audio Manager or individual editors.
 */

import { useState, useRef, useCallback } from 'react';
import { Play, Pause, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineAudioStatusProps {
  /** Chinese text this audio is for */
  text: string;
  
  /** Existing audio URL (R2 key or full URL) */
  audioUrl?: string;
  
  /** Called when audio changes (for future upload support) */
  onAudioSaved?: (audioUrl: string) => void;
  
  /** Called when audio is removed */
  onAudioRemoved?: () => void;
  
  /** Lesson ID for context */
  lessonId?: string;
  
  /** Block ID for context */
  blockId?: string;
  
  /** Option ID for context (MCQ options, etc.) */
  optionId?: string;
  
  /** Whether the component is disabled */
  disabled?: boolean;
  
  /** Additional class name */
  className?: string;
}

export function InlineAudioStatus({
  text,
  audioUrl,
  className,
  // These props are accepted for compatibility but not used yet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAudioSaved: _onAudioSaved,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAudioRemoved: _onAudioRemoved,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lessonId: _lessonId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  blockId: _blockId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  optionId: _optionId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  disabled: _disabled,
}: InlineAudioStatusProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const hasAudio = !!audioUrl;
  const fullAudioUrl = audioUrl?.startsWith('http')
    ? audioUrl
    : audioUrl
    ? `https://content.polymasterlabs.com/${audioUrl}`
    : null;

  // No text - don't show anything
  if (!text?.trim()) {
    return null;
  }

  // Toggle playback
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !fullAudioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, fullAudioUrl]);

  // Handle audio end
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {hasAudio ? (
        <>
          <audio
            ref={audioRef}
            src={fullAudioUrl || undefined}
            onEnded={handleAudioEnded}
          />
          <button
            onClick={togglePlay}
            className={cn(
              "p-1 rounded-full transition-colors",
              isPlaying
                ? "bg-green-100 text-green-600"
                : "bg-purple-100 text-purple-600 hover:bg-purple-200"
            )}
            title="Play audio"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>
          <CheckCircle2 className="w-3 h-3 text-green-500" />
        </>
      ) : (
        <span className="flex items-center gap-1 text-xs text-amber-500" title="Audio needed">
          <AlertCircle className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

export default InlineAudioStatus;

