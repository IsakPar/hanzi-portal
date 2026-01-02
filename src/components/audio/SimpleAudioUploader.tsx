/**
 * SimpleAudioUploader
 * 
 * A simple drag-and-drop audio uploader for vocabulary words.
 * Uploads MP3 files generated from ElevenLabs portal.
 * 
 * Features:
 * - Drag and drop support
 * - File picker fallback
 * - Playback preview for existing audio
 * - Base64 encoding for API submission
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Play, Pause, Loader2, Check, Volume2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimpleAudioUploaderProps {
  label?: string;
  existingAudioKey?: string | null;
  onUpload: (base64: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  className?: string;
}

export function SimpleAudioUploader({
  label = 'Audio',
  existingAudioKey,
  onUpload,
  onDelete,
  className = '',
}: SimpleAudioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExistingAudio = !!existingAudioKey;
  const audioUrl = hasExistingAudio
    ? `https://content.polymasterlabs.com/${existingAudioKey}`
    : undefined;

  /**
   * Convert file to base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  /**
   * Handle file upload
   */
  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      setError('Please upload an MP3 audio file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)');
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const base64 = await fileToBase64(file);
      await onUpload(base64);
      setUploadSuccess(true);
      // Reset success indicator after 2 seconds
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  /**
   * Handle drag events
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  /**
   * Toggle audio playback
   */
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioUrl]);

  // Handle audio end
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-purple-500" />
          {label}
        </label>
        {hasExistingAudio && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
      </div>

      {/* Existing audio player */}
      {hasExistingAudio && audioUrl && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
          />
          <button
            onClick={togglePlayback}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <span className="text-sm text-green-700 flex-1">Audio saved</span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all',
          dragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50',
          isUploading && 'opacity-50 cursor-wait',
          uploadSuccess && 'border-green-500 bg-green-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/mpeg,.mp3"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-2" />
            <span className="text-sm text-gray-600">Uploading...</span>
          </>
        ) : uploadSuccess ? (
          <>
            <Check className="w-8 h-8 text-green-500 mb-2" />
            <span className="text-sm text-green-600">Uploaded!</span>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-purple-400 mb-2" />
            <span className="text-sm text-gray-600">
              {hasExistingAudio ? 'Replace audio' : 'Drop MP3 here'}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              or click to browse
            </span>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        💡 Generate audio in <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">ElevenLabs</a> portal, download MP3, then upload here
      </p>
    </div>
  );
}

export default SimpleAudioUploader;

