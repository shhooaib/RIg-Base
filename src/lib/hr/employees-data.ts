import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmployeeProfile, HrDashboardStats } from '@/lib/hr/types'
import { emptyHrDashboardStats } from '@/lib/hr/reports'
import type { HrAttendanceRecord, HrLeaveRequest } from '@/lib/hr/types'
import { todayIsoDate } from '@/lib/hr/attendance-utils'

/** Shared query root — keep HR list and CRM employee pickers in sync. */
export const EMPLOYEES_QUERY_ROOT = 'employees' as const

export async function fetchHrEmployees(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<EmployeeProfile[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as EmployeeProfile[]
  if (rows.length === 0) return []

  const managerIds = [...new Set(rows.map((r) => r.manager_id).filter(Boolean))] as string[]
  const deptIds = [...new Set(rows.map((r) => r.department_id).filter(Boolean))] as string[]
  const desigIds = [...new Set(rows.map((r) => r.designation_id).filter(Boolean))] as string[]

  const [managersRes, deptsRes, desigsRes] = await Promise.all([
    managerIds.length
      ? supabase.from('employees').select('id, full_name').in('id', managerIds)
      : Promise.resolve({ data: [], error: null }),
    deptIds.length
      ? supabase.from('hr_departments').select('id, name').in('id', deptIds)
      : Promise.resolve({ data: [], error: null }),
    desigIds.length
      ? supabase.from('hr_designations').select('id, title').in('id', desigIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const managerMap = new Map((managersRes.data ?? []).map((m) => [m.id, m]))
  const deptMap = new Map((deptsRes.data ?? []).map((d) => [d.id, d]))
  const desigMap = new Map((desigsRes.data ?? []).map((d) => [d.id, d]))

  return rows.map((row) => ({
    ...row,
    manager: row.manager_id ? (managerMap.get(row.manager_id) ?? null) : null,
    hr_department: row.department_id ? (deptMap.get(row.department_id) ?? null) : null,
    designation: row.designation_id ? (desigMap.get(row.designation_id) ?? null) : null,
  }))
}

export function computeHrDashboardStats(
  employees: EmployeeProfile[],
  todayAttendance: HrAttendanceRecord[],
  leaveRequests: HrLeaveRequest[],
  departmentCount: number
): HrDashboardStats {
  if (employees.length === 0 && departmentCount === 0) {
    return emptyHrDashboardStats()
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    employees: {
      total: employees.length,
      active: employees.filter((e) => e.status === 'active').length,
      onboarding: employees.filter((e) => (e.lifecycle_stage ?? 'active') === 'onboarding').length,
      on_leave: employees.filter((e) => e.status === 'on_leave').length,
      inactive: employees.filter((e) => e.status === 'inactive').length,
      invited: employees.filter((e) => e.status === 'invited').length,
    },
    departments: departmentCount,
    attendance_today: {
      present: todayAttendance.filter((a) => a.status === 'present').length,
      absent: todayAttendance.filter((a) => a.status === 'absent').length,
      late: todayAttendance.filter((a) => a.status === 'late').length,
      half_day: todayAttendance.filter((a) => a.status === 'half_day').length,
    },
    leave: {
      pending: leaveRequests.filter((r) => r.status === 'pending').length,
      approved_this_month: leaveRequests.filter((r) => {
        if (r.status !== 'approved') return false
        const at = r.approved_at ?? r.created_at
        return new Date(at) >= monthStart
      }).length,
    },
  }
}

export { todayIsoDate }
