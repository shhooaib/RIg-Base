'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { usePermissions } from '@/hooks/use-permissions'
import { useCrmEmployees, useCrmPipeline } from '@/hooks/use-crm-data'
import { useCrmOwnerFilters } from '@/hooks/use-crm-owner-filters'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { RowActions, actionsColumn } from '@/components/ui/row-actions'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { CustomerForm } from '@/components/crm/customer-form'
import { LeadForm } from '@/components/crm/lead-form'
import { DealForm } from '@/components/crm/deal-form'
import { employeeName } from '@/components/crm/employee-select'
import { ModuleImport } from '@/components/import/module-import'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import { matchesOwnerFilter } from '@/lib/crm/list-utils'
import type { Customer, Lead } from '@/lib/types'
import { logCrmInteraction } from '@/lib/crm/interactions'
import { pushCrmEntityToGhl } from '@/lib/crm/ghl-push-client'
import { UserCircle, Plus, Kanban, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function CrmCustomersPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [promoteLead, setPromoteLead] = useState<Customer | null>(null)
  const [promoteDeal, setPromoteDeal] = useState<Customer | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: employees = [] } = useCrmEmployees()
  const { data: stages = [] } = useCrmPipeline()
  const { ownerFilter } = useCrmOwnerFilters()

  const { data: leads = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.leads,
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').eq('workspace_id', workspace?.id)
      return (data ?? []) as Lead[]
    },
    enabled: !!workspace?.id,
  })

  const { data: customers = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.customers,
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('workspace_id', workspace?.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as Customer[]
    },
    enabled: !!workspace?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.customers })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
  }

  const addCustomer = useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, workspace_id: workspace?.id })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: (id) => {
      invalidate()
      setShowAdd(false)
      toast.success('Customer added')
      void pushCrmEntityToGhl('customer', id)
    },
    onError: () => toast.error('Failed to add customer'),
  })

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase.from('customers').update({ ...customer, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      invalidate()
      setEditing(null)
      toast.success('Customer updated')
      void pushCrmEntityToGhl('customer', id)
    },
    onError: () => toast.error('Failed to update customer'),
  })

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Customer deleted') },
    onError: () => toast.error('Failed to delete customer'),
  })

  const addLeadFromCustomer = useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('leads').insert({ ...lead, workspace_id: workspace?.id }).select('id').single()
      if (error) throw error
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: 'lead_created',
        title: `Lead created from customer: ${lead.name}`,
        leadId: data.id,
        customerId: promoteLead?.id ?? null,
        createdBy: userData.user?.id,
      })
      return data.id as string
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leads })
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
      setPromoteLead(null)
      toast.success('Lead created from customer')
      void pushCrmEntityToGhl('lead', leadId)
    },
    onError: () => toast.error('Failed to create lead'),
  })

  const addDealFromCustomer = useMutation({
    mutationFn: async (deal: Partial<import('@/lib/types').Deal>) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('deals').insert({ ...deal, workspace_id: workspace?.id }).select('id, name, customer_id').single()
      if (error) throw error
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: 'deal_created',
        title: `Deal created: ${data.name}`,
        customerId: data.customer_id,
        dealId: data.id,
        createdBy: userData.user?.id,
      })
      return data.id as string
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.deals })
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
      setPromoteDeal(null)
      toast.success('Deal created from customer')
      void pushCrmEntityToGhl('deal', dealId)
    },
    onError: () => toast.error('Failed to create deal'),
  })

  const crmFilters = useMemo(
    () => [
      {
        id: 'status',
        label: 'Status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'lead', label: 'Lead' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
      ownerFilter,
    ],
    [ownerFilter]
  )

  const customFilter = useMemo(
    () => (item: Customer, ctx: { filters: Record<string, string> }) => {
      const owner = ctx.filters.assigned_to ?? 'all'
      if (!matchesOwnerFilter(item.assigned_to, owner)) return false
      const status = ctx.filters.status ?? 'all'
      if (status !== 'all' && item.status !== status) return false
      return true
    },
    []
  )

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item: Customer) => (
        <Link href={`/dashboard/crm/customers/${item.id}`} className="text-text-primary hover:text-accent font-medium">
          {item.name}
        </Link>
      ),
    },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'company', header: 'Company', sortable: true, render: (item: Customer) => item.company || '—' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item: Customer) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
          item.status === 'active' ? 'bg-success/10 text-success' :
          item.status === 'lead' ? 'bg-accent/10 text-accent' :
          'bg-bg-tertiary text-text-tertiary'
        }`}>{item.status}</span>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Owner',
      sortable: true,
      sortValue: (item: Customer) => employeeName(employees, item.assigned_to),
      render: (item: Customer) => employeeName(employees, item.assigned_to),
    },
    {
      key: 'total_spent',
      header: 'Total Spent',
      sortable: true,
      sortValue: (item: Customer) => Number(item.total_spent),
      render: (item: Customer) => (
        <span className="table-cell-amount">${Number(item.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      ),
    },
    actionsColumn<Customer>((item) => (
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {can('crm', 'create') && (
          <>
            <button type="button" onClick={() => setPromoteLead(item)} className="px-2 py-1 text-[11px] text-accent hover:bg-accent/10 rounded inline-flex items-center gap-1" title="Create lead from customer">
              <UserPlus size={12} /> Lead
            </button>
            <button type="button" onClick={() => setPromoteDeal(item)} className="px-2 py-1 text-[11px] text-accent hover:bg-accent/10 rounded inline-flex items-center gap-1" title="Create deal from customer">
              <Kanban size={12} /> Deal
            </button>
          </>
        )}
        <RowActions
          onEdit={can('crm', 'edit') ? () => setEditing(item) : undefined}
          onDelete={can('crm', 'delete') ? () => setDeleting(item) : undefined}
          editLabel={`Edit ${item.name}`}
          deleteLabel={`Delete ${item.name}`}
        />
      </div>
    )),
  ]

  return (
    <>
      <div className="page-header">
        <div />
        <div className="page-header-actions">
          <PermissionGate module="crm" permission="import">
            <ModuleImport module="crm" entity="customers" />
          </PermissionGate>
          <PermissionGate module="crm" permission="create">
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add Customer
            </button>
          </PermissionGate>
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState icon={UserCircle} title="No customers yet" description="Add your first customer to start tracking relationships and revenue." action={{ label: 'Add first customer', onClick: () => setShowAdd(true) }} />
      ) : (
        <FilterableDataTable columns={columns} data={customers} searchPlaceholder="Search customers…" searchKeys={['name', 'email', 'company', 'phone', 'source']} filters={crmFilters} customFilter={customFilter} pageSize={10} rowKey={(item) => item.id} emptyFilteredMessage="No customers match your filters." />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Customer">
        <CustomerForm employees={employees} onSubmit={(d) => addCustomer.mutate(d)} loading={addCustomer.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Customer">
        {editing && <CustomerForm key={editing.id} initial={editing} employees={employees} onSubmit={(d) => updateCustomer.mutate({ id: editing.id, ...d })} loading={updateCustomer.isPending} submitLabel="Save changes" />}
      </Modal>
      <ConfirmDeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteCustomer.mutate(deleting.id)} title="Delete customer" description="This will permanently remove the customer record." entityName={deleting?.name} loading={deleteCustomer.isPending} />

      <Modal open={!!promoteLead} onClose={() => setPromoteLead(null)} title="Create lead from customer">
        {promoteLead && (
          <LeadForm
            key={promoteLead.id}
            customers={customers}
            employees={employees}
            initialFromCustomer={promoteLead}
            onSubmit={(d) => addLeadFromCustomer.mutate(d)}
            loading={addLeadFromCustomer.isPending}
            submitLabel="Create lead"
          />
        )}
      </Modal>

      <Modal open={!!promoteDeal} onClose={() => setPromoteDeal(null)} title="Create deal from customer">
        {promoteDeal && (
          <DealForm
            key={promoteDeal.id}
            customers={customers}
            leads={leads}
            employees={employees}
            stages={stages}
            initialFromCustomer={promoteDeal}
            onSubmit={(d) => addDealFromCustomer.mutate(d)}
            loading={addDealFromCustomer.isPending}
            submitLabel="Create deal"
          />
        )}
      </Modal>
    </>
  )
}
