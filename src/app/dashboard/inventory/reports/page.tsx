'use client'

import Link from 'next/link'
import { useProducts, useStockMovements } from '@/hooks/use-inventory-data'
import { movementsByType, stockValueByCategory, totalStockValue } from '@/lib/inventory/reports'
import { Loader2 } from 'lucide-react'

export default function InventoryReportsPage() {
  const { data: products = [], isLoading: pLoading } = useProducts()
  const { data: movements = [], isLoading: mLoading } = useStockMovements()

  if (pLoading || mLoading) {
    return <div className="flex justify-center py-16 text-text-secondary"><Loader2 className="animate-spin mr-2" size={18} /> Loading reports…</div>
  }

  const byCategory = stockValueByCategory(products)
  const byType = movementsByType(movements)
  const totalValue = totalStockValue(products)

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Inventory reports</h2>
          <p className="text-sm text-text-secondary mt-1">Stock valuation, movement breakdown, and category analysis</p>
        </div>
      </div>

      <div className="summary-row mb-8">
        <div className="summary-stat"><p className="stat-label summary-stat-label">Total stock value</p><p className="text-2xl font-semibold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Products</p><p className="text-2xl font-semibold">{products.length}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Movements tracked</p><p className="text-2xl font-semibold">{movements.length}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportPanel title="Stock value by category">
          {byCategory.length === 0 ? (
            <p className="text-sm text-text-secondary">No products to report.</p>
          ) : (
            byCategory.map((c) => (
              <ReportBar key={c.category} label={c.category} value={c.value} total={totalValue || 1} suffix={`${c.units} units`} />
            ))
          )}
        </ReportPanel>

        <ReportPanel title="Movements by type">
          {Object.keys(byType).length === 0 ? (
            <p className="text-sm text-text-secondary">No movements recorded yet.</p>
          ) : (
            Object.entries(byType).map(([type, count]) => (
              <ReportBar key={type} label={type.replace(/_/g, ' ')} value={count} total={movements.length || 1} />
            ))
          )}
          <Link href="/dashboard/inventory/movements" className="text-xs text-accent mt-3 inline-block hover:underline">View all movements →</Link>
        </ReportPanel>
      </div>
    </>
  )
}

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ai-card border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ReportBar({ label, value, total, suffix }: { label: string; value: number; total: number; suffix?: string }) {
  const pct = Math.round((value / Math.max(total, 1)) * 100)
  const display = typeof value === 'number' && value > 100 ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : value
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-secondary capitalize">{label}</span>
        <span className="text-text-primary font-medium">{display}{suffix ? ` · ${suffix}` : ''}</span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
