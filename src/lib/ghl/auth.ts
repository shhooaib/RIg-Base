import { GhlApiError, normalizeGhlLocationId, normalizeGhlToken } from '@/lib/ghl/shared'

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'

/** Official @gohighlevel/api-sdk default — required for current PIT tokens */
const API_VERSIONS = ['2023-02-21', '2021-07-28', '2021-04-15'] as const

type AuthMode = 'bearer' | 'raw'
type ApiVersion = (typeof API_VERSIONS)[number]

interface JwtPayload {
  authClass?: string
  auth_class?: string
  companyId?: string
  company_id?: string
  locationId?: string
  location_id?: string
  userType?: string
}

export interface GhlAuthProbeResult {
  ok: boolean
  lastError: string | null
  lastStatus: number | null
}

function decodeJwtPayload(token: string): JwtPayload | null {
  if (!token.startsWith('eyJ')) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as JwtPayload
  } catch {
    return null
  }
}

function authHeaderValue(token: string, mode: AuthMode): string {
  return mode === 'bearer' ? `Bearer ${token}` : token
}

function extractGhlErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body) {
    const record = body as Record<string, unknown>
    const parts = [record.message, record.error, record.msg, record.errorMessage]
      .filter((part) => typeof part === 'string' && part.trim())
      .map((part) => String(part).trim())
    if (parts.length > 0) return parts.join(' — ')
  }
  if (typeof body === 'string' && body.trim()) return body.trim()
  return `GHL API error (${status})`
}

function locationHeaderSets(locationId: string): Array<Record<string, string>> {
  return [
    { locationId },
    { 'x-location-id': locationId },
    { 'location-id': locationId },
    {},
  ]
}

