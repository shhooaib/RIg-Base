import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'inventory', 'edit')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = await request.json()
  const { product_id, movement_type, quantity, notes, reference_type, reference_id } = body

  if (!product_id || !movement_type || quantity == null) {
    return NextResponse.json({ error: 'product_id, movement_type, and quantity are required' }, { status: 400 })
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('quantity, cost_price')
    .eq('id', product_id)
    .eq('workspace_id', access.workspaceId)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  let quantityDelta = Number(quantity)

  if (movement_type === 'adjustment') {
    quantityDelta = Number(quantity) - product.quantity
  } else if (['stock_out', 'return_out'].includes(movement_type)) {
    quantityDelta = -Math.abs(Number(quantity))
  } else {
    quantityDelta = Math.abs(Number(quantity))
  }

  const { data: movementId, error } = await supabase.rpc('record_inventory_movement', {
    p_workspace_id: access.workspaceId,
    p_product_id: product_id,
    p_movement_type: movement_type,
    p_quantity_delta: quantityDelta,
    p_unit_cost: product.cost_price ?? null,
    p_reference_type: reference_type ?? null,
    p_reference_id: reference_id ?? null,
    p_notes: notes ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ movement_id: movementId })
}
