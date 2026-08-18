import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
  /** `text` renders a rounded line, `block` a surface placeholder. */
  variant?: 'text' | 'block' | 'circle';
}

export function Skeleton({ className, variant = 'block' }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block overflow-hidden bg-cream',
        variant === 'text' && 'h-3.5 rounded-full',
        variant === 'block' && 'rounded-md',
        variant === 'circle' && 'rounded-full',
        className,
      )}
    >
      <span className="absolute inset-0 motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </span>
  );
}

/** Product-card shaped skeleton used while catalog data resolves. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      <Skeleton className="aspect-[4/5] w-full rounded-lg" />
      <div className="flex flex-col gap-2 px-0.5">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="h-4 w-4/5" />
        <Skeleton variant="text" className="w-1/4" />
      </div>
    </div>
  );
}
