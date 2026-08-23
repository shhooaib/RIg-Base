'use client'

import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { useHrEmployees } from '@/hooks/use-hr-data'
import { HR_QUERY_KEYS, LIFECYCLE_STAGES } from '@/lib/hr/constants'
import { EmployeeStatusBadge, LifecycleBadge } from '@/components/hr/status-badges'
import { PermissionGate } from '@/components/rbac/permission-gate'
import { GitBranch, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { EmployeeProfile } from '@/lib/hr/types'

const TRANSITIONS: Record<string, { label: string; nextStage: EmployeeProfile['lifecycle_stage']; nextStatus: EmployeeProfile['status']; event: string }[]> = {
  onboarding: [
    { label: 'Complete onboarding', nextStage: 'active', nextStatus: 'active', event: 'onboarding_completed' },
  ],
  active: [
    { label: 'Start offboarding', nextStage: 'offboarding', nextStatus: 'offboarding', event: 'offboarding_started' },
    { label: 'Mark on leave', nextStage: 'on_leave', nextStatus: 'on_leave', event: 'leave_started' },
  ],
  on_leave: [
    { label: 'Return to active', nextStage: 'active', nextStatus: 'active', event: 'leave_ended' },
  ],
  offboarding: [
    { label: 'Complete offboarding', nextStage: 'inactive', nextStatus: 'inactive', event: 'offboarding_completed' },
  ],
  inactive: [
    { label: 'Reactivate', nextStage: 'active', nextStatus: 'active', event: 'reactivated' },
  ],
}

export default function HrLifecyclePage() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: employees = [] } = useHrEmployees()

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeProfile[]>()
    for (const stage of LIFECYCLE_STAGES) map.set(stage.value, [])
    for (const e of employees) {
      const stage = e.lifecycle_stage ?? 'active'
      map.get(stage)?.push(e)
    }
    return map
  }, [employees])

  const transition = useMutation({
    mutationFn: async ({
      employee,
      nextStage,
      nextStatus,
      event,
      label,
    }: {
      employee: EmployeeProfile
      nextStage: EmployeeProfile['lifecycle_stage']
      nextStatus: EmployeeProfile['status']
      event: string
      label: string
    }) => {
      const patch: Record<string, unknown> = {
        lifecycle_stage: nextStage,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }
      if (nextStage === 'inactive') patch.offboarding_date = new Date().toISOString().slice(0, 10)

      const { error } = await supabase.from('employees').update(patch).eq('id', employee.id).eq('workspace_id', workspace?.id)
      if (error) throw error

      await supabase.rpc('record_employee_history', {
        p_workspace_id: workspace?.id,
        p_employee_id: employee.id,
        p_event_type: event,
        p_title: label,
        p_description: `Lifecycle updated to ${nextStage.replace('_', ' ')}`,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.employees })
      queryClient.invalidateQueries({ queryKey: HR_QUERY_KEYS.dashboard })
      toast.success('Lifecycle updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Employee lifecycle</h2>
          <p className="text-sm text-text-secondary mt-1">Onboarding, active employment, leave, and offboarding</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {LIFECYCLE_STAGES.map((s) => (
          <div key={s.value} className="summary-stat">
            <p className="stat-label summary-stat-label capitalize">{s.label}</p>
            <p className="text-2xl font-semibold">{grouped.get(s.value)?.length ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {LIFECYCLE_STAGES.map((stage) => {
          const list = grouped.get(stage.value) ?? []
          if (list.length === 0) return null
          return (
            <section key={stage.value}>
              <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2 capitalize">
                <GitBranch size={16} /> {stage.label} ({list.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((employee) => (
                  <div key={employee.id} className="ai-card border border-border-primary p-4">
                    <div className="flex justify-between gap-2 mb-2">
                      <Link href={`/dashboard/hr/employees/${employee.id}`} className="font-medium text-accent hover:underline">
                        {employee.full_name}
                      </Link>
                      <EmployeeStatusBadge status={employee.status} />
                    </div>
                    <p className="text-xs text-text-tertiary mb-3">{employee.hr_department?.name ?? employee.department} · Joined {employee.hire_date}</p>
                    <LifecycleBadge stage={employee.lifecycle_stage} />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(TRANSITIONS[employee.lifecycle_stage] ?? []).map((t) => (
                        <PermissionGate key={t.label} module="hr" permission="edit">
                          <button
                            type="button"
                            disabled={transition.isPending}
                            onClick={() =>
                              transition.mutate({
                                employee,
                                nextStage: t.nextStage,
                                nextStatus: t.nextStatus,
                                event: t.event,
                                label: t.label,
                              })
                            }
                            className="text-xs px-2 py-1 border border-border-primary rounded hover:border-accent"
                          >
                            {t.label}
                          </button>
                        </PermissionGate>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {employees.filter((e) => e.lifecycle_stage === 'onboarding').length === 0 && (
        <div className="ai-card border border-dashed border-border-primary p-8 text-center text-text-secondary">
          <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">New hires appear here when lifecycle stage is set to onboarding.</p>
        </div>
      )}
    </>
  )
}
