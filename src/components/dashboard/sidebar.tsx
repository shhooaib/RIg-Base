import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { getActiveOrganizationName } from '@/lib/workspace-access'
import { usePermissions } from '@/hooks/use-permissions'
import type { ModuleKey } from '@/lib/rbac/types'
import { ERP_MODULE_KEYS } from '@/lib/rbac/constants'
import { resolveSidebarWidth } from '@/lib/sidebar-layout'
import { WorkspaceSwitcher } from '@/components/dashboard/workspace-switcher'
import { SidebarBrandTitle, SidebarBrandCollapsed } from '@/components/dashboard/sidebar-brand-title'
import { SidebarResizeHandle } from '@/components/dashboard/sidebar-resize-handle'
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import {
  ICON_SIZE_NAV,
  ICON_STROKE_NAV,
  MODULE_NAV_ICONS,
  mergeNavIconClass,
} from '@/lib/icons/lucide-nav'
import { toast } from 'sonner'

const moduleIcons = MODULE_NAV_ICONS

const SettingsIcon = MODULE_NAV_ICONS.settings

const moduleLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  hr: 'HR',
  inventory: 'Inventory',
  finance: 'Finance',
  supply_chain: 'Supply Chain',
  crm: 'CRM',
}

const moduleRoutes: Record<string, string> = {
  dashboard: '/dashboard',
  hr: '/dashboard/hr',
  inventory: '/dashboard/inventory',
  finance: '/dashboard/finance',
  supply_chain: '/dashboard/supply-chain',
  crm: '/dashboard/crm',
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const {
    workspace,
    profile,
    memberships,
    sidebarOpen,
    sidebarWidth,
    sidebarResizing,
    toggleSidebar,
    hydrateSidebarWidth,
  } = useWorkspaceStore()
  const { canViewModule, roleName } = usePermissions()
  const supabase = createClient()

  useEffect(() => {
    hydrateSidebarWidth()
  }, [hydrateSidebarWidth])

  const width = resolveSidebarWidth(sidebarOpen, sidebarWidth)

  const activeOrganizationName = getActiveOrganizationName(
    workspace,
    memberships,
    profile?.business_name ?? 'Organization'
  )

  const activeModules = workspace?.modules
    ? ERP_MODULE_KEYS.filter(
        (key) => workspace.modules[key as keyof typeof workspace.modules] && canViewModule(key)
      )
    : []

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <motion.aside
      animate={{ width }}
      transition={sidebarResizing ? { duration: 0 } : { duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-primary flex flex-col z-20"
    >
      {sidebarOpen ? <SidebarBrandTitle /> : <SidebarBrandCollapsed />}

      <WorkspaceSwitcher memberships={memberships} collapsed={!sidebarOpen} />

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {activeModules.map((module) => {
          const Icon = moduleIcons[module as ModuleKey] ?? MODULE_NAV_ICONS.dashboard
          const route = moduleRoutes[module]
          const isActive = pathname === route || (module !== 'dashboard' && pathname.startsWith(route))

          return (
            <Link
              key={module}
              href={route}
              className={`group flex items-center gap-3 px-3 py-2.5 transition-colors relative ${
                isActive
                  ? 'text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-full"
                />
              )}
              <Icon
                size={ICON_SIZE_NAV}
                strokeWidth={ICON_STROKE_NAV}
                className={mergeNavIconClass(isActive)}
              />
              {sidebarOpen && (
                <span className="text-sm font-medium tracking-wide">{moduleLabels[module]}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border-primary p-2 space-y-0.5">
        {canViewModule('settings') && (
        <Link
          href="/dashboard/settings"
          className={`group flex items-center gap-3 px-3 py-2.5 transition-colors ${
            pathname === '/dashboard/settings'
              ? 'text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <SettingsIcon
            size={ICON_SIZE_NAV}
            strokeWidth={ICON_STROKE_NAV}
            className={mergeNavIconClass(pathname === '/dashboard/settings')}
          />
          {sidebarOpen && <span className="text-sm">Settings</span>}
        </Link>
        )}

        <button
          onClick={handleLogout}
          className="group w-full flex items-center gap-3 px-3 py-2.5 text-text-tertiary hover:text-danger transition-colors"
        >
          <LogOut
            size={ICON_SIZE_NAV}
            strokeWidth={ICON_STROKE_NAV}
            className="flex-shrink-0 text-text-tertiary group-hover:text-danger"
          />
          {sidebarOpen && <span className="text-sm">Sign out</span>}
        </button>

        {sidebarOpen && profile && (
          <div className="px-3 py-3 mt-1 border-t border-border-primary">
            <Link href="/dashboard/profile" className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border-primary flex items-center justify-center text-xs font-medium text-accent shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-text-primary">{profile.full_name}</p>
                <p className="text-[11px] text-text-tertiary truncate">
                  {roleName} · {activeOrganizationName}
                </p>
              </div>
            </Link>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border-primary p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className={`w-full flex items-center transition-colors text-text-muted hover:text-text-tertiary ${
            sidebarOpen ? 'justify-start gap-3 px-3 py-2.5' : 'justify-center p-2.5'
          }`}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft size={ICON_SIZE_NAV} strokeWidth={ICON_STROKE_NAV} className="text-text-muted" />
          ) : (
            <ChevronRight size={ICON_SIZE_NAV} strokeWidth={ICON_STROKE_NAV} className="text-text-muted" />
          )}
          {sidebarOpen && <span className="text-sm">Collapse</span>}
        </button>
      </div>
      <SidebarResizeHandle />
    </motion.aside>
  )
}
