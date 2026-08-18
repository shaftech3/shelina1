import { cn } from '@/lib/cn';
import type { HeroSlide } from '@/types';
import { Badge, ButtonLink, Container, Icon, Image } from '@/components/ui';

interface HeroProps {
  slide: HeroSlide;
  className?: string;
}

/**
 * Storefront hero.
 *
 * Layout: mobile stacks image above copy so nothing important is cropped and
 * the CTAs stay above the fold. From `lg` the copy overlays the image with a
 * controlled gradient scrim.
 *
 * Motion: a short staggered CSS entrance (eyebrow → heading → copy → CTA →
 * image). Transform/opacity only, and every duration collapses to ~0 under
 * `prefers-reduced-motion` via the Stage 1 token contract.
 */
export function Hero({ slide, className }: HeroProps) {
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
  } = slide;

  return (
    <section className={cn('relative isolate bg-cream', className)} aria-labelledby="hero-heading">
      {/* Media — eager + high priority: this is the LCP element. */}
      <div className="relative lg:absolute lg:inset-0">
        <Image
          src={image.src}
          alt={image.alt}
          priority
          ratio="auto"
          sizes="100vw"
          /* Shorter on phones so the heading and CTAs stay reachable without
             a long scroll; full-bleed from lg where copy overlays the image. */
          className="h-[34vh] min-h-[220px] w-full sm:h-[44vh] lg:h-full"
          /* The subject sits right-of-centre in the source frame, so a plain
             centre crop clips it on narrow viewports. */
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
    </section>
  );
}
