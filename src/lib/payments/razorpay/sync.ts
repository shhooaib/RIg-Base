import type { SupabaseClient } from '@supabase/supabase-js'
import { createRazorpayClient, mapRazorpayPaymentStatus, razorpayAmount } from '@/lib/payments/razorpay/client'
import { parseRazorpayError } from '@/lib/payments/razorpay/errors'
import { applyPaymentToInvoice, postLedgerFromPayment } from '@/lib/finance/ledger'
import type { FinancePayment } from '@/lib/finance/types'

interface RazorpayPaymentEntity {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  order_id?: string
  invoice_id?: string
  method?: string
  fee?: number
  tax?: number
  error_code?: string
  error_description?: string
  created_at: number
  notes?: Record<string, string>
  acquirer_data?: { utr?: string }
}

async function upsertRazorpayPayment(
  admin: SupabaseClient,
  workspaceId: string,
  row: Partial<FinancePayment> & { provider_payment_id: string }
): Promise<FinancePayment | null> {
  const { data: existing } = await admin
    .from('finance_payments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'razorpay')
    .eq('provider_payment_id', row.provider_payment_id)
    .maybeSingle()

  const payload = {
    ...row,
    workspace_id: workspaceId,
    provider: 'razorpay' as const,
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

export async function syncRazorpayPayments(
  admin: SupabaseClient,
  workspaceId: string,
  keyId: string,
  keySecret: string
): Promise<{ synced: number }> {
  if (!keyId?.trim()) {
    throw new Error('Razorpay Key ID is missing from saved integration. Reconnect with your Key ID and Key Secret.')
  }

  const client = createRazorpayClient(keyId.trim(), keySecret.trim())
  let synced = 0
  let skip = 0

  try {
    for (let page = 0; page < 20; page++) {
      const batch = (await client.payments.all({ count: 100, skip })) as { items: RazorpayPaymentEntity[] }
      const items = batch.items ?? []
      for (const payment of items) {
        await processRazorpayPayment(admin, workspaceId, payment)
        synced++
      }
      if (items.length < 100) break
      skip += items.length
    }
  } catch (err) {
    throw new Error(parseRazorpayError(err))
  }

  return { synced }
}

export async function processRazorpayPayment(
  admin: SupabaseClient,
  workspaceId: string,
  rp: RazorpayPaymentEntity
): Promise<void> {
  const amount = razorpayAmount(rp.amount)
  const fee = razorpayAmount(rp.fee ?? 0)
  const tax = razorpayAmount(rp.tax ?? 0)
  const notes = rp.notes ?? {}

  const payment = await upsertRazorpayPayment(admin, workspaceId, {
    direction: 'inbound',
    status: mapRazorpayPaymentStatus(rp.status) as FinancePayment['status'],
    amount,
    fee_amount: fee,
    tax_amount: tax,
    net_amount: amount - fee - tax,
    currency: (rp.currency ?? 'INR').toUpperCase(),
    paid_at: ['captured', 'authorized'].includes(rp.status)
      ? new Date(rp.created_at * 1000).toISOString()
      : null,
    provider_payment_id: rp.id,
    provider_order_id: rp.order_id ?? null,
    provider_utr: rp.acquirer_data?.utr ?? null,
    payment_method: rp.method ?? null,
    failure_code: rp.error_code ?? null,
    failure_message: rp.error_description ?? null,
    metadata: notes as Record<string, unknown>,
    invoice_id: notes.invoice_id ?? null,
    customer_id: notes.customer_id ?? null,
    deal_id: notes.deal_id ?? null,
  })

  if (payment?.status === 'succeeded') {
    await postLedgerFromPayment(admin, payment)
    if (payment.invoice_id) await applyPaymentToInvoice(admin, workspaceId, payment.invoice_id, Number(payment.amount))
  }
}

export async function processRazorpayRefund(
  admin: SupabaseClient,
  workspaceId: string,
  refund: { id: string; payment_id: string; amount: number; status: string; created_at?: number; notes?: Record<string, string> }
): Promise<void> {
  const { data: payment } = await admin
    .from('finance_payments')
    .select('id, amount')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'razorpay')
    .eq('provider_payment_id', refund.payment_id)
    .maybeSingle()

  if (!payment?.id) return

  const { data: existing } = await admin
    .from('finance_refunds')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'razorpay')
    .eq('provider_refund_id', refund.id)
    .maybeSingle()

  if (existing?.id) return

  const amount = razorpayAmount(refund.amount)

  await admin.from('finance_refunds').insert({
    workspace_id: workspaceId,
    payment_id: payment.id,
    amount,
    status: refund.status === 'processed' ? 'succeeded' : refund.status === 'failed' ? 'failed' : 'pending',
    provider: 'razorpay',
    provider_refund_id: refund.id,
    refunded_at: refund.created_at ? new Date(refund.created_at * 1000).toISOString() : null,
    metadata: (refund.notes ?? {}) as Record<string, unknown>,
  })

  await admin
    .from('finance_payments')
    .update({
      status: amount >= Number(payment.amount) ? 'refunded' : 'partially_refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
}

export async function processRazorpaySettlement(
  admin: SupabaseClient,
  workspaceId: string,
  settlement: { id: string; utr?: string; amount: number; fees: number; tax: number; created_at: number }
): Promise<void> {
  const { data: existingRecon } = await admin
    .from('finance_reconciliations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'razorpay')
    .eq('settlement_id', settlement.id)
    .maybeSingle()

  if (!existingRecon?.id) {
    await admin.from('finance_reconciliations').insert({
      workspace_id: workspaceId,
      provider: 'razorpay',
      period_start: new Date(settlement.created_at * 1000).toISOString().slice(0, 10),
      period_end: new Date(settlement.created_at * 1000).toISOString().slice(0, 10),
      status: 'reconciled',
      expected_amount: razorpayAmount(settlement.amount),
      actual_amount: razorpayAmount(settlement.amount),
      fee_total: razorpayAmount(settlement.fees),
      tax_total: razorpayAmount(settlement.tax),
      settlement_id: settlement.id,
      settlement_utr: settlement.utr ?? null,
      reconciled_at: new Date().toISOString(),
    })
  }

  await admin
    .from('finance_payments')
    .update({
      provider_settlement_id: settlement.id,
      provider_utr: settlement.utr ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('provider', 'razorpay')
    .is('provider_settlement_id', null)
}
