'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import { EMPLOYEES_QUERY_ROOT } from '@/lib/hr/employees-data'
import { ensurePipelineStages } from '@/lib/crm/interactions'
import type { CrmPipelineStage, Employee } from '@/lib/types'

export function useCrmEmployees() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [EMPLOYEES_QUERY_ROOT, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .in('status', ['active', 'on_leave', 'onboarding'])
        .order('full_name')
      if (error) throw new Error(error.message)
      return (data ?? []) as Employee[]
    },
    enabled: !!workspace?.id,
  })
}

export function useCrmPipeline() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: CRM_QUERY_KEYS.pipeline,
    queryFn: async () => {
      if (!workspace?.id) return []
      await ensurePipelineStages(supabase, workspace.id)
      const { data } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('position')
      return (data ?? []) as CrmPipelineStage[]
    },
    enabled: !!workspace?.id,
  })
}
