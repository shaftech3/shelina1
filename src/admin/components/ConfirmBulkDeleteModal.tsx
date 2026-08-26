import { useState } from 'react';
import { Button, Modal } from '@/components/ui';

interface ConfirmBulkDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemType: 'orders' | 'customers';
  count: number;
  itemsSummary?: string[];
}

export function ConfirmBulkDeleteModal({
  open,
  onClose,
  onConfirm,
  itemType,
  count,
  itemsSummary = [],
}: ConfirmBulkDeleteModalProps) {
  const [busy, setBusy] = useState(false);

  if (count === 0) return null;

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const isOrder = itemType === 'orders';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bulk Delete ${count} ${isOrder ? 'Order' : 'Customer'}${count > 1 ? 's' : ''}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy}>
            Delete {count} {isOrder ? 'Orders' : 'Customers'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-body-sm text-red-900">
          <p className="font-semibold">Warning: This bulk operation cannot be undone.</p>
          <p className="mt-1 text-red-700">
            {isOrder
              ? `You are about to permanently delete ${count} selected order(s) and all of their associated line items.`
              : `You are about to delete ${count} customer user account(s). Their historical order records will be preserved as guest orders.`}
          </p>
        </div>

        {itemsSummary.length > 0 && (
          <div className="rounded-lg border border-border bg-sand/30 p-3">
            <p className="mb-2 text-caption font-semibold uppercase text-ink-muted">
              Selected {isOrder ? 'Orders' : 'Customers'} ({itemsSummary.length}):
            </p>
            <div className="max-h-36 overflow-y-auto space-y-1 text-body-sm font-mono text-ink">
              {itemsSummary.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 py-0.5 border-b border-border/40 last:border-0">
                  <span className="text-caption text-ink-muted">{idx + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
