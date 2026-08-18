import { useState } from 'react';
import { Button, Modal } from '@/components/ui';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
}

/**
 * Destructive-action confirmation, built on the existing Modal.
 *
 * Never `window.confirm()` (§15): it cannot be styled, cannot be focus-trapped
 * consistently, and is blocked outright in some embedded contexts.
 */
export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
}: ConfirmDeleteModalProps) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      // The caller decides what "success" means (toast, refresh, redirect);
      // closing here keeps that decision out of this component.
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
