export type GhlSyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface GhlIntegrationRow {
  id: string
  workspace_id: string
  location_id: string
  location_name: string | null
  pipeline_id: string | null
  pit_token: string
  connected_at: string
  last_sync_at: string | null
  last_sync_status: GhlSyncStatus
  last_sync_error: string | null
}

export interface GhlIntegrationStatus {
  connected: boolean
  locationId: string | null
  locationName: string | null
  pipelineId: string | null
  connectedAt: string | null
  lastSyncAt: string | null
  lastSyncStatus: GhlSyncStatus
  lastSyncError: string | null
}

export interface GhlLocation {
  id: string
  name?: string
  companyId?: string
}

export interface GhlContact {
  id: string
  locationId?: string
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phone?: string
  companyName?: string
  source?: string
  tags?: string[]
  type?: string
  dateAdded?: string
}

export interface GhlPipelineStage {
  id: string
  name: string
  position?: number
}

export interface GhlPipeline {
  id: string
  name: string
  stages: GhlPipelineStage[]
}

export interface GhlOpportunity {
  id: string
  name: string
  pipelineId?: string
  pipelineStageId?: string
  status?: string
  contactId?: string
  monetaryValue?: number
  assignedTo?: string
  forecastExpectedCloseDate?: string
  forecastProbability?: number
}

export interface GhlTask {
  id: string
  title?: string
  body?: string
  dueDate?: string
  completed?: boolean
  status?: string
}

export interface GhlSyncResult {
  contacts: { created: number; updated: number }
  opportunities: { created: number; updated: number }
  tasks: { created: number; updated: number }
  pipelines: { stages: number }
  pushed: { contacts: number; opportunities: number; tasks: number }
  warnings?: string[]
}
