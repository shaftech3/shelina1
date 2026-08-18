import { useRef, useState } from 'react';
import { Button, Icon, IconButton, Input } from '@/components/ui';
import { mediaService } from '@/services';
import type { ImageAsset } from '@/types';

interface ImageListInputProps {
  images: ImageAsset[];
  onChange: (images: ImageAsset[]) => void;
}

/**
 * Product image manager.
 *
 * Two honest ways to add an image, because there is no storage backend yet:
 *   • a path to a file already published under /public (persists), or
 *   • a browser file, previewed via an object URL (does NOT persist).
 *
 * Both funnel through `mediaService`, so when `POST /api/media` exists the
 * upload path starts returning a real URL and nothing here changes. Temporary
 * blobs are labelled in the UI rather than silently pretending to be saved.
 */
export function ImageListInput({ images, onChange }: ImageListInputProps) {
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addByPath() {
    const trimmed = path.trim();
    if (!trimmed) return;
    if (images.some((image) => image.src === trimmed)) {
      setError('That image has already been added.');
      return;
    }
    try {
      const asset = mediaService.selectExisting(trimmed);
      onChange([...images, { src: asset.url, alt: asset.alt }]);
      setPath('');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add that image.');
    }
  }

  async function addByFile(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => mediaService.upload(file)));
      onChange([
        ...images,
        ...uploaded.map((asset) => ({
          src: asset.url,
          alt: asset.alt,
          width: asset.width,
          height: asset.height,
        })),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that file.');
    } finally {
      // Allow re-selecting the same file after a removal.
      if (fileRef.current) fileRef.current.value = '';
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

  /** Reordering is buttons, not drag-and-drop: keyboard-accessible and dependency-free. */
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-cream p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            label="Image path"
            placeholder="/images/products/my-product.jpg"
            value={path}
            onChange={(event) => {
              setPath(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addByPath();
              }
            }}
            hint="A file already published in the site's /public folder."
            wrapperClassName="flex-1"
          />
          <Button type="button" variant="outline" onClick={addByPath} disabled={!path.trim()} className="h-12 shrink-0">
            Add
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-caption text-ink-subtle">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept={mediaService.acceptedImageTypes.join(',')}
            multiple
            onChange={(event) => void addByFile(event.target.files)}
            className="sr-only"
            id="product-image-upload"
            // Visually hidden but still in the a11y tree, so it needs its own
            // name: the visible trigger is a separate button.
            aria-label="Choose product image files"
          />
          <Button
            type="button"
            variant="outline"
            fullWidth
            iconLeft={<Icon name="upload" size={17} />}
            onClick={() => fileRef.current?.click()}
          >
            Choose image files
          </Button>
          <p className="mt-2 text-caption text-ink-subtle">
            Preview only — files are not uploaded to a server in this build and will disappear when the
            page reloads. Use an image path above for content you want to keep.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-caption text-error">
            {error}
          </p>
        )}
      </div>

      {images.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-surface px-4 py-6 text-center text-body-sm text-ink-subtle">
          No images yet. The first image you add becomes the main product image.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {images.map((image, index) => (
            <li
              key={`${image.src}-${index}`}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-cream">
                {/* Plain <img>: these are admin previews, including blob: URLs
                    that the storefront Image component's ratio box would fight. */}
                <img src={image.src} alt="" className="h-full w-full object-cover" />
                {index === 0 && (
                  <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-0.5 text-center text-caption text-white">
                    Main
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="truncate text-caption text-ink-subtle" title={image.src}>
                  {image.src}
                  {mediaService.isTemporary(image.src) && (
                    <span className="ml-2 rounded-full bg-warning/12 px-2 py-0.5 text-warning">temporary</span>
                  )}
                </p>
                <Input
                  label="Alt text"
                  value={image.alt}
                  onChange={(event) => update(index, { alt: event.target.value })}
                  placeholder="Describe the image for screen readers"
                />
              </div>

              <div className="flex shrink-0 items-start gap-1">
                <IconButton
                  label={`Move ${image.alt || 'image'} up`}
                  icon={<Icon name="chevron-down" size={17} className="rotate-180" />}
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
                <IconButton
                  label={`Move ${image.alt || 'image'} down`}
                  icon={<Icon name="chevron-down" size={17} />}
                  size="sm"
                  disabled={index === images.length - 1}
                  onClick={() => move(index, 1)}
                />
                <IconButton
                  label={`Remove ${image.alt || 'image'}`}
                  icon={<Icon name="trash" size={17} />}
                  size="sm"
                  onClick={() => remove(index)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
