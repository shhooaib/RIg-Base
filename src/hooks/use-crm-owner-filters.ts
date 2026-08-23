'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { useCrmEmployees } from '@/hooks/use-crm-data'
import { useWorkspaceStore } from '@/store/workspace'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

/** Current user's employee row in the active workspace (for "My records" filters). */
export function useCurrentCrmEmployeeId() {
  const { workspace, profile } = useWorkspaceStore()
  const supabase = createClient()

  const { data } = useQuery({
    queryKey: ['crm-current-employee', workspace?.id, profile?.id],
    queryFn: async () => {
      if (!workspace?.id || !profile?.id) return null
      const { data: row } = await supabase
        .from('employees')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('user_id', profile.id)
        .maybeSingle()
      return row?.id ?? null
    },
    enabled: !!workspace?.id && !!profile?.id,
  })

  return data ?? null
}

export function useCrmOwnerFilters() {
  const { data: employees = [] } = useCrmEmployees()
  const { isOwner } = usePermissions()
  const myEmployeeId = useCurrentCrmEmployeeId()

  const ownerFilter = useMemo(
    () => ({
      id: 'assigned_to',
      label: 'Owner',
      options: [
        ...(myEmployeeId ? [{ value: myEmployeeId, label: 'Assigned to me' }] : []),
        { value: 'unassigned', label: 'Unassigned' },
        ...employees
          .filter((e) => e.id !== myEmployeeId)
          .map((e) => ({ value: e.id, label: e.full_name })),
      ],
    }),
    [employees, myEmployeeId]
  )

  return { ownerFilter, myEmployeeId, isOwner, employees }
}
