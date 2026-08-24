import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { STORE_CONFIG } from '@/lib/constants';
import { Drawer, Icon, IconButton, type IconName } from '@/components/ui';
import { useAdminAuth } from '../auth';
import { AdminLogoutButton } from './AdminLogoutButton';

interface AdminNavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Only the dashboard needs an exact match; the rest own their subtrees. */
  end?: boolean;
}

/**
 * Six destinations, deliberately. The brief calls for a focused content
 * manager, not an enterprise dashboard, so this list should stay short.
 */
const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
  { to: '/admin/products', label: 'Products', icon: 'grid' },
  { to: '/admin/orders', label: 'Orders', icon: 'receipt' },
  { to: '/admin/categories', label: 'Categories', icon: 'layers' },
  { to: '/admin/brands', label: 'Brands', icon: 'tag' },
  { to: '/admin/homepage', label: 'Homepage', icon: 'image' },
  { to: '/admin/settings', label: 'Store & Delivery', icon: 'truck' },
  { to: '/admin/integrations/nexora', label: 'NEXORA Sync', icon: 'link' },
  { to: '/admin/seo', label: 'SEO', icon: 'settings' },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm transition-colors duration-fast ease-elegant',
              'focus-visible:outline-none focus-visible:shadow-focus',
              isActive
                ? 'bg-primary-soft font-medium text-primary-deep'
                : 'text-ink-muted hover:bg-cream hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} size={18} className={isActive ? 'text-primary-deep' : 'text-ink-subtle'} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { admin } = useAdminAuth();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex-1">
        <NavItems onNavigate={onNavigate} />
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {admin && (
          <div className="px-3">
            <p className="text-caption text-ink-subtle">Signed in as</p>
            <p className="truncate text-body-sm font-medium text-ink" title={admin.email}>
              {admin.email}
            </p>
          </div>
        )}
        <AdminLogoutButton onDone={onNavigate} />
      </div>
    </div>
  );
}

interface AdminLayoutProps {
  title: string;
  description?: string;
  /** Page-level actions, e.g. an "Add product" button. */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Admin shell: persistent sidebar at ≥lg, a Drawer below that.
 *
 * Reuses the Stage 1 Drawer rather than introducing a second overlay system,
 * so focus trapping, Escape and scroll locking behave identically to the
 * storefront.
 */
export function AdminLayout({ title, description, actions, children }: AdminLayoutProps) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer on navigation; otherwise it stays open over the
  // page the admin just chose.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar. Sticky so navigation stays reachable on long tables. */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <IconButton
              label="Open admin menu"
              icon={<Icon name="menu" size={20} />}
              onClick={() => setNavOpen(true)}
              size="sm"
            />
          </div>

          <NavLink
            to="/admin"
            className="flex min-w-0 items-baseline gap-2 rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span className="font-display text-h4 leading-none text-ink">{STORE_CONFIG.name}</span>
            <span className="hidden text-caption uppercase tracking-[0.18em] text-ink-subtle sm:inline">
              Admin
            </span>
          </NavLink>

          <div className="ml-auto flex items-center gap-2">
            {/* Fast path back to the live site — admins check their work constantly. */}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className={cn(
                'hidden items-center gap-1.5 rounded-md px-3 py-2 text-body-sm text-ink-muted sm:inline-flex',
                'transition-colors duration-fast hover:bg-cream hover:text-ink',
                'focus-visible:outline-none focus-visible:shadow-focus',
              )}
            >
              View store
              <Icon name="external" size={15} />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-8 px-4 py-6 sm:px-6 lg:py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-[calc(4rem+1.5rem)]">
            <SidebarContent />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-h2 text-ink">{title}</h1>
              {description && <p className="mt-1.5 text-body-sm text-ink-muted">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>

          {children}
        </main>
      </div>

      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Admin menu" side="left">
        <div className="h-full py-2">
          <SidebarContent onNavigate={() => setNavOpen(false)} />
        </div>
      </Drawer>
    </div>
  );
}
