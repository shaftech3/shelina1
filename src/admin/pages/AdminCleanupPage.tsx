import { useState } from 'react';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useAdminCleanupStats, useSeo } from '@/hooks';
import { adminCleanupService, adminCustomerService, orderService, ServiceError } from '@/services';
import type { AdminCustomer, MediaDiagnosticsReport, Order } from '@/types';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmOrderDeleteModal } from '../components/ConfirmOrderDeleteModal';
import { ConfirmCustomerDeleteModal } from '../components/ConfirmCustomerDeleteModal';
import { ConfirmBulkDeleteModal } from '../components/ConfirmBulkDeleteModal';

export function AdminCleanupPage() {
  const { data: stats, loading, error, retry } = useAdminCleanupStats();
  const { notify } = useToast();

  useSeo({ title: 'Data Cleanup & Management', path: '/admin/cleanup', noIndex: true });

  // Order lookup state
  const [orderQuery, setOrderQuery] = useState('');
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Customer lookup state
  const [customerQuery, setCustomerQuery] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<AdminCustomer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<AdminCustomer | null>(null);

  // Action busy states
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [syncingNexora, setSyncingNexora] = useState(false);
  const [migratingMedia, setMigratingMedia] = useState(false);
  const [scanningDiagnostics, setScanningDiagnostics] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] = useState<MediaDiagnosticsReport | null>(null);
  const [bulkDeleteType, setBulkDeleteType] = useState<'cancelled-orders' | 'inactive-customers' | null>(null);

  async function handleScanDiagnostics() {
    setScanningDiagnostics(true);
    try {
      const report = await adminCleanupService.getMediaDiagnostics();
      setDiagnosticsReport(report);
      notify({
        title: 'Media Diagnostic Scan Complete',
        description: `Scanned ${report.totalMedia} media references (${report.permanentCloudinary} permanent cloud, ${report.legacyLocal} legacy local, ${report.missingOrBroken} missing/ephemeral).`,
        tone: 'success',
      });
    } catch (cause) {
      notify({
        title: 'Diagnostic Scan Failed',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setScanningDiagnostics(false);
    }
  }

  async function handleMigrateMedia() {
    setMigratingMedia(true);
    try {
      const result = await adminCleanupService.migrateMedia();
      notify({
        title: 'Media Migration Completed',
        description: `Scanned ${result.totalScanned} media items. Successfully migrated ${result.migratedCount} to persistent cloud storage (${result.skippedCount} already in cloud / ${result.failedCount} failed).`,
        tone: result.failedCount > 0 ? 'info' : 'success',
      });
      // Refresh scan
      void handleScanDiagnostics();
      retry();
    } catch (cause) {
      notify({
        title: 'Media Migration Failed',
        description: cause instanceof ServiceError ? cause.message : 'Please check storage configuration in backend settings.',
        tone: 'error',
      });
    } finally {
      setMigratingMedia(false);
    }
  }

  async function handleSearchOrder() {
    const q = orderQuery.trim();
    if (!q) return;
    setSearchingOrder(true);
    setFoundOrder(null);
    try {
      const order = await orderService.getAny(q);
      setFoundOrder(order);
    } catch (cause) {
      notify({
        title: 'Order not found',
        description: cause instanceof ServiceError ? cause.message : 'No order matching that reference was found.',
        tone: 'error',
      });
    } finally {
      setSearchingOrder(false);
    }
  }

  async function handleSearchCustomer() {
    const q = customerQuery.trim();
    if (!q) return;
    setSearchingCustomer(true);
    setFoundCustomer(null);
    try {
      const res = await adminCustomerService.listAll({ search: q, pageSize: 1 });
      if (res.customers.length > 0) {
        setFoundCustomer(res.customers[0]);
      } else {
        notify({
          title: 'Customer not found',
          description: `No registered customer found for "${q}".`,
          tone: 'error',
        });
      }
    } catch (cause) {
      notify({
        title: 'Customer lookup failed',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSearchingCustomer(false);
    }
  }

  async function handleCleanOrphans() {
    setCleaningOrphans(true);
    try {
      const result = await adminCleanupService.cleanupOrphans();
      notify({
        title: 'Orphaned items cleaned',
        description: result.orphanedMediaRemoved > 0
          ? `Successfully removed ${result.orphanedMediaRemoved} orphaned media reference(s).`
          : 'Catalogue scan clean. No orphaned media records found.',
        tone: 'success',
      });
      retry();
    } catch (cause) {
      notify({
        title: 'Cleanup failed',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setCleaningOrphans(false);
    }
  }

  async function handleNexoraSync() {
    setSyncingNexora(true);
    try {
      const result = await adminCleanupService.triggerNexoraSync();
      notify({
        title: result.connected ? 'NEXORA Sync Verified' : 'NEXORA Status Check',
        description: result.connected
          ? `Verified active synchronization (${result.counts.products} products, ${result.counts.orders} orders, ${result.counts.customers} customers).`
          : 'Sync check completed. No active NEXORA API key is currently provisioned.',
        tone: result.connected ? 'success' : 'info',
      });
      retry();
    } catch (cause) {
      notify({
        title: 'Synchronization test failed',
        description: cause instanceof ServiceError ? cause.message : 'Please check NEXORA connection settings.',
        tone: 'error',
      });
    } finally {
      setSyncingNexora(false);
    }
  }

  async function handleConfirmDeleteOrder() {
    if (!orderToDelete) return;
    try {
      await orderService.delete(orderToDelete.id);
      notify({
        title: 'Order deleted',
        description: `Order ${orderToDelete.orderNumber} was removed.`,
        tone: 'success',
      });
      setFoundOrder(null);
      setOrderToDelete(null);
      retry();
    } catch (cause) {
      notify({
        title: 'Could not delete order',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  async function handleConfirmDeleteCustomer() {
    if (!customerToDelete) return;
    try {
      await adminCustomerService.delete(customerToDelete.id);
      notify({
        title: 'Customer deleted',
        description: `Customer ${customerToDelete.name} was removed. Past orders were preserved.`,
        tone: 'success',
      });
      setFoundCustomer(null);
      setCustomerToDelete(null);
      retry();
    } catch (cause) {
      notify({
        title: 'Could not delete customer',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  async function handleConfirmBulkCleanup() {
    if (!bulkDeleteType) return;
    try {
      if (bulkDeleteType === 'cancelled-orders') {
        const res = await orderService.listAll({ status: 'CANCELLED', pageSize: 100 });
        if (res.orders.length === 0) {
          notify({ title: 'No cancelled orders', description: 'There are no cancelled orders to clean up.', tone: 'info' });
          return;
        }
        const ids = res.orders.map((o) => o.id);
        const result = await orderService.bulkDelete(ids);
        notify({
          title: 'Cancelled orders cleaned',
          description: `Deleted ${result.count} cancelled order(s).`,
          tone: 'success',
        });
      } else if (bulkDeleteType === 'inactive-customers') {
        const res = await adminCustomerService.listAll({ sort: 'orders-high', pageSize: 100 });
        const zeroOrders = res.customers.filter((c) => c.orderCount === 0);
        if (zeroOrders.length === 0) {
          notify({ title: 'No inactive customers', description: 'There are no customer accounts with 0 orders.', tone: 'info' });
          return;
        }
        const ids = zeroOrders.map((c) => c.id);
        const result = await adminCustomerService.bulkDelete(ids);
        notify({
          title: 'Inactive accounts cleaned',
          description: `Deleted ${result.count} inactive customer account(s).`,
          tone: 'success',
        });
      }
      retry();
    } catch (cause) {
      notify({
        title: 'Bulk cleanup failed',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setBulkDeleteType(null);
    }
  }

  return (
    <AdminLayout
      title="Data Cleanup & Management"
      description="Safely manage old records, purge test data, clean orphaned items, and verify NEXORA sync health."
    >
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Could not load system statistics"
          description="Please check database connection and try again."
          onRetry={retry}
        />
      )}

      {!loading && stats && (
        <div className="space-y-8">
          {/* Top Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold uppercase text-ink-muted">Total Orders</span>
                <span className="rounded bg-sand p-1.5 text-ink">
                  <Icon name="receipt" size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">{stats.orders.total}</p>
              <p className="mt-1 text-caption text-ink-muted">
                {stats.orders.cancelled} cancelled · {stats.orders.guestOrders} guest orders
              </p>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold uppercase text-ink-muted">Customers</span>
                <span className="rounded bg-sand p-1.5 text-ink">
                  <Icon name="user" size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">{stats.customers.total}</p>
              <p className="mt-1 text-caption text-ink-muted">
                {stats.customers.active} with orders · {stats.customers.inactive} without orders
              </p>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold uppercase text-ink-muted">Catalogue Media</span>
                <span className="rounded bg-sand p-1.5 text-ink">
                  <Icon name="image" size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-ink">{stats.catalogue.media}</p>
              <p className="mt-1 text-caption text-ink-muted">
                {stats.catalogue.products} products · {stats.catalogue.orphanedMedia} orphaned
              </p>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold uppercase text-ink-muted">NEXORA Health</span>
                <span className="rounded bg-sand p-1.5 text-ink">
                  <Icon name="link" size={16} />
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    stats.nexora.connected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <p className="text-lg font-bold text-ink">
                  {stats.nexora.connected ? 'Connected' : 'Unconfigured'}
                </p>
              </div>
              <p className="mt-1 text-caption text-ink-muted">
                {stats.nexora.activeKey
                  ? `Key: ${stats.nexora.activeKey.keyPrefix}…`
                  : 'No active API Key'}
              </p>
            </div>
          </div>

          {/* Section 1: Orders Management & Cleanup */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-h5 text-ink">1. Orders Cleanup & Individual Management</h2>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Quickly look up any order to delete it permanently or purge cancelled test orders.
                </p>
              </div>
              {stats.orders.cancelled > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setBulkDeleteType('cancelled-orders')}
                >
                  Clean {stats.orders.cancelled} Cancelled Orders
                </Button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Input
                    label="Search Order by Number or ID"
                    placeholder="e.g. SHL-20260816-0001 or ID"
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleSearchOrder()}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => void handleSearchOrder()}
                    loading={searchingOrder}
                    disabled={!orderQuery.trim()}
                  >
                    Search Order
                  </Button>
                </div>
              </div>

              {foundOrder && (
                <div className="rounded-lg border border-border bg-sand/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">{foundOrder.orderNumber}</span>
                        <span className="rounded bg-sand px-2 py-0.5 text-caption uppercase font-medium text-ink">
                          {foundOrder.status}
                        </span>
                      </div>
                      <p className="mt-1 text-body-sm text-ink">
                        {foundOrder.customerName} ({foundOrder.customerEmail})
                      </p>
                      <p className="text-caption text-ink-muted">
                        Total: Rs. {foundOrder.grandTotal.toLocaleString()} · Items: {foundOrder.itemCount}
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setOrderToDelete(foundOrder)}
                      className="flex items-center gap-1.5"
                    >
                      <Icon name="trash" size={15} />
                      Delete This Order
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Section 2: Customers Management & Cleanup */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-h5 text-ink">2. Customers Cleanup & Management</h2>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Look up registered customer accounts to inspect or delete. Historical orders remain intact as guest orders.
                </p>
              </div>
              {stats.customers.inactive > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setBulkDeleteType('inactive-customers')}
                >
                  Clean {stats.customers.inactive} Inactive Accounts
                </Button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Input
                    label="Search Customer by Name or Email"
                    placeholder="e.g. customer@example.com"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleSearchCustomer()}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => void handleSearchCustomer()}
                    loading={searchingCustomer}
                    disabled={!customerQuery.trim()}
                  >
                    Search Customer
                  </Button>
                </div>
              </div>

              {foundCustomer && (
                <div className="rounded-lg border border-border bg-sand/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-ink">{foundCustomer.name}</h4>
                      <p className="font-mono text-body-sm text-ink-muted">{foundCustomer.email}</p>
                      <p className="mt-1 text-caption text-ink-muted">
                        Orders: {foundCustomer.orderCount} · Total Spent: Rs. {foundCustomer.totalSpent.toLocaleString()} · Joined: {formatDate(foundCustomer.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setCustomerToDelete(foundCustomer)}
                      className="flex items-center gap-1.5"
                    >
                      <Icon name="trash" size={15} />
                      Delete This Customer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Section 3: Orphaned Data & Integrity */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-h5 text-ink">3. Orphaned Records & System Integrity</h2>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Scans and safely prunes detached media references without touching active store products, categories, or brands.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleCleanOrphans()}
                loading={cleaningOrphans}
                className="flex items-center gap-1.5"
              >
                <Icon name="refresh" size={15} />
                Scan & Clean Orphaned Records
              </Button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/70 p-3 bg-surface">
                <span className="text-caption text-ink-muted">Active Products</span>
                <p className="text-lg font-bold text-ink">{stats.catalogue.products}</p>
              </div>
              <div className="rounded-lg border border-border/70 p-3 bg-surface">
                <span className="text-caption text-ink-muted">Total Media References</span>
                <p className="text-lg font-bold text-ink">{stats.catalogue.media}</p>
              </div>
              <div className="rounded-lg border border-border/70 p-3 bg-surface">
                <span className="text-caption text-ink-muted">Orphaned Media Rows</span>
                <p className="text-lg font-bold text-ink">{stats.catalogue.orphanedMedia}</p>
              </div>
            </div>
          </Card>

          {/* Section 4: Persistent Storage & Media Cloud Migration */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-h5 text-ink">4. Media Storage & Cloud Persistence</h2>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Ensures all product, category, brand, and promotional media are stored in permanent cloud storage so they survive server redeployments and restarts.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleScanDiagnostics()}
                  loading={scanningDiagnostics}
                  className="flex items-center gap-1.5"
                >
                  <Icon name="search" size={15} />
                  Scan Media Diagnostics
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleMigrateMedia()}
                  loading={migratingMedia}
                  className="flex items-center gap-1.5"
                >
                  <Icon name="upload" size={15} />
                  Migrate Local Media to Cloud
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    stats.storage?.persistent ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="text-body-sm font-semibold text-ink">
                  {stats.storage?.persistent
                    ? `Persistent Cloud Storage Active (${(stats.storage.provider || 'cloudinary').toUpperCase()})`
                    : 'Ephemeral Local Storage Active (Cloudinary credentials required for production persistence)'}
                </span>
              </div>

              <div className="rounded-lg border border-border bg-sand/20 p-4 text-body-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Storage Provider:</span>
                  <span className="font-semibold text-ink uppercase">{stats.storage?.provider || 'local'}</span>
                </div>
                {stats.storage?.cloudName && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Cloud Name:</span>
                    <span className="font-mono text-ink">{stats.storage.cloudName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-muted">Max Upload Size:</span>
                  <span className="text-ink">{stats.storage?.maxFileSizeMb || 50} MB per file</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Redeploy Persistence:</span>
                  <span className={stats.storage?.persistent ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                    {stats.storage?.persistent ? 'Guaranteed (Cloud Hosted)' : 'Ephemeral (Requires Cloudinary setup for permanent storage)'}
                  </span>
                </div>
                {stats.storage?.message && (
                  <div className="pt-2 border-t border-border/60 text-xs text-ink-muted">
                    {stats.storage.message}
                  </div>
                )}
              </div>

              {/* Diagnostic Scan Results */}
              {diagnosticsReport && (
                <div className="mt-4 space-y-4 rounded-lg border border-border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-body-sm font-semibold text-ink">Media Asset Diagnostics Scan</h3>
                    <span className="text-xs text-ink-muted">
                      Total References: <strong className="text-ink">{diagnosticsReport.totalMedia}</strong>
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
                      <span className="text-caption text-emerald-800 font-medium">Permanent Cloudinary</span>
                      <p className="text-lg font-bold text-emerald-900">{diagnosticsReport.permanentCloudinary}</p>
                    </div>
                    <div className="rounded-md border border-sky-200 bg-sky-50/60 p-3">
                      <span className="text-caption text-sky-800 font-medium">Static Assets</span>
                      <p className="text-lg font-bold text-sky-900">{diagnosticsReport.staticAssets}</p>
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                      <span className="text-caption text-amber-800 font-medium">Legacy Local Files</span>
                      <p className="text-lg font-bold text-amber-900">{diagnosticsReport.legacyLocal}</p>
                    </div>
                    <div className="rounded-md border border-rose-200 bg-rose-50/60 p-3">
                      <span className="text-caption text-rose-800 font-medium">Missing / Ephemeral</span>
                      <p className="text-lg font-bold text-rose-900">{diagnosticsReport.missingOrBroken}</p>
                    </div>
                  </div>

                  {diagnosticsReport.items.length > 0 && (
                    <div className="max-h-64 overflow-y-auto border border-border/80 rounded-md">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="bg-sand/40 sticky top-0 border-b border-border">
                          <tr>
                            <th className="px-3 py-2 font-semibold text-ink-muted">Table / Field</th>
                            <th className="px-3 py-2 font-semibold text-ink-muted">Status</th>
                            <th className="px-3 py-2 font-semibold text-ink-muted">URL / Path</th>
                            <th className="px-3 py-2 font-semibold text-ink-muted">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diagnosticsReport.items.map((item, idx) => (
                            <tr key={`${item.id}-${idx}`} className="border-b border-border/60 hover:bg-sand/10">
                              <td className="px-3 py-2 font-medium text-ink">
                                {item.table}.<span className="text-ink-muted">{item.field}</span>
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  tone={
                                    item.status === 'permanent_cloud'
                                      ? 'success'
                                      : item.status === 'static_asset'
                                        ? 'neutral'
                                        : item.status === 'legacy_local'
                                          ? 'warning'
                                          : 'error'
                                  }
                                >
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 font-mono text-[11px] text-ink-muted truncate max-w-xs" title={item.url}>
                                {item.url || '(empty)'}
                              </td>
                              <td className="px-3 py-2 text-ink-subtle">{item.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Section 5: NEXORA Synchronization Health */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-h5 text-ink">5. NEXORA Synchronization Health</h2>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Tests data pipelines between Shelina and NEXORA, updates key usage timestamps, and logs synchronization audits.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleNexoraSync()}
                loading={syncingNexora}
                className="flex items-center gap-1.5"
              >
                <Icon name="refresh" size={15} />
                Sync Now & Verify Health
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    stats.nexora.connected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="text-body-sm font-semibold text-ink">
                  {stats.nexora.connected ? 'NEXORA Integration Active' : 'No Active Key Configured'}
                </span>
              </div>

              {stats.nexora.activeKey && (
                <div className="rounded-lg border border-border bg-sand/20 p-4 text-body-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Key Name:</span>
                    <span className="font-semibold text-ink">{stats.nexora.activeKey.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Key Prefix:</span>
                    <span className="font-mono text-ink">{stats.nexora.activeKey.keyPrefix}…</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Permissions:</span>
                    <span className="text-ink">{stats.nexora.activeKey.permissions.join(', ')}</span>
                  </div>
                  {stats.nexora.activeKey.lastUsedAt && (
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Last Synchronized:</span>
                      <span className="text-ink">{formatDate(stats.nexora.activeKey.lastUsedAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Section 5: Audit Logs */}
          <Card className="p-6">
            <h2 className="text-h5 text-ink mb-4">Destructive Actions & Synchronization Audit Log</h2>
            {stats.recentAuditLogs.length === 0 ? (
              <EmptyState
                title="No destructive actions logged"
                description="Any manual order deletions, customer deletions, or orphan cleanups will be recorded here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-body-sm">
                  <thead>
                    <tr className="border-b border-border bg-sand/30">
                      <th className="px-4 py-2.5 text-caption font-semibold uppercase text-ink-muted">Action</th>
                      <th className="px-4 py-2.5 text-caption font-semibold uppercase text-ink-muted">Actor</th>
                      <th className="px-4 py-2.5 text-caption font-semibold uppercase text-ink-muted">Date</th>
                      <th className="px-4 py-2.5 text-caption font-semibold uppercase text-ink-muted">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentAuditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border last:border-0 hover:bg-sand/10">
                        <td className="px-4 py-3">
                          <span className="rounded bg-sand px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{log.actorType}</td>
                        <td className="px-4 py-3 text-ink-muted">{formatDate(log.createdAt)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted truncate max-w-xs">
                          {log.metadata ? JSON.stringify(log.metadata) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmOrderDeleteModal
        open={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleConfirmDeleteOrder}
        order={orderToDelete}
      />

      <ConfirmCustomerDeleteModal
        open={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDeleteCustomer}
        customer={customerToDelete}
      />

      <ConfirmBulkDeleteModal
        open={Boolean(bulkDeleteType)}
        onClose={() => setBulkDeleteType(null)}
        onConfirm={handleConfirmBulkCleanup}
        itemType={bulkDeleteType === 'cancelled-orders' ? 'orders' : 'customers'}
        count={
          bulkDeleteType === 'cancelled-orders'
            ? stats?.orders.cancelled ?? 0
            : stats?.customers.inactive ?? 0
        }
      />
    </AdminLayout>
  );
}
