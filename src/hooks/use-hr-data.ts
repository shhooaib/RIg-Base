'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { HR_QUERY_KEYS } from '@/lib/hr/constants'
import type {
  HrAttendanceRecord,
  HrDepartment,
  HrDesignation,
  HrLeaveBalance,
  HrLeaveRequest,
  HrLeaveType,
} from '@/lib/hr/types'
import {
  computeHrDashboardStats,
  EMPLOYEES_QUERY_ROOT,
  fetchHrEmployees,
  todayIsoDate,
} from '@/lib/hr/employees-data'
import { rolesQueryKey } from '@/lib/rbac/query-keys'
import type { Role } from '@/lib/types'
import { normalizeRolePermissions } from '@/lib/rbac/permissions'

export function useHrDashboard() {
  const { workspace } = useWorkspaceStore()
  const {
    data: employees = [],
    isLoading: employeesLoading,
  } = useHrEmployees()
  const { data: departments = [], isLoading: departmentsLoading } = useHrDepartments()
  const { data: todayAttendance = [], isLoading: attendanceLoading } = useHrAttendance(todayIsoDate())
  const { data: leaveRequests = [], isLoading: leaveLoading } = useHrLeaveRequests()

  const isLoading =
    !workspace?.id ||
    employeesLoading ||
    departmentsLoading ||
    attendanceLoading ||
    leaveLoading

  const data = useMemo(() => {
    if (!workspace?.id || isLoading) return undefined
    return computeHrDashboardStats(employees, todayAttendance, leaveRequests, departments.length)
  }, [workspace?.id, isLoading, employees, todayAttendance, leaveRequests, departments.length])

  return { data, isLoading, isError: false, error: null }
}

export function useHrEmployees() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [EMPLOYEES_QUERY_ROOT, workspace?.id],
    queryFn: () => fetchHrEmployees(supabase, workspace!.id),
    enabled: !!workspace?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useHrEmployee(id: string | undefined) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.employee(id ?? ''), workspace?.id],
    queryFn: async () => {
      const employees = await fetchHrEmployees(supabase, workspace!.id)
      const match = employees.find((e) => e.id === id)
      if (!match) throw new Error('Employee not found')
      return match
    },
    enabled: !!workspace?.id && !!id,
  })
}

export function useHrDepartments() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.departments, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_departments')
        .select(`
          *,
          manager:employees!hr_departments_manager_id_fkey(id, full_name, email)
        `)
        .eq('workspace_id', workspace!.id)
        .order('name')

      if (error) {
        const { data: basic, error: basicError } = await supabase
          .from('hr_departments')
          .select('*')
          .eq('workspace_id', workspace!.id)
          .order('name')
        if (basicError) throw new Error(basicError.message)
        return (basic ?? []) as HrDepartment[]
      }

      const { data: counts } = await supabase
        .from('employees')
        .select('department_id')
        .eq('workspace_id', workspace!.id)
        .not('department_id', 'is', null)

      const countMap = new Map<string, number>()
      for (const row of counts ?? []) {
        if (row.department_id) {
          countMap.set(row.department_id, (countMap.get(row.department_id) ?? 0) + 1)
        }
      }

      return ((data ?? []) as HrDepartment[]).map((d) => ({
        ...d,
        employee_count: countMap.get(d.id) ?? 0,
      }))
    },
    enabled: !!workspace?.id,
  })
}

export function useHrDesignations() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.designations, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_designations')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('title')
      if (error) throw new Error(error.message)
      return (data ?? []) as HrDesignation[]
    },
    enabled: !!workspace?.id,
  })
}

export function useHrAttendance(date?: string) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.attendance(date), workspace?.id],
    queryFn: async () => {
      let q = supabase
        .from('attendance')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('date', { ascending: false })
        .limit(200)

      if (date) q = q.eq('date', date)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      const rows = data ?? []
      if (rows.length === 0) return [] as HrAttendanceRecord[]

      const employeeIds = [...new Set(rows.map((r) => r.employee_id))]
      const { data: emps } = await supabase
        .from('employees')
        .select('id, full_name, department, employee_code')
        .in('id', employeeIds)

      const empMap = new Map((emps ?? []).map((e) => [e.id, e]))

      return rows.map((row) => ({
        ...row,
        employee: empMap.get(row.employee_id) ?? undefined,
      })) as HrAttendanceRecord[]
    },
    enabled: !!workspace?.id,
  })
}

export function useHrLeaveTypes() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.leaveTypes, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_leave_types')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .eq('is_active', true)
        .order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as HrLeaveType[]
    },
    enabled: !!workspace?.id,
  })
}

export function useHrLeaveRequests() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.leaveRequests, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw new Error(error.message)

      const rows = data ?? []
      if (rows.length === 0) return [] as HrLeaveRequest[]

      const employeeIds = [...new Set(rows.map((r) => r.employee_id))]
      const leaveTypeIds = [...new Set(rows.map((r) => r.leave_type_id).filter(Boolean))] as string[]

      const [empsRes, typesRes] = await Promise.all([
        supabase.from('employees').select('id, full_name, department').in('id', employeeIds),
        leaveTypeIds.length
          ? supabase.from('hr_leave_types').select('id, name, code, color').in('id', leaveTypeIds)
          : Promise.resolve({ data: [] }),
      ])

      const empMap = new Map((empsRes.data ?? []).map((e) => [e.id, e]))
      const typeMap = new Map((typesRes.data ?? []).map((t) => [t.id, t]))

      return rows.map((row) => ({
        ...row,
        employee: empMap.get(row.employee_id),
        leave_type: row.leave_type_id ? typeMap.get(row.leave_type_id) : undefined,
      })) as HrLeaveRequest[]
    },
    enabled: !!workspace?.id,
  })
}

export function useHrLeaveBalances(employeeId?: string) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.leaveBalances, workspace?.id, employeeId],
    queryFn: async () => {
      let q = supabase
        .from('hr_leave_balances')
        .select('*')
        .eq('workspace_id', workspace!.id)

      if (employeeId) q = q.eq('employee_id', employeeId)

      const { data, error } = await q
      if (error) throw new Error(error.message)
      return (data ?? []) as HrLeaveBalance[]
    },
    enabled: !!workspace?.id,
  })
}

export function useHrRoles() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: rolesQueryKey(workspace?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*').eq('workspace_id', workspace!.id)
      if (error) throw new Error(error.message)
      return (data ?? []).map((role) => ({
        ...(role as Role),
        permissions: normalizeRolePermissions((role as Role).permissions),
      })) as Role[]
    },
    enabled: !!workspace?.id,
  })
}

export function useEmployeeHistory(employeeId: string | undefined) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.history(employeeId ?? ''), workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_history')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .eq('employee_id', employeeId!)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: !!workspace?.id && !!employeeId,
  })
}

export function useEmployeeDocuments(employeeId: string | undefined) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [...HR_QUERY_KEYS.documents(employeeId ?? ''), workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .eq('employee_id', employeeId!)
        .order('uploaded_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: !!workspace?.id && !!employeeId,
  })
}

export { EMPLOYEES_QUERY_ROOT }
