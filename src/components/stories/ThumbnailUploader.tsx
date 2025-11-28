/**
 * ThumbnailUploader Component
 * Reusable image upload component with preview and graceful fallback
 */

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getCoverUrl } from '@/services/storiesAPI';

interface ThumbnailUploaderProps {
  currentR2Key?: string | null;
  fallbackColor?: string;
  fallbackIcon?: React.ReactNode;
  onUpload: (file: File) => Promise<string>;
  onDelete?: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
};

export function ThumbnailUploader({
  currentR2Key,
  fallbackColor = '#4F46E5',
  fallbackIcon,
  onUpload,
  onDelete,
  size = 'md',
  className = '',
  disabled = false,
}: ThumbnailUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUrl = getCoverUrl(currentR2Key);
  const showImage = imageUrl && !imageError;

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5MB)');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Use PNG, JPEG, or WebP');
      return;
    }

    setError(null);
    setUploading(true);
    setImageError(false);

    try {
      await onUpload(file);
    } catch (err) {
      setError('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    
    setDeleting(true);
    try {
      await onDelete();
      setImageError(false);
    } catch (err) {
      setError('Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Image or Fallback */}
      <div
        className={`${sizeClasses[size]} rounded-xl overflow-hidden relative group`}
        style={!showImage ? { backgroundColor: fallbackColor } : undefined}
      >
        {showImage ? (
          <img
            src={imageUrl}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {fallbackIcon || <ImageIcon className="w-8 h-8 text-white/50" />}
          </div>
        )}

        {/* Overlay on hover */}
        {!disabled && !uploading && !deleting && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
              title="Upload image"
            >
              <Upload className="w-5 h-5 text-gray-700" />
            </button>
            {showImage && onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 bg-white/90 rounded-lg hover:bg-red-100 transition-colors"
                title="Remove image"
              >
                <X className="w-5 h-5 text-red-600" />
              </button>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {(uploading || deleting) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading || deleting}
      />

      {/* Error message */}
      {error && (
        <p className="absolute -bottom-6 left-0 right-0 text-xs text-red-600 text-center">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Simple thumbnail display with graceful fallback
 */
interface ThumbnailProps {
  r2Key?: string | null;
  fallbackColor?: string;
  fallbackIcon?: React.ReactNode;
  alt?: string;
  className?: string;
}

export function Thumbnail({
  r2Key,
  fallbackColor = '#4F46E5',
  fallbackIcon,
  alt = 'Cover',
  className = 'w-full h-full',
}: ThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getCoverUrl(r2Key);
  const showImage = imageUrl && !imageError;

  if (showImage) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={`object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ backgroundColor: fallbackColor }}
    >
      {fallbackIcon || <ImageIcon className="w-1/3 h-1/3 text-white/50" />}
    </div>
  );
}

