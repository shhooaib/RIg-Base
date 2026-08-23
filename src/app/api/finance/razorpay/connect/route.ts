import { createClient } from '@/lib/supabase/server'
import { requirePermission, appBaseUrl } from '@/lib/api/workspace-context'
import {
  verifyRazorpayConnection,
  normalizeRazorpayCredentials,
  parseRazorpayError,
  isRazorpayAuthError,
  RazorpayConnectError,
} from '@/lib/payments/razorpay/client'
import {
  upsertPaymentIntegration,
  getFinanceIntegrationStatus,
  updatePaymentSyncState,
  deletePaymentIntegration,
  getPaymentIntegrationCredentialsAdmin,
} from '@/lib/finance/integration-store'
import { syncRazorpayPayments } from '@/lib/payments/razorpay/sync'
import { getSupabaseAdminClient, isSupabaseServiceRoleError, INVALID_SUPABASE_SECRET_KEY_MESSAGE } from '@/lib/supabase/admin'
import { resolveRazorpaySyncClient } from '@/lib/payments/razorpay/sync-client'
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

async function rollbackRazorpay(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
) {
  try {
    await deletePaymentIntegration(supabase, workspaceId, 'razorpay')
  } catch {
    // best effort
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'finance', 'manage')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = await request.json().catch(() => ({}))
  const webhookSecret = String(body.webhookSecret ?? body.webhook_secret ?? '').trim() || null

  let creds
  try {
    creds = normalizeRazorpayCredentials(
      String(body.keyId ?? body.publishableKey ?? body.key_id ?? ''),
      String(body.keySecret ?? body.secretKey ?? body.key_secret ?? '')
    )
  } catch (error) {
    const message = error instanceof RazorpayConnectError ? error.message : 'Invalid Razorpay credentials'
    return NextResponse.json({ error: message, source: 'validation' }, { status: 400 })
  }

  try {
    // Step 1: Verify with Razorpay before saving anything
    const verification = await verifyRazorpayConnection(creds.keyId, creds.keySecret)

    const admin = getSupabaseAdminClient()
    let syncResult: { synced: number } | null = null
    let serviceRoleWarning: string | null = null
    const syncTarget = await resolveRazorpaySyncClient(supabase)

    // Step 2: Full sync test with the same keys (still nothing saved yet)
    if (syncTarget) {
      try {
        syncResult = await syncRazorpayPayments(
          syncTarget.client,
          access.workspaceId,
          creds.keyId,
          creds.keySecret
        )
        if (syncTarget.source === 'session') {
          serviceRoleWarning = syncTarget.warning
        }
      } catch (syncError) {
        const message = parseRazorpayError(syncError)
        if (isSupabaseServiceRoleError(message)) {
          serviceRoleWarning = INVALID_SUPABASE_SECRET_KEY_MESSAGE
        } else {
          return NextResponse.json(
            {
              error: isRazorpayAuthError(syncError)
                ? `Razorpay rejected your API keys: ${message}. Nothing was saved. Regenerate keys in Dashboard → Account & Settings → API Keys (Test Mode on for test keys).`
                : `Could not connect to Razorpay: ${message}. Nothing was saved.`,
              source: 'razorpay',
              verified: false,
            },
            { status: 400 }
          )
        }
      }
    }

    // Step 3: Save only after live verification (+ sync when admin is available)
    await upsertPaymentIntegration(supabase, access.workspaceId, {
      provider: 'razorpay',
      accountMode: verification.accountMode,
      publishableKey: creds.keyId,
      secretKey: creds.keySecret,
      webhookSecret,
    })

    // Step 4: Round-trip — read back from DB and verify stored secrets match what Razorpay accepts
    if (admin && !serviceRoleWarning) {
      const stored = await getPaymentIntegrationCredentialsAdmin(admin, access.workspaceId, 'razorpay')
      const storedKeyId = stored?.publishable_key?.trim() ?? ''
      const storedSecret = stored?.secret_key?.trim() ?? ''

      if (!storedKeyId || !storedSecret) {
        await rollbackRazorpay(supabase, access.workspaceId)
        return NextResponse.json(
          {
            error: 'Credentials could not be stored correctly. Please try again.',
            source: 'storage',
            verified: false,
          },
          { status: 500 }
        )
      }

      try {
        await verifyRazorpayConnection(storedKeyId, storedSecret)
      } catch (roundTripError) {
        await rollbackRazorpay(supabase, access.workspaceId)
        const message = parseRazorpayError(roundTripError)
        return NextResponse.json(
          {
            error: `Stored credentials failed verification: ${message}. Nothing was saved.`,
            source: 'storage',
            verified: false,
          },
          { status: 400 }
        )
      }

      await updatePaymentSyncState(supabase, access.workspaceId, 'razorpay', {
        last_sync_status: 'success',
        last_sync_at: new Date().toISOString(),
        last_sync_error: null,
      })
    } else {
      await updatePaymentSyncState(supabase, access.workspaceId, 'razorpay', {
        last_sync_status: syncResult ? 'success' : 'idle',
        last_sync_at: syncResult ? new Date().toISOString() : null,
        last_sync_error: null,
      })
    }

    const status = await getFinanceIntegrationStatus(supabase, access.workspaceId)
    const webhookUrl = `${appBaseUrl()}/api/webhooks/razorpay/${access.workspaceId}`

    return NextResponse.json({
      ...status,
      webhookUrl,
      verified: true,
      verification,
      syncResult,
      warning:
        serviceRoleWarning ??
        (syncTarget?.source === 'session' ? syncTarget.warning : admin ? null : INVALID_SUPABASE_SECRET_KEY_MESSAGE),
    })
  } catch (error) {
    await rollbackRazorpay(supabase, access.workspaceId)
    const message = parseRazorpayError(error)
    return NextResponse.json(
      {
        error: isRazorpayAuthError(error)
          ? `Razorpay rejected your API keys: ${message}. Check Key ID (rzp_test_…) and Key Secret from the dashboard — they are two different values.`
          : message,
        source: error instanceof RazorpayConnectError ? 'validation' : 'razorpay',
        verified: false,
      },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'finance', 'manage')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  await deletePaymentIntegration(supabase, access.workspaceId, 'razorpay')
  const status = await getFinanceIntegrationStatus(supabase, access.workspaceId)
  return NextResponse.json(status)
}
