'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import {
  useEmployeeDocuments,
  useEmployeeHistory,
  useHrDepartments,
  useHrDesignations,
  useHrEmployee,
  useHrEmployees,
  useHrLeaveBalances,
  useHrRoles,
} from '@/hooks/use-hr-data'
import { HR_QUERY_KEYS, DOCUMENT_TYPES, HISTORY_EVENT_LABELS } from '@/lib/hr/constants'
import { EmployeeStatusBadge, LifecycleBadge } from '@/components/hr/status-badges'
import { EmployeeForm } from '@/components/hr/employee-form'
import { Modal } from '@/components/ui/modal'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { usePermissions } from '@/hooks/use-permissions'
import { Loader2, ArrowLeft, Pencil, FileText, History, User } from 'lucide-react'
import { toast } from 'sonner'

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [tab, setTab] = useState<'overview' | 'documents' | 'history'>('overview')
  const [editing, setEditing] = useState(false)
  const [docForm, setDocForm] = useState({ name: '', document_type: 'other', file_url: '', notes: '' })
  const { workspace } = useWorkspaceStore()
  const { can } = usePermissions()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: employee, isLoading } = useHrEmployee(id)
  const { data: allEmployees = [] } = useHrEmployees()
  const { data: hrDepartments = [] } = useHrDepartments()
  const { data: designations = [] } = useHrDesignations()
  const { data: roles = [] } = useHrRoles()
  const { data: history = [] } = useEmployeeHistory(id)
  const { data: documents = [] } = useEmployeeDocuments(id)
  const { data: leaveBalances = [] } = useHrLeaveBalances(id)

  const updateEmployee = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase.from('employees').update(data).eq('id', id).eq('workspace_id', workspace?.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.employee(id) })
      queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.employees })
      setEditing(false)
      toast.success('Profile updated')
    },
    onError: () => toast.error('Update failed'),
  })

  const addDocument = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('employee_documents').insert({
        workspace_id: workspace?.id,
        employee_id: id,
        name: docForm.name,
        document_type: docForm.document_type,
        file_url: docForm.file_url || null,
        notes: docForm.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.documents(id) })
      setDocForm({ name: '', document_type: 'other', file_url: '', notes: '' })
      toast.success('Document added')
    },
    onError: () => toast.error('Failed to add document'),
  })

  if (isLoading || !employee) {
    return (
      <div className="flex justify-center py-16 text-text-secondary">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading profile…
      </div>
    )
  }

  const roleName = roles.find((r) => r.id === employee.role_id)?.name ?? '—'
  const assignableRoles = roles.filter((r) => r.name !== 'Owner')

  return (
    <>
      <Link href="/dashboard/hr/employees" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4">
        <ArrowLeft size={14} /> Back to employees
      </Link>

      <div className="page-header">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
            <User size={24} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{employee.full_name}</h2>
            <p className="text-sm text-text-secondary mt-0.5">{employee.job_title ?? employee.designation?.title ?? roleName} · {employee.hr_department?.name ?? employee.department}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <EmployeeStatusBadge status={employee.status} />
              <LifecycleBadge stage={employee.lifecycle_stage} />
              {employee.employee_code && <span className="text-xs text-text-tertiary px-2 py-0.5 bg-bg-tertiary rounded-full">{employee.employee_code}</span>}
            </div>
          </div>
        </div>
        <PermissionGate module="hr" permission="edit">
          <button type="button" onClick={() => setEditing(true)} className="btn-secondary">
            <Pencil size={16} /> Edit profile
          </button>
        </PermissionGate>
      </div>

      <div className="tab-bar mb-6">
        {(['overview', 'documents', 'history'] as const).map((t) => (
          <button key={t} type="button" data-active={tab === t ? 'true' : 'false'} onClick={() => setTab(t)} className="capitalize">
            {t === 'overview' && <User size={16} />}
            {t === 'documents' && <FileText size={16} />}
            {t === 'history' && <History size={16} />}
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InfoCard title="Personal">
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Date of birth" value={employee.date_of_birth} />
            <InfoRow label="Address" value={employee.address} />
            <InfoRow label="Emergency contact" value={employee.emergency_contact_name ? `${employee.emergency_contact_name} (${employee.emergency_contact_phone ?? '—'})` : null} />
          </InfoCard>
          <InfoCard title="Job">
            <InfoRow label="Department" value={employee.hr_department?.name ?? employee.department} />
            <InfoRow label="Designation" value={employee.designation?.title} />
            <InfoRow label="Job title" value={employee.job_title} />
            <InfoRow label="Manager" value={employee.manager?.full_name} />
            <InfoRow label="Employment type" value={employee.employment_type?.replace('_', ' ')} />
            <InfoRow label="Work location" value={employee.work_location} />
            <InfoRow label="Joined" value={employee.hire_date} />
            <InfoRow label="Access role" value={roleName} />
            {employee.user_id && <InfoRow label="Account" value="Linked to login" />}
          </InfoCard>
          {leaveBalances.length > 0 && (
            <InfoCard title="Leave balances">
              {leaveBalances.map((b) => (
                <InfoRow key={b.id} label={b.leave_type?.name ?? 'Leave'} value={`${Math.max(0, b.allocated_days - b.used_days)} / ${b.allocated_days} days`} />
              ))}
            </InfoCard>
          )}
          {employee.notes && (
            <InfoCard title="Notes">
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{employee.notes}</p>
            </InfoCard>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-4">
          <PermissionGate module="hr" permission="edit">
            <div className="ai-card border border-border-primary p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <input className="form-field" placeholder="Document name" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} />
              <select className="form-field" value={docForm.document_type} onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}>
                {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input className="form-field" placeholder="File URL (optional)" value={docForm.file_url} onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })} />
              <button type="button" disabled={!docForm.name || addDocument.isPending} onClick={() => addDocument.mutate()} className="btn-primary">Add document</button>
            </div>
          </PermissionGate>
          {documents.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center">No documents on file.</p>
          ) : (
            <div className="divide-y divide-border-primary border border-border-primary rounded-lg">
              {documents.map((doc) => (
                <div key={doc.id} className="px-4 py-3 flex justify-between gap-4">
                  <div>
                    <p className="font-medium text-text-primary">{doc.name}</p>
                    <p className="text-xs text-text-tertiary capitalize">{doc.document_type.replace('_', ' ')} · {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    {doc.notes && <p className="text-sm text-text-secondary mt-1">{doc.notes}</p>}
                  </div>
                  {doc.file_url && <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm text-accent shrink-0">Open</a>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-0 border border-border-primary rounded-lg divide-y divide-border-primary">
          {history.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center">No history events yet.</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="px-4 py-3">
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-text-primary">{entry.title}</p>
                  <span className="text-xs text-text-tertiary shrink-0">{new Date(entry.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-accent mt-0.5">{HISTORY_EVENT_LABELS[entry.event_type] ?? entry.event_type}</p>
                {entry.description && <p className="text-sm text-text-secondary mt-1">{entry.description}</p>}
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit employee profile">
        <EmployeeForm
          initial={employee}
          departments={workspace?.departments ?? []}
          hrDepartments={hrDepartments}
          designations={designations}
          roles={assignableRoles}
          managers={allEmployees}
          onSubmit={(data) => updateEmployee.mutate(data)}
          loading={updateEmployee.isPending}
          submitLabel="Save changes"
        />
      </Modal>
    </>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ai-card border border-border-primary p-5">
      <h3 className="font-semibold text-text-primary mb-3">{title}</h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="text-text-primary text-right capitalize">{value ?? '—'}</dd>
    </div>
  )
}
