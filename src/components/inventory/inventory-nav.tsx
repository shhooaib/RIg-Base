'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'

const INVENTORY_TABS = [
  { href: '/dashboard/inventory', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/inventory/products', label: 'Products', icon: Package },
  { href: '/dashboard/inventory/movements', label: 'Movements', icon: ArrowLeftRight },
  { href: '/dashboard/inventory/alerts', label: 'Low stock', icon: AlertTriangle },
  { href: '/dashboard/inventory/reports', label: 'Reports', icon: BarChart3 },
] as const

export function InventoryNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 mb-8 border-b border-border-primary pb-1" aria-label="Inventory sections">
      {INVENTORY_TABS.map((tab) => {
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
