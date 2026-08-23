'use client'

import { useQuery } from '@tanstack/react-query'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import type { GhlIntegrationStatus } from '@/lib/types'

async function fetchGhlStatus(): Promise<GhlIntegrationStatus> {
  const res = await fetch('/api/crm/ghl/status', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load GoHighLevel status')
  return res.json()
}

export function useGhlIntegration() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.ghlStatus,
    queryFn: fetchGhlStatus,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}
