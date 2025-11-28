/**
 * WaveformTimestampEditor
 * 
 * Visual waveform editor for marking word boundaries in audio.
 * Uses wavesurfer.js for waveform visualization.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Play, Pause, RotateCcw, Wand2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpeechSegment } from '@/types/lesson';
import { generateInitialSegments, hasSandhiApplied, getSandhiDescription } from './SandhiDetector';
import { cn } from '@/lib/utils';

interface WaveformTimestampEditorProps {
  audioUrl: string;
  text: string;
  pinyin: string;
  segments: SpeechSegment[];
  onSegmentsChange: (segments: SpeechSegment[]) => void;
  onDurationChange?: (durationMs: number) => void;
}

// Color palette for segment regions
const SEGMENT_COLORS = [
  'rgba(99, 102, 241, 0.3)',   // Indigo
  'rgba(16, 185, 129, 0.3)',   // Emerald
  'rgba(245, 158, 11, 0.3)',   // Amber
  'rgba(239, 68, 68, 0.3)',    // Red
  'rgba(139, 92, 246, 0.3)',   // Violet
  'rgba(6, 182, 212, 0.3)',    // Cyan
];

export function WaveformTimestampEditor({
  audioUrl,
  text,
  pinyin,
  segments,
  onSegmentsChange,
  onDurationChange,
}: WaveformTimestampEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    setError(null);
    setIsReady(false);

    // Create regions plugin
    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#94A3B8',
      progressColor: '#6366F1',
      cursorColor: '#1E293B',
      cursorWidth: 2,
      height: 100,
      normalize: true,
      plugins: [regions],
    });

    wavesurferRef.current = ws;

    // Event handlers
    ws.on('ready', () => {
      const dur = ws.getDuration() * 1000; // Convert to ms
      setDuration(dur);
      setIsReady(true);
      onDurationChange?.(dur);
      
      // Add regions for existing segments
      updateRegions(segments, dur);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('timeupdate', (time) => setCurrentTime(time * 1000));
    ws.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setError('Failed to load audio. Please check the URL.');
    });

    // Region events
    regions.on('region-updated', (region) => {
      const index = parseInt(region.id.replace('segment-', ''));
      if (!isNaN(index)) {
        const newSegments = [...segments];
        newSegments[index] = {
          ...newSegments[index],
          startMs: Math.round(region.start * 1000),
          endMs: Math.round(region.end * 1000),
        };
        onSegmentsChange(newSegments);
      }
    });

    // Load audio
    ws.load(audioUrl);

    return () => {
      ws.destroy();
    };
  }, [audioUrl]);

  // Update regions when segments change
  const updateRegions = useCallback((segs: SpeechSegment[], _dur: number) => {
    if (!regionsRef.current || !wavesurferRef.current) return;

    // Clear existing regions
    regionsRef.current.clearRegions();

    // Add new regions
    segs.forEach((seg, index) => {
      regionsRef.current?.addRegion({
        id: `segment-${index}`,
        start: seg.startMs / 1000,
        end: seg.endMs / 1000,
        color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
        drag: true,
        resize: true,
      });
    });
  }, []);

  // Update regions when segments prop changes
  useEffect(() => {
    if (isReady && duration > 0) {
      updateRegions(segments, duration);
    }
  }, [segments, isReady, duration, updateRegions]);

  // Play/Pause toggle
  const togglePlayback = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  // Play specific segment
  const playSegment = (index: number) => {
    if (!wavesurferRef.current || !segments[index]) return;
    
    const seg = segments[index];
    wavesurferRef.current.setTime(seg.startMs / 1000);
    wavesurferRef.current.play();
    
    // Stop at end of segment
    const checkTime = () => {
      if (wavesurferRef.current && wavesurferRef.current.getCurrentTime() * 1000 >= seg.endMs) {
        wavesurferRef.current.pause();
      } else if (wavesurferRef.current?.isPlaying()) {
        requestAnimationFrame(checkTime);
      }
    };
    requestAnimationFrame(checkTime);
  };

  // Auto-generate segments from text/pinyin
  const handleAutoGenerate = () => {
    if (!duration) return;
    
    const newSegments = generateInitialSegments(text, pinyin, duration);
    onSegmentsChange(newSegments);
  };

  // Reset segments
  const handleReset = () => {
    onSegmentsChange([]);
  };

  // Update segment field
  const updateSegment = (index: number, field: keyof SpeechSegment, value: unknown) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], [field]: value };
    onSegmentsChange(newSegments);
  };

  // Format time as mm:ss.ms
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `${seconds}.${milliseconds.toString().padStart(3, '0').slice(0, 2)}s`;
  };

  if (!audioUrl) {
    return (
      <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
        Upload audio first to add timestamps
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Waveform Container */}
      <div className="relative bg-slate-50 rounded-lg p-4 border">
        {error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="w-full" />
            
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
                <div className="animate-pulse text-muted-foreground">Loading audio...</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayback}
          disabled={!isReady}
        >
          {isPlaying ? (
            <><Pause className="h-4 w-4 mr-1" /> Pause</>
          ) : (
            <><Play className="h-4 w-4 mr-1" /> Play</>
          )}
        </Button>
        
        <span className="text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        
        <div className="flex-1" />
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoGenerate}
          disabled={!isReady || !text || !pinyin}
        >
          <Wand2 className="h-4 w-4 mr-1" />
          Auto-Generate
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={segments.length === 0}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Segments Table */}
      {segments.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Word</th>
                <th className="px-3 py-2 text-left font-medium">Pinyin</th>
                <th className="px-3 py-2 text-left font-medium">Written</th>
                <th className="px-3 py-2 text-left font-medium">Actual</th>
                <th className="px-3 py-2 text-left font-medium">Start</th>
                <th className="px-3 py-2 text-left font-medium">End</th>
                <th className="px-3 py-2 text-center font-medium">Play</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, index) => (
                <tr 
                  key={index} 
                  className={cn(
                    "border-t hover:bg-slate-50/50",
                    hasSandhiApplied(seg) && "bg-amber-50/50"
                  )}
                >
                  <td className="px-3 py-2 font-medium text-lg">{seg.word}</td>
                  <td className="px-3 py-2">{seg.pinyin}</td>
                  <td className="px-3 py-2">
                    <select
                      value={seg.writtenTone}
                      onChange={(e) => updateSegment(index, 'writtenTone', parseInt(e.target.value))}
                      className="w-16 px-2 py-1 border rounded text-sm"
                    >
                      <option value={0}>0 (neutral)</option>
                      <option value={1}>1 (flat)</option>
                      <option value={2}>2 (rising)</option>
                      <option value={3}>3 (dip)</option>
                      <option value={4}>4 (falling)</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={seg.actualTone}
                        onChange={(e) => updateSegment(index, 'actualTone', parseInt(e.target.value))}
                        className={cn(
                          "w-16 px-2 py-1 border rounded text-sm",
                          hasSandhiApplied(seg) && "border-amber-400 bg-amber-50"
                        )}
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                      {hasSandhiApplied(seg) && (
                        <span 
                          className="text-amber-600 cursor-help"
                          title={getSandhiDescription(seg) || undefined}
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatTime(seg.startMs)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatTime(seg.endMs)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => playSegment(index)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sandhi Legend */}
      {segments.some(hasSandhiApplied) && (
        <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
          ⚠️ <strong>Sandhi detected:</strong> Some tones change when spoken together. 
          The "Actual" column shows the tone as it should be pronounced.
        </div>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Drag the colored regions on the waveform to adjust word boundaries. 
        Click "Auto-Generate" to create initial segments from the text.
      </p>
    </div>
  );
}

