import type { ReactNode } from 'react'

type MarketingSectionHeaderProps = {
  eyebrow: string
  title: ReactNode
  description?: string
  className?: string
}

export function MarketingSectionHeader({ eyebrow, title, description, className = '' }: MarketingSectionHeaderProps) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <p className="marketing-eyebrow">{eyebrow}</p>
      <h2 className="marketing-section-title mt-3">{title}</h2>
      {description && (
        <p className="text-[15px] text-text-secondary mt-4 leading-relaxed max-w-xl">{description}</p>
      )}
    </div>
  )
}
