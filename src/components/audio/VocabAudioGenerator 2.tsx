/**
 * VocabAudioGenerator - Generate and save audio to VOCABULARY (not lesson blocks)
 * 
 * This component ensures audio is saved to the vocabulary table,
 * making it the single source of truth for word audio.
 * 
 * Flow:
 * 1. Look up vocabulary entry by hanzi
 * 2. Generate audio preview
 * 3. Save to vocabulary (not lesson block)
 * 4. Audio is then available everywhere (vocab practice, lessons, etc.)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, Loader2, CheckCircle2, Play, Pause, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VoiceSelector } from './VoiceSelector';
import { AudioPreviewPlayer } from './AudioPreviewPlayer';
import { 
  previewLessonAudio, 
  DEFAULT_VOICE,
  DEFAULT_SPEED,
  formatCost,
} from '@/services/lessonAudioAPI';
import { 
  searchVocabulary, 
  saveWordAudio,
  type VocabularyEntry,
} from '@/services/vocabularyAPI';
// Note: We no longer re-encode at different speeds - original audio is preserved
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface VocabAudioGeneratorProps {
  /** Chinese text (hanzi) to generate audio for */
  hanzi: string;
  
  /** Section label */
  label?: string;
  
  /** Called when vocabulary audio is saved */
  onAudioSaved?: (vocabEntry: VocabularyEntry) => void;
  
  /** Called when audio is deleted */
  onAudioDeleted?: () => void;
  
  /** Additional class name */
  className?: string;
}

