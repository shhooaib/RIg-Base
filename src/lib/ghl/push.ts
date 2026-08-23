import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createGhlContact,
  createGhlContactTask,
  createGhlOpportunity,
  updateGhlContact,
  updateGhlContactTask,
  updateGhlOpportunity,
} from '@/lib/ghl/client'
import { getGhlIntegrationRow } from '@/lib/ghl/integration-store'
import {
  hasGhlContactChannel,
  mapActivityToGhlTaskPayload,
  mapCustomerToGhlPayload,
  mapDealToGhlPayload,
  mapLeadToGhlPayload,
} from '@/lib/ghl/mappers'
import type { CrmActivity, CrmPipelineStage, Customer, Deal, Lead } from '@/lib/types'

export type GhlPushEntity = 'customer' | 'lead' | 'deal' | 'activity'

export async function pushEntityToGhl(
  supabase: SupabaseClient,
  workspaceId: string,
  entityType: GhlPushEntity,
  entityId: string
): Promise<void> {
  const integration = await getGhlIntegrationRow(supabase, workspaceId)
  if (!integration) return

  const { pit_token: pitToken, location_id: locationId } = integration

  if (entityType === 'customer') {
    const { data } = await supabase.from('customers').select('*').eq('id', entityId).maybeSingle()
    if (!data) return
    const customer = data as Customer
    const payload = mapCustomerToGhlPayload(customer, locationId)
    if (!hasGhlContactChannel(payload)) return
    if (customer.ghl_contact_id) {
      await updateGhlContact(pitToken, locationId, customer.ghl_contact_id, payload)
    } else {
      const created = await createGhlContact(pitToken, locationId, payload)
      await supabase
        .from('customers')
        .update({ ghl_contact_id: created.id, ghl_last_synced_at: new Date().toISOString() })
        .eq('id', customer.id)
    }
    return
  }

  if (entityType === 'lead') {
    const { data } = await supabase.from('leads').select('*').eq('id', entityId).maybeSingle()
    if (!data) return
    const lead = data as Lead
    const payload = mapLeadToGhlPayload(lead, locationId)
    if (!hasGhlContactChannel(payload)) return
    if (lead.ghl_contact_id) {
      await updateGhlContact(pitToken, locationId, lead.ghl_contact_id, payload)
    } else {
      const created = await createGhlContact(pitToken, locationId, payload)
      await supabase
        .from('leads')
        .update({ ghl_contact_id: created.id, ghl_last_synced_at: new Date().toISOString() })
        .eq('id', lead.id)
    }
    return
  }

  if (entityType === 'deal') {
    if (!integration.pipeline_id) return

    const { data } = await supabase.from('deals').select('*').eq('id', entityId).maybeSingle()
    if (!data) return
    const deal = data as Deal

    let contactId: string | null = null
    if (deal.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('ghl_contact_id')
        .eq('id', deal.customer_id)
        .maybeSingle()
      contactId = customer?.ghl_contact_id ?? null
    }
    if (!contactId && deal.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('ghl_contact_id')
        .eq('id', deal.lead_id)
        .maybeSingle()
      contactId = lead?.ghl_contact_id ?? null
    }
    if (!contactId) return

    const { data: stageData } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .eq('id', deal.stage_id)
      .maybeSingle()
    const stage = stageData as CrmPipelineStage | null
    if (!stage?.ghl_pipeline_stage_id) return

    const payload = mapDealToGhlPayload(
      deal,
      locationId,
      integration.pipeline_id,
      stage.ghl_pipeline_stage_id,
      contactId
    )

    if (deal.ghl_opportunity_id) {
      await updateGhlOpportunity(pitToken, locationId, deal.ghl_opportunity_id, payload)
    } else {
      const created = await createGhlOpportunity(pitToken, locationId, payload)
      await supabase
        .from('deals')
        .update({
          ghl_opportunity_id: created.id,
          ghl_last_synced_at: new Date().toISOString(),
        })
        .eq('id', deal.id)
    }
    return
  }

  if (entityType === 'activity') {
    const { data } = await supabase.from('crm_activities').select('*').eq('id', entityId).maybeSingle()
    if (!data) return
    const activity = data as CrmActivity
    if (!activity.customer_id) return

    const { data: customer } = await supabase
      .from('customers')
      .select('ghl_contact_id')
      .eq('id', activity.customer_id)
      .maybeSingle()
    const contactId = customer?.ghl_contact_id
    if (!contactId) return

    const payload = mapActivityToGhlTaskPayload(activity)
    if (activity.ghl_task_id) {
      await updateGhlContactTask(pitToken, locationId, contactId, activity.ghl_task_id, payload)
    } else {
      const created = await createGhlContactTask(pitToken, locationId, contactId, payload)
      await supabase
        .from('crm_activities')
        .update({ ghl_task_id: created.id, ghl_last_synced_at: new Date().toISOString() })
        .eq('id', activity.id)
    }
  }
}
