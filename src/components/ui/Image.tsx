import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import {
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
  isCloudinaryUrl,
  normalizeMediaUrl,
} from '@/lib/media';
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
  objectFit?: 'cover' | 'contain' | 'none' | 'scale-down';
  width?: number;
  height?: number;
  sizes?: string;
  srcSet?: string;
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
 * Reserves layout space up front (no CLS), lazy-loads by default, delivers
 * modern WebP/AVIF via Cloudinary transformations, fades in on decode,
 * and degrades to an elegant branded fallback if the asset fails to load.
 */
export function Image({
  src,
  alt,
  ratio = 'auto',
  className,
  imgClassName,
  priority = false,
  objectFit = 'contain',
  width,
  height,
  sizes,
  srcSet: customSrcSet,
  fallbackText = 'Image unavailable',
}: ImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const normalizedSrc = normalizeMediaUrl(src);

  // Generate responsive srcSet and optimized base src if hosted on Cloudinary
  const isCloud = isCloudinaryUrl(normalizedSrc);

  const displaySrc = useMemo(() => {
    if (!normalizedSrc) return '';
    if (!isCloud) return normalizedSrc;
    // Default optimized single src: automatic format and quality compression
    return getOptimizedImageUrl(normalizedSrc, {
      width: width || (ratio === 'product' ? 800 : ratio === 'banner' ? 1400 : 1000),
      quality: 'auto:good',
      format: 'auto',
      crop: 'limit',
    });
  }, [normalizedSrc, isCloud, width, ratio]);

  const responsiveSrcSet = useMemo(() => {
    if (customSrcSet) return customSrcSet;
    if (!isCloud) return undefined;
    return getResponsiveImageSrcSet(normalizedSrc);
  }, [customSrcSet, isCloud, normalizedSrc]);

  // Reset status whenever the src changes
  useEffect(() => {
    if (!normalizedSrc) {
      setStatus('error');
    } else {
      setStatus('loading');
    }
  }, [normalizedSrc]);

  const fitClass =
    objectFit === 'cover'
      ? 'object-cover'
      : objectFit === 'contain'
        ? 'object-contain'
        : objectFit === 'scale-down'
          ? 'object-scale-down'
          : 'object-none';

  return (
    <div className={cn('relative flex min-w-0 max-w-full items-center justify-center overflow-hidden bg-cream/70', RATIOS[ratio], className)}>
      {status === 'loading' && (
        <div className="absolute inset-0 bg-cream/80">
          <div className="absolute inset-0 motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      )}

      {status === 'error' || !normalizedSrc ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-cream-dark/40 text-ink-subtle p-3 text-center select-none">
          <Icon name="image" size={24} className="opacity-40 text-primary-deep" />
          <span className="text-caption font-medium tracking-wide text-ink-muted/80">{fallbackText}</span>
        </div>
      ) : (
        <img
          src={displaySrc}
          srcSet={responsiveSrcSet}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes || (ratio === 'product' ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw' : undefined)}
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
            'h-full w-full max-h-full max-w-full transition-all duration-base ease-elegant',
            fitClass,
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}

