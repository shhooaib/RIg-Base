import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import { seedInventorySupplyChainDemo } from '@/lib/inventory-supply-chain/seed-demo-data'
import { NextResponse } from 'next/server'

async function requireInventorySupplyChainWrite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  let inv = await requirePermission(supabase, userId, 'inventory', 'create')
  if ('error' in inv) {
    inv = await requirePermission(supabase, userId, 'inventory', 'edit')
  }
  if ('error' in inv) return inv

  let sc = await requirePermission(supabase, userId, 'supply_chain', 'create')
  if ('error' in sc) {
    sc = await requirePermission(supabase, userId, 'supply_chain', 'edit')
  }
  if ('error' in sc) return sc

  return { workspaceId: inv.workspaceId }
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await requireInventorySupplyChainWrite(supabase, user.id)
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  try {
    const summary = await seedInventorySupplyChainDemo(supabase, access.workspaceId)
    return NextResponse.json(summary)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load demo data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await requirePermission(supabase, user.id, 'inventory', 'view')
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { data } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('workspace_id', access.workspaceId)
    .eq('order_number', 'DEMO-PO-001')
    .maybeSingle()

  return NextResponse.json({ loaded: !!data })
}
