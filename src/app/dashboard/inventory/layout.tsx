'use client'

import { ModuleAccessGuard } from '@/components/rbac/module-access-guard'
import { InventoryNav } from '@/components/inventory/inventory-nav'

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard module="inventory" label="Inventory">
      <div className="max-w-7xl mx-auto">
        <div className="page-header mb-0">
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">Products, stock levels, movements, valuation, and alerts</p>
          </div>
        </div>
        <InventoryNav />
        {children}
      </div>
    </ModuleAccessGuard>
  )
}
