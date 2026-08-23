'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useHrDepartments, useHrEmployees } from '@/hooks/use-hr-data'
import { HR_QUERY_KEYS } from '@/lib/hr/constants'
import { Modal } from '@/components/ui/modal'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { ThemeSelect } from '@/components/ui/theme-select'

export default function HrDepartmentsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', manager_id: '', parent_id: '' })
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: departments = [] } = useHrDepartments()
  const { data: employees = [] } = useHrEmployees()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.departments })
    queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.dashboard })
  }

  const addDept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('hr_departments').insert({
        workspace_id: workspace?.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        manager_id: form.manager_id || null,
        parent_id: form.parent_id || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      setShowAdd(false)
      setForm({ name: '', description: '', manager_id: '', parent_id: '' })
      toast.success('Department created')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Departments</h2>
          <p className="text-sm text-text-secondary mt-1">Organization structure, managers, and team assignments</p>
        </div>
        <PermissionGate module="hr" permission="edit">
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add department
          </button>
        </PermissionGate>
      </div>

      {departments.length === 0 ? (
        <EmptyState icon={Building2} title="No departments" description="Create departments to organize employees and reporting lines." action={{ label: 'Add department', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="ai-card border border-border-primary p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-text-primary">{dept.name}</h3>
                <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                  <Users size={12} /> {dept.employee_count ?? 0}
                </span>
              </div>
              {dept.description && <p className="text-sm text-text-secondary mb-3 line-clamp-2">{dept.description}</p>}
              <div className="mt-auto space-y-1 text-sm">
                <p className="text-text-tertiary">
                  Manager: <span className="text-text-secondary">{dept.manager?.full_name ?? '—'}</span>
                </p>
                {dept.parent_id && (
                  <p className="text-text-tertiary">
                    Parent: <span className="text-text-secondary">{departments.find((d) => d.id === dept.parent_id)?.name ?? '—'}</span>
                  </p>
                )}
              </div>
              <Link href={`/dashboard/hr/employees?department=${encodeURIComponent(dept.name)}`} className="text-xs text-accent mt-3 hover:underline">
                View employees →
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add department">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            addDept.mutate()
          }}
        >
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
            <input required className="form-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
            <textarea className="form-field min-h-[72px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Department manager</label>
            <ThemeSelect variant="form" value={form.manager_id} onChange={(manager_id) => setForm({ ...form, manager_id })} options={[{ value: '', label: 'None' }, ...employees.map((e) => ({ value: e.id, label: e.full_name }))]} aria-label="Manager" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Parent department</label>
            <ThemeSelect variant="form" value={form.parent_id} onChange={(parent_id) => setForm({ ...form, parent_id })} options={[{ value: '', label: 'None' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} aria-label="Parent" />
          </div>
          <button type="submit" disabled={addDept.isPending} className="btn-primary w-full">Create department</button>
        </form>
      </Modal>
    </>
  )
}
