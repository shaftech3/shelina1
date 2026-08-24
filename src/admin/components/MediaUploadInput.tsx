import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button, Icon } from '@/components/ui';
import { mediaService } from '@/services';
import { isVideoMedia, normalizeMediaUrl } from '@/lib/media';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview url whenever value changes
  useEffect(() => {
    setPreviewUrl(value ? normalizeMediaUrl(value) : null);
    setMediaLoadError(false);
  }, [value]);

  const isVideo =
    mediaType === 'video' ||
    isVideoMedia(value) ||
    isVideoMedia(previewUrl);

  const acceptTypes =
    mediaType === 'video'
      ? mediaService.acceptedVideoTypes.join(',')
      : mediaType === 'image'
        ? mediaService.acceptedImageTypes.join(',')
        : [...mediaService.acceptedImageTypes, ...mediaService.acceptedVideoTypes].join(',');

  async function handleFile(file: File) {
    setError(null);
    setMediaLoadError(false);

    // Instant local preview
    const localBlobUrl = URL.createObjectURL(file);
    setPreviewUrl(localBlobUrl);
    setUploading(true);

    try {
      const result = await mediaService.upload(file);
      const finalUrl = result.url;
      onChange(finalUrl);
      setPreviewUrl(normalizeMediaUrl(finalUrl));
    } catch (err: any) {
      setError(err?.message || 'Failed to upload file.');
      // Revert if value wasn't present
      if (!value) {
        setPreviewUrl(null);
      } else {
        setPreviewUrl(normalizeMediaUrl(value));
      }
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localBlobUrl);
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
    setPreviewUrl(null);
    if (onRemove) onRemove();
    else onChange('');
    setError(null);
    setMediaLoadError(false);
  }

  const hasMedia = Boolean(previewUrl || value);

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

      {hasMedia ? (
        <div className="group relative flex flex-col gap-3 rounded-lg border border-border bg-white p-3 shadow-xs">
          <div className="relative flex items-center justify-center overflow-hidden rounded-md bg-cream-dark/40 min-h-[160px] max-h-[280px]">
            {isVideo ? (
              <video
                src={previewUrl || normalizeMediaUrl(value)}
                controls
                playsInline
                className="max-h-[260px] w-full rounded object-contain"
                onError={() => setMediaLoadError(true)}
              />
            ) : mediaLoadError ? (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-ink-subtle">
                <Icon name="image" size={32} className="opacity-40" />
                <span className="text-caption text-ink-muted">Image unavailable or pending processing</span>
              </div>
            ) : (
              <img
                src={previewUrl || normalizeMediaUrl(value)}
                alt={label || 'Uploaded preview'}
                className="max-h-[260px] w-full rounded object-contain"
                onError={() => {
                  setMediaLoadError(true);
                }}
              />
            )}

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-caption font-medium text-ink shadow-md">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Uploading media...
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
            <span className="truncate text-caption text-ink-subtle font-mono text-xs max-w-[200px] sm:max-w-xs" title={value || ''}>
              {value || 'Local file selected'}
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
                      ? 'JPG, PNG, WebP, SVG, AVIF up to 50MB'
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
