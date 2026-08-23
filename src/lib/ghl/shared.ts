export class GhlApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GhlApiError'
    this.status = status
  }
}

export function normalizeGhlToken(raw: string): string {
  let token = raw.trim()
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim()
  }
  if (/^bearer\s+/i.test(token)) {
    token = token.replace(/^bearer\s+/i, '').trim()
  }
  return token
}

export function normalizeGhlLocationId(raw: string): string {
  let value = raw.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }

  const urlMatch = value.match(/\/location\/([A-Za-z0-9_-]+)/i)
  if (urlMatch?.[1]) return urlMatch[1]

  return value
}
