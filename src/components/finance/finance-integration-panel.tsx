'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plug, RefreshCw, Unplug, CheckCircle2, AlertCircle, Copy, ShieldCheck, Info } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { useFinanceIntegration } from '@/hooks/use-finance-integration'
import { FINANCE_QUERY_KEYS } from '@/lib/finance/constants'
import { useWorkspaceStore } from '@/store/workspace'
import { formatWhen } from '@/components/finance/finance-status-badge'
import type { PaymentProviderStatus } from '@/lib/finance/types'
import { IntegrationLogo } from '@/components/integrations/integration-logo'
import { isCredentialErrorMessage } from '@/lib/payments/razorpay/errors'

function WebhookUrl({ path }: { path: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `${origin}${path}`

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="text-xs bg-bg-tertiary px-2 py-1 rounded font-mono break-all">{url}</code>
      <button
        type="button"
        className="text-text-secondary hover:text-text-primary"
        onClick={() => {
          navigator.clipboard.writeText(url)
          toast.success('Webhook URL copied')
        }}
        aria-label="Copy webhook URL"
      >
        <Copy size={14} />
      </button>
    </div>
  )
}

function ProviderCard({
  name,
  provider,
  status,
  connectFields,
  webhookPath,
}: {
  name: string
  provider: 'stripe' | 'razorpay'
  status?: PaymentProviderStatus
  connectFields: React.ReactNode
  webhookPath: string
}) {
  const queryClient = useQueryClient()
  const connected = status?.connected ?? false
  const credentialError =
    provider === 'razorpay' &&
    (isCredentialErrorMessage(status?.lastSyncError) ||
      (connected && status?.lastSyncStatus === 'error' && !!status?.lastSyncError))
  const healthy = connected && !credentialError && status?.lastSyncStatus !== 'error'

  const sync = useMutation({
    mutationFn: async () => {
      const endpoint =
        provider === 'razorpay' ? '/api/finance/razorpay/sync' : `/api/finance/${provider}/sync`
      const res = await fetch(endpoint, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Sync failed')
      return body
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.integrationStatus })
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.payments })
      toast.success(`Synced ${result.synced ?? 0} ${name} records`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const verify = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/finance/razorpay/verify', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Verification failed')
      return body as {
        verified: boolean
        verification?: {
          accountMode: string
          keyIdPreview: string
          paymentsOnAccount: number
          message: string
        }
        syncResult?: { synced: number }
        warning?: string
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.integrationStatus })
      const v = result.verification
      if (v) {
        toast.success(
          v.accountMode === 'test'
            ? `Test keys verified (${v.keyIdPreview}) — ${v.paymentsOnAccount} payment(s) on account`
            : `Live keys verified (${v.keyIdPreview})`
        )
      }
      if (result.syncResult) toast.info(`Synced ${result.syncResult.synced} payment(s)`)
      if (result.warning) toast.warning(result.warning)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/finance/${provider}/connect`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Disconnect failed')
      return body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.integrationStatus })
      toast.success(`${name} disconnected`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
      <div className="flex items-start gap-4">
        <IntegrationLogo brand={provider} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-text-primary">{name}</h2>
          <p className="text-sm text-text-secondary mt-1">
            Connect your {name} account with API keys. Secrets are stored server-side and never exposed to the browser after saving.
          </p>
        </div>
        {healthy ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <CheckCircle2 size={14} /> {provider === 'razorpay' && status?.accountMode === 'test' ? 'Test — verified' : 'Connected'}
          </span>
        ) : connected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
            <AlertCircle size={14} /> Connection error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-tertiary px-3 py-1 text-xs font-medium text-text-tertiary">
            Not connected
          </span>
        )}
      </div>

      {connected && status && (
        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-text-tertiary">Mode</dt>
            <dd className="text-text-primary capitalize">{status.accountMode ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Connected</dt>
            <dd className="text-text-primary">{formatWhen(status.connectedAt ?? null)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Last sync</dt>
            <dd className="text-text-primary">{formatWhen(status.lastSyncAt ?? null)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Sync status</dt>
            <dd className="text-text-primary capitalize">{status.lastSyncStatus ?? 'idle'}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Last webhook</dt>
            <dd className="text-text-primary">{formatWhen(status.lastWebhookAt ?? null)}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Webhook status</dt>
            <dd className="text-text-primary capitalize">{status.webhookStatus ?? 'unknown'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-text-tertiary">Webhook URL</dt>
            <dd>
              <WebhookUrl path={webhookPath} />
              <p className="text-xs text-text-tertiary mt-1">
                Add this URL in your {name} dashboard and paste the signing secret below when connecting.
              </p>
            </dd>
          </div>
        </dl>
      )}

      {connected && provider === 'razorpay' && status?.accountMode === 'test' && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-3 text-sm text-text-secondary">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="font-medium text-text-primary">Test mode — how to verify your connection</p>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-text-secondary">
              <li>Click <strong className="text-text-primary">Test connection</strong> — Rig Base calls Razorpay with your saved keys and confirms they work.</li>
              <li>In Razorpay Dashboard (Test Mode), create a test payment using the same Key ID.</li>
              <li>Click <strong className="text-text-primary">Sync now</strong> — the payment should appear under Finance → Payments.</li>
              <li>Optional: add the webhook URL in Razorpay → Account &amp; Settings → Webhooks for real-time updates.</li>
            </ol>
          </div>
        </div>
      )}

      {status?.lastSyncError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{credentialError ? 'Invalid API keys' : 'Sync error'}</p>
            <p className="mt-0.5">{status.lastSyncError}</p>
            {credentialError && provider === 'razorpay' && (
              <p className="mt-2 text-text-secondary">
                Disconnect, regenerate keys in Razorpay (Test Mode → API Keys), and connect again. Use Key ID and Key Secret as two separate fields.
              </p>
            )}
          </div>
        </div>
      )}

      {status?.webhookLastError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>Webhook: {status.webhookLastError}</span>
        </div>
      )}

      <PermissionGate module="finance" permission="manage">
        <div className="mt-6 flex flex-wrap gap-3">
          {connected ? (
            <>
              {provider === 'razorpay' && (
                <button
                  type="button"
                  onClick={() => verify.mutate()}
                  disabled={verify.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary"
                >
                  {verify.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Test connection
                </button>
              )}
              <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending} className="btn-primary inline-flex items-center gap-2">
                {sync.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Sync now
              </button>
              <button
                type="button"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary"
              >
                {disconnect.isPending ? <Loader2 size={16} className="animate-spin" /> : <Unplug size={16} />}
                Disconnect
              </button>
            </>
          ) : (
            connectFields
          )}
        </div>
      </PermissionGate>
    </div>
  )
}

export function FinanceIntegrationPanel() {
  const { workspace } = useWorkspaceStore()
  const { data: status, isPending } = useFinanceIntegration()
  const queryClient = useQueryClient()

  const connectStripe = useMutation({
    mutationFn: async (payload: { secretKey: string; publishableKey: string; webhookSecret: string }) => {
      const res = await fetch('/api/finance/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Connection failed')
      return body
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.integrationStatus })
      toast.success('Stripe connected')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const connectRazorpay = useMutation({
    mutationFn: async (payload: { keyId: string; keySecret: string; webhookSecret: string }) => {
      const res = await fetch('/api/finance/razorpay/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Connection failed')
      return body as {
        verified?: boolean
        verification?: { accountMode: string; keyIdPreview: string; paymentsOnAccount: number; message: string }
        syncResult?: { synced: number }
        warning?: string
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.integrationStatus })
      queryClient.invalidateQueries({ queryKey: FINANCE_QUERY_KEYS.payments })

      if (result.warning) {
        toast.warning(result.warning)
      }

      const v = result.verification
      if (result.verified && v) {
        toast.success(
          v.accountMode === 'test'
            ? `Razorpay test account verified (${v.keyIdPreview})`
            : `Razorpay live account verified (${v.keyIdPreview})`
        )
        if (result.syncResult != null) {
          toast.info(`Synced ${result.syncResult.synced} payment(s) from Razorpay`)
        }
        return
      }

      toast.success('Razorpay connected')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading integrations…
      </div>
    )
  }

  const wsId = workspace?.id ?? ''

  return (
    <div className="space-y-8 max-w-3xl">
      <ProviderCard
        name="Stripe"
        provider="stripe"
        status={status?.stripe}
        webhookPath={`/api/webhooks/stripe/${wsId}`}
        connectFields={
          <StripeConnectForm loading={connectStripe.isPending} onSubmit={(d) => connectStripe.mutate(d)} />
        }
      />
      <ProviderCard
        name="Razorpay"
        provider="razorpay"
        status={status?.razorpay}
        webhookPath={`/api/webhooks/razorpay/${wsId}`}
        connectFields={
          <RazorpayConnectForm loading={connectRazorpay.isPending} onSubmit={(d) => connectRazorpay.mutate(d)} />
        }
      />
    </div>
  )
}

function StripeConnectForm({
  loading,
  onSubmit,
}: {
  loading: boolean
  onSubmit: (data: { secretKey: string; publishableKey: string; webhookSecret: string }) => void
}) {
  const [secretKey, setSecretKey] = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  return (
    <form
      className="w-full space-y-3 mt-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ secretKey, publishableKey, webhookSecret })
      }}
    >
      <input type="password" required placeholder="Secret key (sk_test_… or sk_live_…)" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="form-field font-mono text-sm" autoComplete="off" />
      <input type="text" placeholder="Publishable key (pk_…)" value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} className="form-field font-mono text-sm" />
      <input type="password" placeholder="Webhook signing secret (whsec_…)" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="form-field font-mono text-sm" autoComplete="off" />
      <button type="submit" disabled={loading} className="form-submit inline-flex items-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
        Connect Stripe
      </button>
    </form>
  )
}

function RazorpayConnectForm({
  loading,
  onSubmit,
}: {
  loading: boolean
  onSubmit: (data: { keyId: string; keySecret: string; webhookSecret: string }) => void
}) {
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')

  return (
    <form
      className="w-full space-y-3 mt-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ keyId, keySecret, webhookSecret })
      }}
    >
      <div className="rounded-lg border border-border-primary bg-bg-tertiary/50 px-3 py-2 text-xs text-text-secondary space-y-1">
        <p className="font-medium text-text-primary">Test account setup</p>
        <p>1. Open Razorpay Dashboard and enable <strong>Test Mode</strong> (toggle top-left).</p>
        <p>2. Go to <strong>Account &amp; Settings → API Keys → Generate Key</strong>.</p>
        <p>3. Copy <strong>Key ID</strong> (starts with <code className="font-mono">rzp_test_</code>) and <strong>Key Secret</strong> (separate string — not the Key ID).</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Key ID</label>
        <input
          type="text"
          required
          placeholder="rzp_test_xxxxxxxx"
          value={keyId}
          onChange={(e) => setKeyId(e.target.value.trim())}
          className="form-field font-mono text-sm"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Key Secret</label>
        <input
          type="password"
          required
          placeholder="Secret from Razorpay (not the Key ID)"
          value={keySecret}
          onChange={(e) => setKeySecret(e.target.value)}
          className="form-field font-mono text-sm"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Webhook secret (optional)</label>
        <input
          type="password"
          placeholder="From Razorpay → Webhooks (optional for connect)"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          className="form-field font-mono text-sm"
          autoComplete="off"
        />
      </div>
      <button type="submit" disabled={loading} className="form-submit inline-flex items-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
        {loading ? 'Verifying keys…' : 'Connect & verify Razorpay'}
      </button>
    </form>
  )
}
