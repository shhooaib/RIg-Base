import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createGhlContact,
  createGhlContactTask,
  createGhlOpportunity,
  listGhlContactTasks,
  listGhlContacts,
  listGhlOpportunities,
  listGhlPipelines,
  updateGhlContact,
  updateGhlContactTask,
  updateGhlOpportunity,
} from '@/lib/ghl/client'
import { getGhlIntegrationRow, updateGhlSyncState } from '@/lib/ghl/integration-store'
import {
  isGhlLeadContact,
  hasGhlContactChannel,
  mapActivityToGhlTaskPayload,
  mapCustomerToGhlPayload,
  mapDealToGhlPayload,
  mapGhlContactToCustomer,
  mapGhlContactToLead,
  mapGhlOpportunityToDeal,
  mapGhlTaskToActivity,
  mapLeadToGhlPayload,
} from '@/lib/ghl/mappers'
import { GhlApiError } from '@/lib/ghl/shared'
import type { GhlIntegrationRow, GhlSyncResult } from '@/lib/ghl/types'
import type { CrmActivity, CrmPipelineStage, Customer, Deal, Lead } from '@/lib/types'

type StageMap = Map<string, string>

function formatSyncError(error: unknown, context: string): string {
  if (error instanceof GhlApiError) {
    return `${context}: ${error.message} (GHL ${error.status})`
  }
  if (error instanceof Error) return `${context}: ${error.message}`
  return `${context}: Sync failed`
}

async function syncPipelineStages(
  admin: SupabaseClient,
  integration: GhlIntegrationRow
): Promise<{ pipelineId: string | null; stageMap: StageMap; count: number }> {
  const pipelines = await listGhlPipelines(integration.pit_token, integration.location_id)
  const primary = pipelines[0]
  if (!primary) {
    return { pipelineId: integration.pipeline_id, stageMap: new Map(), count: 0 }
  }

  const { data: existingStages } = await admin
    .from('crm_pipeline_stages')
    .select('*')
    .eq('workspace_id', integration.workspace_id)
    .order('position')

  const localStages = (existingStages ?? []) as CrmPipelineStage[]
  const stageMap: StageMap = new Map()
  let count = 0

  for (const ghlStage of primary.stages ?? []) {
    let local =
      localStages.find((s) => s.ghl_pipeline_stage_id === ghlStage.id) ??
      localStages.find((s) => s.name.toLowerCase() === ghlStage.name.toLowerCase())

    if (local) {
      await admin
        .from('crm_pipeline_stages')
        .update({ ghl_pipeline_stage_id: ghlStage.id })
        .eq('id', local.id)
      stageMap.set(ghlStage.id, local.id)
      count += 1
      continue
    }

    const position = ghlStage.position ?? localStages.length + count
    const { data: inserted, error } = await admin
      .from('crm_pipeline_stages')
      .insert({
        workspace_id: integration.workspace_id,
        name: ghlStage.name,
        position,
        probability_default: 0,
        is_closed_won: ghlStage.name.toLowerCase() === 'won',
        is_closed_lost: ghlStage.name.toLowerCase() === 'lost',
        ghl_pipeline_stage_id: ghlStage.id,
      })
      .select('*')
      .single()

    if (!error && inserted) {
      stageMap.set(ghlStage.id, inserted.id)
      count += 1
    }
  }

  if (integration.pipeline_id !== primary.id) {
    await updateGhlSyncState(admin, integration.workspace_id, { pipeline_id: primary.id })
  }

  return { pipelineId: primary.id, stageMap, count }
}

