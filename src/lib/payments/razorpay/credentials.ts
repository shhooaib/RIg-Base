import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getPaymentIntegrationCredentials,
  getPaymentIntegrationCredentialsAdmin,
} from '@/lib/finance/integration-store'
import { getSupabaseAdminClient, INVALID_SUPABASE_SECRET_KEY_MESSAGE } from '@/lib/supabase/admin'

export async function resolveRazorpayCredentials(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ keyId: string; keySecret: string } | null> {
  const admin = getSupabaseAdminClient()
  if (admin) {
    const stored = await getPaymentIntegrationCredentialsAdmin(admin, workspaceId, 'razorpay')
    if (stored?.publishable_key && stored?.secret_key) {
      return {
        keyId: stored.publishable_key.trim(),
        keySecret: stored.secret_key.trim(),
      }
    }
  }

  const creds = await getPaymentIntegrationCredentials(supabase, workspaceId, 'razorpay')
  if (!creds?.publishable_key || !creds?.secret_key) return null

  return {
    keyId: creds.publishable_key.trim(),
    keySecret: creds.secret_key.trim(),
  }
}

export const SERVICE_ROLE_SYNC_WARNING = INVALID_SUPABASE_SECRET_KEY_MESSAGE
