import Stripe from 'stripe'

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey)
}

export async function validateStripeConnection(secretKey: string): Promise<{ accountMode: 'test' | 'live' }> {
  const stripe = createStripeClient(secretKey)
  await stripe.balance.retrieve()
  return { accountMode: secretKey.startsWith('sk_live_') ? 'live' : 'test' }
}

export function mapStripePaymentStatus(status: Stripe.PaymentIntent.Status): string {
  switch (status) {
    case 'succeeded':
      return 'succeeded'
    case 'processing':
      return 'processing'
    case 'canceled':
      return 'cancelled'
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
    case 'requires_capture':
      return 'pending'
    default:
      return 'failed'
  }
}

export function stripeAmount(amount: number | null | undefined, currency: string): number {
  if (amount == null) return 0
  const zeroDecimal = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'].includes(currency.toUpperCase())
  return zeroDecimal ? amount : amount / 100
}
