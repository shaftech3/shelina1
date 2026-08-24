import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import type { HeroSlide } from '@/types';
import { Badge, ButtonLink, Container, Icon } from '@/components/ui';
import { isVideoMedia, normalizeMediaUrl } from '@/lib/media';

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
  const mediaSrc = normalizeMediaUrl(image?.src);
  const isVideo = isVideoMedia(mediaSrc);

  return (
    <section
      className={cn('relative isolate bg-ink overflow-hidden', className)}
      aria-labelledby="hero-heading"
    >
      {/* Media background — video or image */}
      <div className="absolute inset-0 -z-10">
        {isVideo ? (
          <video
            key={mediaSrc}
            src={mediaSrc}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover object-center transition-opacity duration-1000 scale-105"
          />
        ) : (
          <img
            key={mediaSrc}
            src={mediaSrc}
            alt={image?.alt || heading}
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover object-center sm:object-[center_35%] transition-all duration-1000 scale-100 motion-safe:animate-[hero-media_1.4s_var(--ease-entrance)_both]"
          />
        )}

        {/* Cinematic Gradient Scrim: Dark-to-transparent for perfect text contrast on all devices */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/65 to-ink/30 sm:bg-gradient-to-r sm:from-ink sm:via-ink/75 sm:to-transparent"
          style={{ opacity: Math.max(overlayOpacity + 0.25, 0.65) }}
        />

        {/* Ambient warm light accent */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      </div>

      <Container className="relative flex min-h-[520px] sm:min-h-[580px] lg:min-h-[clamp(580px,78vh,820px)] items-center py-16 sm:py-20 lg:py-28">
        <div
          key={currentIndex}
          className={cn(
            'flex flex-col gap-6 max-w-2xl text-white',
            align === 'center' && 'mx-auto items-center text-center',
          )}
        >
          {(badge || eyebrow) && (
            <div
              className="flex flex-wrap items-center gap-3 motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]"
              style={{ animationDelay: '40ms' }}
            >
              {badge && (
                <Badge tone="secondary" className="px-3 py-1 text-xs font-semibold shadow-xs">
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
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]"
            style={{ animationDelay: '120ms' }}
          >
            {heading}
          </h1>

          {subheading && (
            <p
              className="max-w-xl text-base sm:text-lg lg:text-xl text-cream/85 font-light leading-relaxed motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]"
              style={{ animationDelay: '200ms' }}
            >
              {subheading}
            </p>
          )}

          <div
            className={cn(
              'mt-2 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap sm:items-center',
              'motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]',
            )}
            style={{ animationDelay: '280ms' }}
          >
            {primaryCta && (
              <ButtonLink
                href={primaryCta.href}
                size="lg"
                className="shadow-lg hover:shadow-xl font-medium tracking-wide"
                iconRight={<Icon name="arrow-right" size={18} />}
              >
                {primaryCta.label}
              </ButtonLink>
            )}
            {secondaryCta && (
              <ButtonLink
                href={secondaryCta.href}
                variant="outline"
                size="lg"
                className="bg-white/10 text-white border-white/30 backdrop-blur-sm hover:bg-white/20"
              >
                {secondaryCta.label}
              </ButtonLink>
            )}
          </div>

          {highlights && highlights.length > 0 && (
            <ul
              className={cn(
                'mt-2 flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-white/15',
                'motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]',
                align === 'center' && 'justify-center',
              )}
              style={{ animationDelay: '360ms' }}
            >
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs sm:text-sm text-cream/75">
                  <Icon name="check" size={14} className="shrink-0 text-primary-light" />
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
