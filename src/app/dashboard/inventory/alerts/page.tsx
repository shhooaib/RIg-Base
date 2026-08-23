'use client'

import Link from 'next/link'
import { useProducts } from '@/hooks/use-inventory-data'
import { lowStockProducts } from '@/lib/inventory/reports'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { AlertTriangle } from 'lucide-react'
import type { InventoryProduct } from '@/lib/inventory/types'

export default function InventoryAlertsPage() {
  const { data: products = [] } = useProducts()
  const alerts = lowStockProducts(products)

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (item: InventoryProduct) => (
        <Link href={`/dashboard/inventory/products/${item.id}`} className="font-medium hover:text-accent">{item.name}</Link>
      ),
    },
    { key: 'sku', header: 'SKU', cellClass: 'table-cell-secondary' },
    {
      key: 'quantity',
      header: 'On hand',
      render: (item: InventoryProduct) => (
        <span className={item.quantity === 0 ? 'text-danger font-medium' : 'text-warning font-medium'}>{item.quantity}</span>
      ),
    },
    {
      key: 'reorder_level',
      header: 'Reorder level',
      render: (item: InventoryProduct) => item.reorder_level ?? item.min_stock_level,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: InventoryProduct) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
          item.status === 'out_of_stock' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
        }`}>
          {item.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'suggested',
      header: 'Suggested reorder',
      render: (item: InventoryProduct) => {
        const reorder = item.reorder_level ?? item.min_stock_level
        const suggested = Math.max(reorder * 2 - item.quantity, reorder)
        return <span className="text-text-secondary">{suggested} units</span>
      },
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Low stock alerts</h2>
          <p className="text-sm text-text-secondary mt-1">{alerts.length} product{alerts.length === 1 ? '' : 's'} at or below reorder level</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="ai-card border border-border-primary p-8 text-center">
          <AlertTriangle className="mx-auto text-success mb-3" size={32} />
          <p className="text-text-primary font-medium">All stock levels are healthy</p>
          <p className="text-sm text-text-secondary mt-1">No products are below their reorder thresholds.</p>
        </div>
      ) : (
        <FilterableDataTable columns={columns} data={alerts} searchPlaceholder="Search alerts…" searchKeys={['name', 'sku']} pageSize={10} rowKey={(item) => item.id} emptyFilteredMessage="No alerts match your search." />
      )}
    </>
  )
}
