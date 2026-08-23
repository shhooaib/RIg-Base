'use client'

import { CheckCircle2, Clock } from 'lucide-react'
import { IntegrationLogo } from '@/components/integrations/integration-logo'
import { ZOHO_CORE_MODULES } from '@/lib/crm/constants'

export function ZohoIntegrationPanel() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border-primary bg-bg-secondary p-6 opacity-[0.98]">
        <div className="flex items-start gap-4">
          <IntegrationLogo brand="zoho" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">Zoho CRM</h2>
            <p className="text-sm text-text-secondary mt-1">
              Sync contacts, leads, deals, and accounts from Zoho CRM into Rig Base — unified reporting alongside finance, HR, and operations.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-tertiary px-3 py-1 text-xs font-medium text-text-tertiary shrink-0">
            <Clock size={14} />
            Coming soon
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-text-tertiary">Connection</dt>
            <dd className="text-text-secondary">OAuth 2.0 (planned)</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Sync direction</dt>
            <dd className="text-text-secondary">Bi-directional (planned)</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Data center</dt>
            <dd className="text-text-secondary">US · EU · IN · AU regions</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Status</dt>
            <dd className="text-text-secondary">Preview — not yet available</dd>
          </div>
        </dl>

        <div className="mt-6 rounded-lg border border-dashed border-border-secondary bg-bg-primary/40 px-4 py-3 text-sm text-text-secondary">
          Zoho CRM is listed for integration planning. For live CRM sync today, use{' '}
          <strong className="text-text-primary font-medium">GoHighLevel</strong> below.
        </div>
      </div>

      <div className="rounded-xl border border-border-primary bg-bg-secondary p-6">
        <h3 className="text-base font-semibold text-text-primary mb-1">Planned sync scope</h3>
        <p className="text-sm text-text-secondary mb-4">
          When enabled, Rig Base will mirror these Zoho CRM modules into your workspace.
        </p>
        <ul className="space-y-3">
          {ZOHO_CORE_MODULES.map((mod) => (
            <li key={mod.key} className="flex gap-3 text-sm">
              <CheckCircle2 size={16} className="text-text-tertiary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-text-primary">{mod.label}</p>
                <p className="text-text-secondary">{mod.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border-primary bg-bg-secondary p-6 space-y-4">
        <h3 className="text-base font-semibold text-text-primary">Connect Zoho CRM</h3>
        <p className="text-sm text-text-secondary">
          Enter your Zoho CRM organization details. Connection will be enabled in a future release.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60 pointer-events-none select-none" aria-hidden>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Data center</label>
            <input type="text" readOnly value="zoho.com (US)" className="form-field text-sm" tabIndex={-1} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Organization ID</label>
            <input type="text" readOnly placeholder="123456789" className="form-field font-mono text-sm" tabIndex={-1} />
          </div>
        </div>
        <button type="button" disabled className="form-submit opacity-50 cursor-not-allowed">
          Connect Zoho CRM (coming soon)
        </button>
      </div>
    </div>
  )
}
