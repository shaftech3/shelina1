import { cn } from '@/lib/cn';
import type { TrustValue } from '@/types';
import { Icon, Reveal, Skeleton, type IconName } from '@/components/ui';

interface TrustSectionProps {
  values: TrustValue[] | null;
  loading?: boolean;
  className?: string;
}

/**
 * Value proposition row.
 *
 * Copy is intentionally non-committal — no invented guarantees, certifications,
 * return windows or delivery promises. The owner supplies real policy wording.
 */
export function TrustSection({ values, loading, className }: TrustSectionProps) {
  const grid = cn('grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4', className);

  if (loading || !values) {
    return (
      <div className={grid} aria-busy={loading || undefined}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-3">
            <Skeleton variant="circle" className="h-12 w-12" />
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="text" className="w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className={grid}>
      {values.map((value, index) => (
        <Reveal as="li" key={value.id} delay={index * 70} className="flex flex-col gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-deep">
            <Icon name={value.icon as IconName} size={21} />
          </span>
          <h3 className="font-sans text-body-sm font-semibold text-ink">{value.title}</h3>
          <p className="text-caption leading-relaxed text-ink-muted">{value.description}</p>
        </Reveal>
      ))}
    </ul>
  );
}
