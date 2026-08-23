export class RazorpayConnectError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = 'RazorpayConnectError'
  }
}

export interface RazorpayApiErrorShape {
  statusCode?: number
  error?: {
    code?: string
    description?: string
    reason?: string
    field?: string
    source?: string
    step?: string
  }
}

export function parseRazorpayError(err: unknown): string {
  if (!err) return 'Unknown Razorpay error'
  if (err instanceof RazorpayConnectError) return err.message
  if (err instanceof Error && err.message) return err.message

  const rp = err as RazorpayApiErrorShape
  if (rp.error?.description) return rp.error.description
  if (rp.error?.reason) return rp.error.reason
  if (rp.error?.code) return rp.error.code.replace(/_/g, ' ')

  if (typeof err === 'string') return err

  try {
    const raw = JSON.stringify(err)
    if (raw && raw !== '{}') return raw
  } catch {
    // ignore
  }

  return 'Razorpay request failed'
}

export function isRazorpayAuthError(err: unknown): boolean {
  const rp = err as RazorpayApiErrorShape
  if (rp.statusCode === 401 || rp.statusCode === 403) return true

  const parsed = parseRazorpayError(err).toLowerCase()
  if (
    parsed.includes('authentication') ||
    parsed.includes('api key') ||
    parsed.includes('invalid key') ||
    parsed.includes('key id') ||
    parsed.includes('key secret') ||
    parsed.includes('unauthorized') ||
    parsed.includes('access denied') ||
    parsed.includes('forbidden') ||
    (parsed.includes('invalid') && parsed.includes('key'))
  ) {
    return true
  }

  const text = [rp.error?.description, rp.error?.reason, rp.error?.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (
    text.includes('authentication') ||
    text.includes('api key') ||
    text.includes('invalid') ||
    text.includes('key id') ||
    text.includes('key secret') ||
    text.includes('unauthorized') ||
    text.includes('access denied')
  )
}

export function isCredentialErrorMessage(message: string | null | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('authentication') ||
    m.includes('api key') ||
    m.includes('invalid key') ||
    m.includes('key secret') ||
    m.includes('key id') ||
    m.includes('unauthorized') ||
    (m.includes('invalid') && m.includes('key'))
  )
}

function cleanCredential(value: string): string {
  return value.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
}

export function normalizeRazorpayCredentials(keyId: string, keySecret: string): NormalizedRazorpayCredentials {
  const id = cleanCredential(keyId)
  const secret = cleanCredential(keySecret)

  if (!id || !secret) {
    throw new RazorpayConnectError(
      'Key ID and Key Secret are both required. Find them in Razorpay Dashboard → Account & Settings → API Keys (enable Test Mode for test keys).'
    )
  }

  if (secret.startsWith('rzp_test_') || secret.startsWith('rzp_live_')) {
    throw new RazorpayConnectError(
      'Key ID and Key Secret appear swapped. Key ID starts with rzp_test_ or rzp_live_. Key Secret is a separate secret string shown once when you generate API keys.'
    )
  }

  if (id.startsWith('rzp_live_') && secret.length < 8) {
    throw new RazorpayConnectError('Key Secret looks too short. Copy the full secret from the Razorpay dashboard.')
  }

  if (!id.startsWith('rzp_test_') && !id.startsWith('rzp_live_')) {
    throw new RazorpayConnectError(
      'Key ID must start with rzp_test_ (test mode) or rzp_live_ (live mode). Make sure Test Mode is enabled in the dashboard when using test keys.'
    )
  }

  return {
    keyId: id,
    keySecret: secret,
    accountMode: id.startsWith('rzp_live_') ? 'live' : 'test',
  }
}

export function maskRazorpayKeyId(keyId: string): string {
  if (keyId.length <= 12) return keyId
  return `${keyId.slice(0, 12)}…${keyId.slice(-4)}`
}

export interface NormalizedRazorpayCredentials {
  keyId: string
  keySecret: string
  accountMode: 'test' | 'live'
}
