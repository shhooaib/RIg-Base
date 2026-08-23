'use client'

import { ModuleAccessGuard } from '@/components/rbac/module-access-guard'
import { FinanceNav } from '@/components/finance/finance-nav'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard module="finance" label="Finance">
      <div className="max-w-7xl mx-auto">
        <div className="page-header mb-0">
          <div>
            <h1 className="page-title">Finance</h1>
            <p className="page-subtitle">Invoices, payments, expenses, cash flow, and gateway integrations</p>
          </div>
        </div>
        <FinanceNav />
        {children}
      </div>
    </ModuleAccessGuard>
  )
}
