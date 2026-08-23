import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import { getGhlIntegrationStatusPublic } from '@/lib/ghl/integration-store'
import { runGhlFullSync } from '@/lib/ghl/sync'
import { GhlApiError } from '@/lib/ghl/shared'
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'crm', 'edit')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const syncResult = await runGhlFullSync(supabase, access.workspaceId)
    const status = await getGhlIntegrationStatusPublic(supabase, access.workspaceId)
    return NextResponse.json({ ...status, syncResult })
  } catch (error) {
    const message =
      error instanceof GhlApiError
        ? `${error.message} (GoHighLevel ${error.status})`
        : error instanceof Error
          ? error.message
          : 'Sync failed'
    const status = await getGhlIntegrationStatusPublic(supabase, access.workspaceId)
    return NextResponse.json({ error: message, ...status }, { status: 500 })
  }
}
