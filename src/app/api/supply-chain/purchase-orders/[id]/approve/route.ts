import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import { NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let access = await requirePermission(supabase, user.id, 'supply_chain', 'approve')
  if ('error' in access) {
    access = await requirePermission(supabase, user.id, 'supply_chain', 'edit')
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
  }

  const { data, error } = await supabase.rpc('approve_purchase_order', {
    p_workspace_id: access.workspaceId,
    p_po_id: id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
