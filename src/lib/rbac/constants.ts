import type { ModuleKey, PermissionKey } from '@/lib/rbac/types'

export const PERMISSION_DEFINITIONS: { key: PermissionKey; label: string; description: string }[] = [
  { key: 'view', label: 'View', description: 'See records and lists' },
  { key: 'create', label: 'Create', description: 'Add new records' },
  { key: 'edit', label: 'Edit', description: 'Modify existing records' },
  { key: 'delete', label: 'Delete', description: 'Remove records permanently' },
  { key: 'approve', label: 'Approve', description: 'Approve pending records' },
  { key: 'import', label: 'Import', description: 'Import data from files' },
  { key: 'export', label: 'Export', description: 'Export data to files' },
  { key: 'print', label: 'Print', description: 'Print records and reports' },
  { key: 'manage', label: 'Manage', description: 'Configure module settings and assignments' },
  { key: 'view_reports', label: 'View Reports', description: 'Access analytics and reports' },
]

export const MODULE_DEFINITIONS: { key: ModuleKey; label: string; route?: string }[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/dashboard' },
  { key: 'finance', label: 'Finance', route: '/dashboard/finance' },
  { key: 'crm', label: 'CRM', route: '/dashboard/crm' },
  { key: 'hr', label: 'Human Resources', route: '/dashboard/hr' },
  { key: 'inventory', label: 'Inventory', route: '/dashboard/inventory' },
  { key: 'supply_chain', label: 'Supply Chain', route: '/dashboard/supply-chain' },
  { key: 'settings', label: 'Settings', route: '/dashboard/settings' },
]

export const ALL_PERMISSION_KEYS = PERMISSION_DEFINITIONS.map((p) => p.key)

export const ERP_MODULE_KEYS = MODULE_DEFINITIONS.filter((m) => m.key !== 'settings').map((m) => m.key)

export const UNIVERSAL_ROLE_NAMES = [
  'Owner',
  'Administrator',
  'Manager',
  'Staff',
  'Data Entry',
  'Viewer / Auditor',
] as const
