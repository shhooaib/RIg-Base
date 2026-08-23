import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import {
  updatePaymentSyncState,
  deletePaymentIntegration,
} from '@/lib/finance/integration-store'
import { parseRazorpayError } from '@/lib/payments/razorpay/client'
import { syncRazorpayPayments } from '@/lib/payments/razorpay/sync'
import { isRazorpayAuthError } from '@/lib/payments/razorpay/errors'
import { resolveRazorpayCredentials } from '@/lib/payments/razorpay/credentials'
import { resolveRazorpaySyncClient } from '@/lib/payments/razorpay/sync-client'
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

  const keys = await resolveRazorpayCredentials(supabase, access.workspaceId)
  if (!keys) {
    return NextResponse.json({ error: 'Razorpay is not connected' }, { status: 400 })
  }

  const syncTarget = await resolveRazorpaySyncClient(supabase)
  if (!syncTarget) {
    return NextResponse.json({ error: 'Unable to run payment sync' }, { status: 500 })
  }

  await updatePaymentSyncState(supabase, access.workspaceId, 'razorpay', {
    last_sync_status: 'syncing',
    last_sync_error: null,
  })

  try {
    const result = await syncRazorpayPayments(
      syncTarget.client,
      access.workspaceId,
      keys.keyId,
      keys.keySecret
    )
    await updatePaymentSyncState(supabase, access.workspaceId, 'razorpay', {
      last_sync_status: 'success',
      last_sync_at: new Date().toISOString(),
      last_sync_error: null,
    })
    return NextResponse.json({
      ...result,
      warning: syncTarget.source === 'session' ? syncTarget.warning : undefined,
    })
  } catch (error) {
    const message = parseRazorpayError(error)
    await updatePaymentSyncState(supabase, access.workspaceId, 'razorpay', {
      last_sync_status: 'error',
      last_sync_at: new Date().toISOString(),
      last_sync_error: message,
    })

    if (isRazorpayAuthError(error)) {
      await deletePaymentIntegration(supabase, access.workspaceId, 'razorpay')
      return NextResponse.json(
        {
          error: `Saved API keys are invalid: ${message}. Connection removed — reconnect with fresh keys from Razorpay Dashboard.`,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
