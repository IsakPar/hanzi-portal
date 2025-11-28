/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback } from 'react';
import { Upload, Play, Pause, Trash2, Loader2, Check, X } from 'lucide-react';
import { audioAPI } from '@/services/audioAPI';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { useConfirm } from '@/hooks/useConfirm';
import { API_BASE_URL, getAuthToken } from '@/services/api';

interface AudioUploaderProps {
  label?: string;
  audioUrl?: string; // Changed from currentUrl to match usage in editors
  lessonId?: string; // Optional - will use 'draft' if not provided
  context: string; // 'hero_block_0', 'dialogue_line_2', etc.
  onChange: (url: string) => void; // Changed from onUpload to match usage
  onDelete?: () => void;
  mini?: boolean; // Small inline version
  className?: string;
  helperText?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Audio Uploader Component
 * 
 * Handles MP3 file upload to backend → Cloudflare R2
 * Features:
 * - Drag and drop support
 * - Upload progress tracking
 * - Cancel upload functionality
 * - Audio playback preview
 */
export function AudioUploader({
  label = 'Audio',
  audioUrl,
  lessonId,
  context,
  onChange,
  onDelete,
  mini = false,
  className = '',
  helperText
}: AudioUploaderProps) {
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setIsUploading(false);
      setUploadProgress(null);
      logger.log('Upload cancelled');
    }
  }, []);

  // Use lessonId or 'draft' for new unsaved lessons
  const effectiveLessonId = lessonId || 'draft';

  /**
   * Upload file with progress tracking using XMLHttpRequest
   */
  const uploadWithProgress = useCallback(async (file: File): Promise<string> => {
    const token = await getAuthToken();
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
          });
        }
      });

      xhr.addEventListener('load', () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.url || response.data?.url);
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || errorData.message || 'Upload failed'));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        xhrRef.current = null;
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        xhrRef.current = null;
        reject(new Error('Upload cancelled'));
      });

      // Build form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('lessonId', effectiveLessonId);
      formData.append('context', context);

      // Send request
      xhr.open('POST', `${API_BASE_URL}/v1/audio/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }, [effectiveLessonId, context]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
      setError('Only MP3 files are allowed');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: file.size, percent: 0 });

    try {
      // Try the progress-enabled upload first
      const url = await uploadWithProgress(file);
      onChange(url);
    } catch (err: any) {
      // If it's a cancelled upload, don't show error
      if (err.message === 'Upload cancelled') {
        return;
      }
      // Fall back to original method if progress upload fails
      logger.warn('Progress upload failed, falling back to standard upload:', err);
      try {
        const url = await audioAPI.uploadAudio(file, effectiveLessonId, context);
        onChange(url);
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Upload failed');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDelete = async () => {
    if (!audioUrl) return;
    
    const confirmed = await confirm({
      title: "Delete Audio?",
      description: "Are you sure you want to delete this audio file?",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      // Optimistic update
      onChange('');
      // Try to delete from server (fire and forget or await)
      await audioAPI.deleteAudio(audioUrl).catch((err) => logger.error('Delete audio failed:', err));
      onDelete?.();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Mini inline version for exercises
  if (mini) {
    return (
      <>
        {ConfirmDialogComponent}
        <div className={cn("inline-flex items-center gap-1", className)}>
        {audioUrl ? (
          <>
            <button
              onClick={handlePlay}
              className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
              title="Delete audio"
            >
              <Trash2 className="h-3 w-3" />
            </button>
            <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} />
          </>
        ) : isUploading ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
            {uploadProgress && (
              <span className="text-xs text-blue-600">{uploadProgress.percent}%</span>
            )}
            <button
              onClick={cancelUpload}
              className="p-0.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
              title="Cancel upload"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : (
          <label className="p-1 hover:bg-blue-100 text-blue-600 rounded cursor-pointer transition-colors">
            <Upload className="h-3 w-3" />
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mp3,audio/mpeg"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
        {error && (
          <span className="text-xs text-destructive" title={error}>
            ⚠️
          </span>
        )}
        </div>
      </>
    );
  }

  // Full version
  return (
    <>
      {ConfirmDialogComponent}
      <div className={cn("space-y-2", className)}>
      {label && <label className="block text-sm font-medium">{label}</label>}

      {audioUrl ? (
        // Audio uploaded - show player
        <div className="flex items-center gap-3 p-4 bg-green-50/50 border border-green-200/50 rounded-lg">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-green-700">Audio uploaded</div>
            <div className="text-xs text-green-600/80 truncate">
              {audioUrl.split('/').pop()?.split('_').slice(1).join('_') || 'audio.mp3'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePlay}
              className="p-2 text-green-700 hover:bg-green-100 rounded-md transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Delete audio"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} />
        </div>
      ) : (
        // No audio - show uploader
        <label
          className={cn(
            "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5",
            isUploading && "pointer-events-none"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-sm text-primary font-medium">
                  Uploading... {uploadProgress?.percent ?? 0}%
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress?.percent ?? 0}%` }}
                />
              </div>
              
              {/* File size info */}
              {uploadProgress && (
                <span className="text-xs text-muted-foreground mt-2">
                  {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}
                </span>
              )}
              
              {/* Cancel button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  cancelUpload();
                }}
                className="mt-3 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors pointer-events-auto"
              >
                Cancel Upload
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">
                Drop MP3 here or click to upload
              </span>
              <span className="text-xs text-muted-foreground mt-1">Maximum file size: 5MB</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/mpeg"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      )}

      {helperText && !audioUrl && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      </div>
    </>
  );
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

