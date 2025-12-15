/**
 * AudioPreviewApproval
 * 
 * Reusable component for TTS audio preview → adjust speed → approve flow.
 * Used in VocabularyEditor for both word audio and example audio.
 * 
 * Now uses Azure TTS (no more trimming needed!)
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Check, Loader2, Volume2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/useToast';
import { CDN_BASE_URL } from '@/services/api';

interface GenerateResult {
  base64: string;
  needsTrim?: boolean; // Deprecated - Azure TTS doesn't need trimming
}

interface AudioPreviewApprovalProps {
  /** Label for the audio section (e.g., "Word Audio", "Sentence Audio") */
  label: string;
  /** Icon to display next to label */
  icon?: React.ReactNode;
  /** Color theme: 'purple' | 'blue' | 'green' */
  colorTheme?: 'purple' | 'blue' | 'green';
  /** Existing saved R2 key (shows "Audio saved" with playback) */
  savedAudioKey?: string | null;
  /** Timestamp for cache busting (appended to audio URL) */
  audioUpdatedAt?: number | null;
  /** Whether we can generate (false for new entries) */
  canGenerate?: boolean;
  /** Hint text when cannot generate */
  disabledHint?: string;
  /** Callback to generate new audio (returns base64) */
  onGenerate: () => Promise<GenerateResult>;
  /** Callback to save approved audio (receives base64 at chosen speed), returns new timestamp */
  onSave: (base64: string, speed: number) => Promise<number | void>;
  /** Initial playback speed */
  initialSpeed?: number;
  /** @deprecated Target word for trimmer - no longer needed with Azure TTS */
  targetWord?: string;
}

const themeClasses = {
  purple: {
    container: 'from-purple-50 to-pink-50 border-purple-200',
    label: 'text-purple-900',
    preview: 'border-purple-300',
    text: 'text-purple-700',
    button: 'border-purple-300 text-purple-700 hover:bg-purple-100',
  },
  blue: {
    container: 'from-blue-50 to-indigo-50 border-blue-200',
    label: 'text-blue-900',
    preview: 'border-blue-300',
    text: 'text-blue-700',
    button: 'border-blue-300 text-blue-700 hover:bg-blue-100',
  },
  green: {
    container: 'from-green-50 to-emerald-50 border-green-200',
    label: 'text-green-900',
    preview: 'border-green-300',
    text: 'text-green-700',
    button: 'border-green-300 text-green-700 hover:bg-green-100',
  },
};

export function AudioPreviewApproval({
  label,
  icon = <Volume2 className="w-4 h-4" />,
  colorTheme = 'purple',
  savedAudioKey,
  audioUpdatedAt,
  canGenerate = true,
  disabledHint = '💡 Save the entry first to generate audio',
  onGenerate,
  onSave,
  initialSpeed = 0.7,
  targetWord: _targetWord = '',
}: AudioPreviewApprovalProps) {
  void _targetWord; // Deprecated - no longer needed with Azure TTS
  
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const theme = themeClasses[colorTheme];

  // Update playback speed in real-time
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Generate new audio (Azure TTS - always clean, no trimming needed)
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await onGenerate();
      console.log('[AudioPreview] Generated audio size:', result.base64.length, 'chars');
      
      setAudioBase64(result.base64);
      toast.success('Audio generated!', 'Listen and approve when ready');
    } catch (err) {
      toast.error('Generation failed', (err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // Play/pause preview
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play();
      setPlaying(true);
    }
  };

  // Save approved audio (Azure TTS - clean audio, no processing needed)
  const handleSave = async () => {
    if (!audioBase64) return;
    
    setSaving(true);
    try {
      console.log('[AudioPreview] Saving audio, size:', audioBase64.length, 'chars');
      console.log('[AudioPreview] Playback speed metadata:', playbackSpeed);
      
      // Save audio directly - Azure TTS produces clean audio
      // Speed is stored as metadata, mobile app applies it during playback
      await onSave(audioBase64, playbackSpeed);
      setAudioBase64(null);
      
      const speedMsg = playbackSpeed !== 1.0 ? ` (plays at ${playbackSpeed}x)` : '';
      toast.success('Audio saved!', `Original quality preserved${speedMsg}`);
    } catch (err) {
      toast.error('Save failed', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Discard preview
  const handleDiscard = () => {
    setAudioBase64(null);
    setPlaying(false);
  };

  // Speed label
  const getSpeedLabel = () => {
    if (playbackSpeed < 0.7) return 'Slow';
    if (playbackSpeed < 0.9) return 'Learning';
    return 'Normal';
  };

  return (
    <div className={`bg-gradient-to-r ${theme.container} border rounded-xl p-4`}>
      <Label className={`${theme.label} flex items-center gap-2 mb-3`}>
        {icon}
        {label}
      </Label>

      {/* Existing saved audio */}
      {savedAudioKey && !audioBase64 && (
        <div className="flex items-center gap-3 mb-3 p-2 bg-white rounded-lg border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">Audio saved</span>
          <audio controls className="h-8 flex-1">
            {/* Cache busting: append timestamp to force fresh fetch */}
            <source src={`${CDN_BASE_URL}/${savedAudioKey}${audioUpdatedAt ? `?v=${audioUpdatedAt}` : ''}`} />
          </audio>
        </div>
      )}

      {/* Preview mode */}
      {audioBase64 ? (
        <div className={`space-y-3 p-3 bg-white rounded-lg border ${theme.preview}`}>
          {/* Playback controls */}
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handlePlayPause} className={theme.button}>
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className={`flex-1 text-sm ${theme.text}`}>
              {playing ? 'Playing...' : 'Ready to play'}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleGenerate} 
              disabled={generating}
              title="Regenerate"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDiscard}
              title="Discard"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Speed slider */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <Label className={`text-xs ${theme.text} whitespace-nowrap`}>
              Playback: <span className="font-bold">{playbackSpeed.toFixed(2)}x</span>
            </Label>
            <Slider
              value={[playbackSpeed]}
              onValueChange={(values: number[]) => setPlaybackSpeed(values[0])}
              min={0.5}
              max={1.0}
              step={0.05}
              className="flex-1"
            />
            <span className="text-xs text-gray-500">{getSpeedLabel()}</span>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {playbackSpeed !== 1.0 ? 'Processing & Saving...' : 'Saving...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save at {playbackSpeed}x Speed
              </>
            )}
          </Button>

          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={`data:audio/mpeg;base64,${audioBase64}`}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        </div>
      ) : (
        /* Generate button */
        <Button
          onClick={handleGenerate}
          disabled={generating || !canGenerate}
          variant="outline"
          className={`w-full ${theme.button}`}
        >
          {generating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            icon
          )}
          <span className="ml-2">
            {generating ? 'Generating...' : `Generate ${label}`}
          </span>
        </Button>
      )}

      {/* Disabled hint */}
      {!canGenerate && (
        <p className={`text-xs ${theme.text} mt-2`}>{disabledHint}</p>
      )}
    </div>
  );
}

export default AudioPreviewApproval;

