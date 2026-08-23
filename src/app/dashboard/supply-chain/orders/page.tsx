'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { usePurchaseOrders, useSuppliers } from '@/hooks/use-supply-chain-data'
import { useProducts } from '@/hooks/use-inventory-data'
import { SUPPLY_CHAIN_QUERY_KEYS, PO_STATUSES, PO_STATUS_COLORS } from '@/lib/supply-chain/constants'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { RowActions, actionsColumn } from '@/components/ui/row-actions'
import { PurchaseOrderForm, type PurchaseOrderFormData } from '@/components/supply-chain/purchase-order-form'
import { ModuleImport } from '@/components/import/module-import'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { usePermissions } from '@/hooks/use-permissions'
import { matchesSearch } from '@/hooks/use-table-controls'
import { FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { PurchaseOrderDetail } from '@/lib/supply-chain/types'

async function savePurchaseOrder(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  data: PurchaseOrderFormData,
  existingId?: string
) {
  const poPayload = {
    supplier_id: data.supplier_id,
    order_number: data.order_number,
    total_amount: data.total_amount,
    expected_delivery: data.expected_delivery,
    order_date: data.order_date,
    status: data.status,
    notes: data.notes,
    items: [],
  }

  let poId = existingId

  if (existingId) {
    const { error } = await supabase.from('purchase_orders').update(poPayload).eq('id', existingId).eq('workspace_id', workspaceId)
    if (error) throw error
    await supabase.from('purchase_order_line_items').delete().eq('purchase_order_id', existingId)
  } else {
    const { data: inserted, error } = await supabase.from('purchase_orders').insert({ ...poPayload, workspace_id: workspaceId }).select('id').single()
    if (error) throw error
    poId = inserted.id
  }

  if (data.line_items.length && poId) {
    const { error: linesError } = await supabase.from('purchase_order_line_items').insert(
      data.line_items.map((l) => ({
        ...l,
        workspace_id: workspaceId,
        purchase_order_id: poId,
        quantity_received: 0,
      }))
    )
    if (linesError) throw linesError
  }

  return poId
}

export default function PurchaseOrdersPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<PurchaseOrderDetail | null>(null)
  const [deleting, setDeleting] = useState<PurchaseOrderDetail | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: orders = [] } = usePurchaseOrders()
  const { data: suppliers = [] } = useSuppliers()
  const { data: products = [] } = useProducts()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.purchaseOrders] })
    queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.dashboard] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const addPO = useMutation({
    mutationFn: (data: PurchaseOrderFormData) => savePurchaseOrder(supabase, workspace!.id, data),
    onSuccess: () => { invalidate(); setShowAdd(false); toast.success('Purchase order created') },
    onError: () => toast.error('Failed to create purchase order'),
  })

  const updatePO = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PurchaseOrderFormData }) => savePurchaseOrder(supabase, workspace!.id, data, id),
    onSuccess: () => { invalidate(); setEditing(null); toast.success('Purchase order updated') },
    onError: () => toast.error('Failed to update purchase order'),
  })

  const deletePO = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Purchase order deleted') },
    onError: () => toast.error('Failed to delete purchase order'),
  })

  const orderFilters = useMemo(
    () => [
      { id: 'status', label: 'Status', options: PO_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
      { id: 'supplier_id', label: 'Supplier', options: suppliers.map((s) => ({ value: s.id, label: s.name })) },
    ],
    [suppliers]
  )

  const filterOrders = useCallback(
    (order: PurchaseOrderDetail, ctx: { search: string; filters: Record<string, string> }) => {
      const supplierName = suppliers.find((s) => s.id === order.supplier_id)?.name ?? ''
      const haystack = [order.order_number, supplierName, order.status, order.order_date].join(' ')
      if (!matchesSearch(haystack, ctx.search)) return false
      if (ctx.filters.status !== 'all' && order.status !== ctx.filters.status) return false
      if (ctx.filters.supplier_id !== 'all' && order.supplier_id !== ctx.filters.supplier_id) return false
      return true
    },
    [suppliers]
  )

  const columns = [
    {
      key: 'order_number',
      header: 'Order #',
      render: (item: PurchaseOrderDetail) => (
        <Link href={`/dashboard/supply-chain/orders/${item.id}`} className="font-medium hover:text-accent">{item.order_number}</Link>
      ),
    },
    {
      key: 'supplier_id',
      header: 'Supplier',
      cellClass: 'table-cell-secondary',
      render: (item: PurchaseOrderDetail) => suppliers.find((s) => s.id === item.supplier_id)?.name || '—',
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
      key: 'total_amount',
      header: 'Total',
      render: (item: PurchaseOrderDetail) => `$${Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'received_amount',
      header: 'Received',
      render: (item: PurchaseOrderDetail) => `$${Number(item.received_amount ?? 0).toFixed(2)}`,
    },
    { key: 'order_date', header: 'Order date', cellClass: 'table-cell-date' },
    actionsColumn<PurchaseOrderDetail>((item) =>
      can('supply_chain', 'edit') || can('supply_chain', 'delete') ? (
        <RowActions
          onEdit={can('supply_chain', 'edit') ? () => setEditing(item) : undefined}
          onDelete={can('supply_chain', 'delete') ? () => setDeleting(item) : undefined}
          editLabel={`Edit ${item.order_number}`}
          deleteLabel={`Delete ${item.order_number}`}
        />
      ) : null
    ),
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Purchase orders</h2>
          <p className="text-sm text-text-secondary mt-1">Create, approve, and track procurement lifecycle</p>
        </div>
        <div className="page-header-actions">
          <PermissionGate module="supply_chain" permission="import">
            <ModuleImport module="supply_chain" entity="purchase_orders" label="Import orders" />
          </PermissionGate>
          <PermissionGate module="supply_chain" permission="create">
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary" disabled={suppliers.length === 0}>
              <Plus size={16} /> New order
            </button>
          </PermissionGate>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={FileText} title="No purchase orders yet" description="Create a purchase order with line items to start procurement." action={suppliers.length > 0 ? { label: 'Create first order', onClick: () => setShowAdd(true) } : undefined} />
      ) : (
        <FilterableDataTable columns={columns} data={orders} searchPlaceholder="Search orders…" filters={orderFilters} customFilter={filterOrders} pageSize={10} rowKey={(item) => item.id} emptyFilteredMessage="No orders match your filters." />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Purchase Order">
        <PurchaseOrderForm suppliers={suppliers} products={products} onSubmit={(data) => addPO.mutate(data)} loading={addPO.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Purchase Order">
        {editing && (
          <PurchaseOrderForm key={editing.id} initial={editing} suppliers={suppliers} products={products} onSubmit={(data) => updatePO.mutate({ id: editing.id, data })} loading={updatePO.isPending} submitLabel="Save changes" />
        )}
      </Modal>
      <ConfirmDeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deletePO.mutate(deleting.id)} title="Delete purchase order" description="This will permanently remove the order." entityName={deleting?.order_number} loading={deletePO.isPending} />
    </>
  )
}
