/**
 * StoryPreviewPlayer
 * Sequential playback of all segment audio with visual highlighting
 */

import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { getPlayableUrl } from './hooks/useAudioPlayer';
import type { EditableSegment } from './types/segment';

interface StoryPreviewPlayerProps {
  segments: EditableSegment[];
  pauseBetweenSegmentsMs: number;
  onSegmentHighlight: (index: number | null) => void;
}

export function StoryPreviewPlayer({
  segments,
  pauseBetweenSegmentsMs,
  onSegmentHighlight,
}: StoryPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const abortRef = useRef(false);

  const segmentsWithAudio = segments.filter(s => 
    s.audioState === 'saved' || s.audioState === 'preview'
  ).length;

  const handlePlay = useCallback(async () => {
    if (segmentsWithAudio === 0) {
      toast.info('No audio available', 'Generate or upload audio for segments first');
      return;
    }

    abortRef.current = false;
    setIsPlaying(true);

    try {
      for (let i = 0; i < segments.length; i++) {
        if (abortRef.current) break;
        
        const segment = segments[i];
        const audioUrl = getPlayableUrl(segment.previewAudioBase64, segment.audioUrl);

        if (!audioUrl) continue;

        onSegmentHighlight(i);

        // Play audio with segment's playback speed
        await new Promise<void>((resolve) => {
          if (!audioRef.current) {
            resolve();
            return;
          }
          
          audioRef.current.src = audioUrl;
          audioRef.current.playbackRate = segment.playbackSpeed ?? 1.0;
          audioRef.current.onended = () => resolve();
          audioRef.current.onerror = () => resolve();
          audioRef.current.play().catch(() => resolve());
        });

        if (abortRef.current) break;

        // Wait for pause duration (except after last segment)
        if (i < segments.length - 1 && pauseBetweenSegmentsMs > 0) {
          await new Promise(resolve => setTimeout(resolve, pauseBetweenSegmentsMs));
        }
      }
    } finally {
      setIsPlaying(false);
      onSegmentHighlight(null);
    }
  }, [segments, segmentsWithAudio, pauseBetweenSegmentsMs, onSegmentHighlight]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    onSegmentHighlight(null);
  }, [onSegmentHighlight]);

  if (segmentsWithAudio === 0) {
    return null;
  }

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      <Button
        onClick={isPlaying ? handleStop : handlePlay}
        variant="outline"
        className={isPlaying ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
      >
        {isPlaying ? (
          <>
            <X className="w-4 h-4 mr-2" />
            Stop Preview
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Preview Story
          </>
        )}
      </Button>
    </>
  );
}

