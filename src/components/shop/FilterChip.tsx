import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  className?: string;
}

/**
 * A removable active-filter chip.
 *
 * Distinct from `Tag`, which is a display/toggle chip — this one is a single
 * destructive control whose accessible name states what removing it does.
 */
export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter: ${label}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-3 pr-2.5',
        'text-caption font-medium text-ink transition-colors duration-fast ease-elegant',
        'hover:border-border-strong hover:bg-cream focus-visible:outline-none focus-visible:shadow-focus',
        className,
      )}
    >
      {label}
      <Icon name="close" size={13} className="text-ink-muted" aria-hidden />
    </button>
  );
}
