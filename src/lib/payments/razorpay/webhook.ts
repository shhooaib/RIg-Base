import type { SupabaseClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'
import {
  processRazorpayPayment,
  processRazorpayRefund,
  processRazorpaySettlement,
} from '@/lib/payments/razorpay/sync'
import {
  recordFinanceWebhookEvent,
  updatePaymentWebhookState,
} from '@/lib/finance/integration-store'

export async function handleRazorpayWebhook(
  admin: SupabaseClient,
  workspaceId: string,
  rawBody: string,
  signature: string,
  webhookSecret: string
): Promise<{ received: boolean; duplicate?: boolean }> {
  const valid = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret)
  if (!valid) throw new Error('Invalid Razorpay webhook signature')

  const payload = JSON.parse(rawBody) as {
    event: string
    payload?: {
      payment?: { entity: Record<string, unknown> }
      refund?: { entity: Record<string, unknown> }
      settlement?: { entity: Record<string, unknown> }
    }
  }

  const eventId = `${payload.event}-${JSON.stringify(payload.payload ?? {}).slice(0, 120)}`
  const isNew = await recordFinanceWebhookEvent(admin, workspaceId, 'razorpay', eventId, payload.event, payload as Record<string, unknown>)
  if (!isNew) return { received: true, duplicate: true }

  try {
    const entity = payload.payload?.payment?.entity ?? payload.payload?.refund?.entity ?? payload.payload?.settlement?.entity

    switch (payload.event) {
      case 'payment.captured':
      case 'payment.failed':
      case 'payment.authorized':
        if (payload.payload?.payment?.entity) {
          await processRazorpayPayment(admin, workspaceId, payload.payload.payment.entity as unknown as Parameters<typeof processRazorpayPayment>[2])
        }
        break
      case 'refund.created':
      case 'refund.processed':
        if (payload.payload?.refund?.entity) {
          const r = payload.payload.refund.entity
          await processRazorpayRefund(admin, workspaceId, {
            id: String(r.id),
            payment_id: String(r.payment_id),
            amount: Number(r.amount),
            status: String(r.status ?? 'processed'),
            created_at: r.created_at ? Number(r.created_at) : undefined,
            notes: (r.notes as Record<string, string>) ?? {},
          })
        }
        break
      case 'settlement.processed':
        if (payload.payload?.settlement?.entity) {
          const s = payload.payload.settlement.entity
          await processRazorpaySettlement(admin, workspaceId, {
            id: String(s.id),
            utr: s.utr ? String(s.utr) : undefined,
            amount: Number(s.amount),
            fees: Number(s.fees ?? 0),
            tax: Number(s.tax ?? 0),
            created_at: Number(s.created_at),
          })
        }
        break
      default:
        break
    }

    await updatePaymentWebhookState(admin, workspaceId, 'razorpay', {
      webhook_status: 'healthy',
      webhook_last_error: null,
      last_webhook_at: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await updatePaymentWebhookState(admin, workspaceId, 'razorpay', {
      webhook_status: 'error',
      webhook_last_error: message,
      last_webhook_at: new Date().toISOString(),
    })
    throw error
  }

  return { received: true }
}
