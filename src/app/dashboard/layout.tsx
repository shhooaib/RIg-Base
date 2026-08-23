'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { Sidebar } from '@/components/dashboard/sidebar'
import { PermissionRouteGuard } from '@/components/rbac/permission-route-guard'
import { rolesQueryKey } from '@/lib/rbac/query-keys'
import { resolveSidebarWidth } from '@/lib/sidebar-layout'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setProfile, setWorkspace, setMemberships, sidebarOpen, sidebarWidth, sidebarResizing } = useWorkspaceStore()
  const supabase = createClient()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      return data
    },
  })

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces')
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ['workspace'],
    queryFn: async () => {
      const res = await fetch('/api/workspace')
      if (!res.ok) return null
      return res.json()
    },
  })

  useEffect(() => {
    if (profile) setProfile(profile)
  }, [profile, setProfile])

  useEffect(() => {
    if (workspace) setWorkspace(workspace)
  }, [workspace, setWorkspace])

  useEffect(() => {
    if (memberships.length > 0) setMemberships(memberships)
  }, [memberships, setMemberships])

  const queryClient = useQueryClient()

  useQuery({
    queryKey: ['roles-migrate'],
    queryFn: async () => {
      const res = await fetch('/api/roles/migrate', { method: 'POST' })
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: rolesQueryKey(workspace?.id) })
        return res.json()
      }
      return null
    },
    enabled: !!workspace?.id && workspace.user_id === profile?.id,
    staleTime: Infinity,
    retry: 1,
  })

  if (profileLoading || workspaceLoading || membershipsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex relative">
      <Sidebar />
      <main
        className={`flex-1 min-w-0 ${sidebarResizing ? '' : 'transition-[margin] duration-300 ease-in-out'}`}
        style={{ marginLeft: resolveSidebarWidth(sidebarOpen, sidebarWidth) }}
      >
        <PermissionRouteGuard />
        <div className="p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
