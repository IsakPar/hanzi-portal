/**
 * InlineAudioStatus - Compact audio status indicator for inline use
 * 
 * Shows:
 * - ⚠️ if no audio exists (with generate option)
 * - 🔊 if audio exists (with preview/replace options)
 * 
 * Used in MCQ options, dialogue lines, etc.
 */

import { useState, useRef } from 'react';
import { Volume2, AlertCircle, Loader2, Play, Pause, RefreshCw } from 'lucide-react';
import { VoiceSelector } from './VoiceSelector';
import { previewLessonAudio, saveLessonAudio, DEFAULT_VOICE, formatCost } from '@/services/lessonAudioAPI';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface InlineAudioStatusProps {
  /** Chinese text to generate audio for */
  text: string;
  
  /** Existing audio URL (if already saved) */
  audioUrl?: string;
  
  /** Lesson ID for storage path */
  lessonId: string;
  
  /** Block ID for storage path */
  blockId: string;
  
  /** Option ID (for MCQ) or segment ID for unique storage path */
  optionId: string;
  
  /** Called when audio is saved */
  onAudioSaved: (audioUrl: string) => void;
  
  /** Called when audio is removed */
  onAudioRemoved?: () => void;
  
  /** Disable all interactions */
  disabled?: boolean;
}

export function InlineAudioStatus({
  text,
  audioUrl,
  lessonId,
  blockId,
  optionId,
  onAudioSaved,
  onAudioRemoved,
  disabled = false,
}: InlineAudioStatusProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const hasAudio = !!audioUrl;
  const hasText = !!text?.trim();
  
  // Check if text contains Chinese characters
  const hasChinese = hasText && /[\u4e00-\u9fff]/.test(text);
  
  // Don't show anything if no Chinese text
  if (!hasChinese) {
    return null;
  }

  const handleGenerate = async () => {
    if (!hasText || disabled) return;
    
    setIsGenerating(true);
    try {
      const result = await previewLessonAudio(text, selectedVoice);
      setPreviewBase64(result.audioBase64);
      
      // Auto-play preview
      if (previewAudioRef.current) {
        previewAudioRef.current.src = `data:audio/mpeg;base64,${result.audioBase64}`;
        previewAudioRef.current.play();
      }
      
      toast.success('Preview ready!', `${result.charactersUsed} chars • ${formatCost(result.estimatedCost)}`);
    } catch (err) {
      toast.error('Generation failed', (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!previewBase64) return;
    
    setIsSaving(true);
    try {
      // Use optionId in the blockId path to make it unique per option
      const combinedBlockId = `${blockId}_${optionId}`;
      const result = await saveLessonAudio(previewBase64, lessonId, combinedBlockId);
      
      onAudioSaved(result.audioUrl);
      setPreviewBase64(null);
      setShowPopover(false);
      
      toast.success('Audio saved!');
    } catch (err) {
      toast.error('Save failed', (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleRemove = () => {
    onAudioRemoved?.();
    setShowPopover(false);
  };

  // Status icon button
  const StatusButton = () => (
    <button
      onClick={() => setShowPopover(!showPopover)}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-md transition-all",
        hasAudio
          ? "text-green-600 hover:bg-green-50"
          : "text-amber-500 hover:bg-amber-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title={hasAudio ? "Audio ready" : "No audio - click to generate"}
    >
      {hasAudio ? (
        <Volume2 size={16} />
      ) : (
        <AlertCircle size={16} />
      )}
    </button>
  );

  return (
    <div className="relative">
      <StatusButton />
      
      {/* Hidden audio elements */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}
      <audio ref={previewAudioRef} onEnded={() => {}} />
      
      {/* Popover */}
      {showPopover && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPopover(false)}
          />
          
          {/* Popover content */}
          <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {hasAudio ? 'Audio Ready' : 'Generate Audio'}
              </span>
              <button
                onClick={() => setShowPopover(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            {/* Text preview */}
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-800 break-all">
              {text}
            </div>
            
            {/* Has audio - show play/replace */}
            {hasAudio && !previewBase64 && (
              <div className="flex gap-2">
                <button
                  onClick={handlePlayPause}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Generate new audio"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                </button>
              </div>
            )}
            
            {/* No audio - show generate */}
            {!hasAudio && !previewBase64 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Voice:</span>
                  <VoiceSelector
                    value={selectedVoice}
                    onChange={setSelectedVoice}
                    size="sm"
                    disabled={isGenerating}
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || disabled}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Volume2 size={16} />
                      Generate Audio
                    </>
                  )}
                </button>
              </>
            )}
            
            {/* Preview ready - show approve/discard */}
            {previewBase64 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Volume2 size={14} />
                  <span>Preview ready - click to replay</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                  <button
                    onClick={() => setPreviewBase64(null)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            
            {/* Remove audio option */}
            {hasAudio && onAudioRemoved && (
              <button
                onClick={handleRemove}
                className="w-full text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Remove audio
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

