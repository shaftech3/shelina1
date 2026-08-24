import { useRef, useState, type DragEvent } from 'react';
import { Button, Icon, IconButton, Input } from '@/components/ui';
import { mediaService } from '@/services';
import { normalizeMediaUrl } from '@/lib/media';
import type { ImageAsset } from '@/types';

interface ImageListInputProps {
  images: ImageAsset[];
  onChange: (images: ImageAsset[]) => void;
}

export function ImageListInput({ images, onChange }: ImageListInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | File[]) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    const fileArray = Array.from(files);
    try {
      const uploaded = await mediaService.uploadMultiple(fileArray);
      onChange([
        ...images,
        ...uploaded.map((asset) => ({
          src: asset.url,
          alt: asset.alt,
          width: asset.width,
          height: asset.height,
        })),
      ]);
    } catch (cause: any) {
      setError(cause instanceof Error ? cause.message : 'Could not upload selected files.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
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
      void addFiles(e.dataTransfer.files);
    }
  }

  function update(index: number, patch: Partial<ImageAsset>) {
    onChange(images.map((image, position) => (position === index ? { ...image, ...patch } : image)));
  }

  function remove(index: number) {
    const [removed] = images.slice(index, index + 1);
    if (removed) mediaService.release(removed.src);
    onChange(images.filter((_, position) => position !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Upload Dropzone */}
      <input
        ref={fileRef}
        type="file"
        accept={mediaService.acceptedImageTypes.join(',')}
        multiple
        onChange={(event) => void addFiles(event.target.files ?? [])}
        className="sr-only"
        id="product-image-upload"
        aria-label="Upload product images"
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all ${
          isDragging
            ? 'border-primary bg-primary/5 shadow-xs'
            : 'border-border/80 bg-cream/40 hover:border-ink-muted hover:bg-cream'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-caption font-medium text-ink">Uploading images...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-muted shadow-xs">
              <Icon name="upload" size={20} />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-body-sm font-medium text-ink">
                Click to upload images <span className="text-ink-subtle font-normal">or drag & drop</span>
              </p>
              <p className="text-caption text-ink-subtle">
                Upload main and gallery photos (JPG, PNG, WebP, SVG up to 50MB)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              iconLeft={<Icon name="plus" size={15} />}
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="mt-1"
            >
              Choose Images
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-caption text-burgundy">
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}

      {/* Image list */}
      {images.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center text-body-sm text-ink-subtle">
          No images uploaded yet. The first image uploaded will serve as the primary product cover.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {images.map((image, index) => {
            const normalizedSrc = normalizeMediaUrl(image.src);
            return (
              <li
                key={`${image.src}-${index}`}
                className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3.5 shadow-xs sm:flex-row"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-cream border border-border/60">
                  <img
                    src={normalizedSrc}
                    alt={image.alt || 'Product thumbnail'}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className =
                          'h-full w-full flex items-center justify-center bg-cream-dark/50 text-[10px] text-ink-muted text-center p-1';
                        fallback.innerText = 'Preview pending';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                  {index === 0 && (
                    <span className="absolute inset-x-0 bottom-0 bg-primary/90 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wider text-white">
                      Primary Cover
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                  <p className="truncate text-caption text-ink-subtle font-mono text-xs" title={image.src}>
                    {image.src}
                  </p>
                  <Input
                    label="Alt text (for accessibility & SEO)"
                    value={image.alt}
                    onChange={(event) => update(index, { alt: event.target.value })}
                    placeholder="e.g. Leather Oxford Shoes — Side View"
                  />
                </div>

                <div className="flex shrink-0 items-center sm:items-start gap-1 pt-1">
                  <IconButton
                    label={`Move up`}
                    icon={<Icon name="chevron-down" size={17} className="rotate-180" />}
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    label={`Move down`}
                    icon={<Icon name="chevron-down" size={17} />}
                    size="sm"
                    disabled={index === images.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  <IconButton
                    label={`Remove image`}
                    icon={<Icon name="trash" size={17} />}
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-burgundy hover:bg-burgundy/10"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
