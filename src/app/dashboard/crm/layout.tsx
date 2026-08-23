'use client'

import { ModuleAccessGuard } from '@/components/rbac/module-access-guard'
import { CrmNav } from '@/components/crm/crm-nav'
import { GhlAutoSync } from '@/components/crm/ghl-auto-sync'

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard module="crm" label="CRM">
      <GhlAutoSync />
      <div className="max-w-7xl mx-auto">
        <div className="page-header mb-0">
          <div>
            <h1 className="page-title">CRM</h1>
            <p className="page-subtitle">Manage leads, customers, deals, and relationships</p>
          </div>
        </div>
        <CrmNav />
        {children}
      </div>
    </ModuleAccessGuard>
  )
}
