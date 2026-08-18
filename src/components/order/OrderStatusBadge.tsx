import { Badge, type BadgeTone } from '@/components/ui';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types';

/**
 * Order status, shown as a labelled badge.
 *
 * ACCESSIBILITY: the status word is always present in the text. Colour is a
 * secondary cue, never the only one, so the state is readable to someone who
 * cannot distinguish the tints (or is printing in greyscale).
 */
const TONES: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'primary',
  PROCESSING: 'primary',
  SHIPPED: 'secondary',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function OrderStatusBadge({ status, size = 'md', className }: OrderStatusBadgeProps) {
  return (
    <Badge tone={TONES[status] ?? 'neutral'} size={size} className={className}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
