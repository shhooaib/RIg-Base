'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  FileText,
  PackageCheck,
  BarChart3,
} from 'lucide-react'

const SUPPLY_CHAIN_TABS = [
  { href: '/dashboard/supply-chain', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/supply-chain/suppliers', label: 'Suppliers', icon: Building2 },
  { href: '/dashboard/supply-chain/orders', label: 'Purchase orders', icon: FileText },
  { href: '/dashboard/supply-chain/receiving', label: 'Receiving', icon: PackageCheck },
  { href: '/dashboard/supply-chain/reports', label: 'Reports', icon: BarChart3 },
] as const

export function SupplyChainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 mb-8 border-b border-border-primary pb-1" aria-label="Supply chain sections">
      {SUPPLY_CHAIN_TABS.map((tab) => {
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
