'use client'

import { GhlIntegrationPanel } from '@/components/crm/ghl-integration-panel'
import { ZohoIntegrationPanel } from '@/components/crm/zoho-integration-panel'

export default function CrmIntegrationsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Connect external CRM platforms and manage contacts, deals, and pipeline data from Rig Base.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10 items-start max-w-6xl">
        <section aria-labelledby="ghl-integration-heading">
          <h2 id="ghl-integration-heading" className="sr-only">
            GoHighLevel
          </h2>
          <GhlIntegrationPanel />
        </section>
        <section aria-labelledby="zoho-integration-heading">
          <h2 id="zoho-integration-heading" className="sr-only">
            Zoho CRM
          </h2>
          <ZohoIntegrationPanel />
        </section>
      </div>
    </>
  )
}
