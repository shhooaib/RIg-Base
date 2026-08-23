import { createClient } from '@/lib/supabase/server'
import { requirePermission, appBaseUrl } from '@/lib/api/workspace-context'
import { validateStripeConnection } from '@/lib/payments/stripe/client'
import {
  upsertPaymentIntegration,
  getFinanceIntegrationStatus,
  updatePaymentSyncState,
} from '@/lib/finance/integration-store'
import { syncStripePayments } from '@/lib/payments/stripe/sync'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'finance', 'manage')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = await request.json().catch(() => ({}))
  const secretKey = String(body.secretKey ?? body.secret_key ?? '').trim()
  const publishableKey = String(body.publishableKey ?? body.publishable_key ?? '').trim() || null
  const webhookSecret = String(body.webhookSecret ?? body.webhook_secret ?? '').trim() || null

  if (!secretKey) {
    return NextResponse.json({ error: 'Stripe secret key is required' }, { status: 400 })
  }

  try {
    const { accountMode } = await validateStripeConnection(secretKey)

    await upsertPaymentIntegration(supabase, access.workspaceId, {
      provider: 'stripe',
      accountMode,
      publishableKey,
      secretKey,
      webhookSecret,
    })

    const admin = getSupabaseAdminClient()
    let syncResult = null
    if (admin) {
      await updatePaymentSyncState(supabase, access.workspaceId, 'stripe', {
        last_sync_status: 'syncing',
        last_sync_error: null,
      })
      try {
        syncResult = await syncStripePayments(admin, access.workspaceId, secretKey)
        await updatePaymentSyncState(supabase, access.workspaceId, 'stripe', {
          last_sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          last_sync_error: null,
        })
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Initial sync failed'
        await updatePaymentSyncState(supabase, access.workspaceId, 'stripe', {
          last_sync_status: 'error',
          last_sync_at: new Date().toISOString(),
          last_sync_error: message,
        })
      }
    }

    const status = await getFinanceIntegrationStatus(supabase, access.workspaceId)
    const webhookUrl = `${appBaseUrl()}/api/webhooks/stripe/${access.workspaceId}`

    return NextResponse.json({ ...status, webhookUrl, syncResult })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect Stripe'
    if (message.includes('Could not find the function') || message.includes('payment_integrations')) {
      return NextResponse.json(
        {
          error: 'Database migration required: run 019_finance_expansion.sql and 020_payment_integrations_rpc.sql in Supabase, then retry.',
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: message }, { status: 400 })
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

  const { deletePaymentIntegration } = await import('@/lib/finance/integration-store')
  await deletePaymentIntegration(supabase, access.workspaceId, 'stripe')
  const status = await getFinanceIntegrationStatus(supabase, access.workspaceId)
  return NextResponse.json(status)
}
