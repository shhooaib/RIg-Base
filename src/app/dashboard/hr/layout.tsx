'use client'

import { ModuleAccessGuard } from '@/components/rbac/module-access-guard'
import { HrNav } from '@/components/hr/hr-nav'

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard module="hr" label="HR">
      <div className="max-w-7xl mx-auto">
        <div className="page-header mb-0">
          <div>
            <h1 className="page-title">Human Resources</h1>
            <p className="page-subtitle">Employees, org structure, attendance, leave, and access management</p>
          </div>
        </div>
        <HrNav />
        {children}
      </div>
    </ModuleAccessGuard>
  )
}
