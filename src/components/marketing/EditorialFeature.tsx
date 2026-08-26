import { cn } from '@/lib/cn';
import type { EditorialFeature as EditorialData } from '@/types';
import { ButtonLink, Container, Icon, Image, Reveal, Skeleton } from '@/components/ui';

interface EditorialFeatureProps {
  feature: EditorialData | null;
  loading?: boolean;
  className?: string;
}

/**
 * Full-bleed editorial story.
 *
 * Visual-first: large imagery with a floating copy card at desktop and a
 * stacked, fully legible layout on mobile (no text over a busy crop).
 */
export function EditorialFeature({ feature, loading, className }: EditorialFeatureProps) {
  if (loading || !feature) {
    return (
      <div className={cn('bg-cream', className)} aria-busy={loading || undefined}>
        <Skeleton className="h-[420px] w-full rounded-none lg:h-[560px]" />
      </div>
    );
  }

  const { eyebrow, heading, description, image, cta, align = 'left' } = feature;

  return (
    <section className={cn('relative isolate bg-cream', className)} aria-labelledby="editorial-heading">
      <Image
        src={image.src}
        alt={image.alt}
        ratio="auto"
        objectFit="cover"
        sizes="100vw"
        className="h-[300px] w-full sm:h-[380px] lg:h-[620px]"
      />

      {/* Desktop: subtle scrim behind the floating card side. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 hidden lg:block',
          align === 'left'
            ? 'lg:bg-gradient-to-r lg:from-ink/45 lg:via-ink/10 lg:to-transparent'
            : 'lg:bg-gradient-to-l lg:from-ink/45 lg:via-ink/10 lg:to-transparent',
        )}
      />

      <Container className="lg:pointer-events-none lg:absolute lg:inset-0 lg:flex lg:items-center">
        <Reveal
          className={cn(
            'lg:pointer-events-auto lg:max-w-lg',
            align === 'right' && 'lg:ml-auto',
          )}
        >
          <div
            className={cn(
              'flex flex-col items-start gap-4 py-10 sm:py-12',
              'lg:rounded-xl lg:bg-surface/95 lg:p-10 lg:shadow-lg lg:backdrop-blur-sm',
            )}
          >
            {eyebrow && <span className="eyebrow text-primary-deep">{eyebrow}</span>}
            <h2 id="editorial-heading" className="text-h2">
              {heading}
            </h2>
            {description && <p className="max-w-prose text-body text-ink-muted">{description}</p>}
            {cta && (
              <ButtonLink
                href={cta.href}
                className="mt-2"
                iconRight={<Icon name="arrow-right" size={17} />}
              >
                {cta.label}
              </ButtonLink>
            )}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
