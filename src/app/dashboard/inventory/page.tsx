'use client'

import Link from 'next/link'
import { useInventoryDashboard, useProducts } from '@/hooks/use-inventory-data'
import { totalStockValue, lowStockProducts } from '@/lib/inventory/reports'
import { Loader2, Package, DollarSign, AlertTriangle, ArrowLeftRight, Plus } from 'lucide-react'
import { PermissionGate } from '@/components/rbac/permission-gate'

export default function InventoryOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useInventoryDashboard()
  const { data: products = [], isLoading: productsLoading } = useProducts()

  if (statsLoading || productsLoading || !stats) {
    return (
      <div className="flex justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading inventory overview…
      </div>
    )
  }

  const alerts = lowStockProducts(products).slice(0, 5)
  const stockValue = totalStockValue(products)

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Overview</h2>
          <p className="text-sm text-text-secondary mt-1">Stock snapshot, valuation, and recent activity</p>
        </div>
        <PermissionGate module="inventory" permission="create">
          <Link href="/dashboard/inventory/products" className="btn-primary">
            <Plus size={16} /> Manage products
          </Link>
        </PermissionGate>
      </div>

      <div className="summary-row mb-8">
        <StatCard icon={Package} label="Products" value={stats.products} href="/dashboard/inventory/products" />
        <StatCard icon={Package} label="Total units" value={stats.total_units} href="/dashboard/inventory/products" />
        <StatCard icon={DollarSign} label="Stock value" value={`$${stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} href="/dashboard/inventory/reports" />
        <StatCard icon={AlertTriangle} label="Low / out of stock" value={stats.low_stock + stats.out_of_stock} sub={`${stats.out_of_stock} out of stock`} href="/dashboard/inventory/alerts" />
        <StatCard icon={ArrowLeftRight} label="Movements today" value={stats.movements_today} href="/dashboard/inventory/movements" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Stock status">
          <Bar label="In stock" value={products.filter((p) => p.status === 'in_stock').length} total={products.length || 1} color="bg-success" />
          <Bar label="Low stock" value={stats.low_stock} total={products.length || 1} color="bg-warning" />
          <Bar label="Out of stock" value={stats.out_of_stock} total={products.length || 1} color="bg-danger" />
        </Panel>

        <Panel title="Low stock alerts">
          {alerts.length === 0 ? (
            <p className="text-sm text-text-secondary">All products are above reorder levels.</p>
          ) : (
            alerts.map((p) => (
              <Link key={p.id} href={`/dashboard/inventory/products/${p.id}`} className="flex justify-between text-sm py-1.5 hover:text-accent">
                <span>{p.name}</span>
                <span className={p.status === 'out_of_stock' ? 'text-danger' : 'text-warning'}>
                  {p.quantity} / reorder {p.reorder_level ?? p.min_stock_level}
                </span>
              </Link>
            ))
          )}
          <Link href="/dashboard/inventory/alerts" className="text-xs text-accent mt-3 inline-block hover:underline">View all alerts →</Link>
        </Panel>
      </div>
    </>
  )
}

function StatCard({ icon: Icon, label, value, sub, href }: { icon: typeof Package; label: string; value: number | string; sub?: string; href: string }) {
  return (
    <Link href={href} className="summary-stat hover:border-accent/40 transition-colors">
      <p className="stat-label summary-stat-label"><Icon size={12} /> {label}</p>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
    </Link>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ai-card border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.round((value / Math.max(total, 1)) * 100)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{value}</span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
