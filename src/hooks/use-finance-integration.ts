'use client'

import { useQuery } from '@tanstack/react-query'
import { FINANCE_QUERY_KEYS } from '@/lib/finance/constants'
import type { FinanceIntegrationStatus } from '@/lib/finance/types'

async function fetchFinanceIntegrationStatus(): Promise<FinanceIntegrationStatus> {
  const res = await fetch('/api/finance/integrations/status', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load integration status')
  return res.json()
}

export function useFinanceIntegration() {
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.integrationStatus,
    queryFn: fetchFinanceIntegrationStatus,
    staleTime: 60_000,
  })
}
