'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { usePermissions } from '@/hooks/use-permissions'
import { useCrmEmployees } from '@/hooks/use-crm-data'
import { useCrmOwnerFilters } from '@/hooks/use-crm-owner-filters'
import { Modal } from '@/components/ui/modal'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { RowActions, actionsColumn } from '@/components/ui/row-actions'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { ActivityForm } from '@/components/crm/activity-form'
import { employeeName } from '@/components/crm/employee-select'
import {
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
  CRM_QUERY_KEYS,
} from '@/lib/crm/constants'
import { logCrmInteraction, touchCustomerInteraction, touchLeadContact } from '@/lib/crm/interactions'
import { matchesOwnerFilter } from '@/lib/crm/list-utils'
import { pushCrmEntityToGhl } from '@/lib/crm/ghl-push-client'
import type { CrmActivity, Customer, Deal, Lead } from '@/lib/types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function CrmActivitiesPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<CrmActivity | null>(null)
  const [deleting, setDeleting] = useState<CrmActivity | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: employees = [] } = useCrmEmployees()
  const { ownerFilter } = useCrmOwnerFilters()

  const { data: activities = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.activities,
    queryFn: async () => {
      const { data } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('workspace_id', workspace?.id)
        .order('due_at', { ascending: true, nullsFirst: false })
      return (data ?? []) as CrmActivity[]
    },
    enabled: !!workspace?.id,
  })

  const { data: customers = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.customers,
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').eq('workspace_id', workspace?.id)
      return (data ?? []) as Pick<Customer, 'id' | 'name'>[]
    },
    enabled: !!workspace?.id,
  })

  const { data: leads = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.leads,
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('id, name').eq('workspace_id', workspace?.id)
      return (data ?? []) as Pick<Lead, 'id' | 'name'>[]
    },
    enabled: !!workspace?.id,
  })

  const { data: deals = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.deals,
    queryFn: async () => {
      const { data } = await supabase.from('deals').select('id, name').eq('workspace_id', workspace?.id)
      return (data ?? []) as Pick<Deal, 'id' | 'name'>[]
    },
    enabled: !!workspace?.id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.activities })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
  }

  const completeActivity = useMutation({
    mutationFn: async (activity: CrmActivity) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('crm_activities')
        .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', activity.id)
      if (error) throw error

      const eventType =
        activity.type === 'call' ? 'call_logged' :
        activity.type === 'meeting' ? 'meeting_completed' :
        activity.type === 'email' ? 'email_logged' :
        activity.type === 'follow_up' ? 'follow_up_scheduled' :
        'task_completed'

      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType,
        title: `${ACTIVITY_TYPE_LABELS[activity.type]} completed: ${activity.title}`,
        customerId: activity.customer_id,
        leadId: activity.lead_id,
        dealId: activity.deal_id,
        activityId: activity.id,
        createdBy: userData.user?.id,
      })

      if (activity.customer_id) await touchCustomerInteraction(supabase, activity.customer_id, workspace!.id)
      if (activity.lead_id) await touchLeadContact(supabase, activity.lead_id, workspace!.id)
      return activity.id
    },
    onSuccess: (activityId) => {
      invalidate()
      toast.success('Activity completed')
      void pushCrmEntityToGhl('activity', activityId)
    },
    onError: () => toast.error('Failed to complete activity'),
  })

  const saveActivity = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CrmActivity> & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from('crm_activities').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
        return id
      }
      const { data, error } = await supabase.from('crm_activities').insert({ ...payload, workspace_id: workspace?.id }).select('id').single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: (id) => {
      invalidate()
      setShowAdd(false)
      setEditing(null)
      toast.success('Activity saved')
      void pushCrmEntityToGhl('activity', id)
    },
    onError: () => toast.error('Failed to save activity'),
  })

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_activities').delete().eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Activity deleted') },
    onError: () => toast.error('Failed to delete activity'),
  })

  const filters = useMemo(
    () => [
      { id: 'status', label: 'Status', options: ACTIVITY_STATUSES.map((s) => ({ value: s, label: s })) },
      { id: 'type', label: 'Type', options: ACTIVITY_TYPES.map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] })) },
      { id: 'priority', label: 'Priority', options: ACTIVITY_PRIORITIES.map((p) => ({ value: p, label: p })) },
      ownerFilter,
    ],
    [ownerFilter]
  )

  const customFilter = useMemo(
    () => (item: CrmActivity, ctx: { filters: Record<string, string> }) => {
      if (!matchesOwnerFilter(item.assigned_to, ctx.filters.assigned_to ?? 'all')) return false
      for (const key of ['status', 'type', 'priority'] as const) {
        const selected = ctx.filters[key] ?? 'all'
        if (selected !== 'all' && item[key] !== selected) return false
      }
      return true
    },
    []
  )

  const columns = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'type', header: 'Type', sortable: true, render: (a: CrmActivity) => ACTIVITY_TYPE_LABELS[a.type] },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'priority', header: 'Priority', sortable: true },
    {
      key: 'due_at',
      header: 'Due',
      sortable: true,
      sortValue: (a: CrmActivity) => a.due_at ?? '',
      render: (a: CrmActivity) => (a.due_at ? new Date(a.due_at).toLocaleString() : '—'),
    },
    {
      key: 'assigned_to',
      header: 'Owner',
      sortable: true,
      sortValue: (a: CrmActivity) => employeeName(employees, a.assigned_to),
      render: (a: CrmActivity) => employeeName(employees, a.assigned_to),
    },
    actionsColumn<CrmActivity>((item) => (
      <div className="flex items-center gap-1 justify-end">
        {can('crm', 'edit') && item.status === 'pending' && (
          <button type="button" onClick={() => completeActivity.mutate(item)} className="px-2 py-1 text-[11px] text-success hover:bg-success/10 rounded">Done</button>
        )}
        <RowActions
          onEdit={can('crm', 'edit') ? () => setEditing(item) : undefined}
          onDelete={can('crm', 'delete') ? () => setDeleting(item) : undefined}
          deleteLabel={`Delete ${item.title}`}
          editLabel={`Edit ${item.title}`}
        />
      </div>
    )),
  ]

  return (
    <>
      <div className="page-header">
        <div />
        <PermissionGate module="crm" permission="create">
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add Activity</button>
        </PermissionGate>
      </div>

      <FilterableDataTable
        columns={columns}
        data={activities}
        searchPlaceholder="Search activities…"
        searchKeys={['title', 'description']}
        filters={filters}
        customFilter={customFilter}
        pageSize={12}
        rowKey={(a) => a.id}
        emptyFilteredMessage="No activities found."
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Activity">
        <ActivityForm customers={customers} leads={leads} deals={deals} employees={employees} onSubmit={(d) => saveActivity.mutate(d)} loading={saveActivity.isPending} submitLabel="Add activity" />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Activity">
        {editing && (
          <ActivityForm
            key={editing.id}
            initial={editing}
            customers={customers}
            leads={leads}
            deals={deals}
            employees={employees}
            onSubmit={(d) => saveActivity.mutate({ id: editing.id, ...d })}
            loading={saveActivity.isPending}
            submitLabel="Save changes"
          />
        )}
      </Modal>
      <ConfirmDeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteActivity.mutate(deleting.id)} title="Delete activity" description="Remove this activity permanently." entityName={deleting?.title} loading={deleteActivity.isPending} />
    </>
  )
}
