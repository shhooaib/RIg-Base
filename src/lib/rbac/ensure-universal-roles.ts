import type { SupabaseClient } from '@supabase/supabase-js'
import { buildUniversalRoles } from '@/lib/rbac/permissions'
import { normalizeRolePermissions, isNestedPermissionMap } from '@/lib/rbac/permissions'
import { syncRoleModulePermissions } from '@/lib/rbac/sync-role-permissions'
import type { WorkspaceModules } from '@/lib/rbac/types'
import { UNIVERSAL_ROLE_NAMES } from '@/lib/rbac/constants'

export async function ensureUniversalRoles(
  supabase: SupabaseClient,
  workspaceId: string,
  modules: WorkspaceModules
) {
  const { data: existingRoles, error } = await supabase
    .from('roles')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error) throw error

  const roles = existingRoles ?? []
  const universalTemplates = buildUniversalRoles(modules)

  for (const role of roles) {
    if (!isNestedPermissionMap(role.permissions)) {
      const normalized = normalizeRolePermissions(role.permissions)
      const { error: updateError } = await supabase
        .from('roles')
        .update({ permissions: normalized })
        .eq('id', role.id)
      if (updateError) throw updateError
      await syncRoleModulePermissions(supabase, role.id, normalized)
    }
  }

  const obsoleteRoles = roles.filter((r) => !UNIVERSAL_ROLE_NAMES.includes(r.name as (typeof UNIVERSAL_ROLE_NAMES)[number]))

  const { data: staffRowEarly } = await supabase
    .from('roles')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', 'Staff')
    .maybeSingle()

  for (const obsolete of obsoleteRoles) {
    if (staffRowEarly) {
      await supabase
        .from('employees')
        .update({ role_id: staffRowEarly.id })
        .eq('role_id', obsolete.id)
    }
    await supabase.from('roles').delete().eq('id', obsolete.id)
  }

  const refreshed = await supabase.from('roles').select('*').eq('workspace_id', workspaceId)
  const current = refreshed.data ?? []

  for (const template of universalTemplates) {
    const match = current.find((r) => r.name === template.name)
    if (match) {
      const normalized = normalizeRolePermissions(match.permissions)
      const needsPermissionRefresh =
        template.is_system &&
        JSON.stringify(normalized) !== JSON.stringify(template.permissions)

      if (needsPermissionRefresh) {
        const { error: updateError } = await supabase
          .from('roles')
          .update({
            description: template.description,
            is_system: true,
            permissions: template.permissions,
          })
          .eq('id', match.id)
        if (updateError) throw updateError
        await syncRoleModulePermissions(supabase, match.id, template.permissions)
      } else if (!match.description || match.description !== template.description) {
        await supabase
          .from('roles')
          .update({ description: template.description, is_system: template.is_system })
          .eq('id', match.id)
      }
      continue
    }

    const { data: inserted, error: insertError } = await supabase
      .from('roles')
      .insert({
        workspace_id: workspaceId,
        name: template.name,
        description: template.description,
        is_system: template.is_system,
        permissions: template.permissions,
      })
      .select('id')
      .single()

    if (insertError) throw insertError
    if (inserted) {
      await syncRoleModulePermissions(supabase, inserted.id, template.permissions)
    }
  }

  const { data: staffRow } = await supabase
    .from('roles')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', 'Staff')
    .maybeSingle()

  if (staffRow) {
    await supabase
      .from('employees')
      .update({ role_id: staffRow.id })
      .eq('workspace_id', workspaceId)
      .is('role_id', null)
  }

  return { migrated: true }
}
