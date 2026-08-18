import { memo } from 'react';
import { cn } from '@/lib/cn';
import type { Category } from '@/types';
import { Icon, Image, SmartLink } from '@/components/ui';

interface CategoryCardProps {
  category: Category;
  className?: string;
  /** `feature` renders a taller editorial tile for showcase rows. */
  variant?: 'default' | 'feature';
  priority?: boolean;
}

/**
 * Premium category tile.
 *
 * Hover/focus: slight image zoom, deepening scrim and a CTA that slides in.
 * The CTA is decorative — the whole card is one link, so nothing is
 * hover-only or unreachable by keyboard.
 */
export const CategoryCard = memo(function CategoryCard({
  category,
  className,
  variant = 'default',
  priority = false,
}: CategoryCardProps) {
  const { name, description, image, slug, productCount } = category;
  const isFeature = variant === 'feature';

  return (
    <SmartLink
      href={`/category/${slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-lg bg-cream',
        'transition-shadow duration-base ease-elegant hover:shadow-md',
        'focus-visible:outline-none focus-visible:shadow-focus',
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        ratio={isFeature ? 'category' : 'square'}
        priority={priority}
        sizes={isFeature ? '(max-width: 1023px) 100vw, 42vw' : '(max-width: 767px) 50vw, (max-width: 1023px) 50vw, 29vw'}
        className="h-full"
        imgClassName="transition-transform duration-[900ms] ease-elegant motion-safe:group-hover:scale-[1.06] motion-safe:group-focus-visible:scale-[1.06]"
      />

      {/* Scrim keeps label text legible over any imagery. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 bg-gradient-to-t transition-opacity duration-base ease-elegant',
          // Small square cards crop to a tighter frame over pale product shots,
          // so they need a deeper scrim than the large feature card to hold AA.
          isFeature
            ? 'from-ink/72 via-ink/18 to-transparent group-hover:from-ink/80'
            : 'from-ink/92 via-ink/55 to-ink/10 group-hover:from-ink/95',
        )}
      />

      <span
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-5',
          'transition-transform duration-base ease-elegant motion-safe:group-hover:-translate-y-1',
        )}
      >
        <span className="flex items-start gap-2">
          {/* min-w-0 lets a long name wrap within its own column instead of
              flowing underneath the arrow; the arrow never shrinks. */}
          <span
            className={cn(
              'min-w-0 font-display leading-tight text-white',
              isFeature ? 'text-h3' : 'text-h4',
            )}
          >
            {name}
          </span>
          <span
            aria-hidden
            className="mt-0.5 shrink-0 text-white transition-transform duration-base ease-elegant motion-safe:group-hover:translate-x-1.5"
          >
            <Icon name="arrow-right" size={17} />
          </span>
        </span>

        {description && isFeature && (
          <span className="max-w-sm text-caption leading-relaxed text-white/90">{description}</span>
        )}

        {typeof productCount === 'number' && (
          <span className="text-caption text-white/90">{productCount} styles</span>
        )}

        {/* Decorative CTA reveal — duplicates the card link, so it is hidden
            from assistive tech and never the only route to the content. */}
        <span
          aria-hidden
          className={cn(
            'mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5',
            'text-caption font-medium text-ink shadow-sm',
            'opacity-0 transition-[opacity,transform] duration-base ease-elegant',
            'translate-y-1.5 motion-safe:group-hover:translate-y-0 motion-safe:group-hover:opacity-100',
            'motion-safe:group-focus-visible:translate-y-0 motion-safe:group-focus-visible:opacity-100',
            'motion-reduce:hidden',
          )}
        >
          Shop now
          <Icon name="arrow-right" size={13} />
        </span>
      </span>
    </SmartLink>
  );
});
