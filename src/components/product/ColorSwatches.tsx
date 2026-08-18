import { cn } from '@/lib/cn';
import type { ProductColor } from '@/types';

interface ColorSwatchesProps {
  /** Comes straight from the product — never from a global colour list. */
  colors: ProductColor[];
  max?: number;
  className?: string;
}

/** Read-only colour preview row for cards. Selection lives on the PDP later. */
export function ColorSwatches({ colors, max = 4, className }: ColorSwatchesProps) {
  if (colors.length === 0) return <span />;

  const shown = colors.slice(0, max);
  const remainder = colors.length - shown.length;
  const names = colors.map((color) => color.name).join(', ');

  return (
    <span className={cn('flex items-center gap-1.5', className)} title={`Colours: ${names}`}>
      <span className="sr-only">Available colours: {names}</span>
      {shown.map((color) => (
        <span
          key={color.name}
          aria-hidden
          className={cn(
            'h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-ink/12',
            !color.available && 'opacity-35',
          )}
          style={{ backgroundColor: color.swatch ?? 'rgb(var(--c-border-strong))' }}
        />
      ))}
      {remainder > 0 && (
        <span aria-hidden className="text-caption text-ink-subtle">
          +{remainder}
        </span>
      )}
    </span>
  );
}
