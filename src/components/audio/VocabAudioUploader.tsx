/**
 * VocabAudioUploader - Upload audio for vocabulary words
 * 
 * Looks up vocabulary entry by hanzi and allows audio upload.
 * Audio is saved to VOCABULARY table (single source of truth).
 * 
 * Flow:
 * 1. Look up vocabulary entry by hanzi
 * 2. Show existing audio or upload button
 * 3. Save uploaded audio to vocabulary
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Loader2, CheckCircle2, Play, Pause, Upload, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  searchVocabulary, 
  saveWordAudio,
  type VocabularyEntry,
} from '@/services/vocabularyAPI';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface VocabAudioUploaderProps {
  /** Chinese text (hanzi) to upload audio for */
  hanzi: string;
  
  /** Section label */
  label?: string;
  
  /** Called when vocabulary audio is saved */
  onAudioSaved?: (vocabEntry: VocabularyEntry) => void;
  
  /** Additional class name */
  className?: string;
}

export function VocabAudioUploader({
  hanzi,
  label = 'Word Audio',
  onAudioSaved,
  className,
}: VocabAudioUploaderProps) {
  // Vocabulary lookup state
  const [vocabEntry, setVocabEntry] = useState<VocabularyEntry | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Audio state
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio URL from vocabulary
  const audioUrl = vocabEntry?.wordAudioR2Key 
    ? `https://content.polymasterlabs.com/${vocabEntry.wordAudioR2Key}` 
    : null;

  // Look up vocabulary when hanzi changes
  useEffect(() => {
    if (!hanzi?.trim()) {
      setVocabEntry(null);
      setLookupError(null);
      return;
    }

    const lookupVocab = async () => {
      setIsLookingUp(true);
      setLookupError(null);
      
      try {
        const result = await searchVocabulary({ query: hanzi, limit: 1 });
        const match = result.results.find(
          (v: VocabularyEntry) => v.hanzi === hanzi
        );
        
        if (match) {
          setVocabEntry(match);
        } else {
          setLookupError(`"${hanzi}" not found in vocabulary`);
          setVocabEntry(null);
        }
      } catch (err) {
        setLookupError('Failed to look up vocabulary');
        setVocabEntry(null);
      } finally {
        setIsLookingUp(false);
      }
    };

    lookupVocab();
  }, [hanzi]);

  // Handle file upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vocabEntry) return;

    // Validate file type
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      toast.error('Invalid file', 'Please upload an MP3 audio file');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const result = await saveWordAudio(vocabEntry.id, base64);
          
          // Update local state
          setVocabEntry(prev => prev ? {
            ...prev,
            wordAudioR2Key: result.r2Key,
            wordAudioUpdatedAt: result.audioUpdatedAt,
          } : null);
          
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 2000);
          toast.success('Audio saved!', `Updated audio for ${hanzi}`);
          
          if (onAudioSaved && vocabEntry) {
            onAudioSaved({
              ...vocabEntry,
              wordAudioR2Key: result.r2Key,
            });
          }
        } catch (err) {
          toast.error('Upload failed', (err as Error).message);
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to read file');
        setIsUploading(false);
      };
    } catch (err) {
      toast.error('Upload failed', (err as Error).message);
      setIsUploading(false);
    }

    // Reset file input
    e.target.value = '';
  }, [vocabEntry, hanzi, onAudioSaved]);

  // Toggle playback
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Handle audio end
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Loading state
  if (isLookingUp) {
    return (
      <div className={cn("p-4 bg-gray-50 rounded-xl border", className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Looking up vocabulary...</span>
        </div>
      </div>
    );
  }

  // Error state - word not in vocabulary
  if (lookupError) {
    return (
      <div className={cn("p-4 bg-amber-50 rounded-xl border border-amber-200", className)}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">{lookupError}</p>
            <p className="text-xs text-amber-600 mt-1">
              Add this word to the vocabulary database first
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No hanzi entered
  if (!hanzi?.trim()) {
    return (
      <div className={cn("p-4 bg-gray-50 rounded-xl border", className)}>
        <div className="flex items-center gap-2 text-gray-400">
          <Volume2 className="w-4 h-4" />
          <span className="text-sm">Enter Chinese text to manage audio</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4 bg-purple-50 rounded-xl border border-purple-200", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/mpeg,.mp3"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Label className="flex items-center gap-2 text-purple-900 font-medium">
          <Volume2 className="w-4 h-4" />
          {label}
        </Label>
        {audioUrl && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Saved
          </span>
        )}
      </div>

      {/* Audio player or upload zone */}
      {audioUrl ? (
        <div className="flex items-center gap-3">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
          />
          <button
            onClick={togglePlay}
            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <span className="text-sm text-purple-700 flex-1">Audio for "{hanzi}"</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs"
          >
            {isUploading ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Upload className="w-3 h-3 mr-1" />
            )}
            Replace
          </Button>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all",
            "border-purple-300 hover:border-purple-500 hover:bg-purple-100/50",
            isUploading && "opacity-50 cursor-wait",
            uploadSuccess && "border-green-500 bg-green-50"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin mb-2" />
              <span className="text-sm text-gray-600">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-purple-400 mb-2" />
              <span className="text-sm text-gray-600">Upload MP3 for "{hanzi}"</span>
              <span className="text-xs text-gray-400 mt-1">or click to browse</span>
            </>
          )}
        </div>
      )}

      {/* ElevenLabs link */}
      <div className="mt-3 pt-3 border-t border-purple-200">
        <a
          href="https://elevenlabs.io/app/speech-synthesis"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Generate in ElevenLabs portal
        </a>
      </div>
    </div>
  );
}

export default VocabAudioUploader;

