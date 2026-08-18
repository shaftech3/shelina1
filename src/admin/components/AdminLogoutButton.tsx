import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, useToast } from '@/components/ui';
import { useAdminAuth } from '../auth';

/**
 * Signs the admin out and returns them to the login screen.
 *
 * Deliberately does NOT touch the cart: the shopper's bag lives under a
 * different storage key and has nothing to do with the admin session.
 */
export function AdminLogoutButton({ onDone }: { onDone?: () => void }) {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      onDone?.();
      navigate('/admin/login', { replace: true });
      notify({ title: 'Signed out', tone: 'success' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      fullWidth
      loading={busy}
      onClick={handleLogout}
      iconLeft={<Icon name="logout" size={17} />}
      className="justify-start"
    >
      Log out
    </Button>
  );
}