async function ghlRequestRaw(
  token: string,
  path: string,
  init: RequestInit & { query?: Record<string, string | number | boolean | undefined> },
  version: ApiVersion,
  authMode: AuthMode,
  extraHeaders: Record<string, string>
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = new URL(`${GHL_BASE_URL}${path}`)
  if (init.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
  }

  const method = init.method?.toUpperCase() ?? 'GET'
  const headers: Record<string, string> = {
    Authorization: authHeaderValue(token, authMode),
    Version: version,
    Accept: 'application/json',
    ...extraHeaders,
  }

  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] =
      init.headers && 'Content-Type' in (init.headers as object)
        ? String((init.headers as Record<string, string>)['Content-Type'])
        : 'application/json'
  }

  const res = await fetch(url.toString(), {
    ...init,
    method,
    cache: 'no-store',
    headers: {
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  return { ok: res.ok, status: res.status, body }
}

async function tryGhlRequest<T>(
  token: string,
  locationId: string,
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  let lastError = 'GoHighLevel request failed'
  let lastStatus = 401

  for (const version of API_VERSIONS) {
    for (const authMode of ['bearer', 'raw'] as const) {
      for (const locHeaders of locationHeaderSets(locationId)) {
        const result = await ghlRequestRaw(token, path, init ?? {}, version, authMode, locHeaders)
        if (result.ok) return { ok: true, data: result.body as T }

        lastError = extractGhlErrorMessage(result.body, result.status)
        lastStatus = result.status

        if (result.status !== 400 && result.status !== 401 && result.status !== 403) {
          return { ok: false, error: lastError, status: lastStatus }
        }
      }
    }
  }

  return { ok: false, error: lastError, status: lastStatus }
}

export async function ghlRequestWithResolvedAuth<T>(
  token: string,
  locationId: string,
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }
): Promise<T> {
  const result = await tryGhlRequest<T>(token, locationId, path, init)
  if (result.ok) return result.data
  throw new GhlApiError(result.error, result.status)
}

async function probeGhlAccess(token: string, locationId: string): Promise<GhlAuthProbeResult> {
  const probes = [
    {
      path: '/contacts/',
      init: { query: { locationId, limit: 1 } },
    },
    {
      path: '/opportunities/pipelines',
      init: { query: { locationId } },
    },
    {
      path: `/locations/${locationId}`,
      init: {},
    },
    {
      path: '/contacts/search',
      init: {
        method: 'POST',
        body: JSON.stringify({ locationId, pageLimit: 1, page: 1 }),
      },
    },
  ] as const

  let lastError: string | null = null
  let lastStatus: number | null = null

  for (const probe of probes) {
    const result = await tryGhlRequest(token, locationId, probe.path, probe.init)
    if (result.ok) return { ok: true, lastError: null, lastStatus: null }
    lastError = result.error
    lastStatus = result.status
  }

  return { ok: false, lastError, lastStatus }
}

async function exchangeAgencyTokenForLocationToken(
  agencyToken: string,
  locationId: string
): Promise<string | null> {
  const jwt = decodeJwtPayload(agencyToken)
  const companyId = jwt?.companyId ?? jwt?.company_id

  const attempts: Array<{
    path: string
    version: string
    contentType: string
    body: string
  }> = []

  if (companyId) {
    attempts.push({
      path: '/oauth/locationToken',
      version: '2023-02-21',
      contentType: 'application/json',
      body: JSON.stringify({ companyId, locationId }),
    })
    attempts.push({
      path: '/oauth/locationToken',
      version: '2021-07-28',
      contentType: 'application/json',
      body: JSON.stringify({ companyId, locationId }),
    })
    attempts.push({
      path: '/oauth/location-token',
      version: '2023-02-21',
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams({ companyId, locationId }).toString(),
    })
  }

  attempts.push({
    path: '/oauth/locationToken',
    version: '2023-02-21',
    contentType: 'application/json',
    body: JSON.stringify({ locationId }),
  })

  for (const attempt of attempts) {
    for (const authMode of ['bearer', 'raw'] as const) {
      const res = await fetch(`${GHL_BASE_URL}${attempt.path}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: authHeaderValue(agencyToken, authMode),
          Version: attempt.version,
          Accept: 'application/json',
          'Content-Type': attempt.contentType,
          locationId,
        },
        body: attempt.body,
      })

      const text = await res.text()
      if (!res.ok) continue

      try {
        const data = JSON.parse(text) as { access_token?: string; accessToken?: string }
        const accessToken = data.access_token ?? data.accessToken
        if (accessToken) return accessToken
      } catch {
        continue
      }
    }
  }

  return null
}

const resolvedTokenCache = new Map<string, { token: string; expiresAt: number }>()

function cacheResolvedToken(pitToken: string, locationId: string, resolved: string, ttlMs = 30 * 60_000) {
  resolvedTokenCache.set(`${pitToken.slice(-24)}:${locationId}`, {
    token: resolved,
    expiresAt: Date.now() + ttlMs,
  })
}

function readCachedToken(pitToken: string, locationId: string): string | null {
  const cached = resolvedTokenCache.get(`${pitToken.slice(-24)}:${locationId}`)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    resolvedTokenCache.delete(`${pitToken.slice(-24)}:${locationId}`)
    return null
  }
  return cached.token
}

export async function resolveGhlApiToken(pitToken: string, locationId: string): Promise<string> {
  const token = normalizeGhlToken(pitToken)
  const locId = normalizeGhlLocationId(locationId)

  if (!token) throw new GhlApiError('Private Integration Token is required', 400)
  if (!locId) throw new GhlApiError('Location ID is required', 400)

  const cached = readCachedToken(token, locId)
  if (cached) return cached

  const directProbe = await probeGhlAccess(token, locId)
  if (directProbe.ok) {
    cacheResolvedToken(token, locId, token, 60 * 60_000)
    return token
  }

  const jwt = decodeJwtPayload(token)
  const tokenLocationId = jwt?.locationId ?? jwt?.location_id

  if (tokenLocationId && tokenLocationId !== locId) {
    throw new GhlApiError(
      `This token belongs to location ${tokenLocationId}, but you entered ${locId}. Use the Location ID from the same sub-account where the PIT was created.`,
      403
    )
  }

  const locationToken = await exchangeAgencyTokenForLocationToken(token, locId)
  if (locationToken) {
    const exchangedProbe = await probeGhlAccess(locationToken, locId)
    if (exchangedProbe.ok) {
      cacheResolvedToken(token, locId, locationToken, 23 * 60 * 60_000)
      return locationToken
    }
  }

  const hint = directProbe.lastError ?? 'Unknown GoHighLevel auth error'
  throw new GhlApiError(
    `GoHighLevel rejected the connection: ${hint}. Use a sub-account PIT (pit-...) from Settings → Integrations → Private Integrations with contacts + opportunities scopes.`,
    directProbe.lastStatus ?? 401
  )
}

export function isAgencyScopedToken(token: string): boolean {
  const jwt = decodeJwtPayload(normalizeGhlToken(token))
  if (!jwt) return false
  const authClass = (jwt.authClass ?? jwt.auth_class ?? jwt.userType ?? '').toLowerCase()
  return authClass.includes('company') || authClass.includes('agency')
}

export async function probeGhlCredentials(
  pitToken: string,
  locationId: string
): Promise<GhlAuthProbeResult> {
  const token = normalizeGhlToken(pitToken)
  const locId = normalizeGhlLocationId(locationId)
  if (!token || !locId) {
    return { ok: false, lastError: 'Token and Location ID are required', lastStatus: 400 }
  }
  return probeGhlAccess(token, locId)
}
