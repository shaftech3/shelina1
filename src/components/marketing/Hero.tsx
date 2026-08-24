import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import type { HeroSlide } from '@/types';
import { Badge, ButtonLink, Container, Icon, Image } from '@/components/ui';

interface HeroProps {
  slide?: HeroSlide;
  slides?: HeroSlide[];
  className?: string;
}

/**
 * Storefront hero with carousel support.
 */
export function Hero({ slide, slides, className }: HeroProps) {
  const allSlides = slides && slides.length > 0 ? slides : slide ? [slide] : [];
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeSlide = allSlides[currentIndex] || slide;

  useEffect(() => {
    if (allSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allSlides.length);
    }, 7000);
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
    overlayOpacity = 0.34,
    align = 'left',
  } = activeSlide;

  const hasMultiple = allSlides.length > 1;

  return (
    <section className={cn('relative isolate bg-cream overflow-hidden', className)} aria-labelledby="hero-heading">
      {/* Media — eager + high priority: this is the LCP element. */}
      <div className="relative lg:absolute lg:inset-0">
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          priority
          ratio="auto"
          sizes="100vw"
          className="h-[34vh] min-h-[220px] w-full sm:h-[44vh] lg:h-full transition-opacity duration-700"
          imgClassName="[object-position:70%_50%] lg:[object-position:50%_50%] motion-safe:animate-[hero-media_1.2s_var(--ease-entrance)_both]"
        />
        {/* Scrim only exists at lg+, where text sits on top of the image. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden lg:block lg:bg-gradient-to-r lg:from-ink lg:via-ink/45 lg:to-transparent"
          style={{ opacity: overlayOpacity + 0.28 }}
        />
      </div>

      <Container className="relative lg:flex lg:min-h-[clamp(540px,74vh,780px)] lg:items-center">
        <div
          key={currentIndex}
          className={cn(
            'flex flex-col gap-5 py-10 sm:py-12 lg:max-w-xl lg:py-24',
            align === 'center' && 'lg:mx-auto lg:items-center lg:text-center',
          )}
        >
          {(badge || eyebrow) && (
            <div
              className="flex flex-wrap items-center gap-3 motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]"
              style={{ animationDelay: '40ms' }}
            >
              {badge && <Badge tone="secondary">{badge}</Badge>}
              {eyebrow && <span className="eyebrow text-primary-deep lg:text-white/85">{eyebrow}</span>}
            </div>
          )}

          <h1
            id="hero-heading"
            className="text-h1 text-ink motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both] lg:text-display lg:text-white"
            style={{ animationDelay: '120ms' }}
          >
            {heading}
          </h1>

          {subheading && (
            <p
              className="max-w-prose text-body-lg text-ink-muted motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both] lg:text-white/85"
              style={{ animationDelay: '200ms' }}
            >
              {subheading}
            </p>
          )}

          <div
            className={cn(
              'mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap',
              'motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]',
            )}
            style={{ animationDelay: '280ms' }}
          >
            {primaryCta && (
              <ButtonLink href={primaryCta.href} size="lg" iconRight={<Icon name="arrow-right" size={18} />}>
                {primaryCta.label}
              </ButtonLink>
            )}
            {secondaryCta && (
              <ButtonLink href={secondaryCta.href} variant="light" size="lg">
                {secondaryCta.label}
              </ButtonLink>
            )}
          </div>

          {highlights && highlights.length > 0 && (
            <ul
              className={cn(
                'mt-3 flex flex-wrap gap-x-6 gap-y-2',
                'motion-safe:animate-[fade-up_var(--dur-slow)_var(--ease-entrance)_both]',
                align === 'center' && 'lg:justify-center',
              )}
              style={{ animationDelay: '360ms' }}
            >
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-caption text-ink-muted lg:text-white/75">
                  <Icon name="check" size={14} className="shrink-0 text-primary lg:text-white/70" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>

      {/* Multi-slide indicators and navigation */}
      {hasMultiple && (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 rounded-full bg-ink/40 backdrop-blur-md px-3 py-1.5 text-white sm:bottom-6 sm:right-8">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? allSlides.length - 1 : prev - 1))}
            className="rounded-full p-1 hover:bg-white/20 transition-colors"
            aria-label="Previous slide"
          >
            <Icon name="chevron-left" size={16} />
          </button>

          <div className="flex items-center gap-1.5">
            {allSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  idx === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70',
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
