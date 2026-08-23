'use client'

import { useEffect, useState } from 'react'
import type { EmployeeProfile, HrDepartment, HrDesignation } from '@/lib/hr/types'
import type { Role } from '@/lib/types'
import { ThemeSelect } from '@/components/ui/theme-select'
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES, LIFECYCLE_STAGES } from '@/lib/hr/constants'

export function EmployeeForm({
  departments,
  hrDepartments,
  designations,
  roles,
  managers,
  initial,
  onSubmit,
  loading,
  submitLabel = 'Add Employee',
}: {
  departments: string[]
  hrDepartments: HrDepartment[]
  designations: HrDesignation[]
  roles: Role[]
  managers: Pick<EmployeeProfile, 'id' | 'full_name'>[]
  initial?: EmployeeProfile
  onSubmit: (data: Record<string, unknown>) => void
  loading: boolean
  submitLabel?: string
}) {
  const deptOptions =
    hrDepartments.length > 0
      ? hrDepartments.map((d) => ({ value: d.id, label: d.name, text: d.name }))
      : departments.map((d) => ({ value: d, label: d, text: d }))

  const [form, setForm] = useState({
    full_name: initial?.full_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    employee_code: initial?.employee_code ?? '',
    department: initial?.department ?? departments[0] ?? deptOptions[0]?.text ?? '',
    department_id: initial?.department_id ?? (hrDepartments[0]?.id ?? ''),
    designation_id: initial?.designation_id ?? '',
    manager_id: initial?.manager_id ?? '',
    job_title: initial?.job_title ?? '',
    employment_type: initial?.employment_type ?? 'full_time',
    work_location: initial?.work_location ?? '',
    hire_date: initial?.hire_date ?? new Date().toISOString().split('T')[0],
    date_of_birth: initial?.date_of_birth ?? '',
    address: initial?.address ?? '',
    emergency_contact_name: initial?.emergency_contact_name ?? '',
    emergency_contact_phone: initial?.emergency_contact_phone ?? '',
    salary: initial?.salary != null ? String(initial.salary) : '',
    status: (initial?.status ?? 'active') as EmployeeProfile['status'],
    lifecycle_stage: (initial?.lifecycle_stage ?? 'active') as EmployeeProfile['lifecycle_stage'],
    role_id: initial?.role_id ?? roles[0]?.id ?? '',
    notes: initial?.notes ?? '',
  })

  useEffect(() => {
    if (!initial) return
    setForm({
      full_name: initial.full_name,
      email: initial.email,
      phone: initial.phone ?? '',
      employee_code: initial.employee_code ?? '',
      department: initial.department,
      department_id: initial.department_id ?? '',
      designation_id: initial.designation_id ?? '',
      manager_id: initial.manager_id ?? '',
      job_title: initial.job_title ?? '',
      employment_type: initial.employment_type ?? 'full_time',
      work_location: initial.work_location ?? '',
      hire_date: initial.hire_date,
      date_of_birth: initial.date_of_birth ?? '',
      address: initial.address ?? '',
      emergency_contact_name: initial.emergency_contact_name ?? '',
      emergency_contact_phone: initial.emergency_contact_phone ?? '',
      salary: initial.salary != null ? String(initial.salary) : '',
      status: initial.status,
      lifecycle_stage: initial.lifecycle_stage ?? 'active',
      role_id: initial.role_id,
      notes: initial.notes ?? '',
    })
  }, [initial])

  function handleDepartmentChange(value: string) {
    if (hrDepartments.length > 0) {
      const dept = hrDepartments.find((d) => d.id === value)
      setForm((f) => ({ ...f, department_id: value, department: dept?.name ?? f.department }))
    } else {
      setForm((f) => ({ ...f, department: value, department_id: '' }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      employee_code: form.employee_code || null,
      department: form.department,
      department_id: form.department_id || null,
      designation_id: form.designation_id || null,
      manager_id: form.manager_id || null,
      job_title: form.job_title || null,
      employment_type: form.employment_type,
      work_location: form.work_location || null,
      hire_date: form.hire_date,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      salary: form.salary ? Number(form.salary) : null,
      status: form.status,
      lifecycle_stage: form.lifecycle_stage,
      role_id: form.role_id,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <Section title="Basic information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name" required>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="form-field" />
          </Field>
          <Field label="Employee code">
            <input type="text" value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} className="form-field" placeholder="EMP-001" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" required>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-field" />
          </Field>
          <Field label="Phone">
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-field" />
          </Field>
        </div>
        <Field label="Date of birth">
          <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="form-field" />
        </Field>
        <Field label="Address">
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="form-field min-h-[72px]" />
        </Field>
      </Section>

      <Section title="Job details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department" required>
            <ThemeSelect
              variant="form"
              value={hrDepartments.length > 0 ? form.department_id : form.department}
              onChange={handleDepartmentChange}
              options={deptOptions.map((d) => ({ value: d.value, label: d.label }))}
              aria-label="Department"
            />
          </Field>
          <Field label="Designation">
            <ThemeSelect
              variant="form"
              value={form.designation_id}
              onChange={(designation_id) => setForm({ ...form, designation_id })}
              options={[{ value: '', label: 'None' }, ...designations.map((d) => ({ value: d.id, label: d.title }))]}
              aria-label="Designation"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Job title">
            <input type="text" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="form-field" />
          </Field>
          <Field label="Manager">
            <ThemeSelect
              variant="form"
              value={form.manager_id}
              onChange={(manager_id) => setForm({ ...form, manager_id })}
              options={[{ value: '', label: 'None' }, ...managers.filter((m) => m.id !== initial?.id).map((m) => ({ value: m.id, label: m.full_name }))]}
              aria-label="Manager"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employment type">
            <ThemeSelect variant="form" value={form.employment_type} onChange={(employment_type) => setForm({ ...form, employment_type: employment_type as typeof form.employment_type })} options={EMPLOYMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))} aria-label="Employment type" />
          </Field>
          <Field label="Work location">
            <input type="text" value={form.work_location} onChange={(e) => setForm({ ...form, work_location: e.target.value })} className="form-field" placeholder="Office / Remote" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hire date" required>
            <input type="date" required value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className="form-field" />
          </Field>
          <Field label="Salary">
            <input type="number" min={0} step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="form-field" />
          </Field>
        </div>
        <Field label="Access role" required>
          <ThemeSelect variant="form" value={form.role_id} onChange={(role_id) => setForm({ ...form, role_id })} options={roles.map((r) => ({ value: r.id, label: r.name }))} aria-label="Role" />
        </Field>
      </Section>

      <Section title="Emergency contact">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact name">
            <input type="text" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} className="form-field" />
          </Field>
          <Field label="Contact phone">
            <input type="tel" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} className="form-field" />
          </Field>
        </div>
      </Section>

      {initial && (
        <Section title="Status">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employment status">
              <ThemeSelect variant="form" value={form.status} onChange={(status) => setForm({ ...form, status: status as typeof form.status })} options={EMPLOYEE_STATUSES.map((s) => ({ value: s.value, label: s.label }))} aria-label="Status" />
            </Field>
            <Field label="Lifecycle stage">
              <ThemeSelect variant="form" value={form.lifecycle_stage} onChange={(lifecycle_stage) => setForm({ ...form, lifecycle_stage: lifecycle_stage as typeof form.lifecycle_stage })} options={LIFECYCLE_STAGES.map((s) => ({ value: s.value, label: s.label }))} aria-label="Lifecycle" />
            </Field>
          </div>
        </Section>
      )}

      <Field label="Notes">
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-field min-h-[72px]" />
      </Field>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-2 border-t border-border-primary first:border-0 first:pt-0">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  )
}
