import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import {
  getPaymentIntegrationCredentials,
  updatePaymentSyncState,
} from '@/lib/finance/integration-store'
import { syncStripePayments } from '@/lib/payments/stripe/sync'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'finance', 'edit')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const creds = await getPaymentIntegrationCredentials(supabase, access.workspaceId, 'stripe')
  if (!creds) return NextResponse.json({ error: 'Stripe is not connected' }, { status: 400 })

  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for payment sync' },
      { status: 500 }
    )
  }

  await updatePaymentSyncState(supabase, access.workspaceId, 'stripe', {
    last_sync_status: 'syncing',
    last_sync_error: null,
  })

  try {
    const result = await syncStripePayments(admin, access.workspaceId, creds.secret_key)
    await updatePaymentSyncState(supabase, access.workspaceId, 'stripe', {
      last_sync_status: 'success',
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    await updatePaymentSyncState(supabase, access.workspaceId, 'stripe', {
      last_sync_status: 'error',
      last_sync_at: new Date().toISOString(),
      last_sync_error: message,
    })
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
