'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Kanban,
  CalendarCheck,
  BarChart3,
  Plug,
} from 'lucide-react'

const CRM_TABS = [
  { href: '/dashboard/crm', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/crm/leads', label: 'Leads', icon: UserPlus },
  { href: '/dashboard/crm/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/crm/deals', label: 'Deals', icon: Kanban },
  { href: '/dashboard/crm/activities', label: 'Activities', icon: CalendarCheck },
  { href: '/dashboard/crm/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/crm/integrations', label: 'Integrations', icon: Plug },
] as const

export function CrmNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 mb-8 border-b border-border-primary pb-1" aria-label="CRM sections">
      {CRM_TABS.map((tab) => {
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
