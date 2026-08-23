'use client'

import Link from 'next/link'
import { usePurchaseOrders } from '@/hooks/use-supply-chain-data'
import { PO_STATUS_COLORS } from '@/lib/supply-chain/constants'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { PackageCheck } from 'lucide-react'
import type { PurchaseOrderDetail } from '@/lib/supply-chain/types'

export default function ReceivingPage() {
  const { data: orders = [] } = usePurchaseOrders()
  const receivable = orders.filter((o) => ['approved', 'shipped', 'partially_delivered'].includes(o.status))

  const columns = [
    {
      key: 'order_number',
      header: 'Order #',
      render: (item: PurchaseOrderDetail) => (
        <Link href={`/dashboard/supply-chain/orders/${item.id}`} className="font-medium hover:text-accent">{item.order_number}</Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PurchaseOrderDetail) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${PO_STATUS_COLORS[item.status] ?? ''}`}>
          {item.status.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Received / Total',
      render: (item: PurchaseOrderDetail) => (
        <span>${Number(item.received_amount ?? 0).toFixed(2)} / ${Number(item.total_amount).toFixed(2)}</span>
      ),
    },
    {
      key: 'lines',
      header: 'Line progress',
      render: (item: PurchaseOrderDetail) => {
        const total = item.items.reduce((s, l) => s + Number(l.quantity_ordered), 0)
        const received = item.items.reduce((s, l) => s + Number(l.quantity_received), 0)
        return `${received} / ${total} units`
      },
    },
    { key: 'expected_delivery', header: 'Expected', cellClass: 'table-cell-date' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Goods receiving</h2>
          <p className="text-sm text-text-secondary mt-1">Partial and full deliveries — updates inventory on receipt</p>
        </div>
      </div>

      {receivable.length === 0 ? (
        <div className="ai-card border border-border-primary p-8 text-center">
          <PackageCheck className="mx-auto text-text-tertiary mb-3" size={32} />
          <p className="text-text-primary font-medium">No orders awaiting receipt</p>
          <p className="text-sm text-text-secondary mt-1">Approve a purchase order first, then receive goods here or from the order detail page.</p>
          <Link href="/dashboard/supply-chain/orders" className="text-sm text-accent mt-3 inline-block hover:underline">View purchase orders →</Link>
        </div>
      ) : (
        <FilterableDataTable columns={columns} data={receivable} searchPlaceholder="Search orders…" searchKeys={['order_number']} pageSize={10} rowKey={(item) => item.id} emptyFilteredMessage="No orders match your search." />
      )}
    </>
  )
}
