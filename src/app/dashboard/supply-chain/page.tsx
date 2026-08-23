'use client'

import Link from 'next/link'
import { useSupplyChainDashboard, usePurchaseOrders, useSuppliers } from '@/hooks/use-supply-chain-data'
import { computeSupplierPerformance, pendingOrdersValue } from '@/lib/supply-chain/reports'
import { isDelayedOrder } from '@/lib/supply-chain/reports'
import { Loader2, Building2, FileText, Clock, DollarSign, PackageCheck } from 'lucide-react'
import { PermissionGate } from '@/components/rbac/permission-gate'

export default function SupplyChainOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useSupplyChainDashboard()
  const { data: orders = [], isLoading: ordersLoading } = usePurchaseOrders()
  const { data: suppliers = [] } = useSuppliers()

  if (statsLoading || ordersLoading || !stats) {
    return (
      <div className="flex justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading supply chain overview…
      </div>
    )
  }

  const delayed = orders.filter(isDelayedOrder).slice(0, 5)
  const pendingValue = pendingOrdersValue(orders)
  const topSuppliers = computeSupplierPerformance(suppliers, orders).slice(0, 3)

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Overview</h2>
          <p className="text-sm text-text-secondary mt-1">Procurement pipeline, spend, and supplier health</p>
        </div>
        <PermissionGate module="supply_chain" permission="create">
          <Link href="/dashboard/supply-chain/orders" className="btn-primary">
            <FileText size={16} /> Manage orders
          </Link>
        </PermissionGate>
      </div>

      <div className="summary-row mb-8">
        <StatCard icon={Building2} label="Suppliers" value={stats.suppliers} sub={`${stats.active_suppliers} active`} href="/dashboard/supply-chain/suppliers" />
        <StatCard icon={FileText} label="Open orders" value={stats.open_orders} sub={`${stats.pending_orders} pending approval`} href="/dashboard/supply-chain/orders" />
        <StatCard icon={Clock} label="Delayed" value={stats.delayed_orders} href="/dashboard/supply-chain/reports" />
        <StatCard icon={DollarSign} label="Total spend" value={`$${Number(stats.total_spend).toLocaleString()}`} href="/dashboard/supply-chain/reports" />
        <StatCard icon={PackageCheck} label="Received value" value={`$${Number(stats.received_value).toLocaleString()}`} href="/dashboard/supply-chain/receiving" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Pending procurement">
          <p className="text-2xl font-semibold text-text-primary">${pendingValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-sm text-text-secondary">Outstanding value on open purchase orders</p>
          <Link href="/dashboard/supply-chain/orders" className="text-xs text-accent mt-3 inline-block hover:underline">View orders →</Link>
        </Panel>

        <Panel title="Delayed deliveries">
          {delayed.length === 0 ? (
            <p className="text-sm text-text-secondary">No delayed orders right now.</p>
          ) : (
            delayed.map((o) => (
              <Link key={o.id} href={`/dashboard/supply-chain/orders/${o.id}`} className="flex justify-between text-sm py-1.5 hover:text-accent">
                <span>{o.order_number}</span>
                <span className="text-danger">Due {o.expected_delivery}</span>
              </Link>
            ))
          )}
        </Panel>

        <Panel title="Top suppliers by spend">
          {topSuppliers.length === 0 ? (
            <p className="text-sm text-text-secondary">No supplier activity yet.</p>
          ) : (
            topSuppliers.map((s) => (
              <Link key={s.supplier_id} href={`/dashboard/supply-chain/suppliers/${s.supplier_id}`} className="flex justify-between text-sm py-1.5 hover:text-accent">
                <span>{s.supplier_name}</span>
                <span>${s.total_spend.toLocaleString()} · {s.order_count} orders</span>
              </Link>
            ))
          )}
        </Panel>
      </div>
    </>
  )
}

function StatCard({ icon: Icon, label, value, sub, href }: { icon: typeof Building2; label: string; value: number | string; sub?: string; href: string }) {
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
    <div className="ai-card border border-border-primary p-5 md:col-span-1">
      <h3 className="font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
