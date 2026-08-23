import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSupabaseAdminClient,
  isSupabaseAdminClientHealthy,
  isSupabaseServiceRoleError,
  INVALID_SUPABASE_SECRET_KEY_MESSAGE,
} from '@/lib/supabase/admin'

export type RazorpaySyncClient =
  | { client: SupabaseClient; source: 'admin' }
  | { client: SupabaseClient; source: 'session'; warning: string }

export async function resolveRazorpaySyncClient(
  sessionClient: SupabaseClient
): Promise<RazorpaySyncClient | null> {
  const admin = getSupabaseAdminClient()
  if (admin && (await isSupabaseAdminClientHealthy(admin))) {
    return { client: admin, source: 'admin' }
  }

  if (admin) {
    return {
      client: sessionClient,
      source: 'session',
      warning: INVALID_SUPABASE_SECRET_KEY_MESSAGE,
    }
  }

  return {
    client: sessionClient,
    source: 'session',
    warning:
      'Payment sync is using your logged-in session. Add SUPABASE_SERVICE_ROLE_KEY (sb_secret_… from Supabase → Settings → API Keys) for background webhooks and server sync.',
  }
}

export function isSupabaseSyncInfrastructureError(message: string): boolean {
  return isSupabaseServiceRoleError(message)
}

export { INVALID_SUPABASE_SECRET_KEY_MESSAGE }
