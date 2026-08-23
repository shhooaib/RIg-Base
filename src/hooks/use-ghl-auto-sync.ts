'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  GHL_AUTO_SYNC_INTERVAL_MS,
  invalidateCrmAfterGhlSync,
  runGhlSyncRequest,
} from '@/lib/ghl/sync-client'
import { useGhlIntegration } from '@/hooks/use-ghl-integration'
import { usePermissions } from '@/hooks/use-permissions'

export function useGhlAutoSync() {
  const queryClient = useQueryClient()
  const { data: status, isPending: statusLoading } = useGhlIntegration()
  const { can, isLoading: permissionsLoading } = usePermissions()
  const syncingRef = useRef(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const connected = status?.connected ?? false
  const canSync = can('crm', 'edit')
  const enabled = connected && canSync && !statusLoading && !permissionsLoading

  const performSync = useCallback(
    async (_reason: 'mount' | 'interval' | 'visible') => {
      if (!enabled || syncingRef.current) return

      syncingRef.current = true
      setIsSyncing(true)
      try {
        await runGhlSyncRequest()
        invalidateCrmAfterGhlSync(queryClient)
      } catch (error) {
        console.error('[GHL auto-sync]', error)
      } finally {
        syncingRef.current = false
        setIsSyncing(false)
      }
    },
    [enabled, queryClient]
  )

  useEffect(() => {
    if (!enabled) return

    void performSync('mount')

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void performSync('interval')
      }
    }, GHL_AUTO_SYNC_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void performSync('visible')
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, performSync])

  return { enabled, isSyncing, intervalMs: GHL_AUTO_SYNC_INTERVAL_MS }
}
