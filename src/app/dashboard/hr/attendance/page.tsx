'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useHrAttendance, useHrEmployees } from '@/hooks/use-hr-data'
import { HR_QUERY_KEYS, ATTENDANCE_STATUSES } from '@/lib/hr/constants'
import { computeWorkMinutes, currentTimeIso, formatWorkHours, todayIsoDate } from '@/lib/hr/attendance-utils'
import { AttendanceStatusBadge } from '@/components/hr/status-badges'
import { Modal } from '@/components/ui/modal'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { ThemeSelect } from '@/components/ui/theme-select'
import { Clock, LogIn, LogOut, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { HrAttendanceRecord } from '@/lib/hr/types'

export default function HrAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayIsoDate())
  const [showMark, setShowMark] = useState(false)
  const [form, setForm] = useState({ employee_id: '', status: 'present', check_in: '09:00:00', check_out: '18:00:00', notes: '' })
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: employees = [] } = useHrEmployees()
  const { data: records = [] } = useHrAttendance(selectedDate)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.attendance(selectedDate) })
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.dashboard })
  }

  const markAttendance = useMutation({
    mutationFn: async () => {
      const work_hours_minutes = computeWorkMinutes(form.check_in, form.check_out)
      const { error } = await supabase.from('attendance').upsert(
        {
          workspace_id: workspace?.id,
          employee_id: form.employee_id,
          date: selectedDate,
          status: form.status,
          check_in: form.status !== 'absent' ? form.check_in : null,
          check_out: form.status !== 'absent' ? form.check_out : null,
          work_hours_minutes,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,date' }
      )
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      setShowMark(false)
      toast.success('Attendance saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const quickCheckIn = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.from('attendance').upsert(
        {
          workspace_id: workspace?.id,
          employee_id: employeeId,
          date: selectedDate,
          status: 'present',
          check_in: currentTimeIso(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,date' }
      )
      if (error) throw error
    },
    onSuccess: () => { invalidate(); toast.success('Checked in') },
    onError: (e: Error) => toast.error(e.message),
  })

  const quickCheckOut = useMutation({
    mutationFn: async (record: HrAttendanceRecord) => {
      const checkOut = currentTimeIso()
      const work_hours_minutes = computeWorkMinutes(record.check_in, checkOut)
      const { error } = await supabase
        .from('attendance')
        .update({ check_out: checkOut, work_hours_minutes, updated_at: new Date().toISOString() })
        .eq('id', record.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); toast.success('Checked out') },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns = useMemo(
    () => [
      { key: 'employee', header: 'Employee', render: (r: HrAttendanceRecord) => r.employee?.full_name ?? '—' },
      { key: 'department', header: 'Department', cellClass: 'table-cell-secondary', render: (r: HrAttendanceRecord) => r.employee?.department ?? '—' },
      { key: 'check_in', header: 'Check in', render: (r: HrAttendanceRecord) => r.check_in?.slice(0, 5) ?? '—' },
      { key: 'check_out', header: 'Check out', render: (r: HrAttendanceRecord) => r.check_out?.slice(0, 5) ?? '—' },
      { key: 'work_hours', header: 'Hours', render: (r: HrAttendanceRecord) => formatWorkHours(r.work_hours_minutes) },
      { key: 'status', header: 'Status', render: (r: HrAttendanceRecord) => <AttendanceStatusBadge status={r.status} /> },
      {
        key: 'actions',
        header: '',
        render: (r: HrAttendanceRecord) =>
          !r.check_out && r.check_in ? (
            <button type="button" onClick={() => quickCheckOut.mutate(r)} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              <LogOut size={12} /> Check out
            </button>
          ) : null,
      },
    ],
    [quickCheckOut]
  )

  const unmarked = employees.filter((e) => e.status === 'active' && !records.some((r) => r.employee_id === e.id))

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Attendance</h2>
          <p className="text-sm text-text-secondary mt-1">Check-in/out, daily status, and work hours</p>
        </div>
        <div className="page-header-actions flex items-center gap-3">
          <input type="date" className="form-field w-auto" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          <PermissionGate module="hr" permission="create">
            <button type="button" onClick={() => setShowMark(true)} className="btn-primary">
              <Plus size={16} /> Mark attendance
            </button>
          </PermissionGate>
        </div>
      </div>

      {unmarked.length > 0 && (
        <div className="ai-card border border-border-primary p-4 mb-6">
          <p className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2"><Clock size={16} /> Not marked today ({unmarked.length})</p>
          <div className="flex flex-wrap gap-2">
            {unmarked.slice(0, 8).map((e) => (
              <PermissionGate key={e.id} module="hr" permission="create">
                <button type="button" onClick={() => quickCheckIn.mutate(e.id)} className="px-3 py-1.5 text-xs border border-border-primary rounded-md hover:border-accent inline-flex items-center gap-1">
                  <LogIn size={12} /> {e.full_name}
                </button>
              </PermissionGate>
            ))}
          </div>
        </div>
      )}

      <FilterableDataTable
        columns={columns}
        data={records}
        searchPlaceholder="Search attendance…"
        filters={[{ id: 'status', label: 'Status', options: ATTENDANCE_STATUSES.map((s) => ({ value: s.value, label: s.label })) }]}
        customFilter={(r, ctx) => {
          const name = r.employee?.full_name ?? ''
          if (ctx.search && !name.toLowerCase().includes(ctx.search.toLowerCase())) return false
          if (ctx.filters.status !== 'all' && r.status !== ctx.filters.status) return false
          return true
        }}
        pageSize={15}
        rowKey={(r) => r.id}
        emptyFilteredMessage="No attendance records for this date."
      />

      <Modal open={showMark} onClose={() => setShowMark(false)} title="Mark attendance">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            markAttendance.mutate()
          }}
        >
          <ThemeSelect variant="form" value={form.employee_id} onChange={(employee_id) => setForm({ ...form, employee_id })} options={employees.filter((e) => e.status === 'active').map((e) => ({ value: e.id, label: e.full_name }))} aria-label="Employee" />
          <ThemeSelect variant="form" value={form.status} onChange={(status) => setForm({ ...form, status })} options={ATTENDANCE_STATUSES.map((s) => ({ value: s.value, label: s.label }))} aria-label="Status" />
          {form.status !== 'absent' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Check in</label>
                <input type="time" className="form-field" value={form.check_in.slice(0, 5)} onChange={(e) => setForm({ ...form, check_in: `${e.target.value}:00` })} />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Check out</label>
                <input type="time" className="form-field" value={form.check_out.slice(0, 5)} onChange={(e) => setForm({ ...form, check_out: `${e.target.value}:00` })} />
              </div>
            </div>
          )}
          <textarea className="form-field min-h-[60px]" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" disabled={!form.employee_id || markAttendance.isPending} className="btn-primary w-full">Save</button>
        </form>
      </Modal>
    </>
  )
}
