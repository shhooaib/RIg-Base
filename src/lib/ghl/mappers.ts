import type { GhlContact, GhlOpportunity, GhlTask } from '@/lib/ghl/types'
import type { CrmActivity, Customer, Deal, Lead } from '@/lib/types'

const PLACEHOLDER_EMAIL_RE = /@placeholder\.local$/i

export function isPlaceholderGhlEmail(email?: string | null): boolean {
  if (!email?.trim()) return false
  const value = email.trim()
  return PLACEHOLDER_EMAIL_RE.test(value) || value.startsWith('ghl-')
}

export function sanitizeEmailForGhl(email?: string | null): string | undefined {
  if (!email?.trim() || isPlaceholderGhlEmail(email)) return undefined
  return email.trim()
}

export function hasGhlContactChannel(payload: { email?: string; phone?: string }): boolean {
  return Boolean(payload.email?.trim() || payload.phone?.trim())
}

export function stripEmptyFields<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out as Partial<T>
}

export function ghlContactDisplayName(contact: GhlContact): string {
  if (contact.name?.trim()) return contact.name.trim()
  const combined = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
  return combined || 'Unnamed contact'
}

export function splitNameForGhl(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim()
  const space = trimmed.indexOf(' ')
  if (space === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  }
}

export function isGhlLeadContact(contact: GhlContact): boolean {
  const type = contact.type?.toLowerCase()
  if (type === 'lead') return true
  return (contact.tags ?? []).some((tag) => tag.toLowerCase().includes('lead'))
}

export function mapGhlContactToCustomer(
  contact: GhlContact,
  workspaceId: string
): Partial<Customer> & { workspace_id: string } {
  return {
    workspace_id: workspaceId,
    name: ghlContactDisplayName(contact),
    email: contact.email?.trim() || `ghl-${contact.id}@placeholder.local`,
    phone: contact.phone ?? null,
    company: contact.companyName ?? null,
    status: isGhlLeadContact(contact) ? 'lead' : 'active',
    source: contact.source?.trim() || 'GoHighLevel',
    notes: null,
    total_spent: 0,
    ghl_contact_id: contact.id,
    ghl_last_synced_at: new Date().toISOString(),
  }
}

export function mapGhlContactToLead(
  contact: GhlContact,
  workspaceId: string
): Partial<Lead> & { workspace_id: string } {
  return {
    workspace_id: workspaceId,
    name: ghlContactDisplayName(contact),
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    company: contact.companyName ?? null,
    source: contact.source?.trim() || 'GoHighLevel',
    status: 'new',
    lead_score: 0,
    estimated_value: 0,
    notes: null,
    ghl_contact_id: contact.id,
    ghl_last_synced_at: new Date().toISOString(),
  }
}

export function mapCustomerToGhlPayload(customer: Customer, locationId: string) {
  const { firstName, lastName } = splitNameForGhl(customer.name)
  return stripEmptyFields({
    locationId,
    firstName,
    lastName,
    email: sanitizeEmailForGhl(customer.email),
    phone: customer.phone?.trim() || undefined,
    companyName: customer.company?.trim() || undefined,
    source: customer.source?.trim() || 'Rig Base',
    tags: customer.status === 'lead' ? ['lead'] : undefined,
  })
}

export function mapLeadToGhlPayload(lead: Lead, locationId: string) {
  const { firstName, lastName } = splitNameForGhl(lead.name)
  return stripEmptyFields({
    locationId,
    firstName,
    lastName,
    email: sanitizeEmailForGhl(lead.email),
    phone: lead.phone?.trim() || undefined,
    companyName: lead.company?.trim() || undefined,
    source: lead.source?.trim() || 'Rig Base',
    tags: ['lead'],
  })
}

export function mapGhlOpportunityStatus(status?: string): Deal['status'] {
  if (status === 'won') return 'won'
  if (status === 'lost' || status === 'abandoned') return 'lost'
  return 'open'
}

export function mapDealStatusToGhl(status: Deal['status']): string {
  return status
}

export function mapGhlTaskStatus(task: GhlTask): CrmActivity['status'] {
  if (task.completed || task.status === 'completed') return 'completed'
  if (task.status === 'cancelled') return 'cancelled'
  return 'pending'
}

export function mapActivityStatusToGhlTask(status: CrmActivity['status']): { completed: boolean; status: string } {
  if (status === 'completed') return { completed: true, status: 'completed' }
  if (status === 'cancelled') return { completed: false, status: 'cancelled' }
  return { completed: false, status: 'pending' }
}

export function mapGhlOpportunityToDeal(
  opp: GhlOpportunity,
  workspaceId: string,
  stageId: string,
  customerId: string | null
): Partial<Deal> & { workspace_id: string; stage_id: string } {
  return {
    workspace_id: workspaceId,
    name: opp.name,
    customer_id: customerId,
    lead_id: null,
    value: Number(opp.monetaryValue ?? 0),
    stage_id: stageId,
    probability: Number(opp.forecastProbability ?? 0),
    expected_close_date: opp.forecastExpectedCloseDate
      ? normalizeGhlDate(opp.forecastExpectedCloseDate)
      : null,
    assigned_to: null,
    status: mapGhlOpportunityStatus(opp.status),
    product_ids: [],
    notes: null,
    ghl_opportunity_id: opp.id,
    ghl_last_synced_at: new Date().toISOString(),
  }
}

export function mapGhlTaskToActivity(
  task: GhlTask,
  workspaceId: string,
  link: { customerId?: string; leadId?: string }
): Partial<CrmActivity> & { workspace_id: string } {
  const customerId = link.customerId ?? null
  const leadId = link.leadId ?? null
  return {
    workspace_id: workspaceId,
    type: 'task',
    title: task.title?.trim() || 'GHL Task',
    description: task.body ?? null,
    customer_id: customerId,
    lead_id: leadId,
    deal_id: null,
    assigned_to: null,
    priority: 'medium',
    status: mapGhlTaskStatus(task),
    due_at: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    completed_at:
      mapGhlTaskStatus(task) === 'completed' ? new Date().toISOString() : null,
    ghl_task_id: task.id,
    ghl_last_synced_at: new Date().toISOString(),
  }
}

function normalizeGhlDate(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function mapDealToGhlPayload(
  deal: Deal,
  locationId: string,
  pipelineId: string,
  pipelineStageId: string,
  contactId: string
) {
  return stripEmptyFields({
    locationId,
    pipelineId,
    pipelineStageId,
    name: deal.name?.trim() || 'Deal',
    status: mapDealStatusToGhl(deal.status),
    contactId,
    monetaryValue: Number(deal.value ?? 0),
    forecastProbability: deal.probability ?? undefined,
    forecastExpectedCloseDate: deal.expected_close_date ?? undefined,
  })
}

function defaultTaskDueDate(activity: CrmActivity): string {
  if (activity.due_at) {
    const parsed = new Date(activity.due_at)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

export function mapActivityToGhlTaskPayload(activity: CrmActivity) {
  const status = mapActivityStatusToGhlTask(activity.status)
  return {
    title: activity.title?.trim() || 'Task',
    body: activity.description?.trim() || undefined,
    dueDate: defaultTaskDueDate(activity),
    completed: status.completed,
  }
}
