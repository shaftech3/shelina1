import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import type { HeroSlide } from '@/types';
import { Badge, ButtonLink, Container, Icon } from '@/components/ui';
import {
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
  getVideoPosterUrl,
  isCloudinaryUrl,
  isVideoMedia,
  normalizeMediaUrl,
} from '@/lib/media';

interface HeroProps {
  slide?: HeroSlide;
  slides?: HeroSlide[];
  className?: string;
}

/**
 * Storefront cinematic hero with rich carousel, video/image media, and luxury typography.
 */
export function Hero({ slide, slides, className }: HeroProps) {
  const allSlides = slides && slides.length > 0 ? slides : slide ? [slide] : [];
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeSlide = allSlides[currentIndex] || slide;

  useEffect(() => {
    if (allSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allSlides.length);
    }, 7500);
    return () => clearInterval(timer);
  }, [allSlides.length]);

  const rawMediaSrc = normalizeMediaUrl(activeSlide?.image?.src);
  const rawMobileMediaSrc = activeSlide?.mobileImage?.src ? normalizeMediaUrl(activeSlide.mobileImage.src) : undefined;
  const isVideo = isVideoMedia(rawMediaSrc);

  const mobileMediaSrc = useMemo(() => {
    if (!rawMobileMediaSrc) return undefined;
    if (isVideoMedia(rawMobileMediaSrc)) return rawMobileMediaSrc;
    if (isCloudinaryUrl(rawMobileMediaSrc)) {
      return getOptimizedImageUrl(rawMobileMediaSrc, { width: 640, quality: 'auto:good', format: 'auto' });
    }
    return rawMobileMediaSrc;
  }, [rawMobileMediaSrc]);

  const mediaSrc = useMemo(() => {
    if (!rawMediaSrc) return '';
    if (isVideo) return rawMediaSrc;
    if (isCloudinaryUrl(rawMediaSrc)) {
      return getOptimizedImageUrl(rawMediaSrc, { width: 1600, quality: 'auto:good', format: 'auto' });
    }
    return rawMediaSrc;
  }, [rawMediaSrc, isVideo]);

  const heroSrcSet = useMemo(() => {
    if (isVideo || !rawMediaSrc) return undefined;
    return getResponsiveImageSrcSet(rawMediaSrc, [640, 960, 1280, 1600, 1920]);
  }, [rawMediaSrc, isVideo]);

  const videoPoster = useMemo(() => {
    if (!isVideo) return undefined;
    return getVideoPosterUrl(rawMediaSrc, 1280) || undefined;
  }, [isVideo, rawMediaSrc]);

  if (!activeSlide) return null;

  const {
    eyebrow,
    heading,
    subheading,
    image,
    primaryCta,
    secondaryCta,
    badge,
    highlights,
    overlayOpacity = 0.38,
    align = 'left',
  } = activeSlide;

  const hasMultiple = allSlides.length > 1;

  return (
    <section
      className={cn('group/hero relative isolate bg-ink overflow-hidden', className)}
      aria-labelledby="hero-heading"
    >
      {/* Media background — responsive video or image with cinematic motion */}
      <div className="absolute inset-0 -z-10 bg-ink overflow-hidden">
        {isVideo ? (
          <video
            key={mediaSrc}
            src={mediaSrc}
            poster={videoPoster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover object-center transition-all duration-[2000ms] ease-out motion-safe:[@media(hover:hover)]:group-hover/hero:scale-[1.025]"
          />
        ) : (
          <picture className="h-full w-full block">
            {mobileMediaSrc && (
              <source media="(max-width: 640px)" srcSet={mobileMediaSrc} />
            )}
            <img
              key={mediaSrc}
              src={mediaSrc}
              srcSet={heroSrcSet}
              sizes="100vw"
              alt={image?.alt || heading}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              className="h-full w-full object-cover object-center sm:object-[center_35%] transition-transform duration-[2500ms] ease-out motion-safe:animate-[hero-media_1.8s_cubic-bezier(0.16,0.84,0.44,1)_both] motion-safe:[@media(hover:hover)]:group-hover/hero:scale-[1.025]"
            />
          </picture>
        )}

        {/* Cinematic Gradient Scrim: Dark-to-transparent for perfect text contrast on all devices */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/65 to-ink/40 sm:bg-gradient-to-r sm:from-ink/90 sm:via-ink/75 sm:to-transparent transition-opacity duration-700"
          style={{ opacity: Math.max(overlayOpacity + 0.25, 0.7) }}
        />

        {/* Ambient warm light accent */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      </div>

      <Container className="relative flex min-h-[380px] sm:min-h-[440px] lg:min-h-[clamp(440px,56vh,580px)] items-center py-8 sm:py-12 lg:py-14">
        <div
          key={currentIndex}
          className={cn(
            'flex flex-col gap-4 sm:gap-5 max-w-2xl text-white',
            align === 'center' && 'mx-auto items-center text-center',
          )}
        >
          {(badge || eyebrow) && (
            <div
              className="flex flex-wrap items-center gap-2.5 motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]"
              style={{ animationDelay: '60ms' }}
            >
              {badge && (
                <Badge tone="secondary" className="px-2.5 py-0.5 text-xs font-semibold shadow-xs">
                  {badge}
                </Badge>
              )}
              {eyebrow && (
                <span className="eyebrow tracking-[0.22em] text-cream/90 font-medium text-xs sm:text-sm">
                  {eyebrow}
                </span>
              )}
            </div>
          )}

          <h1
            id="hero-heading"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1] motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]"
            style={{ animationDelay: '150ms' }}
          >
            {heading}
          </h1>

          {subheading && (
            <p
              className="max-w-xl text-sm sm:text-base lg:text-lg text-cream/85 font-light leading-relaxed motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]"
              style={{ animationDelay: '240ms' }}
            >
              {subheading}
            </p>
          )}

          <div
            className={cn(
              'mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
              'motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]',
            )}
            style={{ animationDelay: '320ms' }}
          >
            {primaryCta && (
              <ButtonLink
                href={primaryCta.href}
                size="md"
                className="sm:h-12 shadow-lg hover:shadow-xl font-medium tracking-wide"
                iconRight={<Icon name="arrow-right" size={18} />}
              >
                {primaryCta.label}
              </ButtonLink>
            )}
            {secondaryCta && (
              <ButtonLink
                href={secondaryCta.href}
                variant="outline"
                size="md"
                className="sm:h-12 bg-white/10 text-white border-white/30 backdrop-blur-sm hover:bg-white/20"
              >
                {secondaryCta.label}
              </ButtonLink>
            )}
          </div>

          {highlights && highlights.length > 0 && (
            <ul
              className={cn(
                'mt-1 flex flex-wrap gap-x-5 gap-y-1.5 pt-2 border-t border-white/15',
                'motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]',
                align === 'center' && 'justify-center',
              )}
              style={{ animationDelay: '400ms' }}
            >
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-xs sm:text-sm text-cream/75">
                  <Icon name="check" size={13} className="shrink-0 text-primary-light" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>

      {/* Multi-slide indicators and navigation */}
      {hasMultiple && (
        <div className="absolute bottom-6 right-4 sm:right-8 z-10 flex items-center gap-3 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-2 text-white border border-white/10 shadow-lg">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? allSlides.length - 1 : prev - 1))}
            className="rounded-full p-1 hover:bg-white/20 transition-colors"
            aria-label="Previous slide"
          >
            <Icon name="chevron-left" size={16} />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {allSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  idx === currentIndex ? 'w-6 bg-primary-light' : 'w-2 bg-white/40 hover:bg-white/70',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % allSlides.length)}
            className="rounded-full p-1 hover:bg-white/20 transition-colors"
            aria-label="Next slide"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
