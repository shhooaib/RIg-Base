import type { SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseServiceRoleError } from '@/lib/supabase/admin'
import type { FinanceIntegrationStatus } from '@/lib/finance/types'

export interface PaymentIntegrationCredentials {
  id: string
  workspace_id: string
  provider: 'stripe' | 'razorpay'
  account_mode: 'test' | 'live'
  publishable_key: string | null
  secret_key: string
  webhook_secret: string | null
  connected_at: string
  last_sync_at: string | null
  last_sync_status: string
  last_sync_error: string | null
  last_webhook_at: string | null
  webhook_status: string
  webhook_last_error: string | null
}

function emptyProvider(): FinanceIntegrationStatus['stripe'] {
  return { connected: false }
}

function mapProvider(row: Record<string, unknown>): FinanceIntegrationStatus['stripe'] {
  if (!row.connected) return emptyProvider()
  return {
    connected: true,
    accountMode: (row.accountMode as string) ?? null,
    publishableKey: (row.publishableKey as string) ?? null,
    connectedAt: (row.connectedAt as string) ?? null,
    lastSyncAt: (row.lastSyncAt as string) ?? null,
    lastSyncStatus: (row.lastSyncStatus as string) ?? 'idle',
    lastSyncError: (row.lastSyncError as string) ?? null,
    lastWebhookAt: (row.lastWebhookAt as string) ?? null,
    webhookStatus: (row.webhookStatus as string) ?? 'unknown',
    webhookLastError: (row.webhookLastError as string) ?? null,
  }
}

export async function getFinanceIntegrationStatus(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<FinanceIntegrationStatus> {
  const { data, error } = await supabase.rpc('get_payment_integration_status', {
    p_workspace_id: workspaceId,
  })
  if (error) throw new Error(error.message)

  const payload = (data ?? {}) as Record<string, unknown>
  return {
    stripe: mapProvider((payload.stripe ?? { connected: false }) as Record<string, unknown>),
    razorpay: mapProvider((payload.razorpay ?? { connected: false }) as Record<string, unknown>),
  }
}

export async function getPaymentIntegrationCredentials(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: 'stripe' | 'razorpay'
): Promise<PaymentIntegrationCredentials | null> {
  const { data, error } = await supabase.rpc('get_payment_integration_credentials', {
    p_workspace_id: workspaceId,
    p_provider: provider,
  })
  if (error) throw new Error(error.message)
  if (!data || typeof data !== 'object') return null
  return data as PaymentIntegrationCredentials
}

export async function upsertPaymentIntegration(
  supabase: SupabaseClient,
  workspaceId: string,
  input: {
    provider: 'stripe' | 'razorpay'
    accountMode: 'test' | 'live'
    publishableKey: string | null
    secretKey: string
    webhookSecret: string | null
  }
): Promise<void> {
  const { error } = await supabase.rpc('upsert_payment_integration', {
    p_workspace_id: workspaceId,
    p_provider: input.provider,
    p_account_mode: input.accountMode,
    p_publishable_key: input.publishableKey,
    p_secret_key: input.secretKey,
    p_webhook_secret: input.webhookSecret ?? '',
  })
  if (error) throw new Error(error.message)
}

export async function deletePaymentIntegration(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: 'stripe' | 'razorpay'
): Promise<void> {
  const { error } = await supabase.rpc('delete_payment_integration', {
    p_workspace_id: workspaceId,
    p_provider: provider,
  })
  if (error) throw new Error(error.message)
}

export async function updatePaymentSyncState(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: 'stripe' | 'razorpay',
  patch: { last_sync_status?: string; last_sync_at?: string | null; last_sync_error?: string | null }
): Promise<void> {
  const { error } = await supabase.rpc('update_payment_integration_sync_state', {
    p_workspace_id: workspaceId,
    p_provider: provider,
    p_last_sync_status: patch.last_sync_status ?? null,
    p_last_sync_at: patch.last_sync_at ?? null,
    p_last_sync_error: patch.last_sync_error ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function updatePaymentWebhookState(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: 'stripe' | 'razorpay',
  patch: { webhook_status?: string; webhook_last_error?: string | null; last_webhook_at?: string | null }
): Promise<void> {
  const { error } = await supabase.rpc('update_payment_integration_webhook_state', {
    p_workspace_id: workspaceId,
    p_provider: provider,
    p_webhook_status: patch.webhook_status ?? null,
    p_webhook_last_error: patch.webhook_last_error ?? null,
    p_last_webhook_at: patch.last_webhook_at ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function recordFinanceWebhookEvent(
  supabase: SupabaseClient,
  workspaceId: string,
  provider: 'stripe' | 'razorpay',
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await supabase.rpc('record_finance_webhook_event', {
    p_workspace_id: workspaceId,
    p_provider: provider,
    p_event_id: eventId,
    p_event_type: eventType,
    p_payload: payload,
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}

/** Read stored credentials via service role (exact DB values, for sync/webhooks). */
export async function getPaymentIntegrationCredentialsAdmin(
  admin: SupabaseClient,
  workspaceId: string,
  provider: 'stripe' | 'razorpay'
): Promise<PaymentIntegrationCredentials | null> {
  const { data, error } = await admin
    .from('payment_integrations')
    .select(
      'id, workspace_id, provider, account_mode, publishable_key, secret_key, webhook_secret, connected_at, last_sync_at, last_sync_status, last_sync_error, last_webhook_at, webhook_status, webhook_last_error'
    )
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .maybeSingle()

  if (error) {
    if (isSupabaseServiceRoleError(error.message)) return null
    throw new Error(error.message)
  }
  if (!data) return null
  return data as PaymentIntegrationCredentials
}
