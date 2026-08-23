'use client'

import Link from 'next/link'
import { useHrDashboard } from '@/hooks/use-hr-data'
import { attendanceRateToday } from '@/lib/hr/reports'
import { Loader2, Users, Building2, Clock, CalendarDays, UserPlus } from 'lucide-react'

export default function HrOverviewPage() {
  const { data: stats, isLoading } = useHrDashboard()

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading HR overview…
      </div>
    )
  }

  const s = stats
  const attendanceRate = attendanceRateToday(s)

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Overview</h2>
          <p className="text-sm text-text-secondary mt-1">Workforce snapshot, attendance, and leave at a glance</p>
        </div>
        <Link href="/dashboard/hr/employees" className="btn-primary">
          <UserPlus size={16} /> Manage employees
        </Link>
      </div>

      <div className="summary-row mb-8">
        <StatCard icon={Users} label="Total employees" value={s.employees.total} href="/dashboard/hr/employees" />
        <StatCard icon={Users} label="Active" value={s.employees.active} sub={`${s.employees.onboarding} onboarding`} href="/dashboard/hr/lifecycle" />
        <StatCard icon={Building2} label="Departments" value={s.departments} href="/dashboard/hr/departments" />
        <StatCard icon={Clock} label="Present today" value={s.attendance_today.present} sub={`${attendanceRate}% marked`} href="/dashboard/hr/attendance" />
        <StatCard icon={CalendarDays} label="Pending leave" value={s.leave.pending} sub={`${s.leave.approved_this_month} approved this month`} href="/dashboard/hr/leave" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Employee status">
          <Bar label="Active" value={s.employees.active} total={s.employees.total} color="bg-success" />
          <Bar label="Onboarding" value={s.employees.onboarding} total={s.employees.total} color="bg-blue-500" />
          <Bar label="On leave" value={s.employees.on_leave} total={s.employees.total} color="bg-warning" />
          <Bar label="Invited" value={s.employees.invited} total={s.employees.total} color="bg-accent" />
          <Bar label="Inactive" value={s.employees.inactive} total={s.employees.total} color="bg-text-tertiary" />
        </Panel>

        <Panel title="Today&apos;s attendance">
          <Bar label="Present" value={s.attendance_today.present} total={Math.max(s.employees.active, 1)} color="bg-success" />
          <Bar label="Late" value={s.attendance_today.late} total={Math.max(s.employees.active, 1)} color="bg-warning" />
          <Bar label="Half day" value={s.attendance_today.half_day} total={Math.max(s.employees.active, 1)} color="bg-text-secondary" />
          <Bar label="Absent" value={s.attendance_today.absent} total={Math.max(s.employees.active, 1)} color="bg-danger" />
        </Panel>
      </div>
    </>
  )
}

function StatCard({ icon: Icon, label, value, sub, href }: { icon: typeof Users; label: string; value: number; sub?: string; href: string }) {
  return (
    <Link href={href} className="summary-stat hover:border-accent/40 transition-colors">
      <p className="stat-label summary-stat-label"><Icon size={12} /> {label}</p>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
    </Link>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ai-card border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{value}</span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
