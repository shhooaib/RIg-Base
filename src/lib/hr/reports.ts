import type { HrDashboardStats } from '@/lib/hr/types'

export function emptyHrDashboardStats(): HrDashboardStats {
  return {
    employees: { total: 0, active: 0, onboarding: 0, on_leave: 0, inactive: 0, invited: 0 },
    departments: 0,
    attendance_today: { present: 0, absent: 0, late: 0, half_day: 0 },
    leave: { pending: 0, approved_this_month: 0 },
  }
}

export function attendanceRateToday(stats: HrDashboardStats | null | undefined): number {
  if (!stats?.attendance_today) return 0
  const { present, absent, late, half_day } = stats.attendance_today
  const marked = present + absent + late + half_day
  if (marked === 0) return 0
  return Math.round(((present + late + half_day * 0.5) / marked) * 100)
}
