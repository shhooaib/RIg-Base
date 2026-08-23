'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { ActivityForm } from '@/components/crm/activity-form'
import { employeeName } from '@/components/crm/employee-select'
import {
  ACTIVITY_TYPE_LABELS,
  CRM_QUERY_KEYS,
} from '@/lib/crm/constants'
import {
  logCrmInteraction,
  touchCustomerInteraction,
  touchLeadContact,
} from '@/lib/crm/interactions'
import { pushCrmEntityToGhl } from '@/lib/crm/ghl-push-client'
import type { CrmActivity, Customer, Deal, Lead } from '@/lib/types'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

type ActivityScope = {
  workspaceId: string
  customerId?: string
  leadId?: string
  dealId?: string
}

export function CrmActivitiesSection({
  activities,
  scope,
  employees,
  customers,
  leads,
  deals = [],
  canCreate,
  canEdit,
  queryKeysToInvalidate = [],
}: {
  activities: CrmActivity[]
  scope: ActivityScope
  employees: import('@/lib/types').Employee[]
  customers: Pick<Customer, 'id' | 'name'>[]
  leads: Pick<Lead, 'id' | 'name'>[]
  deals?: Pick<Deal, 'id' | 'name'>[]
  canCreate: boolean
  canEdit: boolean
  queryKeysToInvalidate?: ReadonlyArray<readonly unknown[]>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const invalidate = () => {
    for (const key of queryKeysToInvalidate) {
      queryClient.invalidateQueries({ queryKey: key as unknown[] })
    }
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.activities })
    queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
  }

  const addActivity = useMutation({
    mutationFn: async (payload: Partial<CrmActivity>) => {
      const { data, error } = await supabase
        .from('crm_activities')
        .insert({
          ...payload,
          workspace_id: scope.workspaceId,
          customer_id: scope.customerId ?? payload.customer_id ?? null,
          lead_id: scope.leadId ?? payload.lead_id ?? null,
          deal_id: scope.dealId ?? payload.deal_id ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: (id) => {
      invalidate()
      setShowAdd(false)
      toast.success('Activity created')
      void pushCrmEntityToGhl('activity', id)
    },
    onError: () => toast.error('Failed to create activity'),
  })

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
        workspaceId: scope.workspaceId,
        eventType,
        title: `${ACTIVITY_TYPE_LABELS[activity.type]} completed: ${activity.title}`,
        customerId: activity.customer_id,
        leadId: activity.lead_id,
        dealId: activity.deal_id,
        activityId: activity.id,
        createdBy: userData.user?.id,
      })

      if (activity.customer_id) await touchCustomerInteraction(supabase, activity.customer_id, scope.workspaceId)
      if (activity.lead_id) await touchLeadContact(supabase, activity.lead_id, scope.workspaceId)
      return activity.id
    },
    onSuccess: (id) => {
      invalidate()
      toast.success('Activity completed')
      void pushCrmEntityToGhl('activity', id)
    },
    onError: () => toast.error('Failed to complete activity'),
  })

  return (
    <div className="ai-card border border-border-primary p-5 space-y-4">
      {canCreate && (
        <button type="button" onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover">
          <Plus size={16} /> Add activity
        </button>
      )}
      {activities.length === 0 ? (
        <p className="text-sm text-text-tertiary">No activities scheduled.</p>
      ) : (
        activities.map((a) => (
          <div key={a.id} className="border border-border-primary/70 p-4 text-sm flex justify-between gap-4">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-text-tertiary mt-1 capitalize">
                {ACTIVITY_TYPE_LABELS[a.type]} · {a.status} · {a.priority} priority
              </p>
              <p className="text-text-tertiary text-xs mt-1">Assigned: {employeeName(employees, a.assigned_to)}</p>
              {a.description ? <p className="text-text-secondary mt-2 text-xs">{a.description}</p> : null}
            </div>
            <div className="text-right shrink-0 space-y-2">
              <p className="text-text-tertiary text-xs">{a.due_at ? new Date(a.due_at).toLocaleString() : 'No due date'}</p>
              {canEdit && a.status === 'pending' && (
                <button type="button" onClick={() => completeActivity.mutate(a)} className="text-[11px] text-success hover:bg-success/10 rounded px-2 py-1">
                  Mark done
                </button>
              )}
            </div>
          </div>
        ))
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add activity">
        <ActivityForm
          customers={customers}
          leads={leads}
          deals={deals}
          employees={employees}
          lockCustomerId={scope.customerId}
          lockLeadId={scope.leadId}
          lockDealId={scope.dealId}
          onSubmit={(d) => addActivity.mutate(d)}
          loading={addActivity.isPending}
          submitLabel="Add activity"
        />
      </Modal>
    </div>
  )
}
