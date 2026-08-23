import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { createStripeClient } from '@/lib/payments/stripe/client'
import {
  processStripeCharge,
  processStripePaymentIntent,
  processStripeRefund,
} from '@/lib/payments/stripe/sync'
import {
  recordFinanceWebhookEvent,
  updatePaymentWebhookState,
} from '@/lib/finance/integration-store'

export async function handleStripeWebhook(
  admin: SupabaseClient,
  workspaceId: string,
  rawBody: string,
  signature: string,
  webhookSecret: string
): Promise<{ received: boolean; duplicate?: boolean }> {
  const event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

  const isNew = await recordFinanceWebhookEvent(admin, workspaceId, 'stripe', event.id, event.type, event.data.object as unknown as Record<string, unknown>)
  if (!isNew) return { received: true, duplicate: true }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'payment_intent.processing':
      case 'payment_intent.canceled':
        await processStripePaymentIntent(admin, workspaceId, event.data.object as Stripe.PaymentIntent)
        break
      case 'charge.succeeded':
      case 'charge.failed':
        await processStripeCharge(admin, workspaceId, event.data.object as Stripe.Charge)
        break
      case 'charge.refunded':
      case 'refund.created':
      case 'refund.updated': {
        const refund = event.data.object as Stripe.Refund
        let charge: Stripe.Charge | null = null
        if (refund.charge) {
          const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge.id
          const { data: integration } = await admin
            .from('payment_integrations')
            .select('secret_key')
            .eq('workspace_id', workspaceId)
            .eq('provider', 'stripe')
            .maybeSingle()
          if (integration?.secret_key) {
            charge = await createStripeClient(integration.secret_key).charges.retrieve(chargeId)
          }
        }
        await processStripeRefund(admin, workspaceId, refund, charge)
        break
      }
      default:
        break
    }

    await updatePaymentWebhookState(admin, workspaceId, 'stripe', {
      webhook_status: 'healthy',
      webhook_last_error: null,
      last_webhook_at: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await updatePaymentWebhookState(admin, workspaceId, 'stripe', {
      webhook_status: 'error',
      webhook_last_error: message,
      last_webhook_at: new Date().toISOString(),
    })
    throw error
  }

  return { received: true }
}
