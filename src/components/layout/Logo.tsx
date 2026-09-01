import { cn } from '@/lib/cn';
import { BRAND_ASSETS, STORE_CONFIG } from '@/lib/constants';
import { normalizeMediaUrl } from '@/lib/media';

export type LogoSlot = 'desktop' | 'mobile' | 'footer';

interface LogoProps {
  slot?: LogoSlot;
  className?: string;
  /** Renders the wordmark next to the mark (footer / drawer contexts). */
  showWordmark?: boolean;
  invert?: boolean;
  priority?: boolean;
}

const SOURCES: Record<LogoSlot, string> = {
  desktop: BRAND_ASSETS.logoDesktop,
  mobile: BRAND_ASSETS.logoMobile,
  footer: BRAND_ASSETS.logoFooter,
};

const SIZES: Record<LogoSlot, string> = {
  desktop: 'h-15 w-15 sm:h-16 sm:w-16 md:h-[66px] md:w-[66px] lg:h-[68px] lg:w-[68px]',
  mobile: 'h-[50px] w-[50px] sm:h-[54px] sm:w-[54px]',
  footer: 'h-16 w-16 sm:h-18 sm:w-18',
};

/**
 * Brand asset slot.
 *
 * The owner replaces the files referenced in `BRAND_ASSETS` (lib/constants.ts)
 * and every logo across the site updates — no component changes required.
 */
export function Logo({ slot = 'desktop', className, showWordmark = false, invert = false, priority = false }: LogoProps) {
  const logoSrc = normalizeMediaUrl(SOURCES[slot]);

  return (
    <span className={cn('inline-flex items-center gap-2.5 sm:gap-3.5', className)}>
      <img
        src={logoSrc}
        alt={`${STORE_CONFIG.name} logo`}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn(
          'shrink-0 rounded-full object-cover shadow-sm ring-1.5 transition-transform duration-300 hover:scale-105',
          invert ? 'ring-white/30' : 'ring-primary/30',
          SIZES[slot],
        )}
      />
      {showWordmark && (
        <span className="flex flex-col leading-tight">
          <span
            className={cn(
              'font-display text-[1.45rem] sm:text-[1.75rem] font-bold tracking-[0.06em] uppercase',
              invert ? 'text-cream' : 'text-primary-deep',
            )}
          >
            {STORE_CONFIG.name}
          </span>
          <span
            className={cn(
              'text-[0.6rem] sm:text-[0.68rem] uppercase tracking-[0.28em] font-medium',
              invert ? 'text-cream/70' : 'text-ink-muted',
            )}
          >
            Refined Footwear
          </span>
        </span>
      )}
    </span>
  );
}

