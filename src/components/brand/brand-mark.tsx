'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@/lib/brand'

const GRADIENT_WASH =
  'linear-gradient(135deg, rgba(197, 160, 89, 0.08) 0%, transparent 55%, rgba(197, 160, 89, 0.03) 100%)'

type BrandMarkVariant = 'sidebar' | 'collapsed' | 'default' | 'hero' | 'footer' | 'rb'

type BrandMarkProps = {
  variant?: BrandMarkVariant
  href?: string
  className?: string
  showPlatform?: boolean
  tone?: 'light' | 'dark'
  wordmarkSize?: 'sm' | 'md' | 'lg' | 'xl'
  appearance?: 'default' | 'silver'
}

function PlatformLabel({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass =
    size === 'lg'
      ? 'text-[10px] tracking-[0.26em]'
      : size === 'md'
        ? 'text-[9px] tracking-[0.24em]'
        : 'text-[9px] tracking-[0.24em]'

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/50" />
      <span className={`font-semibold uppercase text-accent shrink-0 ${sizeClass}`}>Command</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/50" />
    </div>
  )
}

function RbWordmark({
  size = 'md',
  className = '',
  tone = 'dark',
  appearance = 'default',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  tone?: 'light' | 'dark'
  appearance?: 'default' | 'silver'
}) {
  const sizeClass =
    size === 'xl'
      ? 'text-[2rem] sm:text-[2.35rem]'
      : size === 'lg'
        ? 'text-2xl'
        : size === 'sm'
          ? 'text-base'
          : 'text-xl'

  if (appearance === 'silver') {
    return (
      <p
        className={`brand-rb-elegant font-serif font-medium leading-none tracking-[0.06em] ${sizeClass} ${className}`}
        aria-hidden
      >
        <span className="brand-rb-metallic brand-rb-metallic-silver">
          <span className="brand-rb-metallic-base">R</span>
          <span className="brand-rb-metallic-shine" aria-hidden>
            R
          </span>
        </span>
        <span className="brand-rb-metallic brand-rb-metallic-gold">
          <span className="brand-rb-metallic-base">B</span>
          <span className="brand-rb-metallic-shine" aria-hidden>
            B
          </span>
        </span>
      </p>
    )
  }

  const rigColor = tone === 'light' ? 'text-white' : 'text-text-primary'

  return (
    <p
      className={`font-serif font-medium leading-none tracking-wide ${rigColor} ${sizeClass} ${className}`}
    >
      R
      <span className="text-accent group-hover:text-accent-hover transition-colors duration-300">B</span>
    </p>
  )
}

function RigBaseWordmark({
  size = 'md',
  className = '',
  tone = 'dark',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  tone?: 'light' | 'dark'
}) {
  const sizeClass =
    size === 'xl'
      ? 'text-[2rem] sm:text-[2.35rem]'
      : size === 'lg'
        ? 'text-2xl'
        : size === 'sm'
          ? 'text-base'
          : 'text-[1.375rem]'

  const rigColor = tone === 'light' ? 'text-white' : 'text-text-primary'

  return (
    <p
      className={`font-serif font-medium leading-none tracking-tight text-center ${rigColor} ${sizeClass} ${className}`}
    >
      Rig{' '}
      <span className="text-accent group-hover:text-accent-hover transition-colors duration-300">Base</span>
    </p>
  )
}

function MetallicWord({ children, metal }: { children: string; metal: 'silver' | 'gold' }) {
  const metalClass = metal === 'silver' ? 'brand-rb-metallic-silver' : 'brand-rb-metallic-gold'

  return (
    <span className={`brand-rb-metallic ${metalClass} whitespace-nowrap`}>
      <span className="brand-rb-metallic-base">{children}</span>
      <span className="brand-rb-metallic-shine" aria-hidden>
        {children}
      </span>
    </span>
  )
}

/** Header wordmark — Rig in silver, Base in gold with subtle metallic shine */
export function MetallicRigBaseWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-rigbase-header ${className}`} aria-hidden>
      <MetallicWord metal="silver">Rig</MetallicWord>
      <MetallicWord metal="gold">Base</MetallicWord>
    </span>
  )
}

function BrandWrapper({
  href,
  className,
  children,
}: {
  href?: string
  className?: string
  children: ReactNode
}) {
  if (href) {
    return (
      <Link href={href} className={className} aria-label={BRAND_NAME}>
        {children}
      </Link>
    )
  }
  return <div className={className}>{children}</div>
}

export function BrandMark({
  variant = 'default',
  href,
  className = '',
  showPlatform = true,
  tone = 'dark',
  wordmarkSize = 'sm',
  appearance = 'default',
}: BrandMarkProps) {

  if (variant === 'rb') {
    return (
      <BrandWrapper href={href} className={`inline-block group min-w-0 ${className}`}>
        <RbWordmark tone={tone} size={wordmarkSize} appearance={appearance} />
      </BrandWrapper>
    )
  }

  if (variant === 'collapsed') {
    return (
      <div className={`relative shrink-0 border-b border-border-primary overflow-hidden ${className}`}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: GRADIENT_WASH }} />
        <BrandWrapper
          href={href}
          className="relative flex flex-col items-center justify-center py-4 px-1 group"
        >
          <RbWordmark tone={tone} />
          <div className="mt-2.5 h-px w-8 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </BrandWrapper>
      </div>
    )
  }

  if (variant === 'sidebar') {
    return (
      <div className={`relative shrink-0 border-b border-border-primary overflow-hidden ${className}`}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden style={{ background: GRADIENT_WASH }} />
        <BrandWrapper href={href} className="relative block px-4 py-5 group text-center">
          {showPlatform ? (
            <PlatformLabel />
          ) : (
            <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" aria-hidden />
          )}
          <div className="mt-2">
            <RigBaseWordmark tone={tone} />
          </div>
          <div className="mt-3 mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        </BrandWrapper>
      </div>
    )
  }

  if (variant === 'hero') {
    return (
      <BrandWrapper href={href} className={`inline-block group text-left ${className}`}>
        <div className="w-full max-w-[15.5rem]">
          {showPlatform && <PlatformLabel size="lg" />}
          <div className={showPlatform ? 'mt-2.5' : ''}>
            <RigBaseWordmark
              size="xl"
              tone="light"
              className={showPlatform ? 'text-center' : 'text-left'}
            />
          </div>
          <div
            className={`mt-3.5 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent ${
              showPlatform ? 'w-full' : 'w-24'
            }`}
          />
        </div>
      </BrandWrapper>
    )
  }

  if (variant === 'footer') {
    return (
      <BrandWrapper href={href} className={`inline-block group text-left ${className}`}>
        {showPlatform && (
          <div className="mb-1.5">
            <PlatformLabel />
          </div>
        )}
        <RigBaseWordmark size={wordmarkSize} className="text-left" tone={tone} />
      </BrandWrapper>
    )
  }

  // default — header & inline
  return (
    <BrandWrapper href={href} className={`inline-block group min-w-0 ${className}`}>
      {showPlatform && <PlatformLabel size="md" />}
      <div className={showPlatform ? 'mt-1.5' : ''}>
        <RigBaseWordmark size={wordmarkSize} className="text-left" tone={tone} />
      </div>
    </BrandWrapper>
  )
}