export function VocabAudioGenerator({
  hanzi,
  label = 'Word Audio',
  onAudioSaved,
  onAudioDeleted,
  className,
}: VocabAudioGeneratorProps) {
  // Vocabulary lookup state
  const [vocabEntry, setVocabEntry] = useState<VocabularyEntry | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  
  // Audio state
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingSaved, setIsPlayingSaved] = useState(false);
  
  // Ref for saved audio playback
  const savedAudioRef = useRef<HTMLAudioElement | null>(null);

  // CDN base URL for audio
  const CDN_BASE_URL = 'https://content.polymasterlabs.com';

  /**
   * Look up vocabulary entry by hanzi
   */
  const lookupVocabulary = useCallback(async () => {
    if (!hanzi?.trim()) {
      setVocabEntry(null);
      setLookupError(null);
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      // Search for exact hanzi match
      const result = await searchVocabulary({ query: hanzi, limit: 10 });
      
      // Find exact match
      const exactMatch = result.results.find(v => v.hanzi === hanzi);
      
      if (exactMatch) {
        setVocabEntry(exactMatch);
      } else {
        setVocabEntry(null);
        setLookupError(`"${hanzi}" not found in vocabulary database`);
      }
    } catch (err) {
      console.error('Vocabulary lookup failed:', err);
      setLookupError('Failed to look up vocabulary');
      setVocabEntry(null);
    } finally {
      setIsLookingUp(false);
    }
  }, [hanzi]);

  // Look up vocabulary when hanzi changes
  useEffect(() => {
    lookupVocabulary();
  }, [lookupVocabulary]);

  // Derive state
  const hasText = !!hanzi?.trim();
  const hasVocabEntry = !!vocabEntry;
  const hasSavedAudio = !!(vocabEntry?.wordAudioR2Key);
  const hasPreview = !!previewBase64;

  // Build audio URL with cache busting
  const savedAudioUrl = hasSavedAudio 
    ? `${CDN_BASE_URL}/${vocabEntry.wordAudioR2Key}${vocabEntry.wordAudioUpdatedAt ? `?t=${vocabEntry.wordAudioUpdatedAt}` : ''}`
    : null;

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
      const result = await previewLessonAudio(hanzi, selectedVoice);
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
   * Handle approval from preview player - saves to VOCABULARY
   */
  const handleApprove = async (audioBase64: string, selectedSpeed: number) => {
    if (!vocabEntry) {
      toast.error('No vocabulary entry', 'Add this word to vocabulary first');
      return;
    }

    try {
      setIsSaving(true);
      
      // NOTE: We save the ORIGINAL audio without speed processing
      // Speed processing causes pitch shift and quality loss
      // The playback speed is stored as metadata for the mobile app to use
      const finalBase64 = audioBase64;
      
      // TODO: In future, store selectedSpeed as metadata in vocabulary table
      // For now, mobile app will use default playback speed
      console.log('[VocabAudio] Saving original audio, intended speed:', selectedSpeed);
      
      // Save to VOCABULARY (not lesson block!)
      const result = await saveWordAudio(vocabEntry.id, finalBase64);
      
      // Update local state with new audio key
      const updatedEntry: VocabularyEntry = {
        ...vocabEntry,
        wordAudioR2Key: result.r2Key,
        wordAudioUpdatedAt: result.audioUpdatedAt,
      };
      setVocabEntry(updatedEntry);
      
      // Clear preview and notify parent
      setPreviewBase64(null);
      onAudioSaved?.(updatedEntry);
      
      toast.success('Audio saved to vocabulary!', `${hanzi} audio is now available everywhere`);
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
   * Delete saved audio (just clears the key in vocabulary)
   */
  const handleDelete = async () => {
    if (!vocabEntry) return;
    
    // Note: We don't actually delete from R2, just clear the reference
    // This could be enhanced to actually delete the R2 file
    toast.info('Audio reference cleared', 'Re-generate to add new audio');
    
    const updatedEntry: VocabularyEntry = {
      ...vocabEntry,
      wordAudioR2Key: null,
      wordAudioUpdatedAt: null,
    };
    setVocabEntry(updatedEntry);
    setIsPlayingSaved(false);
    onAudioDeleted?.();
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

  // LOADING STATE
  if (isLookingUp) {
    return (
      <div className={cn('space-y-3', className)}>
        {label && (
          <Label className="text-purple-900 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            {label}
          </Label>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Looking up vocabulary...</span>
        </div>
      </div>
    );
  }

  // NO VOCABULARY ENTRY - Show error/guidance
  if (!hasVocabEntry && hasText) {
    return (
      <div className={cn('space-y-3', className)}>
        {label && (
          <Label className="text-purple-900 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            {label}
          </Label>
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {lookupError || `"${hanzi}" not in vocabulary`}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Add this word to the vocabulary database first, then you can generate audio.
              </p>
              <a 
                href={`/vocabulary/new?hanzi=${encodeURIComponent(hanzi)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 mt-2 underline"
              >
                Add to vocabulary
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // NO TEXT - Show placeholder
  if (!hasText) {
    return (
      <div className={cn('space-y-3', className)}>
        {label && (
          <Label className="text-purple-900 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            {label}
          </Label>
        )}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Enter Chinese text first</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <Label className="text-purple-900 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          {label}
          <span className="text-xs text-gray-400 font-normal ml-1">
            (saves to vocabulary)
          </span>
        </Label>
      )}

      {/* STATE 1: No audio - Show generate button */}
      {!hasSavedAudio && !hasPreview && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
          {/* Vocab info */}
          <div className="flex items-center gap-2 mb-3 text-xs text-purple-600">
            <span>Saving to:</span>
            <span className="font-medium text-purple-800">{vocabEntry?.hanzi}</span>
            <span className="text-purple-400">({vocabEntry?.pinyin})</span>
          </div>
          
          {/* Voice selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-purple-700">Voice:</span>
            <VoiceSelector
              value={selectedVoice}
              onChange={setSelectedVoice}
              size="sm"
              disabled={isGenerating}
            />
          </div>
          
          {/* Generate button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
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
        </div>
      )}

      {/* STATE 2: Preview - Show preview player */}
      {hasPreview && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
          <div className="text-xs text-purple-600 mb-2">
            Will save to: <span className="font-medium">{vocabEntry?.hanzi}</span>
          </div>
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
            src={savedAudioUrl!}
            onEnded={() => setIsPlayingSaved(false)} 
          />
          
          <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-green-700">Audio saved</div>
              <div className="text-xs text-green-600/80 truncate">
                Stored in vocabulary • Available everywhere
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

export default VocabAudioGenerator;

