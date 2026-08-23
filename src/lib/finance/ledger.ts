import type { SupabaseClient } from '@supabase/supabase-js'
import type { FinancePayment } from '@/lib/finance/types'

export async function postLedgerFromPayment(
  admin: SupabaseClient,
  payment: FinancePayment
): Promise<void> {
  if (payment.status !== 'succeeded') return

  const { data: existing } = await admin
    .from('transactions')
    .select('id')
    .eq('workspace_id', payment.workspace_id)
    .eq('payment_id', payment.id)
    .maybeSingle()

  if (existing?.id) return

  const isInbound = payment.direction === 'inbound'
  const net = Number(payment.net_amount || payment.amount)

  await admin.from('transactions').insert({
    workspace_id: payment.workspace_id,
    type: isInbound ? 'revenue' : 'expense',
    category: isInbound ? 'Payment received' : 'Payment sent',
    amount: net,
    tax_amount: payment.tax_amount,
    fee_amount: payment.fee_amount,
    net_amount: net,
    currency: payment.currency,
    description: `${payment.provider} ${payment.provider_payment_id ?? payment.id}`,
    date: (payment.paid_at ?? new Date().toISOString()).slice(0, 10),
    reference: payment.provider_payment_id,
    customer_id: payment.customer_id,
    deal_id: payment.deal_id,
    invoice_id: payment.invoice_id,
    payment_id: payment.id,
    expense_id: payment.expense_id,
    vendor_id: payment.vendor_id,
    status: 'posted',
    source: payment.provider,
  })
}

export async function applyPaymentToInvoice(
  admin: SupabaseClient,
  workspaceId: string,
  invoiceId: string,
  amount: number
): Promise<void> {
  const { data: invoice } = await admin
    .from('finance_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!invoice) return

  const newPaid = Number(invoice.amount_paid) + amount
  const total = Number(invoice.total_amount)
  let status = invoice.status as string
  if (newPaid >= total) status = 'paid'
  else if (newPaid > 0) status = 'partial'

  await admin
    .from('finance_invoices')
    .update({ amount_paid: newPaid, status, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
}
