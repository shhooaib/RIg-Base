'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MARKETING_MODULES } from '@/lib/marketing/content'
import { MarketingSectionHeader } from '@/components/marketing/marketing-section-header'

export function ErpModuleGrid() {
  const [activeId, setActiveId] = useState(MARKETING_MODULES[0].id)
  const active = MARKETING_MODULES.find((m) => m.id === activeId) ?? MARKETING_MODULES[0]
  const ActiveIcon = active.icon

  return (
    <section id="modules" className="relative px-6 py-24 border-y border-border-primary/70 bg-bg-primary scroll-mt-28">
      <div className="max-w-7xl mx-auto">
        <MarketingSectionHeader
          eyebrow="Modules"
          title={
            <>
              Six integrated modules.
              <span className="text-accent"> One permission model.</span>
            </>
          }
          description="Dashboard plus finance, CRM, HR, inventory, and supply chain — same workspace, imports, and role controls throughout."
          className="mb-12"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-8 items-stretch">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {MARKETING_MODULES.map((module) => {
              const Icon = module.icon
              const isActive = module.id === activeId
              return (
                <button
                  key={module.id}
                  type="button"
                  data-active={isActive ? 'true' : 'false'}
                  onMouseEnter={() => setActiveId(module.id)}
                  onFocus={() => setActiveId(module.id)}
                  className="marketing-module-tile text-left rounded-lg border border-border-primary p-4"
                >
                  <div
                    className={`w-9 h-9 rounded-md flex items-center justify-center mb-3 border transition-colors duration-200 ${
                      isActive
                        ? 'bg-accent border-accent text-[#0a0a0a]'
                        : 'bg-bg-tertiary border-border-primary text-accent'
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-medium text-text-primary leading-snug">{module.label}</p>
                  <p className="text-[11px] text-text-tertiary mt-1">{module.tagline}</p>
                </button>
              )
            })}
          </div>

          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-border-primary bg-bg-secondary/50 p-7 lg:p-8 flex flex-col justify-center"
          >
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                <ActiveIcon size={20} className="text-accent" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-text-primary tracking-tight">{active.label}</h3>
                <p className="text-sm text-text-tertiary mt-0.5">{active.tagline}</p>
              </div>
            </div>
            <p className="text-[15px] text-text-secondary leading-relaxed mb-6">{active.summary}</p>
            <ul className="space-y-2.5 border-t border-border-primary pt-5">
              {active.capabilities.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-text-secondary">
                  <span className="mt-2 w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
