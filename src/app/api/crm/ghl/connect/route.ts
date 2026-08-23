import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api/workspace-context'
import { validateGhlConnection, listGhlPipelines, normalizeGhlToken, normalizeGhlLocationId } from '@/lib/ghl/client'
import { GhlApiError } from '@/lib/ghl/shared'
import {
  upsertGhlIntegration,
  getGhlIntegrationStatusPublic,
} from '@/lib/ghl/integration-store'
import { runGhlFullSync } from '@/lib/ghl/sync'
import { NextResponse } from 'next/server'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await requirePermission(supabase, user.id, 'crm', 'manage')
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

  const body = await request.json().catch(() => ({}))
  const pitToken = normalizeGhlToken(String(body.pitToken ?? body.pit ?? body.apiKey ?? ''))
  const locationId = normalizeGhlLocationId(String(body.locationId ?? body.location ?? ''))

  if (!pitToken) {
    return NextResponse.json({ error: 'Private Integration Token is required' }, { status: 400 })
  }
  if (!locationId) {
    return NextResponse.json({ error: 'Location ID (sub-account) is required' }, { status: 400 })
  }

  try {
    const location = await validateGhlConnection(pitToken, locationId)
    const pipelines = await listGhlPipelines(pitToken, locationId)
    const primaryPipeline = pipelines[0] ?? null

    await upsertGhlIntegration(supabase, access.workspaceId, {
      locationId,
      locationName: location.name ?? null,
      pipelineId: primaryPipeline?.id ?? null,
      pitToken,
    })

    let syncResult = null
    try {
      syncResult = await runGhlFullSync(supabase, access.workspaceId)
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : 'Initial sync failed'
      const status = await getGhlIntegrationStatusPublic(supabase, access.workspaceId)
      return NextResponse.json(
        {
          ...status,
          warning: `Connected, but initial sync failed: ${message}`,
        },
        { status: 200 }
      )
    }

    const status = await getGhlIntegrationStatusPublic(supabase, access.workspaceId)
    return NextResponse.json({ ...status, syncResult })
  } catch (error) {
    if (error instanceof GhlApiError) {
      return NextResponse.json({ error: error.message, source: 'gohighlevel' }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : 'Failed to connect GoHighLevel'

    if (
      message.includes('Could not find the function') ||
      message.includes('schema cache') ||
      (message.includes('relation') && message.includes('ghl_integrations'))
    ) {
      return NextResponse.json(
        {
          error:
            'Database migration required: run 016_ghl_integration.sql and 017_ghl_integration_rpc.sql in your Supabase SQL editor, then retry.',
          source: 'supabase',
        },
        { status: 500 }
      )
    }

    if (message === 'Forbidden') {
      return NextResponse.json(
        { error: 'You do not have permission to manage CRM integrations.', source: 'permission' },
        { status: 403 }
      )
    }

    return NextResponse.json({ error: message, source: 'unknown' }, { status: 400 })
  }
}
