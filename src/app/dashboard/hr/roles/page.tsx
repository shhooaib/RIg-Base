'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useWorkspaceStore } from '@/store/workspace'
import { useHrRoles } from '@/hooks/use-hr-data'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { TablePagination } from '@/components/ui/table-pagination'
import { RolePermissionsForm } from '@/components/rbac/role-permissions-form'
import { usePermissions } from '@/hooks/use-permissions'
import { useTableControls, matchesSearch } from '@/hooks/use-table-controls'
import {
  countEnabledPermissions,
  formatPermissionSummary,
} from '@/lib/rbac/permissions'
import type { ModulePermissionMap } from '@/lib/rbac/types'
import type { Role } from '@/lib/types'
import { PERMISSION_QUERY_ROOTS } from '@/lib/rbac/query-keys'
import { Shield, Pencil, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function HrRolesPage() {
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const { workspace } = useWorkspaceStore()
  const { canManageRoles, isOwner, can } = usePermissions()
  const queryClient = useQueryClient()
  const { data: roles = [] } = useHrRoles()

  const canSyncRoles = isOwner || can('settings', 'manage') || can('hr', 'manage')

  const syncRoles = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/roles/migrate', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to sync roles')
      return body
    },
    onSuccess: () => {
      for (const root of PERMISSION_QUERY_ROOTS) queryClient.invalidateQueries({ queryKey: [root] })
      toast.success('Roles updated for CRM, Finance, and HR modules')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: ModulePermissionMap }) => {
      const res = await fetch(`/api/roles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error ?? 'Failed to update role')
      }
      return res.json()
    },
    onSuccess: () => {
      for (const root of PERMISSION_QUERY_ROOTS) queryClient.invalidateQueries({ queryKey: [root] })
      setEditingRole(null)
      toast.success('Role permissions updated')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const rolesControls = useTableControls(roles, {
    pageSize: 9,
    filterFn: (role, ctx) =>
      matchesSearch(
        [role.name, role.description ?? '', ...formatPermissionSummary(role.permissions)].join(' '),
        ctx.search
      ),
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Roles & access</h2>
          <p className="text-sm text-text-secondary mt-1">Module permissions for CRM, Finance, HR, and team invites</p>
        </div>
        {canSyncRoles && (
          <button
            type="button"
            onClick={() => syncRoles.mutate()}
            disabled={syncRoles.isPending}
            className="btn-secondary"
          >
            <RefreshCw size={16} className={syncRoles.isPending ? 'animate-spin' : ''} />
            Sync role permissions
          </button>
        )}
      </div>

      {roles.length === 0 ? (
        <EmptyState icon={Shield} title="No roles yet" description="Roles are created during workspace setup." />
      ) : (
        <>
          <TableToolbar
            search={rolesControls.search}
            onSearchChange={rolesControls.setSearch}
            searchPlaceholder="Search roles or permissions…"
            onClear={rolesControls.clearFilters}
            hasActiveFilters={rolesControls.hasActiveFilters}
            filteredCount={rolesControls.filteredCount}
            totalCount={rolesControls.totalCount}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesControls.paginatedData.map((role) => {
              const summaries = formatPermissionSummary(role.permissions).slice(0, 4)
              const permissionCount = countEnabledPermissions(role.permissions)
              const isOwnerRole = role.name === 'Owner'

              return (
                <motion.div key={role.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ai-card border border-border-primary p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-accent-muted flex items-center justify-center shrink-0">
                        <Shield size={16} className="text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{role.name}</h3>
                        {role.is_system && <p className="text-[10px] uppercase tracking-wide text-text-tertiary mt-0.5">System role</p>}
                      </div>
                    </div>
                    {canManageRoles() && !isOwnerRole && (
                      <button type="button" onClick={() => setEditingRole(role)} className="p-1.5 text-text-tertiary hover:text-accent hover:bg-accent/10" aria-label={`Edit ${role.name}`}>
                        <Pencil size={15} />
                      </button>
                    )}
                  </div>
                  {role.description && <p className="text-xs text-text-secondary mb-3 line-clamp-2">{role.description}</p>}
                  <p className="text-[11px] text-text-tertiary mb-2">{permissionCount} permissions enabled</p>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {summaries.map((summary) => (
                      <span key={summary} className="px-2 py-0.5 text-xs bg-bg-tertiary border border-border-primary text-text-secondary">{summary}</span>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
          <TablePagination
            page={rolesControls.page}
            totalPages={rolesControls.totalPages}
            rangeStart={rolesControls.rangeStart}
            rangeEnd={rolesControls.rangeEnd}
            filteredCount={rolesControls.filteredCount}
            onPageChange={rolesControls.setPage}
          />
        </>
      )}

      <Modal open={!!editingRole} onClose={() => setEditingRole(null)} title={`Edit permissions — ${editingRole?.name ?? ''}`}>
        {editingRole && workspace && (
          <RolePermissionsForm
            key={editingRole.id}
            role={editingRole}
            enabledModules={workspace.modules}
            loading={updateRole.isPending}
            onSubmit={(permissions) => updateRole.mutate({ id: editingRole.id, permissions })}
          />
        )}
      </Modal>
    </>
  )
}
