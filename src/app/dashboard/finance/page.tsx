'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { FINANCE_QUERY_KEYS } from '@/lib/finance/constants'
import { computeFinanceReport } from '@/lib/finance/reports'
import { StatMoney } from '@/components/ui/stat-money'
import { Loader2, TrendingUp, TrendingDown, Wallet, AlertTriangle } from 'lucide-react'
import type { FinanceExpense, FinanceInvoice, FinancePayment, FinanceRefund } from '@/lib/finance/types'
import type { Transaction } from '@/lib/types'

export default function FinanceOverviewPage() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: [...FINANCE_QUERY_KEYS.reports, 'overview'],
    queryFn: async () => {
      const wsId = workspace!.id
      const [tx, invoices, expenses, payments, refunds] = await Promise.all([
        supabase.from('transactions').select('*').eq('workspace_id', wsId),
        supabase.from('finance_invoices').select('*').eq('workspace_id', wsId),
        supabase.from('finance_expenses').select('*').eq('workspace_id', wsId),
        supabase.from('finance_payments').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(500),
        supabase.from('finance_refunds').select('*').eq('workspace_id', wsId),
      ])
      return computeFinanceReport({
        transactions: (tx.data ?? []) as Transaction[],
        invoices: (invoices.data ?? []) as FinanceInvoice[],
        expenses: (expenses.data ?? []) as FinanceExpense[],
        payments: (payments.data ?? []) as FinancePayment[],
        refunds: (refunds.data ?? []) as FinanceRefund[],
      })
    },
    enabled: !!workspace?.id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading finance overview…
      </div>
    )
  }

  const report = data!

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Overview</h2>
          <p className="text-sm text-text-secondary mt-1">Revenue, expenses, cash flow, and outstanding balances</p>
        </div>
      </div>

      <div className="summary-row mb-8">
        <div className="summary-stat">
          <p className="stat-label summary-stat-label"><TrendingUp size={12} /> Revenue</p>
          <StatMoney value={report.revenue} className="text-revenue" />
        </div>
        <div className="summary-stat">
          <p className="stat-label summary-stat-label"><TrendingDown size={12} /> Expenses</p>
          <StatMoney value={report.expenses} className="text-danger" />
        </div>
        <div className="summary-stat">
          <p className="stat-label summary-stat-label">Profit</p>
          <StatMoney value={report.profit} className={report.profit >= 0 ? 'text-text-primary' : 'text-danger'} />
        </div>
        <div className="summary-stat">
          <p className="stat-label summary-stat-label"><Wallet size={12} /> Net cash flow</p>
          <StatMoney value={report.netCashFlow} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickStat title="Outstanding receivables" value={report.outstandingReceivables} href="/dashboard/finance/receivables" />
        <QuickStat title="Outstanding payables" value={report.outstandingPayables} href="/dashboard/finance/payables" />
        <QuickStat title="Gateway fees" value={report.gatewayFees} href="/dashboard/finance/reports" />
        <QuickStat title="Refunds" value={report.refunds} href="/dashboard/finance/refunds" />
        <QuickStat title="Failed payments" value={report.failedPayments} href="/dashboard/finance/payments" isCount />
        <QuickStat title="Gateway taxes" value={report.gatewayTaxes} href="/dashboard/finance/reports" />
      </div>

      {report.failedPayments > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning mb-8">
          <AlertTriangle size={16} className="mt-0.5" />
          <span>{report.failedPayments} failed payment(s) need review. Check Payments or Integrations for sync errors.</span>
        </div>
      )}
    </>
  )
}

function QuickStat({ title, value, href, isCount }: { title: string; value: number; href: string; isCount?: boolean }) {
  return (
    <Link href={href} className="rounded-xl border border-border-primary bg-bg-secondary p-4 hover:border-border-secondary transition-colors">
      <p className="text-sm text-text-secondary">{title}</p>
      <p className="text-xl font-semibold text-text-primary mt-1">
        {isCount ? value : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </p>
    </Link>
  )
}
