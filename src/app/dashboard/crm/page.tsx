'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { CrmStatCard } from '@/components/crm/crm-stat-card'
import { CrmTimeline } from '@/components/crm/crm-timeline'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import type { CrmActivity, CrmInteraction, Deal, Lead } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export default function CrmOverviewPage() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: CRM_QUERY_KEYS.overview,
    queryFn: async () => {
      const wsId = workspace!.id
      const [customers, leads, deals, activities, interactions] = await Promise.all([
        supabase.from('customers').select('id, status, total_spent').eq('workspace_id', wsId),
        supabase.from('leads').select('*').eq('workspace_id', wsId),
        supabase.from('deals').select('*').eq('workspace_id', wsId),
        supabase.from('crm_activities').select('*').eq('workspace_id', wsId).order('due_at'),
        supabase
          .from('crm_interactions')
          .select('*')
          .eq('workspace_id', wsId)
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      const leadRows = (leads.data ?? []) as Lead[]
      const dealRows = (deals.data ?? []) as Deal[]
      const activityRows = (activities.data ?? []) as CrmActivity[]
      const customerRows = customers.data ?? []

      const openDeals = dealRows.filter((d) => d.status === 'open')
      const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0)
      const activeLeads = leadRows.filter((l) => !['won', 'lost'].includes(l.status))
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)

      const overdue = activityRows.filter(
        (a) => a.status === 'pending' && a.due_at && new Date(a.due_at) < todayStart
      )
      const today = activityRows.filter(
        (a) =>
          a.status === 'pending' &&
          a.due_at &&
          new Date(a.due_at) >= todayStart &&
          new Date(a.due_at) < todayEnd
      )
      const upcoming = activityRows.filter(
        (a) => a.status === 'pending' && a.due_at && new Date(a.due_at) >= todayEnd
      )

      const converted = leadRows.filter((l) => l.converted_customer_id).length
      const conversionRate = leadRows.length > 0 ? Math.round((converted / leadRows.length) * 100) : 0

      return {
        customerCount: customerRows.length,
        activeLeads: activeLeads.length,
        openDeals: openDeals.length,
        pipelineValue,
        conversionRate,
        overdue,
        today,
        upcoming,
        recentActivity: (interactions.data ?? []) as CrmInteraction[],
      }
    },
    enabled: !!workspace?.id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-secondary">
        <Loader2 size={20} className="animate-spin text-accent mr-2" />
        Loading CRM overview…
      </div>
    )
  }

  const overview = data!

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CrmStatCard label="Customers" value={overview.customerCount} />
        <CrmStatCard label="Active leads" value={overview.activeLeads} hint={`${overview.conversionRate}% converted`} />
        <CrmStatCard label="Open deals" value={overview.openDeals} />
        <CrmStatCard
          label="Pipeline value"
          value={`$${overview.pipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="ai-card border border-border-primary p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-sm">Follow-ups</h2>
            <Link href="/dashboard/crm/activities" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-danger mb-2">Overdue ({overview.overdue.length})</p>
              {overview.overdue.slice(0, 3).map((a) => (
                <p key={a.id} className="text-text-secondary truncate">{a.title}</p>
              ))}
              {overview.overdue.length === 0 && <p className="text-text-tertiary text-xs">None</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-accent mb-2">Today ({overview.today.length})</p>
              {overview.today.slice(0, 3).map((a) => (
                <p key={a.id} className="text-text-secondary truncate">{a.title}</p>
              ))}
              {overview.today.length === 0 && <p className="text-text-tertiary text-xs">None scheduled</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-tertiary mb-2">Upcoming ({overview.upcoming.length})</p>
              {overview.upcoming.slice(0, 3).map((a) => (
                <p key={a.id} className="text-text-secondary truncate">{a.title}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="ai-card border border-border-primary p-5 lg:col-span-2">
          <h2 className="font-medium text-sm mb-4">Recent activity</h2>
          <CrmTimeline items={overview.recentActivity} />
        </div>
      </div>
    </div>
  )
}
