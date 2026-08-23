import Image from 'next/image'
import type { SVGProps } from 'react'

type IntegrationBrand = 'stripe' | 'razorpay' | 'ghl' | 'zoho'

function StripeMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        fill="#635BFF"
        d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"
      />
    </svg>
  )
}

/** Official Razorpay glyph (Simple Icons / brand asset paths) */
function RazorpayMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        fill="#3395FF"
        d="M22.436 0 10.526 7.773 9.352 12.049 15.977 7.752 11.65 24h4.391l6.395-24z"
      />
      <path
        fill="#072654"
        d="M14.26 10.098 3.389 17.166 1.564 24h9.008l3.688-13.902z"
      />
    </svg>
  )
}

const LABELS: Record<IntegrationBrand, string> = {
  stripe: 'Stripe',
  razorpay: 'Razorpay',
  ghl: 'GoHighLevel',
  zoho: 'Zoho CRM',
}

export function IntegrationLogo({
  brand,
  size = 48,
  className = '',
}: {
  brand: IntegrationBrand
  size?: number
  className?: string
}) {
  const iconSize = Math.round(size * 0.58)

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-border-primary bg-white overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {brand === 'ghl' ? (
        <Image
          src="/integrations/ghl.png"
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          aria-hidden
        />
      ) : brand === 'zoho' ? (
        <Image
          src="/integrations/zoho.svg"
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-contain p-1.5"
          aria-hidden
        />
      ) : brand === 'stripe' ? (
        <StripeMark width={iconSize} height={iconSize} />
      ) : (
        <RazorpayMark width={iconSize} height={iconSize} />
      )}
      <span className="sr-only">{LABELS[brand]}</span>
    </div>
  )
}

export type { IntegrationBrand }
