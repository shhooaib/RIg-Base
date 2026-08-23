'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Waves,
  RotateCcw,
  Scale,
  BarChart3,
  BookOpen,
  Plug,
} from 'lucide-react'

const FINANCE_TABS = [
  { href: '/dashboard/finance', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/finance/invoices', label: 'Invoices', icon: FileText },
  { href: '/dashboard/finance/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/finance/expenses', label: 'Expenses', icon: Receipt },
  { href: '/dashboard/finance/receivables', label: 'Receivables', icon: ArrowDownLeft },
  { href: '/dashboard/finance/payables', label: 'Payables', icon: ArrowUpRight },
  { href: '/dashboard/finance/cash-flow', label: 'Cash Flow', icon: Waves },
  { href: '/dashboard/finance/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/dashboard/finance/reconciliation', label: 'Reconciliation', icon: Scale },
  { href: '/dashboard/finance/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/finance/ledger', label: 'Ledger', icon: BookOpen },
  { href: '/dashboard/finance/integrations', label: 'Integrations', icon: Plug },
] as const

export function FinanceNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 mb-8 border-b border-border-primary pb-1" aria-label="Finance sections">
      {FINANCE_TABS.map((tab) => {
        const { href, label, icon: Icon } = tab
        const exact = 'exact' in tab && tab.exact
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
              active
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
