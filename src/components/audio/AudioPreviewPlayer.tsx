/**
 * AudioPreviewPlayer - Preview playback with speed control and approve/discard
 * 
 * Used after generating audio, before saving to R2.
 * Features:
 * - Play/pause controls
 * - Speed slider (0.5x - 1.0x)
 * - Approve (save) button
 * - Regenerate / Discard buttons
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { createAudioDataUrl, DEFAULT_SPEED } from '@/services/lessonAudioAPI';
import { cn } from '@/lib/utils';

interface AudioPreviewPlayerProps {
  /** Base64 audio data (not yet saved) */
  audioBase64: string;
  
  /** Default playback speed */
  defaultSpeed?: number;
  
  /** Called when user approves - passes final base64 (possibly speed-processed) */
  onApprove: (audioBase64: string, selectedSpeed: number) => void;
  
  /** Called when user discards preview */
  onDiscard: () => void;
  
  /** Called when user wants to regenerate */
  onRegenerate: () => void;
  
  /** Is currently regenerating */
  isRegenerating?: boolean;
  
  /** Is currently saving/processing */
  isSaving?: boolean;
  
  /** Additional class name */
  className?: string;
}

export function AudioPreviewPlayer({
  audioBase64,
  defaultSpeed = DEFAULT_SPEED,
  onApprove,
  onDiscard,
  onRegenerate,
  isRegenerating = false,
  isSaving = false,
  className,
}: AudioPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(defaultSpeed);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create data URL for audio playback
  const audioUrl = createAudioDataUrl(audioBase64);

  // Update playback speed when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleApprove = () => {
    // Pass the original base64 - speed processing happens in the parent
    onApprove(audioBase64, speed);
  };

  const getSpeedLabel = () => {
    if (speed < 0.65) return 'Slow';
    if (speed < 0.85) return 'Learning';
    return 'Normal';
  };

  const isDisabled = isRegenerating || isSaving;

  return (
    <div className={cn('space-y-3 p-3 bg-white rounded-lg border border-purple-300', className)}>
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        src={audioUrl}
        onEnded={() => setIsPlaying(false)} 
      />

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handlePlayPause}
          disabled={isDisabled}
          className="border-purple-300"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        
        <div className="flex-1 text-sm text-purple-700">
          {isPlaying ? 'Playing...' : 'Ready to play'}
        </div>
        
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onRegenerate}
          disabled={isDisabled}
          title="Regenerate"
        >
          {isRegenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </Button>
        
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onDiscard}
          disabled={isDisabled}
          title="Discard"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Speed slider */}
      <div className="flex items-center gap-3 pt-2 border-t border-purple-100">
        <Label className="text-xs text-purple-700 whitespace-nowrap">
          Playback: <span className="font-bold">{speed.toFixed(2)}x</span>
        </Label>
        <Slider
          value={[speed]}
          onValueChange={(values: number[]) => setSpeed(values[0])}
          min={0.5}
          max={1.0}
          step={0.05}
          className="flex-1"
          disabled={isDisabled}
        />
        <span className="text-xs text-gray-500 w-16 text-right">
          {getSpeedLabel()}
        </span>
      </div>
      
      {/* Approve button */}
      <Button 
        onClick={handleApprove} 
        disabled={isDisabled} 
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {speed !== 1.0 ? 'Processing & Saving...' : 'Saving...'}
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Save at {speed.toFixed(2)}x Speed
          </>
        )}
      </Button>
    </div>
  );
}

