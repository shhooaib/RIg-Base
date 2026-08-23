export const HR_QUERY_KEYS = {
  dashboard: ['hr', 'dashboard'] as const,
  employees: ['hr', 'employees'] as const,
  employee: (id: string) => ['hr', 'employee', id] as const,
  departments: ['hr', 'departments'] as const,
  designations: ['hr', 'designations'] as const,
  attendance: (date?: string) => ['hr', 'attendance', date ?? 'all'] as const,
  leaveRequests: ['hr', 'leave-requests'] as const,
  leaveTypes: ['hr', 'leave-types'] as const,
  leaveBalances: ['hr', 'leave-balances'] as const,
  history: (employeeId: string) => ['hr', 'history', employeeId] as const,
  documents: (employeeId: string) => ['hr', 'documents', employeeId] as const,
} as const

export const EMPLOYEE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'inactive', label: 'Inactive' },
] as const

export const LIFECYCLE_STAGES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'inactive', label: 'Inactive' },
] as const

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
] as const

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', color: 'text-success' },
  { value: 'absent', label: 'Absent', color: 'text-danger' },
  { value: 'late', label: 'Late', color: 'text-warning' },
  { value: 'half_day', label: 'Half day', color: 'text-text-secondary' },
] as const

export const LEAVE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const

export const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'id_proof', label: 'ID proof' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'offer_letter', label: 'Offer letter' },
  { value: 'other', label: 'Other' },
] as const

export const HISTORY_EVENT_LABELS: Record<string, string> = {
  hired: 'Hired',
  onboarding_started: 'Onboarding started',
  onboarding_completed: 'Onboarding completed',
  promoted: 'Promoted',
  transferred: 'Transferred',
  manager_changed: 'Manager changed',
  department_changed: 'Department changed',
  leave_started: 'Leave started',
  leave_ended: 'Leave ended',
  offboarding_started: 'Offboarding started',
  offboarding_completed: 'Offboarding completed',
  deactivated: 'Deactivated',
  reactivated: 'Reactivated',
  note: 'Note',
}
