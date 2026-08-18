import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, Skeleton, type IconName } from '@/components/ui';
import { useSeo } from '@/hooks';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminStats } from '../hooks/useAdminData';

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  to: string;
  icon: IconName;
  loading: boolean;
}

function StatCard({ label, value, hint, to, icon, loading }: StatCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col gap-3 rounded-lg border border-border bg-surface p-5',
        'transition-[border-color,box-shadow] duration-fast ease-elegant',
        'hover:border-border-strong hover:shadow-xs',
        'focus-visible:outline-none focus-visible:shadow-focus',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-label font-medium text-ink-muted">{label}</span>
        <Icon name={icon} size={18} className="text-ink-subtle" />
      </div>

      {loading ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <span className="font-display text-h2 leading-none text-ink">{value}</span>
      )}

      <span className="text-caption text-ink-subtle">{hint ?? '\u00A0'}</span>
    </Link>
  );
}

/**
 * Admin home.
 *
 * Deliberately minimal: real counts and shortcuts, nothing else. No charts,
 * no revenue, no invented customer or order numbers — this build has no
 * orders, and a dashboard that implies otherwise would be a lie.
 */
export function AdminDashboardPage() {
  const { data, loading } = useAdminStats();

  useSeo({ title: 'Admin dashboard', path: '/admin', noIndex: true });

  return (
    <AdminLayout
      title="Dashboard"
      description="Manage your catalogue, homepage content and SEO settings."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Products"
          value={data?.products ?? 0}
          hint={
            data
              ? `${data.activeProducts} active${data.draftProducts ? ` · ${data.draftProducts} draft` : ''}`
              : undefined
          }
          to="/admin/products"
          icon="grid"
          loading={loading}
        />
        <StatCard
          label="Categories"
          value={data?.categories ?? 0}
          to="/admin/categories"
          icon="layers"
          loading={loading}
        />
        <StatCard label="Brands" value={data?.brands ?? 0} to="/admin/brands" icon="tag" loading={loading} />
        <StatCard
          label="Featured products"
          value={data?.featured ?? 0}
          hint="Shown on the homepage"
          to="/admin/products"
          icon="sparkle"
          loading={loading}
        />
        <StatCard
          label="On sale"
          value={data?.onSale ?? 0}
          hint="Products with a sale price"
          to="/admin/products"
          icon="tag"
          loading={loading}
        />
      </div>

      <section className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-h4 text-ink">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { to: '/admin/products/new', label: 'Add a product', icon: 'plus' as IconName },
            { to: '/admin/categories', label: 'Manage categories', icon: 'layers' as IconName },
            { to: '/admin/homepage', label: 'Edit homepage', icon: 'image' as IconName },
            { to: '/admin/seo', label: 'SEO settings', icon: 'settings' as IconName },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2 text-body-sm text-ink',
                'transition-colors duration-fast hover:border-border-strong hover:bg-cream',
                'focus-visible:outline-none focus-visible:shadow-focus',
              )}
            >
              <Icon name={action.icon} size={16} className="text-ink-subtle" />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

    </AdminLayout>
  );
}
