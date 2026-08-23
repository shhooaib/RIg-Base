'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { LeadForm } from '@/components/crm/lead-form'
import { LeadLifecycleBoard } from '@/components/crm/lead-lifecycle-board'
import { ConvertLeadModal } from '@/components/crm/convert-lead-modal'
import { employeeName } from '@/components/crm/employee-select'
import { CRM_QUERY_KEYS, LEAD_STATUS_LABELS, LEAD_STATUSES } from '@/lib/crm/constants'
import { convertLead } from '@/lib/crm/convert-lead'
import { matchesOwnerFilter } from '@/lib/crm/list-utils'
import { logCrmInteraction } from '@/lib/crm/interactions'
import { pushCrmEntityToGhl } from '@/lib/crm/ghl-push-client'
import type { Customer, Lead } from '@/lib/types'
import { LayoutGrid, List, Plus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function CrmLeadsPage() {
  const [view, setView] = useState<'list' | 'board'>('board')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [deleting, setDeleting] = useState<Lead | null>(null)
  const [converting, setConverting] = useState<Lead | null>(null)
  const [seedCustomer, setSeedCustomer] = useState<Customer | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: employees = [] } = useCrmEmployees()
  const { data: stages = [] } = useCrmPipeline()
  const { ownerFilter } = useCrmOwnerFilters()

  const { data: leads = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.leads,
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').eq('workspace_id', workspace?.id).order('created_at', { ascending: false })
      return (data ?? []) as Lead[]
    },
    enabled: !!workspace?.id,
  })

  const { data: customers = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.customers,
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('workspace_id', workspace?.id).order('name')
      return (data ?? []) as Customer[]
    },
    enabled: !!workspace?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leads })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.customers })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.deals })
  }

  const addLead = useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('leads').insert({ ...lead, workspace_id: workspace?.id }).select('id').single()
      if (error) throw error
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: 'lead_created',
        title: `Lead created: ${lead.name}`,
        leadId: data.id,
        customerId: seedCustomer?.id ?? null,
        createdBy: userData.user?.id,
      })
      return data.id as string
    },
    onSuccess: (leadId) => {
      invalidate()
      setShowAdd(false)
      setSeedCustomer(null)
      toast.success('Lead added')
      void pushCrmEntityToGhl('lead', leadId)
    },
    onError: () => toast.error('Failed to add lead'),
  })

  const updateLead = useMutation({
    mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: string }) => {
      const { error } = await supabase.from('leads').update({ ...lead, updated_at: new Date().toISOString() }).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => {
      invalidate()
      setEditing(null)
      toast.success('Lead updated')
      void pushCrmEntityToGhl('lead', id)
    },
    onError: () => toast.error('Failed to update lead'),
  })

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Lead deleted') },
    onError: () => toast.error('Failed to delete lead'),
  })

  const convert = useMutation({
    mutationFn: async ({ lead, options }: { lead: Lead; options: { createDeal: boolean; stageId?: string; dealName?: string; dealValue?: number } }) => {
      const { data: userData } = await supabase.auth.getUser()
      return convertLead(supabase, {
        lead,
        workspaceId: workspace!.id,
        userId: userData.user!.id,
        createDeal: options.createDeal,
        stageId: options.stageId,
        dealName: options.dealName,
        dealValue: options.dealValue,
      })
    },
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return }
      invalidate()
      setConverting(null)
      toast.success('Lead converted')
      router.push(`/dashboard/crm/customers/${result.customerId}`)
    },
    onError: () => toast.error('Failed to convert lead'),
  })

  const filters = useMemo(
    () => [
      { id: 'status', label: 'Stage', options: LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] })) },
      ownerFilter,
    ],
    [ownerFilter]
  )

  const customFilter = useMemo(
    () => (item: Lead, ctx: { search: string; filters: Record<string, string> }) => {
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
      render: (l: Lead) => (
        <Link href={`/dashboard/crm/leads/${l.id}`} className="text-text-primary hover:text-accent font-medium" onClick={(e) => e.stopPropagation()}>
          {l.name}
        </Link>
      ),
    },
    { key: 'company', header: 'Company', sortable: true, render: (l: Lead) => l.company || '—' },
    {
      key: 'status',
      header: 'Stage',
      sortable: true,
      render: (l: Lead) => (
        <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent">{LEAD_STATUS_LABELS[l.status]}</span>
      ),
    },
    { key: 'lead_score', header: 'Score', sortable: true, sortValue: (l: Lead) => l.lead_score },
    {
      key: 'estimated_value',
      header: 'Est. value',
      sortable: true,
      sortValue: (l: Lead) => Number(l.estimated_value),
      render: (l: Lead) => `$${Number(l.estimated_value).toLocaleString()}`,
    },
    {
      key: 'assigned_to',
      header: 'Owner',
      sortable: true,
      sortValue: (l: Lead) => employeeName(employees, l.assigned_to),
      render: (l: Lead) => employeeName(employees, l.assigned_to),
    },
    actionsColumn<Lead>((item) => (
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {can('crm', 'edit') && !item.converted_customer_id && (
          <button type="button" onClick={() => setConverting(item)} className="px-2 py-1 text-[11px] text-accent hover:bg-accent/10 rounded" title="Convert lead">
            Convert
          </button>
        )}
        <RowActions
          onEdit={can('crm', 'edit') ? () => setEditing(item) : undefined}
          onDelete={can('crm', 'delete') && !item.converted_customer_id ? () => setDeleting(item) : undefined}
          editLabel={`Edit ${item.name}`}
          deleteLabel={`Delete ${item.name}`}
        />
      </div>
    )),
  ]

  return (
    <>
      <div className="page-header">
        <div className="inline-flex rounded-lg border border-border-primary p-0.5">
          <button type="button" onClick={() => setView('board')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${view === 'board' ? 'bg-accent/10 text-accent' : 'text-text-secondary'}`}>
            <LayoutGrid size={14} /> Pipeline
          </button>
          <button type="button" onClick={() => setView('list')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${view === 'list' ? 'bg-accent/10 text-accent' : 'text-text-secondary'}`}>
            <List size={14} /> List
          </button>
        </div>
        <PermissionGate module="crm" permission="create">
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add Lead
          </button>
        </PermissionGate>
      </div>

      {leads.length === 0 ? (
        <EmptyState icon={UserPlus} title="No leads yet" description="Add leads manually or import details from an existing customer." action={{ label: 'Add first lead', onClick: () => setShowAdd(true) }} />
      ) : view === 'board' ? (
        <LeadLifecycleBoard
          leads={leads}
          canEdit={can('crm', 'edit')}
          onLeadClick={(l) => router.push(`/dashboard/crm/leads/${l.id}`)}
          onStatusChange={(lead, status) => updateLead.mutate({ id: lead.id, status })}
        />
      ) : (
        <FilterableDataTable
          columns={columns}
          data={leads}
          searchPlaceholder="Search leads…"
          searchKeys={['name', 'email', 'company', 'source', 'phone']}
          filters={filters}
          customFilter={customFilter}
          pageSize={12}
          rowKey={(l) => l.id}
          onRowClick={(l) => router.push(`/dashboard/crm/leads/${l.id}`)}
          emptyFilteredMessage="No leads match your filters."
        />
      )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setSeedCustomer(null) }} title="Add Lead">
        <LeadForm customers={customers} employees={employees} initialFromCustomer={seedCustomer ?? undefined} onSubmit={(d) => addLead.mutate(d)} loading={addLead.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Lead">
        {editing && <LeadForm key={editing.id} initial={editing} employees={employees} onSubmit={(d) => updateLead.mutate({ id: editing.id, ...d })} loading={updateLead.isPending} submitLabel="Save changes" />}
      </Modal>
      <ConfirmDeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteLead.mutate(deleting.id)} title="Delete lead" description="This will permanently remove the lead." entityName={deleting?.name} loading={deleteLead.isPending} />
      <ConvertLeadModal
        lead={converting}
        stages={stages}
        open={!!converting}
        onClose={() => setConverting(null)}
        onConfirm={(opts) => converting && convert.mutate({ lead: converting, options: opts })}
        loading={convert.isPending}
      />
    </>
  )
}
