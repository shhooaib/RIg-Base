import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { createStripeClient, mapStripePaymentStatus, stripeAmount } from '@/lib/payments/stripe/client'
import { applyPaymentToInvoice, postLedgerFromPayment } from '@/lib/finance/ledger'
import type { FinancePayment } from '@/lib/finance/types'

async function upsertStripePayment(
  admin: SupabaseClient,
  workspaceId: string,
  row: Partial<FinancePayment> & { provider_payment_id: string }
): Promise<FinancePayment | null> {
  const { data: existing } = await admin
    .from('finance_payments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'stripe')
    .eq('provider_payment_id', row.provider_payment_id)
    .maybeSingle()

  const payload = {
    ...row,
    workspace_id: workspaceId,
    provider: 'stripe' as const,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from('finance_payments')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as FinancePayment
  }

  const { data, error } = await admin.from('finance_payments').insert(payload).select('*').single()
  if (error) throw new Error(error.message)
  return data as FinancePayment
}

export async function syncStripePayments(
  admin: SupabaseClient,
  workspaceId: string,
  secretKey: string
): Promise<{ synced: number }> {
  const stripe = createStripeClient(secretKey)
  let synced = 0
  let startingAfter: string | undefined

  for (let page = 0; page < 20; page++) {
    const intents = await stripe.paymentIntents.list({ limit: 100, starting_after: startingAfter })
    for (const pi of intents.data) {
      await processStripePaymentIntent(admin, workspaceId, pi)
      synced++
    }
    if (!intents.has_more || !intents.data.length) break
    startingAfter = intents.data[intents.data.length - 1]?.id
  }

  return { synced }
}

export async function processStripePaymentIntent(
  admin: SupabaseClient,
  workspaceId: string,
  pi: Stripe.PaymentIntent
): Promise<void> {
  const currency = pi.currency.toUpperCase()
  const amount = stripeAmount(pi.amount, currency)
  const net = stripeAmount(pi.amount_received ?? pi.amount, currency)

  let feeAmount = 0
  let chargeId: string | null = null
  if (pi.latest_charge && typeof pi.latest_charge !== 'string' && pi.latest_charge.balance_transaction) {
    chargeId = pi.latest_charge.id
    const bt = pi.latest_charge.balance_transaction
    if (typeof bt !== 'string') feeAmount = stripeAmount(bt.fee, currency)
  } else if (typeof pi.latest_charge === 'string') {
    chargeId = pi.latest_charge
  }

  const payment = await upsertStripePayment(admin, workspaceId, {
    direction: 'inbound',
    status: mapStripePaymentStatus(pi.status) as FinancePayment['status'],
    amount,
    fee_amount: feeAmount,
    tax_amount: 0,
    net_amount: net - feeAmount,
    currency,
    paid_at: pi.status === 'succeeded' ? new Date(pi.created * 1000).toISOString() : null,
    provider_payment_id: pi.id,
    provider_charge_id: chargeId,
    provider_customer_id: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null,
    payment_method: pi.payment_method_types?.[0] ?? null,
    failure_code: pi.last_payment_error?.code ?? null,
    failure_message: pi.last_payment_error?.message ?? null,
    metadata: (pi.metadata ?? {}) as Record<string, unknown>,
    invoice_id: typeof pi.metadata?.invoice_id === 'string' ? pi.metadata.invoice_id : null,
    customer_id: typeof pi.metadata?.customer_id === 'string' ? pi.metadata.customer_id : null,
    deal_id: typeof pi.metadata?.deal_id === 'string' ? pi.metadata.deal_id : null,
  })

  if (payment?.status === 'succeeded') {
    await postLedgerFromPayment(admin, payment)
    if (payment.invoice_id) await applyPaymentToInvoice(admin, workspaceId, payment.invoice_id, Number(payment.amount))
  }
}

export async function processStripeRefund(
  admin: SupabaseClient,
  workspaceId: string,
  refund: Stripe.Refund,
  charge?: Stripe.Charge | null
): Promise<void> {
  const paymentIntentId =
    typeof refund.payment_intent === 'string'
      ? refund.payment_intent
      : refund.payment_intent?.id ?? null

  let paymentId: string | null = null
  if (paymentIntentId) {
    const { data: payment } = await admin
      .from('finance_payments')
      .select('id, amount, currency')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'stripe')
      .eq('provider_payment_id', paymentIntentId)
      .maybeSingle()
    paymentId = payment?.id ?? null
  }

  if (!paymentId && charge?.id) {
    const { data: payment } = await admin
      .from('finance_payments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'stripe')
      .eq('provider_charge_id', charge.id)
      .maybeSingle()
    paymentId = payment?.id ?? null
  }

  if (!paymentId) return

  const currency = (charge?.currency ?? 'usd').toUpperCase()
  const amount = stripeAmount(refund.amount, currency)

  const { data: existing } = await admin
    .from('finance_refunds')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'stripe')
    .eq('provider_refund_id', refund.id)
    .maybeSingle()

  if (existing?.id) return

  await admin.from('finance_refunds').insert({
    workspace_id: workspaceId,
    payment_id: paymentId,
    amount,
    status: refund.status === 'succeeded' ? 'succeeded' : refund.status === 'failed' ? 'failed' : 'pending',
    reason: refund.reason ?? null,
    provider: 'stripe',
    provider_refund_id: refund.id,
    refunded_at: refund.created ? new Date(refund.created * 1000).toISOString() : null,
    metadata: { charge_id: charge?.id ?? null },
  })

  await admin
    .from('finance_payments')
    .update({
      status: amount >= Number((await admin.from('finance_payments').select('amount').eq('id', paymentId).single()).data?.amount ?? 0)
        ? 'refunded'
        : 'partially_refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
}

export async function processStripeCharge(
  admin: SupabaseClient,
  workspaceId: string,
  charge: Stripe.Charge,
  paymentIntent?: Stripe.PaymentIntent | null
): Promise<void> {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (piId && paymentIntent) {
    await processStripePaymentIntent(admin, workspaceId, paymentIntent)
    return
  }

  const currency = charge.currency.toUpperCase()
  const amount = stripeAmount(charge.amount, currency)
  let feeAmount = 0
  const bt = charge.balance_transaction
  if (bt && typeof bt !== 'string') feeAmount = stripeAmount(bt.fee, currency)

  const payment = await upsertStripePayment(admin, workspaceId, {
    direction: 'inbound',
    status: charge.status === 'succeeded' ? 'succeeded' : charge.status === 'failed' ? 'failed' : 'pending',
    amount,
    fee_amount: feeAmount,
    tax_amount: 0,
    net_amount: amount - feeAmount,
    currency,
    paid_at: charge.created ? new Date(charge.created * 1000).toISOString() : null,
    provider_payment_id: charge.id,
    provider_charge_id: charge.id,
    provider_customer_id: typeof charge.customer === 'string' ? charge.customer : charge.customer?.id ?? null,
    failure_code: charge.failure_code ?? null,
    failure_message: charge.failure_message ?? null,
    metadata: (charge.metadata ?? {}) as Record<string, unknown>,
  })

  if (payment?.status === 'succeeded') await postLedgerFromPayment(admin, payment)
}
