'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useProducts } from '@/hooks/use-inventory-data'
import { INVENTORY_QUERY_KEYS } from '@/lib/inventory/constants'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { RowActions, actionsColumn } from '@/components/ui/row-actions'
import { ProductForm } from '@/components/inventory/product-form'
import { ModuleImport } from '@/components/import/module-import'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { usePermissions } from '@/hooks/use-permissions'
import { Package, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { InventoryProduct } from '@/lib/inventory/types'

export default function InventoryProductsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<InventoryProduct | null>(null)
  const [deleting, setDeleting] = useState<InventoryProduct | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: products = [] } = useProducts()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.products] })
    queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEYS.dashboard] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const addProduct = useMutation({
    mutationFn: async (product: Partial<InventoryProduct>) => {
      const { error } = await supabase.from('products').insert({ ...product, workspace_id: workspace?.id })
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setShowAdd(false); toast.success('Product added') },
    onError: () => toast.error('Failed to add product'),
  })

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...product }: Partial<InventoryProduct> & { id: string }) => {
      const { error } = await supabase.from('products').update(product).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.success('Product updated') },
    onError: () => toast.error('Failed to update product'),
  })

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Product deleted') },
    onError: () => toast.error('Failed to delete product'),
  })

  const filters = useMemo(() => {
    const categories = workspace?.product_categories?.length
      ? workspace.product_categories
      : [...new Set(products.map((p) => p.category))]
    return [
      { id: 'category', label: 'Category', options: categories.map((c) => ({ value: c, label: c })) },
      { id: 'status', label: 'Status', options: [
        { value: 'in_stock', label: 'In stock' },
        { value: 'low_stock', label: 'Low stock' },
        { value: 'out_of_stock', label: 'Out of stock' },
      ]},
    ]
  }, [workspace?.product_categories, products])

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (item: InventoryProduct) => (
        <Link href={`/dashboard/inventory/products/${item.id}`} className="font-medium hover:text-accent">{item.name}</Link>
      ),
    },
    { key: 'sku', header: 'SKU', cellClass: 'table-cell-secondary' },
    { key: 'category', header: 'Category', cellClass: 'table-cell-secondary' },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (item: InventoryProduct) => {
        const reorder = item.reorder_level ?? item.min_stock_level
        return (
          <span className={`table-cell-amount ${item.quantity <= reorder ? 'text-danger' : 'text-text-primary'}`}>
            {item.quantity} {item.unit ?? 'ea'}
          </span>
        )
      },
    },
    {
      key: 'cost_price',
      header: 'Value',
      render: (item: InventoryProduct) => (
        <span className="table-cell-amount text-text-primary">
          ${(item.quantity * Number(item.cost_price)).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: InventoryProduct) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
          item.status === 'in_stock' ? 'bg-success/10 text-success' :
          item.status === 'low_stock' ? 'bg-warning/10 text-warning' :
          'bg-danger/10 text-danger'
        }`}>
          {item.status.replace('_', ' ')}
        </span>
      ),
    },
    actionsColumn<InventoryProduct>((item) =>
      can('inventory', 'edit') || can('inventory', 'delete') ? (
        <RowActions
          onEdit={can('inventory', 'edit') ? () => setEditing(item) : undefined}
          onDelete={can('inventory', 'delete') ? () => setDeleting(item) : undefined}
          editLabel={`Edit ${item.name}`}
          deleteLabel={`Delete ${item.name}`}
        />
      ) : null
    ),
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Products</h2>
          <p className="text-sm text-text-secondary mt-1">Catalog, pricing, reorder levels, and stock on hand</p>
        </div>
        <div className="page-header-actions">
          <PermissionGate module="inventory" permission="import">
            <ModuleImport module="inventory" entity="products" />
          </PermissionGate>
          <PermissionGate module="inventory" permission="create">
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add product
            </button>
          </PermissionGate>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="Add your first product to start tracking inventory." action={{ label: 'Add first product', onClick: () => setShowAdd(true) }} />
      ) : (
        <FilterableDataTable columns={columns} data={products} searchPlaceholder="Search by name or SKU…" searchKeys={['name', 'sku', 'category']} filters={filters} pageSize={10} rowKey={(item) => item.id} emptyFilteredMessage="No products match your filters." />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Product">
        <ProductForm categories={workspace?.product_categories || []} onSubmit={(data) => addProduct.mutate(data)} loading={addProduct.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Product">
        {editing && (
          <ProductForm key={editing.id} initial={editing} categories={workspace?.product_categories || []} onSubmit={(data) => updateProduct.mutate({ id: editing.id, ...data })} loading={updateProduct.isPending} submitLabel="Save changes" allowQuantityEdit={false} />
        )}
      </Modal>
      <ConfirmDeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteProduct.mutate(deleting.id)} title="Delete product" description="This will permanently remove the product." entityName={deleting?.name} loading={deleteProduct.isPending} />
    </>
  )
}
