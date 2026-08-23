import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import { pushEntityToGhl, type GhlPushEntity } from '@/lib/ghl/push'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_ENTITIES: GhlPushEntity[] = ['customer', 'lead', 'deal', 'activity']

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'crm', 'edit')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = await request.json().catch(() => ({}))
  const entityType = body.entityType as GhlPushEntity
  const entityId = String(body.entityId ?? '')

  if (!VALID_ENTITIES.includes(entityType) || !entityId) {
    return NextResponse.json({ error: 'Invalid entity' }, { status: 400 })
  }

  try {
    await pushEntityToGhl(supabase, access.workspaceId, entityType, entityId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Push to GoHighLevel failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
