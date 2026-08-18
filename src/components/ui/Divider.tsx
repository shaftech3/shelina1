import { cn } from '@/lib/cn';

interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  /** Optional centred label, e.g. "or". */
  label?: string;
}

export function Divider({ className, orientation = 'horizontal', label }: DividerProps) {
  if (orientation === 'vertical') {
    return <span role="separator" aria-orientation="vertical" className={cn('w-px self-stretch bg-border', className)} />;
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-4', className)} role="separator">
        <span className="h-px flex-1 bg-border" />
        <span className="text-caption uppercase tracking-[0.18em] text-ink-subtle">{label}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return <hr className={cn('h-px w-full border-0 bg-border', className)} />;
}
