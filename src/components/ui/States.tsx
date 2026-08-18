import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

interface StateProps {
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}

/** Elegant nothing-here state — never a blank region. */
export function EmptyState({
  title,
  description,
  action,
  className,
  icon = 'sparkle',
}: StateProps & { icon?: IconName }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-cream px-6 py-14 text-center',
        className,
      )}
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary shadow-xs">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="text-h4 text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-prose text-body-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface ErrorStateProps extends StateProps {
  onRetry?: () => void;
  retryLabel?: string;
}

/** Clear, branded failure state with a retry affordance. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this content. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: Partial<ErrorStateProps>) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-error/8 text-error">
        <Icon name="alert" size={22} />
      </span>
      <h3 className="text-h4 text-ink">{title}</h3>
      <p className="mt-2 max-w-prose text-body-sm text-ink-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
