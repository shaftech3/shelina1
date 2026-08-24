import { useRef, useState, type DragEvent } from 'react';
import { Button, Icon } from '@/components/ui';
import { mediaService } from '@/services';

interface MediaUploadInputProps {
  label?: string;
  hint?: string;
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  mediaType?: 'image' | 'video' | 'any';
  className?: string;
  required?: boolean;
}

export function MediaUploadInput({
  label,
  hint,
  value,
  onChange,
  onRemove,
  mediaType = 'image',
  className = '',
}: MediaUploadInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo =
    mediaType === 'video' ||
    (value && (value.endsWith('.mp4') || value.endsWith('.webm') || value.includes('video')));

  const acceptTypes =
    mediaType === 'video'
      ? mediaService.acceptedVideoTypes.join(',')
      : mediaType === 'image'
        ? mediaService.acceptedImageTypes.join(',')
        : [...mediaService.acceptedImageTypes, ...mediaService.acceptedVideoTypes].join(',');

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const result = await mediaService.upload(file);
      onChange(result.url);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleRemove() {
    if (value) {
      mediaService.release(value);
    }
    if (onRemove) onRemove();
    else onChange('');
    setError(null);
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-caption font-medium tracking-wide uppercase text-ink">
          {label}
        </span>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleFile(e.target.files[0]);
          }
        }}
        className="sr-only"
        aria-label={label || 'Upload media'}
      />

      {value ? (
        <div className="group relative flex flex-col gap-3 rounded-lg border border-border bg-white p-3 shadow-xs">
          <div className="relative flex items-center justify-center overflow-hidden rounded-md bg-cream-dark/50 min-h-[160px] max-h-[260px]">
            {isVideo ? (
              <video
                src={value}
                controls
                className="max-h-[240px] w-full rounded object-contain"
              />
            ) : (
              <img
                src={value}
                alt={label || 'Uploaded preview'}
                className="max-h-[240px] w-full rounded object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/placeholder.png';
                }}
              />
            )}

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-caption font-medium text-ink shadow-md">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Uploading...
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
            <span className="truncate text-caption text-ink-subtle font-mono text-xs max-w-[200px] sm:max-w-xs">
              {value}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                iconLeft={<Icon name="refresh" size={14} />}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
                className="text-burgundy hover:bg-burgundy/10"
                iconLeft={<Icon name="trash" size={14} />}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all ${
            isDragging
              ? 'border-primary bg-primary/5 shadow-xs'
              : 'border-border/80 bg-cream/40 hover:border-ink-muted hover:bg-cream'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-caption font-medium text-ink">Uploading file...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-muted shadow-xs">
                <Icon name={mediaType === 'video' ? 'sparkle' : 'upload'} size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-body-sm font-medium text-ink">
                  Click to upload {mediaType === 'video' ? 'video' : 'image'}
                  <span className="text-ink-subtle font-normal"> or drag and drop</span>
                </p>
                <p className="text-caption text-ink-subtle">
                  {mediaType === 'video'
                    ? 'MP4 or WebM up to 50MB'
                    : mediaType === 'image'
                      ? 'JPG, PNG, WebP or SVG up to 50MB'
                      : 'Images or Videos up to 50MB'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-caption text-burgundy">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}

      {hint && !error && <p className="text-caption text-ink-subtle">{hint}</p>}
    </div>
  );
}
