import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import {
  updatePaymentSyncState,
  deletePaymentIntegration,
} from '@/lib/finance/integration-store'
import { syncRazorpayPayments } from '@/lib/payments/razorpay/sync'
import {
  verifyRazorpayConnection,
  parseRazorpayError,
  isRazorpayAuthError,
} from '@/lib/payments/razorpay/client'
import { resolveRazorpayCredentials } from '@/lib/payments/razorpay/credentials'
import {
  isSupabaseSyncInfrastructureError,
  resolveRazorpaySyncClient,
} from '@/lib/payments/razorpay/sync-client'
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

async function safeUpdateSyncState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  patch: Parameters<typeof updatePaymentSyncState>[3]
) {
  try {
    await updatePaymentSyncState(supabase, workspaceId, 'razorpay', patch)
  } catch {
    // Non-fatal when RPC or permissions fail during verify
  }
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'finance', 'edit')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const keys = await resolveRazorpayCredentials(supabase, access.workspaceId)
    if (!keys) {
      return NextResponse.json({ error: 'Razorpay is not connected' }, { status: 400 })
    }

    const verification = await verifyRazorpayConnection(keys.keyId, keys.keySecret)
    const syncTarget = await resolveRazorpaySyncClient(supabase)
    if (!syncTarget) {
      return NextResponse.json({ verified: true, verification, syncResult: null })
    }

    await safeUpdateSyncState(supabase, access.workspaceId, {
      last_sync_status: 'syncing',
      last_sync_error: null,
    })

    try {
      const syncResult = await syncRazorpayPayments(
        syncTarget.client,
        access.workspaceId,
        keys.keyId,
        keys.keySecret
      )
      await safeUpdateSyncState(supabase, access.workspaceId, {
        last_sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
      })
      return NextResponse.json({
        verified: true,
        verification,
        syncResult,
        warning: syncTarget.source === 'session' ? syncTarget.warning : undefined,
      })
    } catch (syncError) {
      const message = parseRazorpayError(syncError)

      if (isSupabaseSyncInfrastructureError(message)) {
        await safeUpdateSyncState(supabase, access.workspaceId, {
          last_sync_status: 'idle',
          last_sync_error: null,
        })
        return NextResponse.json({
          verified: true,
          verification,
          syncResult: null,
          warning: syncTarget.source === 'session' ? syncTarget.warning : undefined,
        })
      }

      await safeUpdateSyncState(supabase, access.workspaceId, {
        last_sync_status: 'error',
        last_sync_at: new Date().toISOString(),
        last_sync_error: message,
      })

      if (isRazorpayAuthError(syncError)) {
        try {
          await deletePaymentIntegration(supabase, access.workspaceId, 'razorpay')
        } catch {
          // best effort
        }
        return NextResponse.json(
          {
            error: `Saved API keys are invalid: ${message}. Connection removed — please reconnect with fresh keys from Razorpay.`,
            verified: false,
            source: 'sync',
          },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: message, verified: true, verification, source: 'sync' }, { status: 400 })
    }
  } catch (error) {
    const message = parseRazorpayError(error)

    await safeUpdateSyncState(supabase, access.workspaceId, {
      last_sync_status: 'error',
      last_sync_at: new Date().toISOString(),
      last_sync_error: message,
    })

    if (isRazorpayAuthError(error)) {
      try {
        await deletePaymentIntegration(supabase, access.workspaceId, 'razorpay')
      } catch {
        // best effort
      }
      return NextResponse.json(
        {
          error: `Saved API keys are invalid: ${message}. Connection removed — please reconnect.`,
          verified: false,
          source: 'razorpay',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: message, verified: false, source: 'razorpay' }, { status: 400 })
  }
}
