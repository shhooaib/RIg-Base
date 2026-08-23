'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { CrmStatCard } from '@/components/crm/crm-stat-card'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import type { Deal, Lead } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export default function CrmReportsPage() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: [...CRM_QUERY_KEYS.overview, 'reports'],
    queryFn: async () => {
      const wsId = workspace!.id
      const [leadsRes, dealsRes, customersRes] = await Promise.all([
        supabase.from('leads').select('*').eq('workspace_id', wsId),
        supabase.from('deals').select('*').eq('workspace_id', wsId),
        supabase.from('customers').select('total_spent').eq('workspace_id', wsId),
      ])

      const leads = (leadsRes.data ?? []) as Lead[]
      const deals = (dealsRes.data ?? []) as Deal[]
      const customers = customersRes.data ?? []

      const converted = leads.filter((l) => l.converted_customer_id).length
      const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0
      const wonDeals = deals.filter((d) => d.status === 'won')
      const lostDeals = deals.filter((d) => d.status === 'lost')
      const openPipeline = deals.filter((d) => d.status === 'open')
      const pipelineValue = openPipeline.reduce((s, d) => s + Number(d.value), 0)
      const wonRevenue = wonDeals.reduce((s, d) => s + Number(d.value), 0)
      const customerRevenue = customers.reduce((s, c) => s + Number(c.total_spent), 0)

      const leadsByStatus = leads.reduce<Record<string, number>>((acc, l) => {
        acc[l.status] = (acc[l.status] ?? 0) + 1
        return acc
      }, {})

      return {
        totalLeads: leads.length,
        conversionRate,
        openDeals: openPipeline.length,
        pipelineValue,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
        wonRevenue,
        customerRevenue,
        leadsByStatus,
      }
    },
    enabled: !!workspace?.id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-secondary">
        <Loader2 size={20} className="animate-spin text-accent mr-2" />
        Loading reports…
      </div>
    )
  }

  const r = data!

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CrmStatCard label="Total leads" value={r.totalLeads} />
        <CrmStatCard label="Conversion rate" value={`${r.conversionRate}%`} />
        <CrmStatCard label="Open pipeline" value={`$${r.pipelineValue.toLocaleString()}`} hint={`${r.openDeals} deals`} />
        <CrmStatCard label="Won revenue" value={`$${r.wonRevenue.toLocaleString()}`} hint={`${r.wonDeals} won · ${r.lostDeals} lost`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="ai-card border border-border-primary p-5">
          <h2 className="font-medium text-sm mb-4">Leads by status</h2>
          <div className="space-y-2">
            {Object.entries(r.leadsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary capitalize">{status.replace('_', ' ')}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(r.leadsByStatus).length === 0 && (
              <p className="text-sm text-text-tertiary">No lead data yet.</p>
            )}
          </div>
        </div>

        <div className="ai-card border border-border-primary p-5">
          <h2 className="font-medium text-sm mb-4">Revenue summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-text-secondary">Customer lifetime value (recorded)</span><span className="font-medium">${r.customerRevenue.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Closed-won deal value</span><span className="font-medium">${r.wonRevenue.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Open pipeline value</span><span className="font-medium">${r.pipelineValue.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
