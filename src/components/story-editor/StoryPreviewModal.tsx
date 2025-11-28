import { useState, useRef, useEffect, useCallback } from "react";
import { X, Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAudioUrl } from "@/services/speechAPI";
import type { StorySentence } from "@/services/storiesAPI";
import { cn } from "@/lib/utils";

interface StoryPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  segments: Array<StorySentence & { 
    previewAudioBase64?: string;
    audioDurationMs?: number;
  }>;
  pauseBetweenSegmentsMs: number;
}

type PlayState = 'idle' | 'playing' | 'paused' | 'pausing';

export function StoryPreviewModal({
  isOpen,
  onClose,
  title,
  segments,
  pauseBetweenSegmentsMs,
}: StoryPreviewModalProps) {
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0-100 for current segment
  const [showPinyin, setShowPinyin] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [playedIndices, setPlayedIndices] = useState<Set<number>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const abortRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter segments that have audio
  const playableSegments = segments.filter(s => 
    s.audioUrl || s.previewAudioBase64 || s.audioR2Key
  );

  // Get audio URL for a segment
  const getAudioUrl = useCallback((segment: typeof segments[0]): string | null => {
    if (segment.previewAudioBase64) {
      return createAudioUrl(segment.previewAudioBase64);
    }
    if (segment.audioUrl) {
      return segment.audioUrl;
    }
    return null;
  }, []);

  // Auto-scroll to current segment
  useEffect(() => {
    if (playState === 'playing' || playState === 'pausing') {
      const currentRef = segmentRefs.current[currentIndex];
      if (currentRef) {
        currentRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex, playState]);

  // Clear progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Start progress tracking
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = setInterval(() => {
      if (audioRef.current && audioRef.current.duration) {
        const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(pct);
      }
    }, 50);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Play a single segment
  const playSegment = useCallback(async (index: number): Promise<boolean> => {
    if (index >= segments.length) return false;
    
    const segment = segments[index];
    const audioUrl = getAudioUrl(segment);
    
    if (!audioUrl || !audioRef.current) return false;

    setCurrentIndex(index);
    setProgress(0);
    
    return new Promise((resolve) => {
      if (!audioRef.current) {
        resolve(false);
        return;
      }

      audioRef.current.src = audioUrl;
      
      audioRef.current.onloadeddata = () => {
        if (abortRef.current) {
          resolve(false);
          return;
        }
        audioRef.current?.play();
        startProgressTracking();
      };
      
      audioRef.current.onended = () => {
        stopProgressTracking();
        setProgress(100);
        setPlayedIndices(prev => new Set([...prev, index]));
        resolve(true);
      };
      
      audioRef.current.onerror = () => {
        stopProgressTracking();
        resolve(false);
      };
    });
  }, [segments, getAudioUrl, startProgressTracking, stopProgressTracking]);

  // Play all segments sequentially
  const playAll = useCallback(async (startIndex: number = 0) => {
    abortRef.current = false;
    setPlayState('playing');
    setPlayedIndices(new Set());

    for (let i = startIndex; i < segments.length; i++) {
      if (abortRef.current) break;

      const hasAudio = getAudioUrl(segments[i]);
      if (!hasAudio) continue;

      const success = await playSegment(i);
      if (!success || abortRef.current) break;

      // Pause between segments
      if (i < segments.length - 1 && pauseBetweenSegmentsMs > 0) {
        setPlayState('pausing');
        await new Promise(resolve => setTimeout(resolve, pauseBetweenSegmentsMs));
        if (abortRef.current) break;
        setPlayState('playing');
      }
    }

    setPlayState('idle');
  }, [segments, pauseBetweenSegmentsMs, playSegment, getAudioUrl]);

  const handlePlayPause = () => {
    if (playState === 'playing' || playState === 'pausing') {
      // Stop
      abortRef.current = true;
      audioRef.current?.pause();
      stopProgressTracking();
      setPlayState('idle');
    } else {
      // Start from current or beginning
      playAll(currentIndex);
    }
  };

  const handleSkipBack = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    abortRef.current = true;
    audioRef.current?.pause();
    stopProgressTracking();
    setCurrentIndex(newIndex);
    setProgress(0);
    setPlayState('idle');
  };

  const handleSkipForward = () => {
    const newIndex = Math.min(segments.length - 1, currentIndex + 1);
    abortRef.current = true;
    audioRef.current?.pause();
    stopProgressTracking();
    setCurrentIndex(newIndex);
    setProgress(0);
    setPlayState('idle');
  };

  const handleSegmentClick = (index: number) => {
    abortRef.current = true;
    audioRef.current?.pause();
    stopProgressTracking();
    setPlayState('idle');
    setCurrentIndex(index);
    setProgress(0);
    // Start playing from clicked segment
    setTimeout(() => playAll(index), 100);
  };

  const handleClose = () => {
    abortRef.current = true;
    audioRef.current?.pause();
    stopProgressTracking();
    setPlayState('idle');
    setCurrentIndex(0);
    setProgress(0);
    setPlayedIndices(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const totalDuration = segments.reduce((sum, s) => sum + (s.audioDurationMs || 0), 0);
  const segmentsWithAudio = playableSegments.length;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <audio ref={audioRef} className="hidden" />
      
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📖 Story Preview</h2>
            <p className="text-sm text-gray-500">{title}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleClose}>
            <X size={20} />
          </Button>
        </div>

        {/* Segments */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {segments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No segments to preview
            </div>
          ) : (
            segments.map((segment, index) => {
              const isPlaying = playState === 'playing' && currentIndex === index;
              const isPausing = playState === 'pausing' && currentIndex === index;
              const isPlayed = playedIndices.has(index);
              const hasAudio = !!getAudioUrl(segment);
              const isCurrent = currentIndex === index;

              return (
                <div
                  key={segment.id}
                  ref={el => { segmentRefs.current[index] = el; }}
                  onClick={() => hasAudio && handleSegmentClick(index)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer",
                    isPlaying && "bg-amber-50 border-amber-400 shadow-lg shadow-amber-200/50",
                    isPausing && "bg-purple-50 border-purple-300 animate-pulse",
                    isPlayed && !isCurrent && "bg-green-50/50 border-green-200 opacity-70",
                    !isPlaying && !isPausing && !isPlayed && "bg-white border-gray-200 hover:border-gray-300",
                    !hasAudio && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {/* Segment header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      Segment {index + 1}/{segments.length}
                    </span>
                    {isPlaying && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Volume2 size={14} className="animate-pulse" />
                        Playing
                      </span>
                    )}
                    {isPausing && (
                      <span className="text-xs font-medium text-purple-600">
                        ⏸️ {pauseBetweenSegmentsMs}ms pause
                      </span>
                    )}
                    {isPlayed && !isCurrent && (
                      <span className="text-xs font-medium text-green-600">✓</span>
                    )}
                    {!hasAudio && (
                      <span className="text-xs text-gray-400">No audio</span>
                    )}
                  </div>

                  {/* Chinese text */}
                  <p className={cn(
                    "text-2xl font-medium mb-1",
                    isPlaying ? "text-amber-900" : "text-gray-900"
                  )}>
                    {segment.chinese}
                  </p>

                  {/* Pinyin */}
                  {showPinyin && segment.pinyin && (
                    <p className="text-gray-600 mb-1">{segment.pinyin}</p>
                  )}

                  {/* English */}
                  {showEnglish && segment.english && (
                    <p className="text-gray-500 italic text-sm">{segment.english}</p>
                  )}

                  {/* Progress bar */}
                  {isCurrent && hasAudio && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-100 rounded-full",
                            isPlaying ? "bg-amber-500" : "bg-gray-400"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>{((segment.audioDurationMs || 0) * progress / 100 / 1000).toFixed(1)}s</span>
                        <span>{((segment.audioDurationMs || 0) / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Controls */}
        <div className="p-6 border-t bg-gray-50">
          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipBack}
              disabled={currentIndex === 0}
            >
              <SkipBack size={18} />
            </Button>
            
            <Button
              onClick={handlePlayPause}
              disabled={segmentsWithAudio === 0}
              className={cn(
                "px-8 py-6 rounded-full",
                playState !== 'idle' 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-purple-600 hover:bg-purple-700"
              )}
            >
              {playState !== 'idle' ? (
                <>
                  <Pause size={24} className="mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play size={24} className="mr-2" />
                  Play All
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipForward}
              disabled={currentIndex >= segments.length - 1}
            >
              <SkipForward size={18} />
            </Button>
          </div>

          {/* Toggles and info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPinyin}
                  onChange={(e) => setShowPinyin(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-600">Pinyin</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEnglish}
                  onChange={(e) => setShowEnglish(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-600">English</span>
              </label>
            </div>
            
            <div className="text-gray-500">
              {segmentsWithAudio}/{segments.length} segments with audio • 
              {(totalDuration / 1000).toFixed(1)}s total • 
              {pauseBetweenSegmentsMs}ms pauses
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

