import type {
  GhlContact,
  GhlLocation,
  GhlOpportunity,
  GhlPipeline,
  GhlTask,
} from '@/lib/ghl/types'
import { ghlRequestWithResolvedAuth, resolveGhlApiToken } from '@/lib/ghl/auth'
import { GhlApiError, normalizeGhlLocationId, normalizeGhlToken } from '@/lib/ghl/shared'

export { GhlApiError, normalizeGhlToken, normalizeGhlLocationId }

function normalizeGhlOpportunity(raw: Record<string, unknown>): GhlOpportunity {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Untitled opportunity'),
    pipelineId: (raw.pipelineId ?? raw.pipeline_id) as string | undefined,
    pipelineStageId: (raw.pipelineStageId ?? raw.pipeline_stage_id) as string | undefined,
    status: raw.status as string | undefined,
    contactId: (raw.contactId ?? raw.contact_id) as string | undefined,
    monetaryValue: Number(raw.monetaryValue ?? raw.monetary_value ?? 0),
    assignedTo: (raw.assignedTo ?? raw.assigned_to) as string | undefined,
    forecastExpectedCloseDate: (raw.forecastExpectedCloseDate ??
      raw.forecast_expected_close_date) as string | undefined,
    forecastProbability: Number(raw.forecastProbability ?? raw.forecast_probability ?? 0),
  }
}

function normalizeGhlContact(raw: Record<string, unknown>): GhlContact {
  return {
    id: String(raw.id ?? ''),
    locationId: (raw.locationId ?? raw.location_id) as string | undefined,
    firstName: (raw.firstName ?? raw.first_name) as string | undefined,
    lastName: (raw.lastName ?? raw.last_name) as string | undefined,
    name: raw.name as string | undefined,
    email: raw.email as string | undefined,
    phone: raw.phone as string | undefined,
    companyName: (raw.companyName ?? raw.company_name) as string | undefined,
    source: raw.source as string | undefined,
    tags: raw.tags as string[] | undefined,
    type: raw.type as string | undefined,
    dateAdded: (raw.dateAdded ?? raw.date_added) as string | undefined,
  }
}

function normalizeGhlTask(raw: Record<string, unknown>): GhlTask {
  return {
    id: String(raw.id ?? ''),
    title: raw.title as string | undefined,
    body: raw.body as string | undefined,
    dueDate: (raw.dueDate ?? raw.due_date) as string | undefined,
    completed: Boolean(raw.completed),
    status: raw.status as string | undefined,
  }
}

async function withToken<T>(
  pitToken: string,
  locationId: string,
  fn: (token: string, locId: string) => Promise<T>
): Promise<T> {
  const token = await resolveGhlApiToken(pitToken, locationId)
  return fn(token, normalizeGhlLocationId(locationId))
}

export async function validateGhlConnection(pitToken: string, locationId: string): Promise<GhlLocation> {
  const locId = normalizeGhlLocationId(locationId)
  await resolveGhlApiToken(pitToken, locId)

  try {
    const data = await withToken(pitToken, locId, (token, id) =>
      ghlRequestWithResolvedAuth<{ location?: GhlLocation } | GhlLocation>(
        token,
        id,
        `/locations/${id}`
      )
    )
    if ('location' in data && data.location) return data.location
    return data as GhlLocation
  } catch {
    return { id: locId, name: undefined }
  }
}

export async function listGhlContacts(pitToken: string, locationId: string): Promise<GhlContact[]> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const contacts: GhlContact[] = []
    let page = 1
    const limit = 100

    while (true) {
      const data = await ghlRequestWithResolvedAuth<{ contacts?: GhlContact[] }>(
        token,
        locId,
        '/contacts/',
        { query: { locationId: locId, limit, page } }
      )
      const batch = (data.contacts ?? []).map((c) =>
        normalizeGhlContact(c as unknown as Record<string, unknown>)
      )
      contacts.push(...batch)
      if (batch.length < limit) break
      page += 1
      if (page > 50) break
    }

    return contacts
  })
}

export async function createGhlContact(
  pitToken: string,
  locationId: string,
  payload: Record<string, unknown>
): Promise<GhlContact> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ contact?: GhlContact } | GhlContact>(
      token,
      locId,
      '/contacts/',
      { method: 'POST', body: JSON.stringify({ ...payload, locationId: locId }) }
    )
    if ('contact' in data && data.contact) return data.contact
    return data as GhlContact
  })
}

