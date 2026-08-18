import { cn } from '@/lib/cn';
import type { ProductColor } from '@/types';

interface ColorSelectorProps {
  /**
   * Comes straight off the product. Colour names are free text entered by the
   * admin, so this component makes no assumption that a name maps to a CSS
   * colour. The swatch is decoration; the NAME is the actual control label and
   * is always visible.
   */
  colors: ProductColor[];
  selected: string | null;
  onSelect: (value: string) => void;
  invalid?: boolean;
  errorId?: string;
  className?: string;
}

export function ColorSelector({
  colors,
  selected,
  onSelect,
  invalid = false,
  errorId,
  className,
}: ColorSelectorProps) {
  if (colors.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span id="color-label" className="text-label font-medium text-ink">
          Colour
        </span>
        {selected && (
          <span className="text-caption text-ink-muted">
            Selected: <span className="font-medium text-ink">{selected}</span>
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-labelledby="color-label"
        aria-invalid={invalid || undefined}
        aria-errormessage={invalid && errorId ? errorId : undefined}
        className="flex flex-wrap gap-2"
      >
        {colors.map((color) => {
          const isSelected = selected === color.name;
          const disabled = !color.available;

          return (
            <button
              key={color.name}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onSelect(color.name)}
              className={cn(
                'group relative inline-flex items-center gap-2 rounded-md border py-2 pl-2 pr-3.5',
                'text-body-sm transition-[background-color,border-color,color] duration-fast ease-elegant',
                'focus-visible:outline-none focus-visible:shadow-focus',
                isSelected
                  ? 'border-ink bg-ink text-white'
                  : 'border-border bg-surface text-ink hover:border-border-strong hover:bg-cream',
                disabled &&
                  'cursor-not-allowed border-border bg-cream text-ink-subtle hover:border-border hover:bg-cream',
              )}
            >
              {/* Only drawn when the admin supplied a swatch value. A missing
                  swatch degrades to the name alone rather than a wrong colour. */}
              {color.swatch && (
                <span
                  aria-hidden
                  className={cn(
                    'h-4 w-4 shrink-0 rounded-full ring-1 ring-inset ring-ink/18',
                    isSelected && 'ring-white/40',
                    disabled && 'opacity-40',
                  )}
                  style={{ backgroundColor: color.swatch }}
                />
              )}
              <span className="font-medium">{color.name}</span>
              {disabled && <span className="sr-only">(unavailable)</span>}
              {disabled && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2 top-1/2 h-px -rotate-[10deg] bg-ink-subtle/60"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
