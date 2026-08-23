'use client'

import Link from 'next/link'
import { BrandMark } from '@/components/brand/brand-mark'
import { Logo } from '@/components/brand/logo'
import { BRAND_NAME } from '@/lib/brand'

const GRADIENT_WASH =
  'linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, transparent 55%, rgba(197, 160, 89, 0.03) 100%)'

export function SidebarBrandTitle() {
  return (
    <div className="relative shrink-0 border-b border-border-primary overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: GRADIENT_WASH }} />
      <Link
        href="/dashboard"
        className="relative flex flex-col items-center px-3 py-2.5 group"
        aria-label={BRAND_NAME}
      >
        <Logo variant="mark" size="sm" compact />
        <div className="mt-2 h-px w-2/3 bg-gradient-to-r from-transparent via-accent/35 to-transparent" aria-hidden />
      </Link>
    </div>
  )
}

export function SidebarBrandCollapsed() {
  return <BrandMark variant="collapsed" href="/dashboard" />
}
