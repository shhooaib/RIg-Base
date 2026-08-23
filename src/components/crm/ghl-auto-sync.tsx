'use client'

import { useGhlAutoSync } from '@/hooks/use-ghl-auto-sync'

/** Keeps CRM data in sync with GoHighLevel while the user is in the CRM module. */
export function GhlAutoSync() {
  useGhlAutoSync()
  return null
}
