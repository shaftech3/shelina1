import { cn } from '@/lib/cn';
import type { StockStatus } from '@/types';

const LABELS: Record<StockStatus, { text: string; className: string }> = {
  'in-stock': { text: 'In stock', className: 'text-success' },
  'low-stock': { text: 'Low stock', className: 'text-warning' },
  'out-of-stock': { text: 'Sold out', className: 'text-ink-subtle' },
  'pre-order': { text: 'Pre-order', className: 'text-primary-deep' },
};

export function StockLabel({ status, className }: { status: StockStatus; className?: string }) {
  const { text, className: tone } = LABELS[status];
  return <span className={cn('shrink-0 text-caption font-medium', tone, className)}>{text}</span>;
}
