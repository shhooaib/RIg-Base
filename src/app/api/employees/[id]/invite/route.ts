import { createClient } from '@/lib/supabase/server'
import { appBaseUrl } from '@/lib/api/workspace-context'
import { sendInviteEmail, isEmailConfigured, formatEmailError } from '@/lib/email/send-invite'
import { resolveServerPermissions, userCan } from '@/lib/rbac/server-permissions'
import { NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

function canSendInvites(ctx: Awaited<ReturnType<typeof resolveServerPermissions>>) {
  if (!ctx) return false
  if (ctx.isOwner) return true
  return (
    userCan(ctx, 'hr', 'manage') ||
    userCan(ctx, 'settings', 'manage') ||
    userCan(ctx, 'hr', 'create')
  )
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await resolveServerPermissions(supabase, user.id)
  if (!ctx) {
    return NextResponse.json({ error: 'No workspace' }, { status: 404 })
  }

  if (!canSendInvites(ctx)) {
    return NextResponse.json({ error: 'You do not have permission to send invites' }, { status: 403 })
  }

  const { data: employee, error: fetchError } = await supabase
    .from('employees')
    .select('id, email, full_name, user_id, status, role_id, roles(name)')
    .eq('id', id)
    .eq('workspace_id', ctx.workspace.id)
    .single()

  if (fetchError || !employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  if (employee.user_id) {
    return NextResponse.json({ error: 'Employee already has an account linked' }, { status: 400 })
  }

  const inviteToken = crypto.randomUUID()

  const { data: updated, error } = await supabase
    .from('employees')
    .update({
      status: 'invited',
      lifecycle_stage: 'onboarding',
      invite_token: inviteToken,
      invited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, email, full_name, invite_token, invited_at, status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const inviteUrl = `${appBaseUrl()}/auth/invite?token=${inviteToken}`

  const roleRecord = employee.roles as { name?: string } | { name?: string }[] | null
  const roleName = Array.isArray(roleRecord) ? roleRecord[0]?.name : roleRecord?.name ?? 'Staff'

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', ctx.workspace.user_id)
    .maybeSingle()

  const businessName = ownerProfile?.business_name ?? ctx.workspace.business_type ?? 'Your organization'

  let emailSent = false
  let emailError: string | null = null

  if (isEmailConfigured()) {
    try {
      await sendInviteEmail({
        to: employee.email,
        employeeName: employee.full_name ?? 'Team member',
        businessName,
        roleName: roleName ?? 'Staff',
        inviteUrl,
      })
      emailSent = true
    } catch (err) {
      emailError = formatEmailError(err)
    }
  } else {
    emailError = 'Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.'
  }

  return NextResponse.json({
    success: true,
    employee: updated,
    inviteUrl,
    emailSent,
    emailError,
  })
}
