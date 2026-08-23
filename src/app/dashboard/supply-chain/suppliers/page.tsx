'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useSuppliers } from '@/hooks/use-supply-chain-data'
import { SUPPLY_CHAIN_QUERY_KEYS } from '@/lib/supply-chain/constants'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { RowActions, actionsColumn } from '@/components/ui/row-actions'
import { SupplierForm } from '@/components/supply-chain/supplier-form'
import { ModuleImport } from '@/components/import/module-import'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { usePermissions } from '@/hooks/use-permissions'
import { Truck, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { SupplyChainSupplier } from '@/lib/supply-chain/types'

export default function SuppliersPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<SupplyChainSupplier | null>(null)
  const [deleting, setDeleting] = useState<SupplyChainSupplier | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: suppliers = [] } = useSuppliers()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [SUPPLY_CHAIN_QUERY_KEYS.suppliers] })

  const addSupplier = useMutation({
    mutationFn: async (supplier: Partial<SupplyChainSupplier>) => {
      const { error } = await supabase.from('suppliers').insert({ ...supplier, workspace_id: workspace?.id })
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setShowAdd(false); toast.success('Supplier added') },
    onError: () => toast.error('Failed to add supplier'),
  })

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...supplier }: Partial<SupplyChainSupplier> & { id: string }) => {
      const { error } = await supabase.from('suppliers').update(supplier).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.success('Supplier updated') },
    onError: () => toast.error('Failed to update supplier'),
  })

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Supplier deleted') },
    onError: () => toast.error('Failed to delete supplier'),
  })

  const columns = [
    {
      key: 'name',
      header: 'Company',
      render: (item: SupplyChainSupplier) => (
        <Link href={`/dashboard/supply-chain/suppliers/${item.id}`} className="font-medium hover:text-accent">{item.name}</Link>
      ),
    },
    { key: 'contact_person', header: 'Contact', cellClass: 'table-cell-secondary' },
    { key: 'email', header: 'Email', cellClass: 'table-cell-secondary' },
    { key: 'payment_terms', header: 'Terms', cellClass: 'table-cell-secondary', render: (item: SupplyChainSupplier) => item.payment_terms ?? '—' },
    {
      key: 'rating',
      header: 'Rating',
      render: (item: SupplyChainSupplier) => item.rating != null ? `${item.rating}/5` : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SupplyChainSupplier) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
          item.status === 'active' ? 'bg-success/10 text-success' : 'bg-bg-tertiary text-text-tertiary'
        }`}>{item.status}</span>
      ),
    },
    actionsColumn<SupplyChainSupplier>((item) =>
      can('supply_chain', 'edit') || can('supply_chain', 'delete') ? (
        <RowActions
          onEdit={can('supply_chain', 'edit') ? () => setEditing(item) : undefined}
          onDelete={can('supply_chain', 'delete') ? () => setDeleting(item) : undefined}
          editLabel={`Edit ${item.name}`}
          deleteLabel={`Delete ${item.name}`}
        />
      ) : null
    ),
  ]

  const filters = useMemo(() => [{ id: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] }], [])

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Suppliers</h2>
          <p className="text-sm text-text-secondary mt-1">Vendor profiles, terms, and performance tracking</p>
        </div>
        <div className="page-header-actions">
          <PermissionGate module="supply_chain" permission="import">
            <ModuleImport module="supply_chain" entity="suppliers" />
          </PermissionGate>
          <PermissionGate module="supply_chain" permission="create">
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add supplier</button>
          </PermissionGate>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="No suppliers yet" description="Add suppliers to manage procurement." action={{ label: 'Add first supplier', onClick: () => setShowAdd(true) }} />
      ) : (
        <FilterableDataTable columns={columns} data={suppliers} searchPlaceholder="Search suppliers…" searchKeys={['name', 'contact_person', 'email', 'phone']} filters={filters} pageSize={10} rowKey={(item) => item.id} emptyFilteredMessage="No suppliers match your filters." />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier"><SupplierForm onSubmit={(data) => addSupplier.mutate(data)} loading={addSupplier.isPending} /></Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Supplier">
        {editing && <SupplierForm key={editing.id} initial={editing} onSubmit={(data) => updateSupplier.mutate({ id: editing.id, ...data })} loading={updateSupplier.isPending} submitLabel="Save changes" />}
      </Modal>
      <ConfirmDeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteSupplier.mutate(deleting.id)} title="Delete supplier" description="This will permanently remove the supplier." entityName={deleting?.name} loading={deleteSupplier.isPending} />
    </>
  )
}
