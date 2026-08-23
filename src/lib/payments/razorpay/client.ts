import Razorpay from 'razorpay'
import {
  RazorpayConnectError,
  isRazorpayAuthError,
  maskRazorpayKeyId,
  normalizeRazorpayCredentials,
  parseRazorpayError,
  type NormalizedRazorpayCredentials,
} from '@/lib/payments/razorpay/errors'

export function createRazorpayClient(keyId: string, keySecret: string): Razorpay {
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

export interface RazorpayVerifyResult {
  verified: true
  accountMode: 'test' | 'live'
  keyIdPreview: string
  paymentsOnAccount: number
  message: string
}

export async function verifyRazorpayConnection(
  keyId: string,
  keySecret: string
): Promise<RazorpayVerifyResult> {
  const creds = normalizeRazorpayCredentials(keyId, keySecret)
  return verifyRazorpayCredentials(creds)
}

export async function verifyRazorpayCredentials(
  creds: NormalizedRazorpayCredentials
): Promise<RazorpayVerifyResult> {
  const client = createRazorpayClient(creds.keyId, creds.keySecret)

  try {
    const response = (await client.payments.all({ count: 1, skip: 0 })) as {
      count?: number
      items?: unknown[]
    }

    const paymentsOnAccount = response.count ?? response.items?.length ?? 0

    return {
      verified: true,
      accountMode: creds.accountMode,
      keyIdPreview: maskRazorpayKeyId(creds.keyId),
      paymentsOnAccount,
      message:
        creds.accountMode === 'test'
          ? 'Test API keys verified with Razorpay. You can create test payments in the Razorpay dashboard and sync them here.'
          : 'Live API keys verified with Razorpay.',
    }
  } catch (err) {
    if (isRazorpayAuthError(err)) {
      throw new RazorpayConnectError(
        `Invalid Razorpay API credentials: ${parseRazorpayError(err)}. Double-check Key ID and Key Secret from Dashboard → Account & Settings → API Keys (Test Mode toggle for test keys).`,
        err
      )
    }
    throw new RazorpayConnectError(parseRazorpayError(err), err)
  }
}

/** @deprecated Use verifyRazorpayConnection */
export async function validateRazorpayConnection(
  keyId: string,
  keySecret: string
): Promise<{ accountMode: 'test' | 'live' }> {
  const result = await verifyRazorpayConnection(keyId, keySecret)
  return { accountMode: result.accountMode }
}

export function mapRazorpayPaymentStatus(status: string): string {
  switch (status) {
    case 'captured':
    case 'authorized':
      return 'succeeded'
    case 'created':
      return 'pending'
    case 'failed':
      return 'failed'
    case 'refunded':
      return 'refunded'
    default:
      return 'processing'
  }
}

export function razorpayAmount(paise: number | null | undefined): number {
  if (paise == null) return 0
  return paise / 100
}

export { normalizeRazorpayCredentials, parseRazorpayError, isRazorpayAuthError, RazorpayConnectError }
