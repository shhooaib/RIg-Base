import { create } from 'zustand'
import type { WorkspaceConfig, Profile, TimePeriod } from '@/lib/types'
import type { WorkspaceMembership } from '@/lib/workspace-access'
import {
  SIDEBAR_WIDTH_DEFAULT,
  persistSidebarWidth,
  readStoredSidebarWidth,
} from '@/lib/sidebar-layout'

interface WorkspaceState {
  profile: Profile | null
  workspace: WorkspaceConfig | null
  memberships: WorkspaceMembership[]
  timePeriod: TimePeriod
  sidebarOpen: boolean
  sidebarWidth: number
  sidebarResizing: boolean
  setProfile: (profile: Profile | null) => void
  setWorkspace: (workspace: WorkspaceConfig | null) => void
  setMemberships: (memberships: WorkspaceMembership[]) => void
  setTimePeriod: (period: TimePeriod) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setSidebarResizing: (resizing: boolean) => void
  hydrateSidebarWidth: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  profile: null,
  workspace: null,
  memberships: [],
  timePeriod: 'month',
  sidebarOpen: true,
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  sidebarResizing: false,
  setProfile: (profile) => set({ profile }),
  setWorkspace: (workspace) => set({ workspace }),
  setMemberships: (memberships) => set({ memberships }),
  setTimePeriod: (timePeriod) => set({ timePeriod }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarWidth: (width) => set({ sidebarWidth: persistSidebarWidth(width) }),
  setSidebarResizing: (sidebarResizing) => set({ sidebarResizing }),
  hydrateSidebarWidth: () => set({ sidebarWidth: readStoredSidebarWidth() }),
}))
