import type { GhlPushEntity } from '@/lib/ghl/push'

export async function pushCrmEntityToGhl(entityType: GhlPushEntity, entityId: string): Promise<void> {
  try {
    await fetch('/api/crm/ghl/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId }),
    })
  } catch {
    // Non-blocking background sync
  }
}
