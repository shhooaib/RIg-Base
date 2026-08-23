import type { Employee } from '@/lib/types'

export interface HrDepartment {
  id: string
  workspace_id: string
  name: string
  description: string | null
  manager_id: string | null
  parent_id: string | null
  created_at: string
  updated_at: string
  manager?: Pick<Employee, 'id' | 'full_name' | 'email'> | null
  employee_count?: number
}

export interface HrDesignation {
  id: string
  workspace_id: string
  title: string
  level: string | null
  description: string | null
  created_at: string
}

export interface EmployeeProfile extends Employee {
  department_id: string | null
  designation_id: string | null
  manager_id: string | null
  employee_code: string | null
  job_title: string | null
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern'
  work_location: string | null
  date_of_birth: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  lifecycle_stage: 'onboarding' | 'active' | 'on_leave' | 'offboarding' | 'inactive'
  offboarding_date: string | null
  notes: string | null
  updated_at: string
  manager?: Pick<Employee, 'id' | 'full_name'> | null
  hr_department?: Pick<HrDepartment, 'id' | 'name'> | null
  designation?: Pick<HrDesignation, 'id' | 'title'> | null
}

export interface EmployeeDocument {
  id: string
  workspace_id: string
  employee_id: string
  name: string
  document_type: 'contract' | 'id_proof' | 'certificate' | 'offer_letter' | 'other'
  file_url: string | null
  notes: string | null
  uploaded_at: string
  created_at: string
}

export interface EmployeeHistoryEntry {
  id: string
  workspace_id: string
  employee_id: string
  event_type: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface HrAttendanceRecord {
  id: string
  workspace_id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: 'present' | 'absent' | 'late' | 'half_day'
  work_hours_minutes: number | null
  notes: string | null
  created_at: string
  employee?: Pick<Employee, 'id' | 'full_name' | 'department' | 'employee_code'>
}

export interface HrLeaveType {
  id: string
  workspace_id: string
  name: string
  code: string
  default_days_per_year: number
  is_paid: boolean
  requires_approval: boolean
  color: string
  is_active: boolean
  created_at: string
}

export interface HrLeaveBalance {
  id: string
  workspace_id: string
  employee_id: string
  leave_type_id: string
  year: number
  allocated_days: number
  used_days: number
  leave_type?: Pick<HrLeaveType, 'id' | 'name' | 'code' | 'color'>
}

export interface HrLeaveRequest {
  id: string
  workspace_id: string
  employee_id: string
  type: string
  leave_type_id: string | null
  start_date: string
  end_date: string
  days_count: number | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  employee?: Pick<Employee, 'id' | 'full_name' | 'department'>
  leave_type?: Pick<HrLeaveType, 'id' | 'name' | 'code' | 'color'>
}

export interface HrDashboardStats {
  employees: {
    total: number
    active: number
    onboarding: number
    on_leave: number
    inactive: number
    invited: number
  }
  departments: number
  attendance_today: {
    present: number
    absent: number
    late: number
    half_day: number
  }
  leave: {
    pending: number
    approved_this_month: number
  }
}
