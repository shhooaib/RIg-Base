'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useHrDepartments, useHrDesignations, useHrEmployees, useHrRoles, EMPLOYEES_QUERY_ROOT } from '@/hooks/use-hr-data'
import { HR_QUERY_KEYS } from '@/lib/hr/constants'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal'
import { FilterableDataTable } from '@/components/ui/filterable-data-table'
import { RowActions, actionsColumn } from '@/components/ui/row-actions'
import { ModuleImport } from '@/components/import/module-import'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { EmployeeForm } from '@/components/hr/employee-form'
import { EmployeeStatusBadge } from '@/components/hr/status-badges'
import { usePermissions } from '@/hooks/use-permissions'
import { matchesSearch } from '@/hooks/use-table-controls'
import { Plus, UserPlus, Mail, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect } from 'react'
import type { EmployeeProfile } from '@/lib/hr/types'
import { PERMISSION_QUERY_ROOTS } from '@/lib/rbac/query-keys'

export default function HrEmployeesPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<EmployeeProfile | null>(null)
  const [deleting, setDeleting] = useState<EmployeeProfile | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const { workspace } = useWorkspaceStore()
  const { can, isOwner } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: employees = [], isError, error } = useHrEmployees()
  const { data: roles = [] } = useHrRoles()
  const { data: hrDepartments = [] } = useHrDepartments()
  const { data: designations = [] } = useHrDesignations()

  useEffect(() => {
    if (isError && error) toast.error(error instanceof Error ? error.message : 'Failed to load employees')
  }, [isError, error])

  const canInvite = isOwner || can('hr', 'manage') || can('settings', 'manage') || can('hr', 'create')
  const assignableRoles = useMemo(() => roles.filter((r) => r.name !== 'Owner'), [roles])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_ROOT] })
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.dashboard })
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    for (const root of PERMISSION_QUERY_ROOTS) queryClient.invalidateQueries({ queryKey: [root] })
  }

  const addEmployee = useMutation({
    mutationFn: async (employee: Record<string, unknown>) => {
      const { error } = await supabase.from('employees').insert({
        ...employee,
        workspace_id: workspace?.id,
        lifecycle_stage: employee.lifecycle_stage ?? 'onboarding',
        status: employee.status ?? 'active',
      })
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setShowAdd(false); toast.success('Employee added') },
    onError: () => toast.error('Failed to add employee'),
  })

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...employee }: Record<string, unknown> & { id: string }) => {
      const { error } = await supabase.from('employees').update(employee).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.success('Employee updated') },
    onError: () => toast.error('Failed to update employee'),
  })

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.success('Employee deleted') },
    onError: () => toast.error('Failed to delete employee'),
  })

  const sendInvite = useMutation({
    mutationFn: async (employeeId: string) => {
      const res = await fetch(`/api/employees/${employeeId}/invite`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error ?? 'Failed to send invite')
      return payload as { inviteUrl: string; emailSent: boolean; emailError?: string | null }
    },
    onSuccess: (data) => {
      invalidate()
      if (data.emailSent) toast.success('Invitation email sent')
      else {
        navigator.clipboard.writeText(data.inviteUrl).catch(() => undefined)
        toast.message(data.emailError ? 'Invite link copied (email failed)' : 'Invite link copied')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  async function copyInviteLink(employee: EmployeeProfile) {
    if (!employee.invite_token) return
    const url = `${window.location.origin}/auth/invite?token=${employee.invite_token}`
    await navigator.clipboard.writeText(url)
    setCopiedInviteId(employee.id)
    toast.success('Invite link copied')
    setTimeout(() => setCopiedInviteId(null), 2000)
  }

  const filters = useMemo(
    () => [
      {
        id: 'department',
        label: 'Department',
        options: [...new Set(employees.map((e) => e.hr_department?.name ?? e.department))].filter(Boolean).map((d) => ({ value: d!, label: d! })),
      },
      {
        id: 'status',
        label: 'Status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'invited', label: 'Invited' },
          { value: 'onboarding', label: 'Onboarding' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'on_leave', label: 'On leave' },
        ],
      },
    ],
    [employees]
  )

  const filterFn = useCallback(
    (employee: EmployeeProfile, ctx: { search: string; filters: Record<string, string> }) => {
      const roleName = roles.find((r) => r.id === employee.role_id)?.name ?? ''
      const dept = employee.hr_department?.name ?? employee.department
      const haystack = [employee.full_name, employee.email, employee.employee_code, dept, roleName, employee.job_title].join(' ')
      if (!matchesSearch(haystack, ctx.search)) return false
      if (ctx.filters.department !== 'all' && dept !== ctx.filters.department) return false
      if (ctx.filters.status !== 'all' && employee.status !== ctx.filters.status) return false
      return true
    },
    [roles]
  )

  const columns = [
    {
      key: 'full_name',
      header: 'Name',
      render: (item: EmployeeProfile) => (
        <Link href={`/dashboard/hr/employees/${item.id}`} className="font-medium text-accent hover:underline inline-flex items-center gap-1">
          {item.full_name}
          <ExternalLink size={12} className="opacity-60" />
        </Link>
      ),
    },
    { key: 'employee_code', header: 'Code', cellClass: 'table-cell-secondary', render: (item: EmployeeProfile) => item.employee_code ?? '—' },
    { key: 'email', header: 'Email' },
    {
      key: 'department',
      header: 'Department',
      cellClass: 'table-cell-secondary',
      render: (item: EmployeeProfile) => item.hr_department?.name ?? item.department,
    },
    {
      key: 'job_title',
      header: 'Job title',
      cellClass: 'table-cell-secondary',
      render: (item: EmployeeProfile) => item.job_title ?? item.designation?.title ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: EmployeeProfile) => (
        <div className="flex flex-col gap-1">
          <EmployeeStatusBadge status={item.user_id ? 'active' : item.status} />
          {item.user_id && <span className="text-[10px] text-text-tertiary">Linked account</span>}
        </div>
      ),
    },
    { key: 'hire_date', header: 'Joined', cellClass: 'table-cell-date' },
    actionsColumn<EmployeeProfile>((item) => (
      <div className="flex items-center gap-1">
        {canInvite && !item.user_id && (
          item.status === 'invited' && item.invite_token ? (
            <button type="button" onClick={() => copyInviteLink(item)} className="p-1.5 text-text-tertiary hover:text-accent hover:bg-accent/10" title="Copy invite link">
              {copiedInviteId === item.id ? <Check size={15} /> : <Copy size={15} />}
            </button>
          ) : (
            <button type="button" onClick={() => sendInvite.mutate(item.id)} disabled={sendInvite.isPending} className="p-1.5 text-text-tertiary hover:text-accent hover:bg-accent/10" title="Send invite">
              <Mail size={15} />
            </button>
          )
        )}
        {(can('hr', 'edit') || can('hr', 'delete')) && (
          <RowActions
            onEdit={can('hr', 'edit') ? () => setEditing(item) : undefined}
            onDelete={can('hr', 'delete') ? () => setDeleting(item) : undefined}
          />
        )}
      </div>
    )),
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Employees</h2>
          <p className="text-sm text-text-secondary mt-1">Profiles, job details, invites, and org assignments</p>
        </div>
        <div className="page-header-actions">
          <PermissionGate module="hr" permission="import">
            <ModuleImport module="hr" entity="employees" />
          </PermissionGate>
          <PermissionGate module="hr" permission="create">
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add Employee
            </button>
          </PermissionGate>
        </div>
      </div>

      {employees.length === 0 ? (
        <EmptyState icon={UserPlus} title="No employees yet" description="Add team members, assign departments and managers, and send email invites." action={{ label: 'Add first employee', onClick: () => setShowAdd(true) }} />
      ) : (
        <FilterableDataTable columns={columns} data={employees} searchPlaceholder="Search employees…" filters={filters} customFilter={filterFn} pageSize={10} rowKey={(item) => item.id} emptyFilteredMessage="No employees match your filters." />
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Employee">
        <EmployeeForm departments={workspace?.departments ?? []} hrDepartments={hrDepartments} designations={designations} roles={assignableRoles} managers={employees} onSubmit={(data) => addEmployee.mutate(data)} loading={addEmployee.isPending} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Employee">
        {editing && (
          <EmployeeForm key={editing.id} initial={editing} departments={workspace?.departments ?? []} hrDepartments={hrDepartments} designations={designations} roles={assignableRoles} managers={employees} onSubmit={(data) => updateEmployee.mutate({ id: editing.id, ...data })} loading={updateEmployee.isPending} submitLabel="Save changes" />
        )}
      </Modal>

      <ConfirmDeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteEmployee.mutate(deleting.id)} title="Delete employee" description="This permanently removes the employee record." entityName={deleting?.full_name} loading={deleteEmployee.isPending} />
    </>
  )
}
