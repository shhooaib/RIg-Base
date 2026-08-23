import type { SupabaseClient } from '@supabase/supabase-js'
import { logCrmInteraction, touchCustomerInteraction } from '@/lib/crm/interactions'
import type { Lead } from '@/lib/types'

type ConvertLeadInput = {
  lead: Lead
  workspaceId: string
  userId: string
  createDeal?: boolean
  dealName?: string
  dealValue?: number
  stageId?: string
}

async function transferLeadRecordsToCustomer(
  supabase: SupabaseClient,
  workspaceId: string,
  leadId: string,
  customerId: string
) {
  await supabase
    .from('crm_notes')
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('lead_id', leadId)

  await supabase
    .from('crm_activities')
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('lead_id', leadId)

  await supabase
    .from('deals')
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('lead_id', leadId)

  await supabase
    .from('crm_interactions')
    .update({ customer_id: customerId })
    .eq('workspace_id', workspaceId)
    .eq('lead_id', leadId)
}

export async function convertLead(
  supabase: SupabaseClient,
  input: ConvertLeadInput
): Promise<{ customerId: string; dealId?: string; error?: string }> {
  const { lead, workspaceId, userId } = input

  if (lead.converted_customer_id) {
    return { customerId: lead.converted_customer_id, dealId: lead.converted_deal_id ?? undefined }
  }

  const email = lead.email?.trim() || `${lead.name.toLowerCase().replace(/\s+/g, '.')}@lead.local`

  let customerId: string | null = null

  if (lead.email) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', lead.email)
      .maybeSingle()

    if (existing) customerId = existing.id
  }

  if (!customerId) {
    const { data: created, error: customerError } = await supabase
      .from('customers')
      .insert({
        workspace_id: workspaceId,
        name: lead.name,
        email,
        phone: lead.phone,
        company: lead.company,
        status: 'active',
        source: lead.source,
        assigned_to: lead.assigned_to,
        notes: lead.notes,
        total_spent: 0,
      })
      .select('id')
      .single()

    if (customerError || !created) {
      return { customerId: '', error: customerError?.message ?? 'Failed to create customer' }
    }

    customerId = created.id

    await logCrmInteraction(supabase, {
      workspaceId,
      eventType: 'customer_created',
      title: `Customer created from lead: ${lead.name}`,
      customerId,
      leadId: lead.id,
      createdBy: userId,
    })
  }

  if (!customerId) {
    return { customerId: '', error: 'Failed to resolve customer' }
  }

  const resolvedCustomerId = customerId

  let dealId: string | undefined

  if (input.createDeal && input.stageId) {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        workspace_id: workspaceId,
        name: input.dealName ?? `${lead.company ?? lead.name} — Opportunity`,
        customer_id: resolvedCustomerId,
        lead_id: lead.id,
        value: input.dealValue ?? lead.estimated_value ?? 0,
        stage_id: input.stageId,
        probability: 30,
        assigned_to: lead.assigned_to,
        status: 'open',
      })
      .select('id')
      .single()

    if (dealError || !deal) {
      return { customerId: resolvedCustomerId, error: dealError?.message ?? 'Customer created but deal failed' }
    }

    dealId = deal.id

    await logCrmInteraction(supabase, {
      workspaceId,
      eventType: 'deal_created',
      title: `Deal created: ${input.dealName ?? deal.id}`,
      customerId: resolvedCustomerId,
      leadId: lead.id,
      dealId,
      createdBy: userId,
    })
  }

  const { error: leadUpdateError } = await supabase
    .from('leads')
    .update({
      status: 'won',
      converted_customer_id: resolvedCustomerId,
      converted_deal_id: dealId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id)
    .eq('workspace_id', workspaceId)

  if (leadUpdateError) {
    return { customerId: resolvedCustomerId, dealId, error: leadUpdateError.message }
  }

  await transferLeadRecordsToCustomer(supabase, workspaceId, lead.id, resolvedCustomerId)

  if (lead.notes?.trim()) {
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('crm_notes').insert({
      workspace_id: workspaceId,
      customer_id: resolvedCustomerId,
      lead_id: lead.id,
      content: lead.notes.trim(),
      created_by: userData.user?.id ?? userId,
    })
  }

  await logCrmInteraction(supabase, {
    workspaceId,
    eventType: 'lead_converted',
    title: `Lead converted: ${lead.name}`,
    description: dealId ? 'Customer and deal created.' : 'Customer created.',
    customerId: resolvedCustomerId,
    leadId: lead.id,
    dealId: dealId ?? null,
    createdBy: userId,
  })

  await touchCustomerInteraction(supabase, resolvedCustomerId, workspaceId)

  return { customerId: resolvedCustomerId, dealId }
}
