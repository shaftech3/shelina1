import { cn } from '@/lib/cn';
import type { Banner as BannerData } from '@/types';
import { Badge, ButtonLink, Container, Icon, Image, Reveal } from '@/components/ui';

interface BannerProps {
  banner: BannerData;
  className?: string;
}

const TONES = {
  cream: 'bg-cream text-ink',
  surface: 'bg-surface text-ink',
  // primary-deep, not primary: white text on the lighter brand blue is 3.4:1 and
  // fails AA for body copy. The pink secondary is a light tone, so it carries ink.
  primary: 'bg-primary-deep text-white',
  secondary: 'bg-secondary text-ink',
} as const;

/**
 * Reusable promotional banner.
 *
 * Renders three layouts from one data shape (`split`, `image`, `plain`) so the
 * future admin panel only has to choose a variant — no new components needed.
 */
export function Banner({ banner, className }: BannerProps) {
  const { variant, tone = 'cream', eyebrow, heading, description, image, cta, badge, mediaSide = 'left' } = banner;
  // Only the primary tone is dark enough to carry white text accessibly.
  const onColor = tone === 'primary';

  if (variant === 'plain') {
    return (
      <section className={cn(TONES[tone], className)}>
        <Container>
          <Reveal className="flex flex-col items-start gap-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
            <div className="flex flex-col gap-2">
              {badge && <Badge tone={onColor ? 'dark' : 'primary'}>{badge}</Badge>}
              <h2 className={cn('text-h3', onColor && 'text-white')}>{heading}</h2>
              {description && (
                <p className={cn('max-w-prose text-body-sm', onColor ? 'text-white' : 'text-ink-muted')}>
                  {description}
                </p>
              )}
            </div>
            {cta && (
              <ButtonLink href={cta.href} variant={onColor ? 'light' : 'outline'} className="shrink-0">
                {cta.label}
              </ButtonLink>
            )}
          </Reveal>
        </Container>
      </section>
    );
  }

  if (variant === 'image') {
    return (
      <section className={cn('relative overflow-hidden', className)}>
        {image && (
          <Image src={image.src} alt={image.alt} ratio="banner" className="w-full" sizes="100vw" />
        )}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink/70 to-ink/10" />
        <Container className="absolute inset-0 flex items-center">
          <Reveal className="flex max-w-lg flex-col gap-3.5">
            {eyebrow && <span className="eyebrow text-white">{eyebrow}</span>}
            <h2 className="text-h2 text-white">{heading}</h2>
            {description && <p className="text-body-sm text-white">{description}</p>}
            {cta && (
              <ButtonLink href={cta.href} variant="light" className="mt-2 w-fit">
                {cta.label}
              </ButtonLink>
            )}
          </Reveal>
        </Container>
      </section>
    );
  }

  // split
  return (
    <section className={cn(TONES[tone], className)}>
      <Container>
        <div
          className={cn(
            'grid items-center gap-8 py-14 md:gap-14 md:py-20 lg:grid-cols-2 lg:gap-20',
            mediaSide === 'right' && 'lg:[&>*:first-child]:order-2',
          )}
        >
          <Reveal>
            {image && (
              <Image
                src={image.src}
                alt={image.alt}
                ratio="banner"
                className="rounded-xl shadow-sm sm:rounded-2xl"
                sizes="(max-width: 1023px) 100vw, 50vw"
                imgClassName="transition-transform duration-[1200ms] ease-elegant hover:scale-[1.03]"
              />
            )}
          </Reveal>

          <Reveal delay={90} className="flex flex-col items-start gap-4">
            {badge && <Badge tone="secondary">{badge}</Badge>}
            {eyebrow && (
              <span className={cn('eyebrow', onColor ? 'text-white' : 'text-primary-deep')}>{eyebrow}</span>
            )}
            <h2 className={cn('text-h2', onColor && 'text-white')}>{heading}</h2>
            {description && (
              <p className={cn('max-w-prose text-body', onColor ? 'text-white' : 'text-ink-muted')}>
                {description}
              </p>
            )}
            {cta && (
              <ButtonLink
                href={cta.href}
                variant={onColor ? 'light' : 'outline'}
                className="mt-2"
                iconRight={<Icon name="arrow-right" size={17} />}
              >
                {cta.label}
              </ButtonLink>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
