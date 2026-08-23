'use client'

import { ModuleAccessGuard } from '@/components/rbac/module-access-guard'
import { SupplyChainNav } from '@/components/supply-chain/supply-chain-nav'

export default function SupplyChainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard module="supply_chain" label="Supply Chain">
      <div className="max-w-7xl mx-auto">
        <div className="page-header mb-0">
          <div>
            <h1 className="page-title">Supply Chain</h1>
            <p className="page-subtitle">Suppliers, purchase orders, goods receiving, and procurement analytics</p>
          </div>
        </div>
        <SupplyChainNav />
        {children}
      </div>
    </ModuleAccessGuard>
  )
}
