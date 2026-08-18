import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useCustomerAccount, useMediaQuery } from '@/hooks';
import { useToast } from '@/components/ui';
import { Drawer, Dropdown, Icon, IconButton, SmartLink } from '@/components/ui';

/** Guest options — sign in or create an account. */
const GUEST_LINKS = [
  {
    href: '/account/sign-in',
    label: 'Sign In',
    description: 'Access your account details',
    icon: 'user' as const,
  },
  {
    href: '/account/register',
    label: 'Create Account',
    description: 'Save your details for faster checkout',
    icon: 'sparkle' as const,
  },
];

/**
 * Signed-in options.
 *
 * Stage 6 adds order history, so "My Orders" now appears here alongside the
 * profile link. Nothing admin-related is ever exposed in this menu.
 */
const CUSTOMER_LINKS = [
  {
    href: '/account',
    label: 'My Account',
    description: 'Your profile details',
    icon: 'user' as const,
  },
  {
    href: '/account/orders',
    label: 'My Orders',
    description: 'Track orders and download invoices',
    icon: 'receipt' as const,
  },
];

/**
 * Header account control.
 *
 * Popover on wide screens, right-side drawer on touch-sized screens. Both
 * reuse the Stage 1 primitives — `Dropdown` already closes on outside click,
 * Escape and focus loss; `Drawer` already traps focus and locks scroll.
 *
 * Stage 5: customer accounts are real, so this now switches between guest and
 * signed-in states based on the server session. It reads ONLY the customer
 * session — an admin signed into /admin is not a signed-in shopper here.
 */
export function AccountMenu() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { customer, isAuthenticated, signOut } = useCustomerAccount();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (isDesktop && drawerOpen) setDrawerOpen(false);
  }, [isDesktop, drawerOpen]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      // Signing out never empties the cart — it belongs to the browser.
      notify({ title: 'Signed out', description: 'Your bag has been kept.', tone: 'success' });
      setDrawerOpen(false);
      navigate('/');
    } catch {
      notify({ title: 'Could not sign out', description: 'Please try again.', tone: 'error' });
    } finally {
      setSigningOut(false);
    }
  };

  const links = isAuthenticated ? CUSTOMER_LINKS : GUEST_LINKS;
  const greeting = isAuthenticated
    ? `Hello, ${customer?.name?.split(' ')[0] ?? 'there'}`
    : 'Welcome to Shelina';
  const subtitle = isAuthenticated
    ? customer?.email ?? ''
    : 'Sign in or create an account to get started.';

  const triggerLabel = isAuthenticated ? `Account, signed in as ${customer?.name}` : 'Account';

  if (isDesktop) {
    return (
      <Dropdown
        align="right"
        className="w-[288px]"
        trigger={({ open, toggle, id, controls }) => (
          <IconButton
            id={id}
            label={triggerLabel}
            icon={<Icon name="user" size={20} />}
            onClick={toggle}
            aria-expanded={open}
            aria-controls={controls}
            aria-haspopup="menu"
            className={cn(open && 'bg-cream text-primary-deep')}
          />
        )}
      >
        <div className="px-3.5 pb-1 pt-2">
          <p className="font-display text-body text-ink">{greeting}</p>
          <p className="mt-1 truncate text-caption text-ink-subtle">{subtitle}</p>
        </div>

        <div className="my-2 h-px bg-border" aria-hidden />

        {links.map((link) => (
          <SmartLink
            key={link.href}
            href={link.href}
            role="menuitem"
            className={cn(
              'flex w-full items-start gap-3 rounded-md px-3.5 py-2.5 text-left',
              'transition-colors duration-fast ease-elegant',
              'hover:bg-cream focus-visible:bg-cream focus-visible:outline-none',
            )}
          >
            <Icon name={link.icon} size={18} className="mt-0.5 shrink-0 text-primary-deep" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-sm font-medium text-ink">{link.label}</span>
              <span className="text-caption text-ink-subtle">{link.description}</span>
            </span>
          </SmartLink>
        ))}

        {isAuthenticated && (
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className={cn(
              'flex w-full items-start gap-3 rounded-md px-3.5 py-2.5 text-left',
              'transition-colors duration-fast ease-elegant',
              'hover:bg-cream focus-visible:bg-cream focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-55',
            )}
          >
            <Icon name="logout" size={18} className="mt-0.5 shrink-0 text-primary-deep" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body-sm font-medium text-ink">
                {signingOut ? 'Signing out…' : 'Logout'}
              </span>
              <span className="text-caption text-ink-subtle">Your bag stays saved</span>
            </span>
          </button>
        )}
      </Dropdown>
    );
  }

  return (
    <>
      <IconButton
        ref={triggerRef}
        label={triggerLabel}
        icon={<Icon name="user" size={20} />}
        onClick={() => setDrawerOpen(true)}
        aria-expanded={drawerOpen}
        aria-haspopup="dialog"
      />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="right" title="Account">
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-display text-h4 text-ink">{greeting}</p>
            <p className="mt-1.5 break-words text-caption text-ink-subtle">{subtitle}</p>
          </div>

          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <SmartLink
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3.5',
                    'transition-colors duration-fast ease-elegant',
                    'hover:border-border-strong hover:bg-cream',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                  )}
                >
                  <Icon name={link.icon} size={19} className="shrink-0 text-primary-deep" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-body-sm font-medium text-ink">{link.label}</span>
                    <span className="text-caption text-ink-subtle">{link.description}</span>
                  </span>
                  <Icon name="chevron-right" size={17} className="ml-auto shrink-0 text-ink-subtle" />
                </SmartLink>
              </li>
            ))}

            {isAuthenticated && (
              <li>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3.5',
                    'transition-colors duration-fast ease-elegant',
                    'hover:border-border-strong hover:bg-cream',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                    'disabled:cursor-not-allowed disabled:opacity-55',
                  )}
                >
                  <Icon name="logout" size={19} className="shrink-0 text-primary-deep" />
                  <span className="flex min-w-0 flex-col gap-0.5 text-left">
                    <span className="text-body-sm font-medium text-ink">
                      {signingOut ? 'Signing out…' : 'Logout'}
                    </span>
                    <span className="text-caption text-ink-subtle">Your bag stays saved</span>
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      </Drawer>
    </>
  );
}
