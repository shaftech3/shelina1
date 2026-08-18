import { cn } from '@/lib/cn';
import { BRAND_ASSETS, STORE_CONFIG } from '@/lib/constants';

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
  desktop: 'h-11 w-11 md:h-12 md:w-12',
  mobile: 'h-10 w-10',
  footer: 'h-12 w-12',
};

/**
 * Brand asset slot.
 *
 * The owner replaces the files referenced in `BRAND_ASSETS` (lib/constants.ts)
 * and every logo across the site updates — no component changes required.
 */
export function Logo({ slot = 'desktop', className, showWordmark = false, invert = false, priority = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img
        src={SOURCES[slot]}
        alt={`${STORE_CONFIG.name} logo`}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={cn('shrink-0 rounded-full object-cover', SIZES[slot])}
      />
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[1.4rem] tracking-[0.02em]',
              invert ? 'text-cream' : 'text-ink',
            )}
          >
            {STORE_CONFIG.name}
          </span>
          <span
            className={cn(
              'mt-1 text-[0.6rem] uppercase tracking-[0.28em]',
              invert ? 'text-cream/60' : 'text-ink-subtle',
            )}
          >
            Footwear
          </span>
        </span>
      )}
    </span>
  );
}
