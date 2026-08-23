'use client'

import Link from 'next/link'
import { useHrDashboard, useHrDepartments, useHrEmployees, useHrLeaveRequests, useHrAttendance } from '@/hooks/use-hr-data'
import { todayIsoDate } from '@/lib/hr/attendance-utils'
import { attendanceRateToday } from '@/lib/hr/reports'
import { Loader2, BarChart3 } from 'lucide-react'

export default function HrReportsPage() {
  const { data: stats, isLoading: statsLoading } = useHrDashboard()
  const { data: departments = [] } = useHrDepartments()
  const { data: employees = [] } = useHrEmployees()
  const { data: leaveRequests = [] } = useHrLeaveRequests()
  const { data: todayAttendance = [] } = useHrAttendance(todayIsoDate())

  if (statsLoading || !stats) {
    return (
      <div className="flex justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading reports…
      </div>
    )
  }

  const s = stats
  const deptBreakdown = departments.map((d) => ({
    name: d.name,
    count: employees.filter((e) => e.department_id === d.id || e.department === d.name).length,
  }))

  const leaveByType = leaveRequests.reduce<Record<string, number>>((acc, r) => {
    const key = r.leave_type?.name ?? r.type
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">HR reports</h2>
          <p className="text-sm text-text-secondary mt-1">Workforce analytics, attendance, and leave statistics</p>
        </div>
      </div>

      <div className="summary-row mb-8">
        <div className="summary-stat"><p className="stat-label summary-stat-label">Headcount</p><p className="text-2xl font-semibold">{s.employees.total}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Departments</p><p className="text-2xl font-semibold">{s.departments}</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Attendance rate today</p><p className="text-2xl font-semibold">{attendanceRateToday(s)}%</p></div>
        <div className="summary-stat"><p className="stat-label summary-stat-label">Pending leave</p><p className="text-2xl font-semibold">{s.leave.pending}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportPanel title="Employees by department">
          {deptBreakdown.length === 0 ? (
            <p className="text-sm text-text-secondary">No departments configured.</p>
          ) : (
            deptBreakdown.map((d) => (
              <ReportBar key={d.name} label={d.name} value={d.count} total={s.employees.total || 1} />
            ))
          )}
          <Link href="/dashboard/hr/departments" className="text-xs text-accent mt-3 inline-block hover:underline">Manage departments →</Link>
        </ReportPanel>

        <ReportPanel title="Employee status">
          <ReportBar label="Active" value={s.employees.active} total={s.employees.total || 1} />
          <ReportBar label="Onboarding" value={s.employees.onboarding} total={s.employees.total || 1} />
          <ReportBar label="On leave" value={s.employees.on_leave} total={s.employees.total || 1} />
          <ReportBar label="Invited" value={s.employees.invited} total={s.employees.total || 1} />
          <ReportBar label="Inactive" value={s.employees.inactive} total={s.employees.total || 1} />
        </ReportPanel>

        <ReportPanel title="Today&apos;s attendance breakdown">
          <ReportBar label="Present" value={s.attendance_today.present} total={todayAttendance.length || 1} />
          <ReportBar label="Late" value={s.attendance_today.late} total={todayAttendance.length || 1} />
          <ReportBar label="Half day" value={s.attendance_today.half_day} total={todayAttendance.length || 1} />
          <ReportBar label="Absent" value={s.attendance_today.absent} total={todayAttendance.length || 1} />
          <Link href="/dashboard/hr/attendance" className="text-xs text-accent mt-3 inline-block hover:underline">View attendance →</Link>
        </ReportPanel>

        <ReportPanel title="Leave requests by type">
          {Object.keys(leaveByType).length === 0 ? (
            <p className="text-sm text-text-secondary">No leave requests yet.</p>
          ) : (
            Object.entries(leaveByType).map(([type, count]) => (
              <ReportBar key={type} label={type} value={count} total={leaveRequests.length || 1} />
            ))
          )}
          <p className="text-xs text-text-tertiary mt-3">{s.leave.approved_this_month} approved this month</p>
          <Link href="/dashboard/hr/leave" className="text-xs text-accent mt-1 inline-block hover:underline">Manage leave →</Link>
        </ReportPanel>
      </div>
    </>
  )
}

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ai-card border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2"><BarChart3 size={16} /> {title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ReportBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
