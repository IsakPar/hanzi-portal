/**
 * SegmentAudioControls
 * Audio generation, preview, and save controls for a single segment
 */

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Mic, 
  Upload, 
  Loader2, 
  Volume2, 
  Check, 
  X, 
  RefreshCw, 
  CheckCircle 
} from 'lucide-react';
import { useSegmentAudio } from './hooks/useSegmentAudio';
import { getPlayableUrl } from './hooks/useAudioPlayer';
import type { EditableSegment } from './types/segment';

interface SegmentAudioControlsProps {
  segment: EditableSegment;
  storyId: string;
  voice: string;
  speed: number;
  playbackSpeed: number;
  onAudioGenerated: (audioBase64: string, durationMs: number) => void;
  onAudioSaved: (r2Key: string, durationMs: number) => void;
  onAudioDiscarded: () => void;
}

export function SegmentAudioControls({
  segment,
  storyId,
  voice,
  speed,
  playbackSpeed,
  onAudioGenerated,
  onAudioSaved,
  onAudioDiscarded,
}: SegmentAudioControlsProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { isGenerating, generate, save } = useSegmentAudio();

  // Update playback rate when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleGenerate = async () => {
    const result = await generate(segment.chinese, voice, speed);
    if (result) {
      onAudioGenerated(result.audioBase64, result.durationMs);
    }
  };

  const handlePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!segment.previewAudioBase64) return;
    
    const result = await save(
      segment.previewAudioBase64,
      storyId,
      segment.id,
      segment.previewDurationMs
    );
    
    if (result) {
      onAudioSaved(result.r2Key, result.durationMs);
    }
  };

  const audioUrl = getPlayableUrl(segment.previewAudioBase64, segment.audioUrl);

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* None - No audio yet */}
      {segment.audioState === 'none' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 flex-1">No audio</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept="audio/*" className="hidden" />
            <Button size="sm" variant="outline" className="gap-1" asChild>
              <span>
                <Upload className="w-4 h-4" />
                Upload
              </span>
            </Button>
          </label>
        </div>
      )}

      {/* Generating */}
      {segment.audioState === 'generating' && (
        <div className="flex items-center gap-2 text-purple-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Generating audio...</span>
        </div>
      )}

      {/* Preview - Audio generated but not saved */}
      {segment.audioState === 'preview' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-600">
            <Volume2 className="w-4 h-4" />
            <span className="text-sm">
              Preview ready ({((segment.previewDurationMs || 0) / 1000).toFixed(1)}s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePlay}
              className="gap-1"
            >
              <Play className="w-4 h-4" />
              {isPlaying ? 'Stop' : 'Play'}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="w-4 h-4" />
              Approve & Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              className="gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAudioDiscarded}
              className="gap-1 text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Discard
            </Button>
          </div>
        </div>
      )}

      {/* Saving */}
      {segment.audioState === 'saving' && (
        <div className="flex items-center gap-2 text-purple-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Saving audio...</span>
        </div>
      )}

      {/* Saved - Audio stored in R2 */}
      {segment.audioState === 'saved' && (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600 flex-1">
            Audio saved ({((segment.audioDurationMs || 0) / 1000).toFixed(1)}s)
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePlay}
            className="gap-1"
          >
            <Play className="w-4 h-4" />
            Play
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            className="gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Replace
          </Button>
        </div>
      )}
    </div>
  );
}

