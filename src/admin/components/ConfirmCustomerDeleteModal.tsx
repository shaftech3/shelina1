import { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { formatPrice } from '@/lib/format';
import type { AdminCustomer } from '@/types';

interface ConfirmCustomerDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  customer: AdminCustomer | null;
}

export function ConfirmCustomerDeleteModal({
  open,
  onClose,
  onConfirm,
  customer,
}: ConfirmCustomerDeleteModalProps) {
  const [busy, setBusy] = useState(false);

  if (!customer) return null;

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
      title="Delete Customer Account"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy}>
            Delete Account
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-body-sm text-red-900">
          <p className="font-semibold">Warning: Customer account deletion is permanent.</p>
          <p className="mt-1 text-red-700">
            This customer will no longer be able to log in. Any historical orders ({customer.orderCount}) will be preserved as guest orders so sales history and accounting remain accurate.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-sand/30 p-4 text-body-sm">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Customer Name:</span>
            <span className="font-semibold text-ink">{customer.name}</span>
          </div>

          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Email Address:</span>
            <span className="font-mono text-ink">{customer.email}</span>
          </div>

          {customer.phone && (
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-ink-muted">Phone:</span>
              <span className="text-ink">{customer.phone}</span>
            </div>
          )}

          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Registered On:</span>
            <span className="text-ink">{formatDate(customer.createdAt)}</span>
          </div>

          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-ink-muted">Total Orders:</span>
            <span className="font-medium text-ink">{customer.orderCount} order(s)</span>
          </div>

          <div className="flex justify-between">
            <span className="text-ink-muted">Total Spent:</span>
            <span className="font-bold text-ink">{formatPrice(customer.totalSpent)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
