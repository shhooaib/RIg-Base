import { ALL_PERMISSION_KEYS } from '@/lib/rbac/constants'
import type {
  ModuleKey,
  ModulePermissionMap,
  PermissionKey,
  UniversalRoleTemplate,
  WorkspaceModules,
} from '@/lib/rbac/types'

const ALL_PERMS = Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true])) as Record<PermissionKey, boolean>

function modulePerms(
  module: ModuleKey,
  permissions: Partial<Record<PermissionKey, boolean>>
): ModulePermissionMap {
  return { [module]: permissions }
}

function mergeMaps(...maps: ModulePermissionMap[]): ModulePermissionMap {
  const result: ModulePermissionMap = {}
  for (const map of maps) {
    for (const [moduleKey, perms] of Object.entries(map)) {
      const mod = moduleKey as ModuleKey
      result[mod] = { ...result[mod], ...perms }
    }
  }
  return result
}

function forEnabledModules(
  modules: WorkspaceModules,
  builder: (module: ModuleKey) => ModulePermissionMap | null
): ModulePermissionMap {
  const keys: (keyof WorkspaceModules)[] = [
    'dashboard',
    'hr',
    'inventory',
    'finance',
    'supply_chain',
    'crm',
  ]
  return mergeMaps(
    ...keys
      .filter((key) => modules[key])
      .map((key) => builder(key as ModuleKey))
      .filter((m): m is ModulePermissionMap => m !== null)
  )
}

function allModulePermissions(module: ModuleKey): ModulePermissionMap {
  return modulePerms(module, ALL_PERMS)
}

export const UNIVERSAL_ROLE_TEMPLATES: UniversalRoleTemplate[] = [
  {
    key: 'owner',
    name: 'Owner',
    description: 'Highest authority with full access to all modules, settings, billing, and user management.',
    isSystem: true,
    buildPermissions: (modules) =>
      mergeMaps(
        forEnabledModules(modules, allModulePermissions),
        modulePerms('settings', ALL_PERMS)
      ),
  },
  {
    key: 'administrator',
    name: 'Administrator',
    description: 'Runs the ERP on behalf of the owner. Manages users, roles, integrations, and data across modules.',
    isSystem: true,
    buildPermissions: (modules) =>
      mergeMaps(
        forEnabledModules(modules, (mod) =>
          modulePerms(mod, {
            view: true,
            create: true,
            edit: true,
            delete: true,
            approve: true,
            import: true,
            export: true,
            print: true,
            manage: mod === 'hr' || mod === 'crm' || mod === 'finance',
            view_reports: true,
          })
        ),
        modulePerms('settings', { view: true, edit: true, manage: true, export: true, print: true, view_reports: true })
      ),
  },
  {
    key: 'manager',
    name: 'Manager',
    description: 'Full control within assigned modules — CRM pipeline, finance operations, HR team management, and approvals.',
    isSystem: true,
    buildPermissions: (modules) =>
      forEnabledModules(modules, (mod) =>
        mod === 'dashboard'
          ? modulePerms(mod, { view: true, view_reports: true })
          : modulePerms(mod, {
              view: true,
              create: true,
              edit: true,
              delete: true,
              approve: true,
              import: true,
              export: true,
              print: true,
              manage: true,
              view_reports: true,
            })
      ),
  },
  {
    key: 'staff',
    name: 'Staff',
    description: 'Regular employee — create and edit records, view module reports, and use day-to-day CRM/Finance/HR tools.',
    isSystem: true,
    buildPermissions: (modules) =>
      forEnabledModules(modules, (mod) =>
        modulePerms(mod, { view: true, create: true, edit: true, view_reports: true })
      ),
  },
  {
    key: 'data_entry',
    name: 'Data Entry',
    description: 'Operator focused on entering information. No delete, export, or approval rights.',
    isSystem: true,
    buildPermissions: (modules) =>
      forEnabledModules(modules, (mod) =>
        modulePerms(mod, { view: true, create: true, edit: true })
      ),
  },
  {
    key: 'viewer',
    name: 'Viewer / Auditor',
    description: 'Read-only access with search and reporting where permitted.',
    isSystem: true,
    buildPermissions: (modules) =>
      forEnabledModules(modules, (mod) =>
        modulePerms(mod, { view: true, view_reports: true })
      ),
  },
]

export function buildUniversalRoles(modules: WorkspaceModules) {
  return UNIVERSAL_ROLE_TEMPLATES.map((template) => ({
    name: template.name,
    description: template.description,
    is_system: template.isSystem,
    permissions: template.buildPermissions(modules),
  }))
}

export function getTemplateByName(name: string): UniversalRoleTemplate | undefined {
  return UNIVERSAL_ROLE_TEMPLATES.find((t) => t.name === name)
}

export function isNestedPermissionMap(value: unknown): value is ModulePermissionMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return true
  return entries.some(([, v]) => typeof v === 'object' && v !== null && !Array.isArray(v))
}

const LEGACY_MODULE_KEYS = ['dashboard', 'hr', 'inventory', 'finance', 'supply_chain', 'crm'] as const

export function migrateLegacyPermissions(flat: Record<string, boolean>): ModulePermissionMap {
  const result: ModulePermissionMap = {}

  for (const [key, enabled] of Object.entries(flat)) {
    if (!enabled) continue
    for (const mod of LEGACY_MODULE_KEYS) {
      if (key === `${mod}_view`) {
        result[mod] = { ...result[mod], view: true }
      }
      if (key === `${mod}_edit`) {
        result[mod] = { ...result[mod], view: true, create: true, edit: true }
      }
      if (key === `${mod}_admin`) {
        result[mod] = { ...ALL_PERMS }
      }
    }
  }

  return result
}

export function normalizeRolePermissions(permissions: unknown): ModulePermissionMap {
  if (!permissions || typeof permissions !== 'object') return {}
  if (isNestedPermissionMap(permissions)) return permissions as ModulePermissionMap
  return migrateLegacyPermissions(permissions as Record<string, boolean>)
}

export function hasPermission(
  permissions: ModulePermissionMap,
  module: ModuleKey,
  permission: PermissionKey
): boolean {
  return Boolean(permissions[module]?.[permission])
}

export function canViewModule(permissions: ModulePermissionMap, module: ModuleKey): boolean {
  return hasPermission(permissions, module, 'view')
}

export function flattenPermissions(map: ModulePermissionMap): { module_key: string; permission_key: string }[] {
  const rows: { module_key: string; permission_key: string }[] = []
  for (const [moduleKey, perms] of Object.entries(map)) {
    if (!perms) continue
    for (const [permissionKey, enabled] of Object.entries(perms)) {
      if (enabled) rows.push({ module_key: moduleKey, permission_key: permissionKey })
    }
  }
  return rows
}

export function countEnabledPermissions(map: ModulePermissionMap): number {
  return flattenPermissions(map).length
}

export function formatPermissionSummary(map: ModulePermissionMap): string[] {
  const summaries: string[] = []
  for (const [moduleKey, perms] of Object.entries(map)) {
    if (!perms) continue
    const enabled = Object.entries(perms)
      .filter(([, v]) => v)
      .map(([k]) => k)
    if (enabled.length > 0) {
      summaries.push(`${moduleKey}: ${enabled.join(', ')}`)
    }
  }
  return summaries
}

export function ownerPermissions(modules: WorkspaceModules): ModulePermissionMap {
  return UNIVERSAL_ROLE_TEMPLATES[0].buildPermissions(modules)
}
