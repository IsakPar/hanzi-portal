/**
 * SpeechAudioUploader - Upload audio for speech practice blocks
 * 
 * Simple upload flow for lesson block audio.
 * Uploads to R2 storage for the specific lesson/block.
 * 
 * NOTE: MFCC extraction should be handled separately after upload
 * if needed for speech scoring.
 */

import { useState, useCallback, useRef } from 'react';
import { Volume2, Loader2, Play, Pause, Upload, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/authClient';
import { API_BASE_URL } from '@/services/api';

interface SpeechAudioUploaderProps {
  /** Chinese text this audio is for */
  text: string;
  
  /** Existing saved audio URL */
  savedAudioUrl?: string;
  
  /** Lesson ID for R2 path */
  lessonId: string;
  
  /** Block ID for R2 path */
  blockId: string;
  
  /** Section label */
  label?: string;
  
  /** Called when audio is saved */
  onSaved?: (audioUrl: string, audioDurationMs: number, mfccUrl?: string) => void;
  
  /** Called when audio is deleted */
  onDeleted?: () => void;
  
  /** Additional class name */
  className?: string;
}

export function SpeechAudioUploader({
  text,
  savedAudioUrl,
  lessonId,
  blockId,
  label = 'Reference Audio',
  onSaved,
  onDeleted,
  className,
}: SpeechAudioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const audioUrl = savedAudioUrl?.startsWith('http')
    ? savedAudioUrl
    : savedAudioUrl
    ? `https://content.polymasterlabs.com/${savedAudioUrl}`
    : null;

  // Upload audio file
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      toast.error('Invalid file', 'Please upload an MP3 audio file');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/v1/lessons/${lessonId}/blocks/${blockId}/audio`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
      toast.success('Audio uploaded!');
      
      if (onSaved) {
        onSaved(result.audioUrl || result.r2Key, result.audioDurationMs || 0, result.mfccUrl);
      }
    } catch (err) {
      toast.error('Upload failed', (err as Error).message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }, [lessonId, blockId, onSaved]);

  // Delete audio
  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this audio?')) return;

    try {
      const token = getAccessToken();
      await fetch(
        `${API_BASE_URL}/v1/lessons/${lessonId}/blocks/${blockId}/audio`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      
      toast.success('Audio deleted');
      onDeleted?.();
    } catch (err) {
      toast.error('Delete failed', (err as Error).message);
    }
  }, [lessonId, blockId, onDeleted]);

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

  // No text entered
  if (!text?.trim()) {
    return (
      <div className={cn("p-4 bg-gray-50 rounded-xl border", className)}>
        <div className="flex items-center gap-2 text-gray-400">
          <Volume2 className="w-4 h-4" />
          <span className="text-sm">Enter Chinese text first</span>
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
      {label && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-purple-900 font-medium text-sm">
            <Volume2 className="w-4 h-4" />
            {label}
          </div>
          {audioUrl && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
      )}

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
          <span className="text-sm text-purple-700 flex-1 truncate">"{text}"</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs"
          >
            <Upload className="w-3 h-3 mr-1" />
            Replace
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
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
              <span className="text-sm text-gray-600">Upload MP3 for "{text}"</span>
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

export default SpeechAudioUploader;

