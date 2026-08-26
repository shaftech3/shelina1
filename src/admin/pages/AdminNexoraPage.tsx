import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Icon,
  Spinner,
  useToast,
} from '@/components/ui';
import { useSeo } from '@/hooks';
import {
  nexoraService,
  type NexoraAuditLog,
  type NexoraIntegrationData,
  type NexoraTestResult,
} from '@/services';
import { AdminLayout } from '../components/AdminLayout';
import { FormSection } from '../components/FormSection';

export function AdminNexoraPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NexoraIntegrationData | null>(null);

  // Modal states
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<NexoraTestResult | null>(null);

  // Dialogs
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useSeo({ title: 'NEXORA Integration', path: '/admin/integrations/nexora', noIndex: true });

  const apiBaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/nexora/v1`
    : 'https://shelina1.onrender.com/api/nexora/v1';

  const loadData = useCallback(async () => {
    try {
      const res = await nexoraService.getIntegrationData();
      setData(res);
    } catch (err) {
      notify({
        title: 'Failed to load NEXORA integration',
        description: err instanceof Error ? err.message : 'Please check your connection.',
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerateKey() {
    setGenerating(true);
    try {
      const res = await nexoraService.generateKey();
      setOneTimeSecret(res.secretKey);
      await loadData();
      notify({
        title: 'NEXORA API Key Generated',
        description: 'Copy and store your secret key securely.',
        tone: 'success',
      });
    } catch (err) {
      notify({
        title: 'Failed to generate key',
        description: err instanceof Error ? err.message : 'Error generating key',
        tone: 'error',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevokeKey() {
    if (!data?.activeKey) return;
    setRevoking(true);
    try {
      await nexoraService.revokeKey(data.activeKey.id);
      setShowRevokeDialog(false);
      await loadData();
      notify({
        title: 'API Key Revoked',
        description: 'NEXORA access has been terminated.',
        tone: 'success',
      });
    } catch (err) {
      notify({
        title: 'Failed to revoke key',
        description: err instanceof Error ? err.message : 'Error revoking key',
        tone: 'error',
      });
    } finally {
      setRevoking(false);
    }
  }

  async function handleRegenerateKey() {
    if (!data?.activeKey) return;
    setGenerating(true);
    try {
      const res = await nexoraService.regenerateKey(data.activeKey.id);
      setShowRegenerateDialog(false);
      setOneTimeSecret(res.secretKey);
      await loadData();
      notify({
        title: 'Replacement Key Generated',
        description: 'Previous key invalidated. Copy your new secret key.',
        tone: 'success',
      });
    } catch (err) {
      notify({
        title: 'Failed to regenerate key',
        description: err instanceof Error ? err.message : 'Error regenerating key',
        tone: 'error',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await nexoraService.testConnection();
      const safeResult: NexoraTestResult = res && typeof res === 'object' ? res : {
        success: false,
        connected: false,
        message: 'Invalid response from connection test',
      };
      setTestResult(safeResult);
      if (safeResult.connected) {
        notify({
          title: 'Connection Successful',
          description: 'NEXORA integration test completed successfully.',
          tone: 'success',
        });
      } else {
        notify({
          title: 'Connection Test Inactive',
          description: safeResult.message || 'NEXORA connection is not active.',
          tone: 'warning',
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error connecting to API';
      setTestResult({
        success: false,
        connected: false,
        message: errorMsg,
      });
      notify({
        title: 'Connection Test Failed',
        description: errorMsg,
        tone: 'error',
      });
    } finally {
      setTesting(false);
    }
  }

  function copyToClipboard(text: string, isKey = false) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (isKey) {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2500);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2500);
      }
      notify({
        title: 'Copied to clipboard',
        tone: 'neutral',
      });
    }
  }

  const activeKey = data?.activeKey;
  const isConnected = Boolean(activeKey && activeKey.status === 'ACTIVE');

  return (
    <AdminLayout
      title="NEXORA Integration"
      description="Connect Shelina to NEXORA securely through API key authentication. Synchronize products, orders, customers, and inventory in real-time."
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner />
          <p className="mt-3 text-body-sm text-ink-muted">Loading integration settings...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-5xl">
          {/* Status & Connection Overview Banner */}
          <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-surface shadow-sm">
                  <Icon name="link" size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif text-heading-md font-semibold text-ink">NEXORA Custom REST API</h2>
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-caption font-medium text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected & Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-caption font-medium text-amber-700 border border-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-body-sm text-ink-muted">
                    Server-to-server data exchange for product catalog, live inventory, customer profiles, and order sync.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleTestConnection}
                      loading={testing}
                      iconLeft={<Icon name="refresh" size={16} />}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRevokeDialog(true)}
                      className="text-error-deep hover:bg-error-soft hover:text-error-deep"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateKey}
                    loading={generating}
                    iconLeft={<Icon name="plus" size={16} />}
                  >
                    Connect NEXORA
                  </Button>
                )}
              </div>
            </div>

            {/* Test Result Toast/Banner if triggered */}
            {testResult && (
              <div
                className={`mt-4 rounded-md border p-4 text-body-sm transition-all ${
                  testResult.connected
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    : 'border-amber-200 bg-amber-50/70 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Icon name={testResult.connected ? 'check' : 'alert'} size={18} />
                  <span>{testResult.message}</span>
                </div>
                {testResult.stats && (
                  <div className="mt-2 flex flex-wrap gap-4 text-caption text-ink-muted">
                    <span>Products available: <strong className="text-ink">{testResult.stats.products}</strong></span>
                    <span>Orders available: <strong className="text-ink">{testResult.stats.orders}</strong></span>
                    <span>Customers available: <strong className="text-ink">{testResult.stats.customers}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Server-to-Server Endpoint Details */}
          <FormSection
            title="API Endpoint & Authentication"
            description="NEXORA communicates with your store via secure REST endpoints with Bearer token authorization."
          >
            <div className="space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-ink mb-1.5">
                  NEXORA Base API URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-border bg-cream/40 px-3.5 py-2.5 font-mono text-body-sm text-ink selection:bg-primary-soft">
                    {apiBaseUrl}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => copyToClipboard(apiBaseUrl, false)}
                    iconLeft={<Icon name="check" size={16} />}
                  >
                    {copiedUrl ? 'Copied' : 'Copy URL'}
                  </Button>
                </div>
                <p className="mt-1.5 text-caption text-ink-subtle">
                  Paste this URL into NEXORA's <strong>Custom Website / REST API</strong> integration settings.
                </p>
              </div>

              <div className="rounded-editorial border border-border bg-surface p-4 text-body-sm text-ink">
                <p className="font-medium text-ink">Authorization Header Format:</p>
                <div className="mt-1.5 rounded bg-ink px-3 py-2 font-mono text-caption text-surface">
                  Authorization: Bearer nex_live_xxxxxxxxxxxxxxxxxxxxxxxx
                </div>
              </div>
            </div>
          </FormSection>

          {/* Active API Key Management */}
          <FormSection
            title="API Key Credentials"
            description="Manage authentication keys. Keys are hashed with SHA-256 in the database for maximum security."
          >
            {activeKey ? (
              <div className="rounded-editorial border border-border bg-surface p-5 space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon name="key" size={18} className="text-primary-deep" />
                      <span className="font-medium text-ink">{activeKey.name}</span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-caption font-medium text-emerald-700">
                        {activeKey.status}
                      </span>
                    </div>
                    <div className="mt-1.5 font-mono text-body-sm text-ink-muted">
                      {activeKey.keyPrefix}••••••••••••••••••••••••••••••••
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowRegenerateDialog(true)}
                      iconLeft={<Icon name="refresh" size={16} />}
                    >
                      Regenerate Key
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRevokeDialog(true)}
                      className="text-error-deep hover:bg-error-soft hover:text-error-deep"
                    >
                      Revoke Key
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 text-caption text-ink-muted">
                  <div>
                    <span className="block text-ink-subtle">Created:</span>
                    <strong className="text-ink font-medium">
                      {new Date(activeKey.createdAt).toLocaleDateString()} at {new Date(activeKey.createdAt).toLocaleTimeString()}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-ink-subtle">Last Active:</span>
                    <strong className="text-ink font-medium">
                      {activeKey.lastUsedAt
                        ? `${new Date(activeKey.lastUsedAt).toLocaleDateString()} at ${new Date(activeKey.lastUsedAt).toLocaleTimeString()}`
                        : 'Never used yet'}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-ink-subtle">Access Policy:</span>
                    <strong className="text-emerald-700 font-medium">Strictly Read-Only</strong>
                  </div>
                </div>

                <div>
                  <span className="block text-caption font-medium text-ink-subtle mb-2">
                    Authorized Permissions:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeKey.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center gap-1.5 rounded-md bg-cream px-2.5 py-1 text-caption font-mono text-ink"
                      >
                        <Icon name="check" size={12} className="text-emerald-600" />
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-editorial border border-dashed border-border bg-cream/30 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-ink-muted mb-3">
                  <Icon name="key" size={24} />
                </div>
                <h3 className="font-serif text-body-lg font-semibold text-ink">No Active API Key</h3>
                <p className="mt-1 max-w-md text-body-sm text-ink-muted">
                  Generate an API key to allow NEXORA to securely sync products, customers, orders, and inventory without exposing database credentials.
                </p>
                <div className="mt-5">
                  <Button
                    variant="primary"
                    onClick={handleGenerateKey}
                    loading={generating}
                    iconLeft={<Icon name="plus" size={16} />}
                  >
                    Generate NEXORA API Key
                  </Button>
                </div>
              </div>
            )}
          </FormSection>

          {/* Audit Logs & Security History */}
          <FormSection
            title="Integration Audit Trail"
            description="Immutable log of all API key creation, rotation, revocation, and authentication events."
          >
            {data?.auditLogs && data.auditLogs.length > 0 ? (
              <div className="overflow-hidden rounded-editorial border border-border bg-surface">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-body-sm">
                    <thead className="border-b border-border bg-cream/50 text-caption font-medium text-ink-muted">
                      <tr>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Actor / Source</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.auditLogs.map((log: NexoraAuditLog) => (
                        <tr key={log.id} className="hover:bg-cream/20">
                          <td className="px-4 py-3 font-mono text-caption text-ink font-medium">
                            <span
                              className={`inline-block px-2 py-0.5 rounded ${
                                log.action.includes('REVOKED')
                                  ? 'bg-red-50 text-red-700'
                                  : log.action.includes('CREATED') || log.action.includes('REGENERATED')
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-cream text-ink-muted'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-caption text-ink-muted">
                            {log.actorType} ({log.actorId || 'system'})
                          </td>
                          <td className="px-4 py-3 font-mono text-caption text-ink-subtle">
                            {log.ipAddress || '—'}
                          </td>
                          <td className="px-4 py-3 text-caption text-ink-muted">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-editorial border border-border bg-cream/20 p-4 text-body-sm text-ink-muted text-center">
                No audit events recorded yet.
              </div>
            )}
          </FormSection>

          {/* Setup Guide & Documentation */}
          <FormSection
            title="NEXORA REST API Documentation"
            description="Available resource endpoints and payload schemas for the custom adapter."
          >
            <div className="grid gap-3">
              <div className="rounded-editorial border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-caption font-semibold text-primary-deep">
                    <span className="rounded bg-primary-soft px-2 py-0.5">GET</span>
                    <span>/api/nexora/v1/test</span>
                  </div>
                  <span className="text-caption text-ink-subtle">Connectivity & Health Check</span>
                </div>
                <p className="mt-1 text-caption text-ink-muted">
                  Used by NEXORA to confirm connection validity and list granted capability scopes.
                </p>
              </div>

              <div className="rounded-editorial border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-caption font-semibold text-primary-deep">
                    <span className="rounded bg-primary-soft px-2 py-0.5">GET</span>
                    <span>/api/nexora/v1/products</span>
                  </div>
                  <span className="text-caption text-ink-subtle">Catalog Sync</span>
                </div>
                <p className="mt-1 text-caption text-ink-muted">
                  Lists products with pricing, stock status, images, categories, and brands. Supports <code className="font-mono bg-cream px-1 rounded">?updatedSince=ISO_DATE</code> and pagination.
                </p>
              </div>

              <div className="rounded-editorial border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-caption font-semibold text-primary-deep">
                    <span className="rounded bg-primary-soft px-2 py-0.5">GET</span>
                    <span>/api/nexora/v1/orders</span>
                  </div>
                  <span className="text-caption text-ink-subtle">Orders & Fulfillment</span>
                </div>
                <p className="mt-1 text-caption text-ink-muted">
                  Fetches orders, COD shipping amounts, customer addresses, and line item breakdowns.
                </p>
              </div>

              <div className="rounded-editorial border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-caption font-semibold text-primary-deep">
                    <span className="rounded bg-primary-soft px-2 py-0.5">GET</span>
                    <span>/api/nexora/v1/inventory</span>
                  </div>
                  <span className="text-caption text-ink-subtle">Live Inventory Levels</span>
                </div>
                <p className="mt-1 text-caption text-ink-muted">
                  Returns exact stock quantities, availability statuses, and reorder alerts.
                </p>
              </div>
            </div>
          </FormSection>
        </div>
      )}

      {/* ─────────────────────────── One-Time Secret Key Modal ─────────────────────────── */}
      {oneTimeSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-surface p-6 shadow-2xl border border-border">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Icon name="check" size={20} />
              </div>
              <div>
                <h3 className="font-serif text-heading-sm font-semibold text-ink">NEXORA API Key Generated</h3>
                <p className="text-caption text-ink-muted">Save your secret key now.</p>
              </div>
            </div>

            <div className="mt-4 rounded-editorial border border-amber-200 bg-amber-50/80 p-4 text-body-sm text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <Icon name="alert" size={18} />
                <span>Important Security Notice</span>
              </div>
              <p className="mt-1 text-caption">
                This secret API key will <strong>ONLY be displayed once</strong>. For your security, the complete key is hashed and cannot be retrieved later. Copy it now and save it in a secure location.
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-caption font-medium text-ink-subtle mb-1">
                Your Secret API Key:
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-border bg-ink px-3.5 py-3 font-mono text-body-sm text-emerald-400 select-all overflow-x-auto">
                  {oneTimeSecret}
                </div>
                <Button
                  variant="primary"
                  onClick={() => copyToClipboard(oneTimeSecret, true)}
                  iconLeft={<Icon name="check" size={16} />}
                >
                  {copiedKey ? 'Copied!' : 'Copy Key'}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setOneTimeSecret(null)}
              >
                I Have Saved This Key
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── Revoke Confirmation Dialog ─────────────────────────── */}
      {showRevokeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-border">
            <div className="flex items-center gap-3 text-error-deep">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-soft">
                <Icon name="alert" size={20} />
              </div>
              <div>
                <h3 className="font-serif text-heading-sm font-semibold text-ink">Revoke NEXORA Access?</h3>
                <p className="text-caption text-ink-muted">Immediate access termination</p>
              </div>
            </div>

            <p className="mt-4 text-body-sm text-ink-muted">
              Are you sure you want to revoke this API key? NEXORA will immediately lose access to your store catalog, customer data, orders, and inventory.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowRevokeDialog(false)}
                disabled={revoking}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRevokeKey}
                loading={revoking}
                className="bg-error-deep hover:bg-error-deep/90 text-white"
              >
                Revoke Key Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────── Regenerate Confirmation Dialog ─────────────────────────── */}
      {showRegenerateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-border">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Icon name="refresh" size={20} />
              </div>
              <div>
                <h3 className="font-serif text-heading-sm font-semibold text-ink">Regenerate API Key?</h3>
                <p className="text-caption text-ink-muted">Current key will be replaced</p>
              </div>
            </div>

            <p className="mt-4 text-body-sm text-ink-muted">
              Generating a replacement key will <strong>immediately invalidate</strong> the current key. You will need to update your NEXORA integration with the new key.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowRegenerateDialog(false)}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRegenerateKey}
                loading={generating}
              >
                Regenerate Key
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
