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
  desktop: 'h-16 w-16 sm:h-[72px] sm:w-[72px] md:h-[78px] md:w-[78px] lg:h-[82px] lg:w-[82px]',
  mobile: 'h-[58px] w-[58px] sm:h-[64px] sm:w-[64px]',
  footer: 'h-20 w-20 sm:h-24 sm:w-24',
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
          'shrink-0 rounded-full object-cover shadow-sm ring-2 transition-transform duration-300 hover:scale-105',
          invert ? 'ring-white/30' : 'ring-primary/40',
          SIZES[slot],
        )}
      />
      {showWordmark && (
        <span className="flex flex-col leading-none gap-0.5">
          <span
            className={cn(
              'font-display font-bold tracking-[0.07em] uppercase',
              slot === 'desktop'
                ? 'text-[1.65rem] sm:text-[1.85rem] lg:text-[2.05rem]'
                : slot === 'mobile'
                ? 'text-[1.35rem] sm:text-[1.55rem]'
                : 'text-[1.75rem] sm:text-[2.15rem]',
              invert ? 'text-cream' : 'text-primary-deep',
            )}
          >
            {STORE_CONFIG.name}
          </span>
          <span
            className={cn(
              'uppercase font-medium tracking-[0.28em]',
              slot === 'desktop'
                ? 'text-[0.68rem] sm:text-[0.74rem]'
                : slot === 'mobile'
                ? 'text-[0.58rem] sm:text-[0.65rem]'
                : 'text-[0.72rem] sm:text-[0.8rem]',
              invert ? 'text-cream/75' : 'text-ink-muted',
            )}
          >
            Refined Footwear
          </span>
        </span>
      )}
    </span>
  );
}

