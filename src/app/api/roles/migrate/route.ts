import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceAccess } from '@/lib/api/workspace-context'
import { ensureUniversalRoles } from '@/lib/rbac/ensure-universal-roles'
import { resolveWorkspaceForUser } from '@/lib/workspace-access'
import { resolveServerPermissions, userCan } from '@/lib/rbac/server-permissions'
import { NextResponse } from 'next/server'
import type { WorkspaceModules } from '@/lib/rbac/types'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requireWorkspaceAccess(supabase, user.id)
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const ctx = await resolveServerPermissions(supabase, user.id)
  if (!ctx) return NextResponse.json({ error: 'No workspace context' }, { status: 404 })

  if (!ctx.isOwner && !userCan(ctx, 'settings', 'manage') && !userCan(ctx, 'hr', 'manage')) {
    return NextResponse.json({ error: 'Only owners and administrators can sync roles' }, { status: 403 })
  }

  const resolved = await resolveWorkspaceForUser(supabase, user.id)
  if (!resolved) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  try {
    await ensureUniversalRoles(supabase, resolved.workspace.id, resolved.workspace.modules as WorkspaceModules)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Migration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