async function resolveDefaultStageId(admin: SupabaseClient, workspaceId: string): Promise<string> {
  const { data } = await admin
    .from('crm_pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('position')
    .limit(1)
    .maybeSingle()

  if (!data?.id) throw new Error('No CRM pipeline stages found')
  return data.id
}

async function pullContacts(
  admin: SupabaseClient,
  integration: GhlIntegrationRow,
  warnings: string[]
) {
  const contacts = await listGhlContacts(integration.pit_token, integration.location_id)
  let created = 0
  let updated = 0

  for (const contact of contacts) {
    const asLead = isGhlLeadContact(contact)

    if (asLead) {
      const { data: existing } = await admin
        .from('leads')
        .select('id')
        .eq('workspace_id', integration.workspace_id)
        .eq('ghl_contact_id', contact.id)
        .maybeSingle()

      const payload = mapGhlContactToLead(contact, integration.workspace_id)
      if (existing?.id) {
        const { error } = await admin.from('leads').update(payload).eq('id', existing.id)
        if (error) warnings.push(formatSyncError(error, `Lead update ${contact.id}`))
        else updated += 1
      } else {
        const { error } = await admin.from('leads').insert(payload)
        if (error) warnings.push(formatSyncError(error, `Lead import ${contact.id}`))
        else created += 1
      }
      continue
    }

    const { data: existing } = await admin
      .from('customers')
      .select('id')
      .eq('workspace_id', integration.workspace_id)
      .eq('ghl_contact_id', contact.id)
      .maybeSingle()

    const payload = mapGhlContactToCustomer(contact, integration.workspace_id)
    if (existing?.id) {
      const { email: _email, ...updatePayload } = payload
      const { error } = await admin.from('customers').update(updatePayload).eq('id', existing.id)
      if (error) warnings.push(formatSyncError(error, `Customer update ${contact.id}`))
      else updated += 1
    } else {
      const { error } = await admin.from('customers').insert(payload)
      if (error) warnings.push(formatSyncError(error, `Customer import ${contact.id}`))
      else created += 1
    }
  }

  return { created, updated }
}

async function findCustomerIdByGhlContact(
  admin: SupabaseClient,
  workspaceId: string,
  ghlContactId?: string
): Promise<string | null> {
  if (!ghlContactId) return null

  const { data: customer } = await admin
    .from('customers')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('ghl_contact_id', ghlContactId)
    .maybeSingle()

  if (customer?.id) return customer.id

  const { data: lead } = await admin
    .from('leads')
    .select('converted_customer_id')
    .eq('workspace_id', workspaceId)
    .eq('ghl_contact_id', ghlContactId)
    .maybeSingle()

  return lead?.converted_customer_id ?? null
}

async function pullOpportunities(
  admin: SupabaseClient,
  integration: GhlIntegrationRow,
  stageMap: StageMap,
  warnings: string[]
) {
  const opportunities = await listGhlOpportunities(integration.pit_token, integration.location_id)
  const defaultStageId = await resolveDefaultStageId(admin, integration.workspace_id)
  let created = 0
  let updated = 0

  for (const opp of opportunities) {
    const stageId =
      (opp.pipelineStageId && stageMap.get(opp.pipelineStageId)) || defaultStageId
    const customerId = await findCustomerIdByGhlContact(admin, integration.workspace_id, opp.contactId)

    const { data: existing } = await admin
      .from('deals')
      .select('id')
      .eq('workspace_id', integration.workspace_id)
      .eq('ghl_opportunity_id', opp.id)
      .maybeSingle()

    const payload = mapGhlOpportunityToDeal(
      opp,
      integration.workspace_id,
      stageId,
      customerId
    )

    if (existing?.id) {
      const { error } = await admin.from('deals').update(payload).eq('id', existing.id)
      if (error) warnings.push(formatSyncError(error, `Deal update ${opp.id}`))
      else updated += 1
    } else {
      const { error } = await admin.from('deals').insert(payload)
      if (error) warnings.push(formatSyncError(error, `Deal import ${opp.id}`))
      else created += 1
    }
  }

  return { created, updated }
}

async function pullTasksForContacts(
  admin: SupabaseClient,
  integration: GhlIntegrationRow,
  rows: Array<{ id: string; ghl_contact_id: string; kind: 'customer' | 'lead' }>,
  warnings: string[]
) {
  let created = 0
  let updated = 0

  for (const row of rows) {
    if (!row.ghl_contact_id) continue

    try {
      const tasks = await listGhlContactTasks(
        integration.pit_token,
        integration.location_id,
        row.ghl_contact_id
      )

      for (const task of tasks) {
        const { data: existing } = await admin
          .from('crm_activities')
          .select('id')
          .eq('workspace_id', integration.workspace_id)
          .eq('ghl_task_id', task.id)
          .maybeSingle()

        const payload = mapGhlTaskToActivity(task, integration.workspace_id, {
          customerId: row.kind === 'customer' ? row.id : undefined,
          leadId: row.kind === 'lead' ? row.id : undefined,
        })

        if (existing?.id) {
          const { error } = await admin.from('crm_activities').update(payload).eq('id', existing.id)
          if (error) warnings.push(formatSyncError(error, `Task update ${task.id}`))
          else updated += 1
        } else {
          const { error } = await admin.from('crm_activities').insert(payload)
          if (error) warnings.push(formatSyncError(error, `Task import ${task.id}`))
          else created += 1
        }
      }
    } catch (error) {
      warnings.push(formatSyncError(error, `Tasks for contact ${row.ghl_contact_id}`))
    }
  }

  return { created, updated }
}

async function pullTasks(
  admin: SupabaseClient,
  integration: GhlIntegrationRow,
  warnings: string[]
) {
  const { data: customers } = await admin
    .from('customers')
    .select('id, ghl_contact_id')
    .eq('workspace_id', integration.workspace_id)
    .not('ghl_contact_id', 'is', null)

  const { data: leads } = await admin
    .from('leads')
    .select('id, ghl_contact_id')
    .eq('workspace_id', integration.workspace_id)
    .not('ghl_contact_id', 'is', null)

  const rows = [
    ...(customers ?? []).map((c) => ({ id: c.id, ghl_contact_id: c.ghl_contact_id!, kind: 'customer' as const })),
    ...(leads ?? []).map((l) => ({ id: l.id, ghl_contact_id: l.ghl_contact_id!, kind: 'lead' as const })),
  ]

  return pullTasksForContacts(admin, integration, rows, warnings)
}

async function pushLocalChanges(
  admin: SupabaseClient,
  integration: GhlIntegrationRow,
  warnings: string[]
) {
  let contacts = 0
  let opportunities = 0
  let tasks = 0

  const pipelineId = integration.pipeline_id
  if (!pipelineId) return { contacts, opportunities, tasks }

  const { data: stages } = await admin
    .from('crm_pipeline_stages')
    .select('*')
    .eq('workspace_id', integration.workspace_id)

  const stageRows = (stages ?? []) as CrmPipelineStage[]
  const defaultStage = stageRows.find((s) => !s.is_closed_won && !s.is_closed_lost) ?? stageRows[0]

  const { data: customerRows } = await admin
    .from('customers')
    .select('*')
    .eq('workspace_id', integration.workspace_id)

  for (const customer of (customerRows ?? []) as Customer[]) {
    try {
      const payload = mapCustomerToGhlPayload(customer, integration.location_id)
      if (!hasGhlContactChannel(payload)) {
        warnings.push(`Skipped customer "${customer.name}": needs email or phone for GHL`)
        continue
      }

      if (customer.ghl_contact_id) {
        await updateGhlContact(
          integration.pit_token,
          integration.location_id,
          customer.ghl_contact_id,
          payload
        )
      } else {
        const created = await createGhlContact(integration.pit_token, integration.location_id, payload)
        await admin
          .from('customers')
          .update({ ghl_contact_id: created.id, ghl_last_synced_at: new Date().toISOString() })
          .eq('id', customer.id)
      }
      contacts += 1
    } catch (error) {
      warnings.push(formatSyncError(error, `Push customer "${customer.name}"`))
    }
  }

  const { data: leadRows } = await admin
    .from('leads')
    .select('*')
    .eq('workspace_id', integration.workspace_id)
    .is('converted_customer_id', null)

  for (const lead of (leadRows ?? []) as Lead[]) {
    try {
      const payload = mapLeadToGhlPayload(lead, integration.location_id)
      if (!hasGhlContactChannel(payload)) {
        warnings.push(`Skipped lead "${lead.name}": needs email or phone for GHL`)
        continue
      }

      if (lead.ghl_contact_id) {
        await updateGhlContact(integration.pit_token, integration.location_id, lead.ghl_contact_id, payload)
      } else {
        const created = await createGhlContact(integration.pit_token, integration.location_id, payload)
        await admin
          .from('leads')
          .update({ ghl_contact_id: created.id, ghl_last_synced_at: new Date().toISOString() })
          .eq('id', lead.id)
      }
      contacts += 1
    } catch (error) {
      warnings.push(formatSyncError(error, `Push lead "${lead.name}"`))
    }
  }

  const { data: dealRows } = await admin
    .from('deals')
    .select('*')
    .eq('workspace_id', integration.workspace_id)

  for (const deal of (dealRows ?? []) as Deal[]) {
    try {
      let contactId: string | null = null
      if (deal.customer_id) {
        const { data: customer } = await admin
          .from('customers')
          .select('ghl_contact_id')
          .eq('id', deal.customer_id)
          .maybeSingle()
        contactId = customer?.ghl_contact_id ?? null
      }
      if (!contactId && deal.lead_id) {
        const { data: lead } = await admin
          .from('leads')
          .select('ghl_contact_id')
          .eq('id', deal.lead_id)
          .maybeSingle()
        contactId = lead?.ghl_contact_id ?? null
      }
      if (!contactId) {
        warnings.push(`Skipped deal "${deal.name}": no linked GHL contact`)
        continue
      }

      const stage = stageRows.find((s) => s.id === deal.stage_id) ?? defaultStage
      const pipelineStageId = stage?.ghl_pipeline_stage_id
      if (!pipelineStageId) {
        warnings.push(`Skipped deal "${deal.name}": pipeline stage not mapped to GHL`)
        continue
      }

      const payload = mapDealToGhlPayload(
        deal,
        integration.location_id,
        pipelineId,
        pipelineStageId,
        contactId
      )

      if (deal.ghl_opportunity_id) {
        await updateGhlOpportunity(
          integration.pit_token,
          integration.location_id,
          deal.ghl_opportunity_id,
          payload
        )
      } else {
        const created = await createGhlOpportunity(integration.pit_token, integration.location_id, payload)
        await admin
          .from('deals')
          .update({
            ghl_opportunity_id: created.id,
            ghl_last_synced_at: new Date().toISOString(),
          })
          .eq('id', deal.id)
      }
      opportunities += 1
    } catch (error) {
      warnings.push(formatSyncError(error, `Push deal "${deal.name}"`))
    }
  }

  const { data: activityRows } = await admin
    .from('crm_activities')
    .select('*')
    .eq('workspace_id', integration.workspace_id)
    .in('type', ['task', 'follow_up', 'call', 'meeting'])

  for (const activity of (activityRows ?? []) as CrmActivity[]) {
    try {
      if (!activity.customer_id) continue
      const { data: customer } = await admin
        .from('customers')
        .select('ghl_contact_id')
        .eq('id', activity.customer_id)
        .maybeSingle()
      const contactId = customer?.ghl_contact_id
      if (!contactId) {
        warnings.push(`Skipped activity "${activity.title}": customer not linked to GHL`)
        continue
      }

      const payload = mapActivityToGhlTaskPayload(activity)
      if (activity.ghl_task_id) {
        await updateGhlContactTask(
          integration.pit_token,
          integration.location_id,
          contactId,
          activity.ghl_task_id,
          payload
        )
      } else {
        const created = await createGhlContactTask(
          integration.pit_token,
          integration.location_id,
          contactId,
          payload
        )
        await admin
          .from('crm_activities')
          .update({ ghl_task_id: created.id, ghl_last_synced_at: new Date().toISOString() })
          .eq('id', activity.id)
      }
      tasks += 1
    } catch (error) {
      warnings.push(formatSyncError(error, `Push activity "${activity.title}"`))
    }
  }

  return { contacts, opportunities, tasks }
}

export async function runGhlFullSync(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<GhlSyncResult> {
  const integration = await getGhlIntegrationRow(supabase, workspaceId)
  if (!integration) throw new Error('GoHighLevel is not connected')

  await supabase.rpc('seed_crm_pipeline_stages', { p_workspace_id: workspaceId })

  const warnings: string[] = []

  await updateGhlSyncState(supabase, workspaceId, {
    last_sync_status: 'syncing',
    last_sync_error: null,
  })

  try {
    const { pipelineId, stageMap, count } = await syncPipelineStages(supabase, integration)
    if (pipelineId && pipelineId !== integration.pipeline_id) {
      integration.pipeline_id = pipelineId
    }

    const contacts = await pullContacts(supabase, integration, warnings)
    const opportunities = await pullOpportunities(supabase, integration, stageMap, warnings)
    const tasks = await pullTasks(supabase, integration, warnings)
    const pushed = await pushLocalChanges(supabase, integration, warnings)

    const syncSummary: GhlSyncResult = {
      contacts,
      opportunities,
      tasks,
      pipelines: { stages: count },
      pushed,
      warnings: warnings.length > 0 ? warnings.slice(0, 20) : undefined,
    }

    await updateGhlSyncState(supabase, workspaceId, {
      last_sync_status: 'success',
      last_sync_at: new Date().toISOString(),
      last_sync_error: warnings.length > 0 ? `${warnings.length} item(s) had issues — see sync details` : null,
      pipeline_id: pipelineId,
    })

    return syncSummary
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    await updateGhlSyncState(supabase, workspaceId, {
      last_sync_status: 'error',
      last_sync_error: message,
    })
    throw error
  }
}
