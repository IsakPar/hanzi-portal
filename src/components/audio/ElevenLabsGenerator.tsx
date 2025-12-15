/**
 * ElevenLabsGenerator - Complete audio generation flow
 * 
 * Full flow component:
 * 1. Generate button (no audio yet)
 * 2. Preview player with speed control (after generation)
 * 3. Saved audio card (after approval)
 * 
 * Matches the UX from VocabularyEditor
 */

import { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2, CheckCircle2, Play, Pause, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VoiceSelector } from './VoiceSelector';
import { AudioPreviewPlayer } from './AudioPreviewPlayer';
import { 
  previewLessonAudio, 
  saveLessonAudio,
  DEFAULT_VOICE,
  DEFAULT_SPEED,
  formatCost,
} from '@/services/lessonAudioAPI';
// Note: We no longer re-encode at different speeds - original audio is preserved
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface ElevenLabsGeneratorProps {
  /** Chinese text to generate audio for */
  text: string;
  
  /** Section label */
  label?: string;
  
  /** Existing saved audio URL (if already saved) */
  savedAudioUrl?: string;
  
  /** Lesson ID for R2 path */
  lessonId: string;
  
  /** Block ID for R2 path */
  blockId: string;
  
  /** Called when audio is saved to R2 (with optional MFCC features) */
  onSaved: (audioUrl: string, durationMs: number, mfccUrl?: string) => void;
  
  /** Called when saved audio is deleted */
  onDeleted: () => void;
  
  /** Disable generation (e.g., entity not saved yet) */
  disabled?: boolean;
  
  /** Message to show when disabled */
  disabledMessage?: string;
  
  /** Additional class name */
  className?: string;
}

export function ElevenLabsGenerator({
  text,
  label = 'Audio',
  savedAudioUrl,
  lessonId,
  blockId,
  onSaved,
  onDeleted,
  disabled = false,
  disabledMessage = 'Save first to generate audio',
  className,
}: ElevenLabsGeneratorProps) {
  // State
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingSaved, setIsPlayingSaved] = useState(false);
  const [justSavedUrl, setJustSavedUrl] = useState<string | null>(null); // Track URL we just saved
  
  // Ref for saved audio playback
  const savedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clear justSavedUrl when the prop updates (parent confirmed the save)
  useEffect(() => {
    if (savedAudioUrl && justSavedUrl) {
      setJustSavedUrl(null);
    }
  }, [savedAudioUrl, justSavedUrl]);

  // Determine current state - use justSavedUrl as fallback while waiting for prop update
  const hasText = !!text?.trim();
  const effectiveSavedUrl = savedAudioUrl || justSavedUrl;
  const hasSavedAudio = !!effectiveSavedUrl;
  const hasPreview = !!previewBase64;

  /**
   * Generate preview audio
   */
  const handleGenerate = async () => {
    if (!hasText) {
      toast.error('Missing text', 'Enter Chinese text first');
      return;
    }

    try {
      setIsGenerating(true);
      const result = await previewLessonAudio(text, selectedVoice);
      setPreviewBase64(result.audioBase64);
      
      toast.success(
        'Audio generated!', 
        `${result.charactersUsed} chars • ${formatCost(result.estimatedCost)}`
      );
    } catch (err) {
      toast.error('Generation failed', (err as Error).message || 'Please try again');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle approval from preview player
   */
  const handleApprove = async (audioBase64: string, selectedSpeed: number) => {
    try {
      setIsSaving(true);
      
      // NOTE: We save the ORIGINAL audio without speed processing
      // Speed processing causes pitch shift and quality loss
      console.log('[ElevenLabs] Saving audio, intended speed:', selectedSpeed);
      
      // Save to R2 - backend extracts MFCC via TTS service
      const result = await saveLessonAudio(
        audioBase64, 
        lessonId, 
        blockId
      );
      
      // Store the URL locally so we can display it while waiting for parent to update
      setJustSavedUrl(result.audioUrl);
      
      // Clear preview and notify parent (with MFCC URL if extracted)
      setPreviewBase64(null);
      onSaved(result.audioUrl, result.audioDurationMs || 0, result.mfccUrl);
      
      // Show confirmation with MFCC status
      if (result.mfccExtracted) {
        toast.success('Audio saved with MFCC!', 'Speech comparison ready');
      } else {
        toast.success('Audio saved!', 'Ready for students (no MFCC)');
      }
    } catch (err) {
      toast.error('Save failed', (err as Error).message || 'Please try again');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Discard preview
   */
  const handleDiscard = () => {
    setPreviewBase64(null);
  };

  /**
   * Delete saved audio
   */
  const handleDelete = () => {
    onDeleted();
    setIsPlayingSaved(false);
    setJustSavedUrl(null); // Clear local URL on delete
  };

  /**
   * Play/pause saved audio
   */
  const handlePlayPauseSaved = () => {
    if (!savedAudioRef.current) return;
    
    if (isPlayingSaved) {
      savedAudioRef.current.pause();
      setIsPlayingSaved(false);
    } else {
      savedAudioRef.current.play();
      setIsPlayingSaved(true);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <Label className="text-purple-900 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          {label}
        </Label>
      )}

      {/* STATE 1: No audio - Show generate button */}
      {!hasSavedAudio && !hasPreview && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
          {/* Voice selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-purple-700">Voice:</span>
            <VoiceSelector
              value={selectedVoice}
              onChange={setSelectedVoice}
              size="sm"
              disabled={disabled || isGenerating}
            />
          </div>
          
          {/* Generate button */}
          <Button 
            onClick={handleGenerate} 
            disabled={disabled || isGenerating || !hasText}
            variant="outline" 
            className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Audio'}
          </Button>
          
          {/* Disabled message */}
          {disabled && (
            <p className="text-xs text-purple-600 mt-2">💡 {disabledMessage}</p>
          )}
          
          {/* No text message */}
          {!hasText && !disabled && (
            <p className="text-xs text-purple-600 mt-2">💡 Enter Chinese text first</p>
          )}
        </div>
      )}

      {/* STATE 2: Preview - Show preview player */}
      {hasPreview && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
          <AudioPreviewPlayer
            audioBase64={previewBase64}
            defaultSpeed={DEFAULT_SPEED}
            onApprove={handleApprove}
            onDiscard={handleDiscard}
            onRegenerate={handleGenerate}
            isRegenerating={isGenerating}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* STATE 3: Saved - Show saved audio card */}
      {hasSavedAudio && !hasPreview && (
        <>
          {/* Hidden audio element for playback */}
          <audio 
            ref={savedAudioRef} 
            src={effectiveSavedUrl!}
            onEnded={() => setIsPlayingSaved(false)} 
          />
          
          <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-green-700">Audio saved</div>
              <div className="text-xs text-green-600/80 truncate">
                Ready for students
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePlayPauseSaved}
                className="text-green-700 hover:bg-green-100"
              >
                {isPlayingSaved ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-green-700 hover:bg-green-100"
                title="Generate new audio"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10"
                title="Remove audio"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

