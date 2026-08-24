import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { normalizeMediaUrl } from '@/lib/media';
import { Icon } from './Icon';

export type AspectRatio = 'product' | 'category' | 'banner' | 'hero' | 'square' | 'wide' | 'diamond' | 'auto';

interface ImageProps {
  src: string;
  alt: string;
  ratio?: AspectRatio;
  className?: string;
  imgClassName?: string;
  /** Above-the-fold images should set this to skip lazy loading. */
  priority?: boolean;
  objectFit?: 'cover' | 'contain';
  width?: number;
  height?: number;
  sizes?: string;
  fallbackText?: string;
}

const RATIOS: Record<AspectRatio, string> = {
  product: 'aspect-[4/5]',
  category: 'aspect-[3/4]',
  banner: 'aspect-[16/9]',
  hero: 'aspect-[4/3]',
  square: 'aspect-square',
  wide: 'aspect-[21/9]',
  diamond: 'aspect-square',
  auto: '',
};

/**
 * Aspect-ratio-locked image container.
 * Reserves layout space up front (no CLS), lazy-loads by default, fades in on
 * decode and degrades to an elegant branded fallback if the asset fails to load.
 */
export function Image({
  src,
  alt,
  ratio = 'auto',
  className,
  imgClassName,
  priority = false,
  objectFit = 'cover',
  width,
  height,
  sizes,
  fallbackText = 'Image unavailable',
}: ImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const normalizedSrc = normalizeMediaUrl(src);

  // Reset status whenever the src changes
  useEffect(() => {
    if (!normalizedSrc) {
      setStatus('error');
    } else {
      setStatus('loading');
    }
  }, [normalizedSrc]);

  return (
    <div className={cn('relative overflow-hidden bg-cream', RATIOS[ratio], className)}>
      {status === 'loading' && (
        <div className="absolute inset-0 bg-cream">
          <div className="absolute inset-0 motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      )}

      {status === 'error' || !normalizedSrc ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-cream-dark/60 text-ink-subtle p-3 text-center select-none">
          <Icon name="image" size={24} className="opacity-40 text-primary-deep" />
          <span className="text-caption font-medium tracking-wide text-ink-muted/80">{fallbackText}</span>
        </div>
      ) : (
        <img
          src={normalizedSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setStatus('loaded')}
          onError={() => {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[Image] Failed to load image from: ${normalizedSrc}`);
            }
            setStatus('error');
          }}
          className={cn(
            'h-full w-full transition-opacity duration-slow ease-elegant',
            objectFit === 'cover' ? 'object-cover' : 'object-contain',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
