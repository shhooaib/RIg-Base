import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeGhlLocationId, normalizeGhlToken } from '@/lib/ghl/shared'
import type { GhlIntegrationRow, GhlIntegrationStatus } from '@/lib/ghl/types'
import type { GhlIntegrationStatus as PublicStatus } from '@/lib/types'

export function toPublicGhlStatus(row: GhlIntegrationRow | null): GhlIntegrationStatus {
  if (!row) {
    return {
      connected: false,
      locationId: null,
      locationName: null,
      pipelineId: null,
      connectedAt: null,
      lastSyncAt: null,
      lastSyncStatus: 'idle',
      lastSyncError: null,
    }
  }

  return {
    connected: true,
    locationId: row.location_id,
    locationName: row.location_name,
    pipelineId: row.pipeline_id,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
  }
}

function rowFromCredentialsJson(data: unknown): GhlIntegrationRow | null {
  if (!data || typeof data !== 'object') return null
  return data as GhlIntegrationRow
}

export async function getGhlIntegrationStatusPublic(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<PublicStatus> {
  const { data, error } = await supabase.rpc('get_ghl_integration_status', {
    p_workspace_id: workspaceId,
  })

  if (error) throw new Error(error.message)

  if (!data || typeof data !== 'object' || !(data as { connected?: boolean }).connected) {
    return {
      connected: false,
      locationId: null,
      locationName: null,
      pipelineId: null,
      connectedAt: null,
      lastSyncAt: null,
      lastSyncStatus: 'idle',
      lastSyncError: null,
    }
  }

  const row = data as Record<string, unknown>
  return {
    connected: true,
    locationId: (row.locationId as string) ?? null,
    locationName: (row.locationName as string) ?? null,
    pipelineId: (row.pipelineId as string) ?? null,
    connectedAt: (row.connectedAt as string) ?? null,
    lastSyncAt: (row.lastSyncAt as string) ?? null,
    lastSyncStatus: (row.lastSyncStatus as PublicStatus['lastSyncStatus']) ?? 'idle',
    lastSyncError: (row.lastSyncError as string) ?? null,
  }
}

export async function getGhlIntegrationRow(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<GhlIntegrationRow | null> {
  const { data, error } = await supabase.rpc('get_ghl_integration_credentials', {
    p_workspace_id: workspaceId,
  })

  if (error) throw new Error(error.message)
  return rowFromCredentialsJson(data)
}

export async function upsertGhlIntegration(
  supabase: SupabaseClient,
  workspaceId: string,
  input: {
    locationId: string
    locationName: string | null
    pipelineId: string | null
    pitToken: string
  }
): Promise<void> {
  const { error } = await supabase.rpc('upsert_ghl_integration', {
    p_workspace_id: workspaceId,
    p_location_id: normalizeGhlLocationId(input.locationId),
    p_location_name: input.locationName,
    p_pipeline_id: input.pipelineId,
    p_pit_token: normalizeGhlToken(input.pitToken),
  })

  if (error) throw new Error(error.message)
}

export async function deleteGhlIntegration(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<void> {
  const { error } = await supabase.rpc('delete_ghl_integration', {
    p_workspace_id: workspaceId,
  })
  if (error) throw new Error(error.message)
}

export async function updateGhlSyncState(
  supabase: SupabaseClient,
  workspaceId: string,
  patch: {
    last_sync_status?: GhlIntegrationRow['last_sync_status']
    last_sync_at?: string | null
    last_sync_error?: string | null
    pipeline_id?: string | null
    location_name?: string | null
  }
): Promise<void> {
  const { error } = await supabase.rpc('update_ghl_integration_sync_state', {
    p_workspace_id: workspaceId,
    p_last_sync_status: patch.last_sync_status ?? null,
    p_last_sync_at: patch.last_sync_at ?? null,
    p_last_sync_error: patch.last_sync_error ?? null,
    p_pipeline_id: patch.pipeline_id ?? null,
    p_location_name: patch.location_name ?? null,
  })

  if (error) throw new Error(error.message)
}
