'use client'

import { FinanceIntegrationPanel } from '@/components/finance/finance-integration-panel'

export default function FinanceIntegrationsPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Integrations & Sync</h2>
          <p className="text-sm text-text-secondary mt-1">
            Connect Stripe or Razorpay, configure webhooks, and monitor sync status and errors.
          </p>
        </div>
      </div>
      <FinanceIntegrationPanel />
    </>
  )
}
