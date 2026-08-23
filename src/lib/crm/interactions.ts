import type { SupabaseClient } from '@supabase/supabase-js'
import type { CrmInteractionEvent } from '@/lib/crm/constants'

type LogInteractionInput = {
  workspaceId: string
  eventType: CrmInteractionEvent
  title: string
  description?: string | null
  customerId?: string | null
  leadId?: string | null
  dealId?: string | null
  activityId?: string | null
  metadata?: Record<string, unknown>
  createdBy?: string | null
}

export async function logCrmInteraction(
  supabase: SupabaseClient,
  input: LogInteractionInput
) {
  const { error } = await supabase.from('crm_interactions').insert({
    workspace_id: input.workspaceId,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    customer_id: input.customerId ?? null,
    lead_id: input.leadId ?? null,
    deal_id: input.dealId ?? null,
    activity_id: input.activityId ?? null,
    metadata: input.metadata ?? {},
    created_by: input.createdBy ?? null,
  })

  if (error) console.error('Failed to log CRM interaction', error)
}

export async function ensurePipelineStages(supabase: SupabaseClient, workspaceId: string) {
  const { data: existing } = await supabase
    .from('crm_pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)

  if (existing && existing.length > 0) return

  await supabase.rpc('seed_crm_pipeline_stages', { p_workspace_id: workspaceId })
}

export async function touchCustomerInteraction(
  supabase: SupabaseClient,
  customerId: string,
  workspaceId: string
) {
  await supabase
    .from('customers')
    .update({ last_interaction: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', customerId)
    .eq('workspace_id', workspaceId)
}

export async function touchLeadContact(
  supabase: SupabaseClient,
  leadId: string,
  workspaceId: string
) {
  await supabase
    .from('leads')
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('workspace_id', workspaceId)
}
