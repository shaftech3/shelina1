import { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import type { Order } from '@/types';

interface ConfirmOrderDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  order: Order | null;
}

export function ConfirmOrderDeleteModal({
  open,
  onClose,
  onConfirm,
  order,
}: ConfirmOrderDeleteModalProps) {
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Order"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy}>
            Delete Order Permanently
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-body-sm text-red-900">
          <p className="font-semibold">Warning: This action cannot be undone.</p>
          <p className="mt-1 text-red-700">
            Deleting this order will remove all order line items and database records for this transaction.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-sand/30 p-4 text-body-sm">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Order Reference:</span>
            <span className="font-mono font-semibold text-ink">{order.orderNumber}</span>
          </div>

          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Customer Name:</span>
            <span className="font-medium text-ink">{order.customerName}</span>
          </div>

          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Customer Email:</span>
            <span className="text-ink">{order.customerEmail}</span>
          </div>

          {order.customerPhone && (
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-ink-muted">Phone:</span>
              <span className="text-ink">{order.customerPhone}</span>
            </div>
          )}

          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Total Amount:</span>
            <span className="font-bold text-ink">{formatPrice(order.grandTotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-ink-muted">Status:</span>
            <span className="rounded bg-sand px-2 py-0.5 text-caption uppercase font-medium text-ink">
              {order.status}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
