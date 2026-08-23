'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { usePermissions } from '@/hooks/use-permissions'
import { useCrmEmployees, useCrmPipeline } from '@/hooks/use-crm-data'
import { useCrmOwnerFilters } from '@/hooks/use-crm-owner-filters'
import { Modal } from '@/components/ui/modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { DealForm } from '@/components/crm/deal-form'
import { employeeName } from '@/components/crm/employee-select'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import { logCrmInteraction } from '@/lib/crm/interactions'
import { matchesOwnerFilter } from '@/lib/crm/list-utils'
import { pushCrmEntityToGhl } from '@/lib/crm/ghl-push-client'
import type { Customer, Deal, Lead } from '@/lib/types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type DealWithRelations = Deal & {
  customer?: Customer | null
  stage?: { name: string; is_closed_won: boolean; is_closed_lost: boolean } | null
}

export default function CrmDealsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [seedCustomer, setSeedCustomer] = useState<Customer | null>(null)
  const [seedLead, setSeedLead] = useState<Lead | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: stages = [] } = useCrmPipeline()
  const { data: employees = [] } = useCrmEmployees()
  const { ownerFilter } = useCrmOwnerFilters()

  const { data: deals = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.deals,
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('*, customer:customers(id, name), stage:crm_pipeline_stages(name, is_closed_won, is_closed_lost)')
        .eq('workspace_id', workspace?.id)
        .order('updated_at', { ascending: false })
      return (data ?? []) as DealWithRelations[]
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

  const { data: leads = [] } = useQuery({
    queryKey: CRM_QUERY_KEYS.leads,
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*').eq('workspace_id', workspace?.id).order('name')
      return (data ?? []) as Lead[]
    },
    enabled: !!workspace?.id,
  })

  const visibleStages = useMemo(
    () => (showClosed ? stages : stages.filter((s) => !s.is_closed_won && !s.is_closed_lost)),
    [stages, showClosed]
  )

  const filteredDeals = useMemo(() => deals, [deals])

  const moveDeal = useMutation({
    mutationFn: async ({ deal, stageId }: { deal: DealWithRelations; stageId: string }) => {
      const stage = stages.find((s) => s.id === stageId)
      const status = stage?.is_closed_won ? 'won' : stage?.is_closed_lost ? 'lost' : 'open'
      const { error } = await supabase
        .from('deals')
        .update({
          stage_id: stageId,
          status,
          probability: stage?.probability_default ?? deal.probability,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deal.id)
      if (error) throw error

      const { data: userData } = await supabase.auth.getUser()
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: status === 'won' ? 'deal_won' : status === 'lost' ? 'deal_lost' : 'deal_stage_changed',
        title: `${deal.name} → ${stage?.name ?? 'Updated'}`,
        customerId: deal.customer_id,
        dealId: deal.id,
        createdBy: userData.user?.id,
      })
      return deal.id
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.deals })
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
      toast.success('Deal updated')
      void pushCrmEntityToGhl('deal', dealId)
    },
    onError: () => toast.error('Failed to update deal'),
  })

  const addDeal = useMutation({
    mutationFn: async (payload: Partial<Deal>) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('deals')
        .insert({ ...payload, workspace_id: workspace?.id })
        .select('id, name, customer_id, lead_id')
        .single()
      if (error) throw error
      await logCrmInteraction(supabase, {
        workspaceId: workspace!.id,
        eventType: 'deal_created',
        title: `Deal created: ${data.name}`,
        customerId: data.customer_id,
        leadId: data.lead_id,
        dealId: data.id,
        createdBy: userData.user?.id,
      })
      return data.id as string
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.deals })
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
      setShowAdd(false)
      setSeedCustomer(null)
      setSeedLead(null)
      toast.success('Deal created')
      void pushCrmEntityToGhl('deal', dealId)
    },
    onError: () => toast.error('Failed to create deal'),
  })

  const listColumns = [
    {
      key: 'name',
      header: 'Deal',
      sortable: true,
      render: (d: DealWithRelations) => <span className="font-medium">{d.name}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      sortValue: (d: DealWithRelations) => d.customer?.name ?? '',
      render: (d: DealWithRelations) => d.customer?.name ?? '—',
    },
    {
      key: 'stage',
      header: 'Stage',
      sortable: true,
      sortValue: (d: DealWithRelations) => d.stage?.name ?? '',
      render: (d: DealWithRelations) => d.stage?.name ?? '—',
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      sortValue: (d: DealWithRelations) => Number(d.value),
      render: (d: DealWithRelations) => `$${Number(d.value).toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Outcome',
      sortable: true,
      render: (d: DealWithRelations) => d.status,
    },
    {
      key: 'assigned_to',
      header: 'Owner',
      sortable: true,
      sortValue: (d: DealWithRelations) => employeeName(employees, d.assigned_to),
      render: (d: DealWithRelations) => employeeName(employees, d.assigned_to),
    },
  ]

  const dealFilters = useMemo(() => [ownerFilter], [ownerFilter])

  return (
    <>
      <div className="page-header">
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="rounded border-border-primary" />
          Show won & lost stages
        </label>
        <PermissionGate module="crm" permission="create">
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary" disabled={stages.length === 0}>
            <Plus size={16} /> Add Deal
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-2 mb-8">
        {visibleStages.map((stage) => {
          const stageDeals = filteredDeals.filter((d) => d.stage_id === stage.id)
          const total = stageDeals.reduce((s, d) => s + Number(d.value), 0)
          return (
            <div key={stage.id} className="ai-card border border-border-primary min-w-[240px]">
              <div className="px-4 py-3 border-b border-border-primary">
                <p className="text-sm font-medium">{stage.name}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{stageDeals.length} deals · ${total.toLocaleString()}</p>
              </div>
              <div className="p-3 space-y-2 min-h-[120px]">
                {stageDeals.map((deal) => (
                  <div key={deal.id} className="border border-border-primary/80 bg-bg-secondary/40 p-3 text-sm">
                    <p className="font-medium truncate">{deal.name}</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {deal.customer_id ? (
                        <Link href={`/dashboard/crm/customers/${deal.customer_id}`} className="hover:text-accent">{deal.customer?.name ?? 'Customer'}</Link>
                      ) : 'No customer'}
                    </p>
                    <p className="text-accent text-xs mt-1">${Number(deal.value).toLocaleString()}</p>
                    <p className="text-[11px] text-text-tertiary mt-1">Owner: {employeeName(employees, deal.assigned_to)}</p>
                    {can('crm', 'edit') && (
                      <select
                        className="mt-2 w-full text-xs form-field py-1"
                        value={deal.stage_id}
                        onChange={(e) => moveDeal.mutate({ deal, stageId: e.target.value })}
                        aria-label={`Move ${deal.name}`}
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="text-sm font-medium text-text-secondary mb-3">All deals</h3>
      <FilterableDataTable
        columns={listColumns}
        data={filteredDeals}
        searchPlaceholder="Search deals…"
        getSearchText={(d) => `${d.name} ${d.customer?.name ?? ''} ${d.stage?.name ?? ''}`}
        filters={dealFilters}
        customFilter={(d, ctx) => matchesOwnerFilter(d.assigned_to, ctx.filters.assigned_to ?? 'all')}
        pageSize={10}
        rowKey={(d) => d.id}
        emptyFilteredMessage="No deals match your filters."
      />

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setSeedCustomer(null); setSeedLead(null) }} title="Add Deal">
        <DealForm
          key={`${seedCustomer?.id ?? ''}-${seedLead?.id ?? ''}-deal`}
          customers={customers}
          leads={leads}
          employees={employees}
          stages={stages}
          initialFromCustomer={seedCustomer ?? undefined}
          initialFromLead={seedLead ?? undefined}
          onSubmit={(d) => addDeal.mutate(d)}
          loading={addDeal.isPending}
        />
      </Modal>
    </>
  )
}
