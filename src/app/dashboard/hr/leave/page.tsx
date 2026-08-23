'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useHrEmployees, useHrLeaveRequests, useHrLeaveTypes } from '@/hooks/use-hr-data'
import { HR_QUERY_KEYS, LEAVE_STATUSES } from '@/lib/hr/constants'
import { computeLeaveDays } from '@/lib/hr/attendance-utils'
import { LeaveStatusBadge } from '@/components/hr/status-badges'
import { Modal } from '@/components/ui/modal'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { ThemeSelect } from '@/components/ui/theme-select'
import { usePermissions } from '@/hooks/use-permissions'
import { CalendarDays, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { HrLeaveRequest } from '@/lib/hr/types'

export default function HrLeavePage() {
  const [showRequest, setShowRequest] = useState(false)
  const [form, setForm] = useState({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: employees = [] } = useHrEmployees()
  const { data: leaveTypes = [] } = useHrLeaveTypes()
  const { data: requests = [] } = useHrLeaveRequests()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.leaveRequests })
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.dashboard })
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.leaveBalances })
  }

  const createRequest = useMutation({
    mutationFn: async () => {
      const lt = leaveTypes.find((t) => t.id === form.leave_type_id)
      const days = computeLeaveDays(form.start_date, form.end_date)
      const { error } = await supabase.from('leave_requests').insert({
        workspace_id: workspace?.id,
        employee_id: form.employee_id,
        leave_type_id: form.leave_type_id || null,
        type: lt?.code ?? 'annual',
        start_date: form.start_date,
        end_date: form.end_date,
        days_count: days,
        reason: form.reason,
        status: 'pending',
      })
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      setShowRequest(false)
      setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' })
      toast.success('Leave request submitted')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const reviewLeave = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: 'approved' | 'rejected'; rejection_reason?: string }) => {
      const req = requests.find((r) => r.id === id)
      const { data: reviewer } = await supabase.from('employees').select('id').eq('workspace_id', workspace?.id).eq('user_id', (await supabase.auth.getUser()).data.user?.id).maybeSingle()

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          approved_by: reviewer?.id ?? null,
          approved_at: new Date().toISOString(),
          rejection_reason: rejection_reason ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      if (status === 'approved' && req?.employee_id && req.leave_type_id && req.days_count) {
        const year = new Date(req.start_date).getFullYear()
        const { data: balance } = await supabase
          .from('hr_leave_balances')
          .select('*')
          .eq('employee_id', req.employee_id)
          .eq('leave_type_id', req.leave_type_id)
          .eq('year', year)
          .maybeSingle()

        if (balance) {
          await supabase
            .from('hr_leave_balances')
            .update({ used_days: Number(balance.used_days) + Number(req.days_count), updated_at: new Date().toISOString() })
            .eq('id', balance.id)
        } else {
          const lt = leaveTypes.find((t) => t.id === req.leave_type_id)
          await supabase.from('hr_leave_balances').insert({
            workspace_id: workspace?.id,
            employee_id: req.employee_id,
            leave_type_id: req.leave_type_id,
            year,
            allocated_days: lt?.default_days_per_year ?? 0,
            used_days: req.days_count,
          })
        }

        if (req.start_date <= new Date().toISOString().slice(0, 10) && req.end_date >= new Date().toISOString().slice(0, 10)) {
          await supabase.from('employees').update({ status: 'on_leave', lifecycle_stage: 'on_leave' }).eq('id', req.employee_id)
        }
      }
    },
    onSuccess: () => { invalidate(); toast.success('Leave request updated') },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns = [
    { key: 'employee', header: 'Employee', render: (r: HrLeaveRequest) => r.employee?.full_name ?? '—' },
    { key: 'type', header: 'Type', render: (r: HrLeaveRequest) => r.leave_type?.name ?? r.type },
    { key: 'dates', header: 'Dates', render: (r: HrLeaveRequest) => `${r.start_date} → ${r.end_date}` },
    { key: 'days', header: 'Days', render: (r: HrLeaveRequest) => r.days_count ?? computeLeaveDays(r.start_date, r.end_date) },
    { key: 'reason', header: 'Reason', cellClass: 'table-cell-secondary max-w-[200px] truncate', render: (r: HrLeaveRequest) => r.reason },
    { key: 'status', header: 'Status', render: (r: HrLeaveRequest) => <LeaveStatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r: HrLeaveRequest) =>
        r.status === 'pending' && can('hr', 'edit') ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => reviewLeave.mutate({ id: r.id, status: 'approved' })} className="text-xs text-success hover:underline">Approve</button>
            <button type="button" onClick={() => reviewLeave.mutate({ id: r.id, status: 'rejected', rejection_reason: 'Not approved' })} className="text-xs text-danger hover:underline">Reject</button>
          </div>
        ) : null,
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Leave management</h2>
          <p className="text-sm text-text-secondary mt-1">Requests, approvals, balances, and leave types</p>
        </div>
        <PermissionGate module="hr" permission="create">
          <button type="button" onClick={() => setShowRequest(true)} className="btn-primary">
            <Plus size={16} /> New request
          </button>
        </PermissionGate>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {leaveTypes.map((lt) => (
          <div key={lt.id} className="ai-card border border-border-primary p-4">
            <p className="text-xs text-text-tertiary">{lt.name}</p>
            <p className="text-lg font-semibold text-text-primary mt-1">{lt.default_days_per_year} days/yr</p>
            <p className="text-[10px] text-text-tertiary mt-1">{lt.is_paid ? 'Paid' : 'Unpaid'}</p>
          </div>
        ))}
      </div>

      <FilterableDataTable
        columns={columns}
        data={requests}
        searchPlaceholder="Search leave requests…"
        filters={[{ id: 'status', label: 'Status', options: LEAVE_STATUSES.map((s) => ({ value: s.value, label: s.label })) }]}
        customFilter={(r, ctx) => {
          const hay = [r.employee?.full_name, r.reason, r.leave_type?.name].join(' ')
          if (ctx.search && !hay.toLowerCase().includes(ctx.search.toLowerCase())) return false
          if (ctx.filters.status !== 'all' && r.status !== ctx.filters.status) return false
          return true
        }}
        pageSize={12}
        rowKey={(r) => r.id}
        emptyFilteredMessage="No leave requests."
      />

      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="New leave request">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            createRequest.mutate()
          }}
        >
          <ThemeSelect variant="form" value={form.employee_id} onChange={(employee_id) => setForm({ ...form, employee_id })} options={employees.filter((e) => ['active', 'on_leave'].includes(e.status)).map((e) => ({ value: e.id, label: e.full_name }))} aria-label="Employee" />
          <ThemeSelect variant="form" value={form.leave_type_id} onChange={(leave_type_id) => setForm({ ...form, leave_type_id })} options={leaveTypes.map((t) => ({ value: t.id, label: t.name }))} aria-label="Leave type" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Start date</label>
              <input type="date" required className="form-field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">End date</label>
              <input type="date" required className="form-field" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <textarea required className="form-field min-h-[80px]" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button type="submit" disabled={createRequest.isPending} className="btn-primary w-full">Submit request</button>
        </form>
      </Modal>
    </>
  )
}
