'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plug, RefreshCw, Unplug, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { useGhlIntegration } from '@/hooks/use-ghl-integration'
import { GHL_CORE_MODULES } from '@/lib/crm/constants'
import { GHL_AUTO_SYNC_INTERVAL_MS, invalidateCrmAfterGhlSync, runGhlSyncRequest } from '@/lib/ghl/sync-client'
import type { GhlIntegrationStatus } from '@/lib/types'
import { IntegrationLogo } from '@/components/integrations/integration-logo'

function formatWhen(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

const CONNECT_DRAFT_KEY = 'crm-ghl-connect-draft'

export function GhlIntegrationPanel() {
  const queryClient = useQueryClient()
  const { data: status, isPending } = useGhlIntegration()
  const [pitToken, setPitToken] = useState('')
  const [locationId, setLocationId] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CONNECT_DRAFT_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as { locationId?: string }
      if (parsed.locationId) setLocationId(parsed.locationId)
    } catch {
      // ignore invalid draft
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(CONNECT_DRAFT_KEY, JSON.stringify({ locationId }))
    } catch {
      // ignore storage errors
    }
  }, [locationId])

  const invalidateStatus = () => invalidateCrmAfterGhlSync(queryClient)

  const connect = useMutation({
    mutationFn: async () => {
      setConnectError(null)
      const res = await fetch('/api/crm/ghl/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitToken, locationId }),
      })
      const body = await res.json()
      if (!res.ok) {
        const msg = body.error ?? 'Connection failed'
        const source = body.source ? ` (${body.source})` : ''
        const fullMsg = `${msg}${source}`
        setConnectError(fullMsg)
        throw new Error(fullMsg)
      }
      return body as GhlIntegrationStatus & { warning?: string; syncResult?: unknown }
    },
    onSuccess: (result) => {
      setPitToken('')
      invalidateStatus()
      if (result.warning) toast.warning(result.warning)
      else toast.success('GoHighLevel connected and synced')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const sync = useMutation({
    mutationFn: runGhlSyncRequest,
    onSuccess: (result) => {
      invalidateStatus()
      if (result.warnings?.length) {
        toast.warning(`Synced with ${result.warnings.length} warning(s)`)
      } else {
        toast.success('Synced with GoHighLevel')
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/crm/ghl/disconnect', { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Disconnect failed')
      return body
    },
    onSuccess: () => {
      invalidateStatus()
      toast.success('GoHighLevel disconnected')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (isPending && status === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading integration status…
      </div>
    )
  }

  const connected = status?.connected ?? false

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
        <div className="flex items-start gap-4">
          <IntegrationLogo brand="ghl" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">GoHighLevel</h2>
            <p className="text-sm text-text-secondary mt-1">
              Connect your GHL sub-account with a Private Integration Token (PIT). Manage core CRM data here — contacts, opportunities, tasks, and pipelines — without opening GHL.
            </p>
          </div>
          {connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <CheckCircle2 size={14} /> Connected
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
              <dt className="text-text-tertiary">Sub-account</dt>
              <dd className="text-text-primary font-medium">{status.locationName ?? status.locationId}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Location ID</dt>
              <dd className="text-text-primary font-mono text-xs">{status.locationId}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Last sync</dt>
              <dd className="text-text-primary">{formatWhen(status.lastSyncAt)}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Sync status</dt>
              <dd className="text-text-primary capitalize">{status.lastSyncStatus}</dd>
            </div>
            {connected && (
              <div className="sm:col-span-2">
                <dt className="text-text-tertiary">Auto-sync</dt>
                <dd className="text-text-primary inline-flex items-center gap-2">
                  <RefreshCw size={14} className="text-accent" />
                  Every {GHL_AUTO_SYNC_INTERVAL_MS / 1000} seconds while you are in CRM (including on refresh)
                </dd>
              </div>
            )}
          </dl>
        )}

        {status?.lastSyncError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{status.lastSyncError}</span>
          </div>
        )}

        <PermissionGate module="crm" permission="manage">
          <div className="mt-6 flex flex-wrap gap-3">
            {connected ? (
              <>
                <button
                  type="button"
                  onClick={() => sync.mutate()}
                  disabled={sync.isPending}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {sync.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Sync now
                </button>
                <button
                  type="button"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary transition-colors"
                >
                  {disconnect.isPending ? <Loader2 size={16} className="animate-spin" /> : <Unplug size={16} />}
                  Disconnect
                </button>
              </>
            ) : null}
          </div>
        </PermissionGate>
      </div>

      {!connected && (
        <PermissionGate module="crm" permission="manage">
          <form
            className="rounded-xl border border-border-primary bg-bg-secondary p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              connect.mutate()
            }}
          >
            <h3 className="text-base font-semibold text-text-primary">Connect sub-account</h3>
            <p className="text-sm text-text-secondary">
              In GHL go to <strong className="text-text-primary">Settings → Integrations → Private Integrations</strong> (inside the sub-account). Create a token with <strong className="text-text-primary">contacts</strong> and <strong className="text-text-primary">opportunities</strong> scopes. Do not use the legacy API key from Business Profile — that will not work here.
            </p>
            <p className="text-sm text-text-secondary">
              Location ID is under <strong className="text-text-primary">Settings → Business Profile</strong> in the same sub-account.
            </p>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Private Integration Token</label>
              <input
                type="password"
                required
                value={pitToken}
                onChange={(e) => setPitToken(e.target.value)}
                placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="form-field font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Location ID (sub-account)</label>
              <input
                type="text"
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="GHL location / sub-account ID"
                className="form-field font-mono text-sm"
              />
            </div>
            <button type="submit" disabled={connect.isPending} className="form-submit inline-flex items-center justify-center gap-2">
              {connect.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
              {connect.isPending ? 'Connecting…' : 'Integrate with GoHighLevel'}
            </button>
            {connectError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{connectError}</span>
              </div>
            )}
          </form>
        </PermissionGate>
      )}

      <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
        <h3 className="text-base font-semibold text-text-primary mb-1">Core modules synced</h3>
        <p className="text-sm text-text-secondary mb-4">
          Rig Base mirrors these GHL features only — not the full GHL product suite.
        </p>
        <ul className="space-y-3">
          {GHL_CORE_MODULES.map((mod) => (
            <li key={mod.key} className="flex gap-3 text-sm">
              <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-text-primary">{mod.label}</p>
                <p className="text-text-secondary">{mod.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
