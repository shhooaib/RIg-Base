import { EMPLOYEE_STATUSES, LIFECYCLE_STAGES, ATTENDANCE_STATUSES, LEAVE_STATUSES } from '@/lib/hr/constants'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/10 text-success',
  invited: 'bg-accent/10 text-accent',
  onboarding: 'bg-blue-500/10 text-blue-400',
  on_leave: 'bg-warning/10 text-warning',
  offboarding: 'bg-orange-500/10 text-orange-400',
  inactive: 'bg-bg-tertiary text-text-tertiary',
  present: 'bg-success/10 text-success',
  absent: 'bg-danger/10 text-danger',
  late: 'bg-warning/10 text-warning',
  half_day: 'bg-bg-tertiary text-text-secondary',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
}

function labelFor(value: string, options: readonly { value: string; label: string }[]) {
  return options.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ')
}

export function EmployeeStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-bg-tertiary text-text-secondary'}`}>
      {labelFor(status, EMPLOYEE_STATUSES)}
    </span>
  )
}

export function LifecycleBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[stage] ?? 'bg-bg-tertiary text-text-secondary'}`}>
      {labelFor(stage, LIFECYCLE_STAGES)}
    </span>
  )
}

export function AttendanceStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-bg-tertiary text-text-secondary'}`}>
      {labelFor(status, ATTENDANCE_STATUSES)}
    </span>
  )
}

export function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-bg-tertiary text-text-secondary'}`}>
      {labelFor(status, LEAVE_STATUSES)}
    </span>
  )
}
