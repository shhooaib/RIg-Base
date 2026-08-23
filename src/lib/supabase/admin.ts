import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/** New-format Supabase keys (sb_publishable_ / sb_secret_) are not JWTs. */
export function isOpaqueSupabaseKey(key: string): boolean {
  return key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')
}

/** True when the service role key is missing or rejected by Supabase (not a Razorpay error). */
export function isSupabaseServiceRoleError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('invalid api key') ||
    m.includes('invalid jwt') ||
    m.includes('invalid token') ||
    m.includes('jwt expired') ||
    m.includes('bad_jwt') ||
    m.includes('no suitable key') ||
    m.includes('wrong key type') ||
    m.includes('apikey not valid')
  )
}

function resolveServiceRoleKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    null
  )
}

/**
 * supabase-js sends the project key as `Authorization: Bearer <key>`.
 * Opaque sb_secret_ keys are not JWTs and PostgREST rejects that header — apikey only.
 */
function createOpaqueKeyFetch(supabaseKey: string): typeof fetch {
  const baseFetch = globalThis.fetch.bind(globalThis)

  if (!isOpaqueSupabaseKey(supabaseKey)) {
    return baseFetch
  }

  return async (input, init) => {
    const headers = new Headers(init?.headers)
    headers.delete('Authorization')
    if (!headers.has('apikey')) {
      headers.set('apikey', supabaseKey)
    }
    return baseFetch(input, { ...init, headers })
  }
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = resolveServiceRoleKey()

  if (!url || !serviceRoleKey) return null

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: createOpaqueKeyFetch(serviceRoleKey),
      },
    })
  }

  return adminClient
}

/** Returns false when the configured service role / secret key is rejected by Supabase. */
export async function isSupabaseAdminClientHealthy(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.from('payment_integrations').select('id').limit(1)
  if (!error) return true
  return !isSupabaseServiceRoleError(error.message)
}

export const INVALID_SUPABASE_SECRET_KEY_MESSAGE =
  'Supabase rejected your server secret key. In Dashboard → Settings → API Keys, copy the default Secret key (sb_secret_…) again or use the legacy service_role JWT from the Legacy API Keys tab, then restart npm run dev.'
