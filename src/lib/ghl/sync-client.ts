import type { QueryClient } from '@tanstack/react-query'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import type { GhlIntegrationStatus } from '@/lib/types'
import type { GhlSyncResult } from '@/lib/ghl/types'

export const GHL_AUTO_SYNC_INTERVAL_MS = 30_000

export type GhlSyncResponse = GhlIntegrationStatus & {
  syncResult?: GhlSyncResult
  warnings?: string[]
}

export async function runGhlSyncRequest(): Promise<GhlSyncResponse> {
  const res = await fetch('/api/crm/ghl/sync', { method: 'POST', cache: 'no-store' })
  const body = (await res.json()) as GhlSyncResponse & { error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Sync failed')
  return body
}

export function invalidateCrmAfterGhlSync(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.ghlStatus })
  queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.customers })
  queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leads })
  queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.deals })
  queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.activities })
  queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.pipeline })
  queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.overview })
}