export async function updateGhlContact(
  pitToken: string,
  locationId: string,
  contactId: string,
  payload: Record<string, unknown>
): Promise<GhlContact> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ contact?: GhlContact } | GhlContact>(
      token,
      locId,
      `/contacts/${contactId}`,
      { method: 'PUT', body: JSON.stringify({ ...payload, locationId: locId }) }
    )
    if ('contact' in data && data.contact) return data.contact
    return data as GhlContact
  })
}

export async function listGhlPipelines(pitToken: string, locationId: string): Promise<GhlPipeline[]> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ pipelines?: GhlPipeline[] }>(
      token,
      locId,
      '/opportunities/pipelines',
      { query: { locationId: locId } }
    )
    return data.pipelines ?? []
  })
}

export async function listGhlOpportunities(pitToken: string, locationId: string): Promise<GhlOpportunity[]> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const opportunities: GhlOpportunity[] = []
    let page = 1
    const limit = 100
    let startAfterId: string | undefined

    while (true) {
      const query: Record<string, string | number | boolean | undefined> = {
        location_id: locId,
        limit,
        status: 'all',
      }

      if (startAfterId) {
        query.startAfterId = startAfterId
      } else if (page > 1) {
        query.page = page
      }

      const data = await ghlRequestWithResolvedAuth<{ opportunities?: Record<string, unknown>[] }>(
        token,
        locId,
        '/opportunities/search',
        { query }
      )
      const batch = (data.opportunities ?? []).map(normalizeGhlOpportunity)
      opportunities.push(...batch)
      if (batch.length < limit) break

      const last = batch[batch.length - 1]
      if (last?.id) {
        startAfterId = last.id
      } else {
        page += 1
      }

      if (page > 50) break
    }

    return opportunities
  })
}

export async function createGhlOpportunity(
  pitToken: string,
  locationId: string,
  payload: Record<string, unknown>
): Promise<GhlOpportunity> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ opportunity?: GhlOpportunity } | GhlOpportunity>(
      token,
      locId,
      '/opportunities/',
      { method: 'POST', body: JSON.stringify({ ...payload, locationId: locId }) }
    )
    if ('opportunity' in data && data.opportunity) return data.opportunity
    return data as GhlOpportunity
  })
}

export async function updateGhlOpportunity(
  pitToken: string,
  locationId: string,
  opportunityId: string,
  payload: Record<string, unknown>
): Promise<GhlOpportunity> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ opportunity?: GhlOpportunity } | GhlOpportunity>(
      token,
      locId,
      `/opportunities/${opportunityId}`,
      { method: 'PUT', body: JSON.stringify({ ...payload, locationId: locId }) }
    )
    if ('opportunity' in data && data.opportunity) return data.opportunity
    return data as GhlOpportunity
  })
}

export async function listGhlContactTasks(
  pitToken: string,
  locationId: string,
  contactId: string
): Promise<GhlTask[]> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ tasks?: GhlTask[] }>(
      token,
      locId,
      `/contacts/${contactId}/tasks`
    )
    return (data.tasks ?? []).map((t) => normalizeGhlTask(t as unknown as Record<string, unknown>))
  })
}

export async function createGhlContactTask(
  pitToken: string,
  locationId: string,
  contactId: string,
  payload: Record<string, unknown>
): Promise<GhlTask> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ task?: GhlTask } | GhlTask>(
      token,
      locId,
      `/contacts/${contactId}/tasks`,
      { method: 'POST', body: JSON.stringify(payload) }
    )
    if ('task' in data && data.task) return data.task
    return data as GhlTask
  })
}

export async function updateGhlContactTask(
  pitToken: string,
  locationId: string,
  contactId: string,
  taskId: string,
  payload: Record<string, unknown>
): Promise<GhlTask> {
  return withToken(pitToken, locationId, async (token, locId) => {
    const data = await ghlRequestWithResolvedAuth<{ task?: GhlTask } | GhlTask>(
      token,
      locId,
      `/contacts/${contactId}/tasks/${taskId}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    )
    if ('task' in data && data.task) return data.task
    return data as GhlTask
  })
}
