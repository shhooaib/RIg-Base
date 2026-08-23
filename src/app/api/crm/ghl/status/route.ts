import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import { getGhlIntegrationStatusPublic } from '@/lib/ghl/integration-store'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'crm', 'view')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const status = await getGhlIntegrationStatusPublic(supabase, access.workspaceId)
    return NextResponse.json(status)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
