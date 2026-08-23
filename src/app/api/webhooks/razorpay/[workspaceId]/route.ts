import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { handleRazorpayWebhook } from '@/lib/payments/razorpay/webhook'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const signature = request.headers.get('x-razorpay-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 })
  }

  const { data: integration } = await admin
    .from('payment_integrations')
    .select('webhook_secret')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'razorpay')
    .maybeSingle()

  if (!integration?.webhook_secret) {
    return NextResponse.json({ error: 'Razorpay webhook not configured for this workspace' }, { status: 400 })
  }

  const rawBody = await request.text()

  try {
    const result = await handleRazorpayWebhook(
      admin,
      workspaceId,
      rawBody,
      signature,
      integration.webhook_secret
    )
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
