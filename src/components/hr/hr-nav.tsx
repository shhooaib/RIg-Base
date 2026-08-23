'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  GitBranch,
  Shield,
  BarChart3,
} from 'lucide-react'

const HR_TABS = [
  { href: '/dashboard/hr', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/hr/employees', label: 'Employees', icon: Users },
  { href: '/dashboard/hr/departments', label: 'Departments', icon: Building2 },
  { href: '/dashboard/hr/attendance', label: 'Attendance', icon: Clock },
  { href: '/dashboard/hr/leave', label: 'Leave', icon: CalendarDays },
  { href: '/dashboard/hr/lifecycle', label: 'Lifecycle', icon: GitBranch },
  { href: '/dashboard/hr/roles', label: 'Roles & Access', icon: Shield },
  { href: '/dashboard/hr/reports', label: 'Reports', icon: BarChart3 },
] as const

export function HrNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 mb-8 border-b border-border-primary pb-1" aria-label="HR sections">
      {HR_TABS.map((tab) => {
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
