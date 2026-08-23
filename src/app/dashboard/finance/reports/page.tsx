'use client'

import { Loader2 } from 'lucide-react'
import { StatMoney } from '@/components/ui/stat-money'
import { computeFinanceReport } from '@/lib/finance/reports'
import { useFinanceReportData } from '@/hooks/use-finance-data'

export default function FinanceReportsPage() {
  const { data, isLoading } = useFinanceReportData()
  const report = data ? computeFinanceReport(data) : null

  if (isLoading || !report) {
    return <div className="flex justify-center py-16 text-text-secondary"><Loader2 className="animate-spin mr-2" size={18} /> Loading reports…</div>
  }

  const sections = [
    { title: 'Profit & loss', items: [
      { label: 'Revenue', value: report.revenue, className: 'text-revenue' },
      { label: 'Expenses', value: report.expenses, className: 'text-danger' },
      { label: 'Net profit', value: report.profit },
    ]},
    { title: 'Outstanding balances', items: [
      { label: 'Accounts receivable', value: report.outstandingReceivables },
      { label: 'Accounts payable', value: report.outstandingPayables },
    ]},
    { title: 'Cash flow', items: [
      { label: 'Cash in', value: report.cashIn, className: 'text-revenue' },
      { label: 'Cash out', value: report.cashOut, className: 'text-danger' },
      { label: 'Net cash flow', value: report.netCashFlow },
    ]},
    { title: 'Payment gateway', items: [
      { label: 'Gateway fees', value: report.gatewayFees },
      { label: 'Gateway taxes', value: report.gatewayTaxes },
      { label: 'Refunds', value: report.refunds },
      { label: 'Failed payments', value: report.failedPayments, isCount: true },
    ]},
  ]

  return (
    <>
      <div className="page-header">
        <div><h2 className="text-xl font-semibold">Financial Reports</h2><p className="text-sm text-text-secondary mt-1">Revenue, expenses, profit, cash flow, gateway fees, and refunds</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-border-primary bg-bg-secondary p-6">
            <h3 className="text-base font-semibold text-text-primary mb-4">{section.title}</h3>
            <dl className="space-y-3">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <dt className="text-text-secondary">{item.label}</dt>
                  <dd className={'className' in item && item.className ? item.className : 'text-text-primary'}>
                    {'isCount' in item && item.isCount ? item.value : <StatMoney value={item.value} className={'className' in item ? item.className : undefined} />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  )
}
