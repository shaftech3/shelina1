import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, Image } from '@/components/ui';
import { normalizeMediaUrl } from '@/lib/media';
import type { ImageAsset, ProductVideo } from '@/types';

interface ProductGalleryProps {
  images: ImageAsset[];
  /** Optional. When absent, no video affordance is rendered at all. */
  video?: ProductVideo;
  productName: string;
  className?: string;
}

type Slide =
  | { kind: 'image'; image: ImageAsset }
  | { kind: 'video'; video: ProductVideo };

/**
 * Product media gallery.
 *
 * Only the active image is rendered at full size; thumbnails are small and
 * lazy. The video element is created only once the customer selects the video
 * slide — before that it is a poster image, so a product page costs zero video
 * bytes unless someone asks for it.
 */
export function ProductGallery({ images, video, productName, className }: ProductGalleryProps) {
  const slides: Slide[] = [
    ...images.map((image) => ({ kind: 'image' as const, image })),
    ...(video ? [{ kind: 'video' as const, video }] : []),
  ];

  const [index, setIndex] = useState(0);
  const [videoActivated, setVideoActivated] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = slides[index];
  const hasMultiple = slides.length > 1;

  // Moving away from the video slide must stop playback — otherwise audio
  // keeps running behind an image the customer is now looking at.
  useEffect(() => {
    if (active?.kind !== 'video') {
      videoRef.current?.pause();
      setVideoError(false);
    }
  }, [active]);

  if (slides.length === 0) {
    return (
      <div className={cn('overflow-hidden rounded-lg border border-border/70 bg-[#faf8f5]', className)}>
        <Image src="" alt={productName} ratio="product" objectFit="contain" />
      </div>
    );
  }

  const go = (next: number) => {
    const wrapped = (next + slides.length) % slides.length;
    setIndex(wrapped);
  };

  /** Arrow keys move between thumbnails, matching the tablist pattern. */
  const onThumbKeyDown = (event: React.KeyboardEvent, position: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (position + (event.key === 'ArrowRight' ? 1 : -1) + slides.length) % slides.length;
    setIndex(next);
    thumbRefs.current[next]?.focus();
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="relative overflow-hidden rounded-lg border border-border/70 bg-[#faf8f5]">
        {active.kind === 'image' ? (
          <Image
            // Keying on src makes React swap the element, which replays the
            // fade transition on every image change.
            key={active.image.src}
            src={active.image.src}
            alt={active.image.alt || productName}
            ratio="product"
            objectFit="contain"
            priority={index === 0}
            sizes="(max-width: 1023px) 100vw, 50vw"
            imgClassName="p-4 sm:p-8 motion-safe:animate-fade-in"
          />
        ) : videoActivated && !videoError ? (
          <video
            ref={videoRef}
            src={normalizeMediaUrl(active.video.src)}
            poster={normalizeMediaUrl(active.video.poster || images[0]?.src)}
            controls
            playsInline
            // Never autoplay with sound. Playback starts muted and only after
            // an explicit click, so no page ever makes noise on load.
            muted
            autoPlay
            preload="metadata"
            aria-label={active.video.title}
            onError={() => setVideoError(true)}
            className="aspect-[4/5] w-full bg-ink object-contain"
          />
        ) : videoError ? (
          <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 bg-[#faf8f5] p-6 text-center">
            <Icon name="video" size={32} className="text-ink-subtle opacity-60" />
            <p className="text-body-sm font-medium text-ink">Video could not be played</p>
            <p className="max-w-xs text-caption text-ink-muted">
              The media format may not be supported by your browser or the file is temporarily unavailable.
            </p>
            <button
              type="button"
              onClick={() => {
                setVideoError(false);
                setVideoActivated(true);
              }}
              className="mt-2 rounded-md bg-ink px-4 py-2 text-caption font-medium text-surface transition-opacity hover:opacity-90"
            >
              Retry Playback
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setVideoActivated(true)}
            className="group relative block w-full focus-visible:outline-none focus-visible:shadow-focus"
            aria-label={`Play video: ${active.video.title}`}
          >
            <Image
              src={active.video.poster || images[0]?.src || ''}
              alt={active.video.title || productName}
              ratio="product"
              objectFit="contain"
              sizes="(max-width: 1023px) 100vw, 50vw"
              imgClassName="p-4 sm:p-8"
            />
            <span aria-hidden className="absolute inset-0 bg-ink/25 transition-colors group-hover:bg-ink/35" />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/92 shadow-md transition-transform duration-base ease-elegant motion-safe:group-hover:scale-105"
            >
              <span className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-ink" />
            </span>
          </button>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/92 text-ink shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/92 text-ink shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </>
        )}

        {/* Announces the change for screen readers without moving focus. */}
        <span aria-live="polite" className="sr-only">
          {active.kind === 'video'
            ? `Video, item ${index + 1} of ${slides.length}`
            : `Image ${index + 1} of ${slides.length}`}
        </span>
      </div>

      {hasMultiple && (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar" role="group" aria-label="Product media">
          {slides.map((slide, position) => {
            const isActive = position === index;
            return (
              <button
                key={slide.kind === 'image' ? slide.image.src : slide.video.src}
                ref={(node) => {
                  thumbRefs.current[position] = node;
                }}
                type="button"
                onClick={() => setIndex(position)}
                onKeyDown={(event) => onThumbKeyDown(event, position)}
                aria-label={
                  slide.kind === 'video' ? 'Show product video' : `Show image ${position + 1}`
                }
                aria-current={isActive}
                className={cn(
                  'relative w-[68px] shrink-0 overflow-hidden rounded-md border-2 bg-[#faf8f5] transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:shadow-focus',
                  isActive ? 'border-ink shadow-xs' : 'border-transparent hover:border-border-strong',
                )}
              >
                <Image
                  src={slide.kind === 'image' ? slide.image.src : (slide.video.poster || images[0]?.src || '')}
                  alt=""
                  ratio="product"
                  objectFit="contain"
                  sizes="68px"
                  imgClassName="p-1"
                />
                {slide.kind === 'video' && (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center bg-ink/30"
                  >
                    <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
