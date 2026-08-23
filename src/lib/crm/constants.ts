export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
  lost: 'Lost',
}

/** Active lifecycle stages shown on the lead board (excludes terminal won/lost). */
export const LEAD_PIPELINE_STATUSES = ['new', 'contacted', 'qualified', 'proposal'] as const

export const DEAL_STATUSES = ['open', 'won', 'lost'] as const
export type DealStatus = (typeof DEAL_STATUSES)[number]

export const ACTIVITY_TYPES = ['call', 'meeting', 'task', 'follow_up', 'email', 'demo', 'other'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  task: 'Task',
  follow_up: 'Follow-up',
  email: 'Email',
  demo: 'Demo',
  other: 'Other',
}

export const ACTIVITY_STATUSES = ['pending', 'completed', 'cancelled'] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export const ACTIVITY_PRIORITIES = ['low', 'medium', 'high'] as const
export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number]

export const CRM_INTERACTION_EVENTS = [
  'lead_created',
  'customer_created',
  'deal_created',
  'deal_stage_changed',
  'call_logged',
  'meeting_completed',
  'email_logged',
  'note_added',
  'task_completed',
  'follow_up_scheduled',
  'deal_won',
  'deal_lost',
  'lead_converted',
] as const

export type CrmInteractionEvent = (typeof CRM_INTERACTION_EVENTS)[number]

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New', position: 0, probability_default: 10, is_closed_won: false, is_closed_lost: false },
  { name: 'Qualified', position: 1, probability_default: 30, is_closed_won: false, is_closed_lost: false },
  { name: 'Proposal', position: 2, probability_default: 50, is_closed_won: false, is_closed_lost: false },
  { name: 'Negotiation', position: 3, probability_default: 75, is_closed_won: false, is_closed_lost: false },
  { name: 'Won', position: 4, probability_default: 100, is_closed_won: true, is_closed_lost: false },
  { name: 'Lost', position: 5, probability_default: 0, is_closed_won: false, is_closed_lost: true },
] as const

export const CRM_QUERY_KEYS = {
  customers: ['customers'] as const,
  leads: ['crm-leads'] as const,
  deals: ['crm-deals'] as const,
  activities: ['crm-activities'] as const,
  notes: (entity: string, id: string) => ['crm-notes', entity, id] as const,
  interactions: (entity: string, id: string) => ['crm-interactions', entity, id] as const,
  pipeline: ['crm-pipeline'] as const,
  tags: ['crm-tags'] as const,
  overview: ['crm-overview'] as const,
  ghlStatus: ['crm-ghl-status'] as const,
}

export const GHL_CORE_MODULES = [
  { key: 'contacts', label: 'Contacts', description: 'Sync customers and leads with GHL contacts' },
  { key: 'opportunities', label: 'Opportunities', description: 'Deals pipeline mapped to GHL opportunities' },
  { key: 'tasks', label: 'Tasks', description: 'CRM activities sync as contact tasks' },
  { key: 'pipelines', label: 'Pipelines', description: 'Pipeline stages imported from your GHL sub-account' },
] as const

export const ZOHO_CORE_MODULES = [
  { key: 'contacts', label: 'Contacts', description: 'Customers and leads mapped from Zoho Contacts & Leads' },
  { key: 'deals', label: 'Deals', description: 'Pipeline stages and deal values synced to Rig Base deals' },
  { key: 'accounts', label: 'Accounts', description: 'Company records linked to customers and opportunities' },
  { key: 'activities', label: 'Activities', description: 'Calls, meetings, and tasks attached to CRM records' },
] as const
