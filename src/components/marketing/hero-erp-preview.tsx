'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MARKETING_MODULES } from '@/lib/marketing/content'
import { INSIGHTS_ICON } from '@/lib/icons/lucide-nav'

const CYCLE_MS = 4800
const PANEL_EASE = [0.22, 1, 0.36, 1] as const

const MODULE_RAIL_LABELS: Record<string, string> = {
  dashboard: 'Home',
  finance: 'Finance',
  crm: 'CRM',
  hr: 'HR',
  inventory: 'Stock',
  supply_chain: 'Supply',
}

export function HeroErpPreview() {
  const [activeId, setActiveId] = useState(MARKETING_MODULES[0].id)
  const [progress, setProgress] = useState(0)

  const activeIndex = MARKETING_MODULES.findIndex((m) => m.id === activeId)
  const active = MARKETING_MODULES[activeIndex >= 0 ? activeIndex : 0] ?? MARKETING_MODULES[0]
  const ActiveIcon = active.icon

  useEffect(() => {
    setProgress(0)
    const start = Date.now()
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(100, (elapsed / CYCLE_MS) * 100))
    }, 50)
    const advance = window.setTimeout(() => {
      setActiveId((current) => {
        const index = MARKETING_MODULES.findIndex((m) => m.id === current)
        return MARKETING_MODULES[(index + 1) % MARKETING_MODULES.length].id
      })
    }, CYCLE_MS)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(advance)
    }
  }, [activeId])

  return (
    <div className="hero-workspace-shell w-full max-w-[26rem] xl:max-w-[28rem]">
      <div className="hero-workspace-glow" aria-hidden />
      <div className="hero-workspace-panel relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080808]/92 backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(197,160,89,0.06)_inset]">
        <div className="hero-workspace-grid" aria-hidden />

        {/* Window chrome */}
        <div className="relative flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="hero-workspace-dot bg-[#c97b6b]/90" />
            <span className="hero-workspace-dot bg-[#c5a059]/80" />
            <span className="hero-workspace-dot bg-[#6b8a6b]/80" />
          </div>
          <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-white/35 truncate">
            Rig Base · Workspace
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hero-workspace-live" aria-hidden />
            <span className="text-[10px] text-accent/80 font-medium tracking-wide">Live</span>
          </div>
        </div>

        <div className="relative flex min-h-[17.5rem]">
          {/* Module rail — mirrors app sidebar order */}
          <nav
            className="w-[3.35rem] shrink-0 border-r border-white/[0.06] bg-black/25 py-3 flex flex-col items-center gap-1"
            aria-label="Module preview"
          >
            {MARKETING_MODULES.map((module) => {
              const Icon = module.icon
              const isActive = module.id === activeId
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setActiveId(module.id)}
                  title={module.label}
                  className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-accent/15 text-accent shadow-[0_0_20px_rgba(197,160,89,0.15)]'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="hero-module-active"
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                      transition={{ duration: 0.28, ease: PANEL_EASE }}
                    />
                  )}
                  <Icon size={16} strokeWidth={1.75} />
                </button>
              )
            })}
          </nav>

          {/* Module viewport */}
          <div className="flex-1 min-w-0 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.32, ease: PANEL_EASE }}
                className="flex-1 p-4 sm:p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-accent/75 mb-1">
                      {active.tagline}
                    </p>
                    <h3 className="text-base font-medium text-white/95 tracking-tight">{active.label}</h3>
                    <p className="text-xs text-white/45 mt-1 leading-relaxed">{active.preview.headline}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/25 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(197,160,89,0.12)]">
                    <ActiveIcon size={18} className="text-accent" strokeWidth={1.75} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  {active.preview.metrics.map((metric, i) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + i * 0.06, duration: 0.28, ease: PANEL_EASE }}
                      className="hero-workspace-metric rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5"
                    >
                      <p className="text-[9px] font-medium text-white/38 uppercase tracking-[0.14em]">
                        {metric.label}
                      </p>
                      <p className="text-lg font-medium text-white/95 mt-1 tabular-nums tracking-tight">
                        {metric.value}
                      </p>
                      <p className="text-[10px] text-white/35 mt-0.5">{metric.note}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-2">
                    <INSIGHTS_ICON size={12} className="text-accent/70 shrink-0" strokeWidth={1.75} />
                    <p className="text-[10px] text-white/40 leading-relaxed">{active.preview.footnote}</p>
                  </div>
                  <div className="h-px w-full bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-accent/40 via-accent to-accent/40 rounded-full"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.05, ease: 'linear' }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[9px] text-white/28 tracking-wide">
                      {MODULE_RAIL_LABELS[active.id] ?? active.label}
                    </p>
                    <p className="text-[9px] text-white/28 tabular-nums">
                      {String(activeIndex + 1).padStart(2, '0')} / {String(MARKETING_MODULES.length).padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Capability strip */}
        <div className="relative border-t border-white/[0.06] px-4 py-2.5 bg-black/20">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {active.capabilities.map((cap) => (
              <span
                key={cap}
                className="shrink-0 text-[9px] font-medium tracking-wide text-white/35 px-2 py-0.5 rounded-full border border-white/[0.07] bg-white/[0.02]"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
