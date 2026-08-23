'use client'

import type { Employee } from '@/lib/types'

export function EmployeeSelect({
  employees,
  value,
  onChange,
  allowEmpty = true,
  className = 'form-field',
}: {
  employees: Employee[]
  value: string
  onChange: (value: string) => void
  allowEmpty?: boolean
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-label="Assigned employee"
    >
      {allowEmpty && <option value="">Unassigned</option>}
      {employees
        .filter((e) => e.status === 'active' || e.status === 'on_leave')
        .map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name}
          </option>
        ))}
    </select>
  )
}

export function employeeName(employees: Employee[], id: string | null | undefined) {
  if (!id) return '—'
  return employees.find((e) => e.id === id)?.full_name ?? '—'
}
