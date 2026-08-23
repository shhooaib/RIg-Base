import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ErpModuleGrid } from '@/components/marketing/erp-module-grid'
import { HeroErpPreview } from '@/components/marketing/hero-erp-preview'
import { MarketingSectionHeader } from '@/components/marketing/marketing-section-header'
import { SiteHeader } from '@/components/marketing/site-header'
import { SiteFooter } from '@/components/marketing/site-footer'
import { PLATFORM_PILLARS, TRUST_LABELS, WORKFLOW_STEPS } from '@/lib/marketing/content'

const HERO_BG_IMAGE = '/images/hero-bg.png'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary marketing-page">
      <SiteHeader />

      <section className="relative min-h-[100vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0a0a]" aria-hidden>
          <Image
            src={HERO_BG_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-90"
          />
        </div>
        <div className="absolute inset-0 hero-bg-image-overlay" aria-hidden />
        <div className="absolute inset-0 hero-bg-glow" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 sm:pt-32 pb-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 xl:gap-16 items-center">
            <div className="max-w-2xl">
              <h1 className="marketing-hero-title text-[clamp(2.375rem,5.4vw,3.625rem)] mb-5">
                Operational control
                <span className="block text-accent mt-1.5">for the whole business.</span>
              </h1>

              <p className="marketing-hero-lead marketing-hero-lead-home mb-9">
                Rig Base brings finance, CRM, HR, inventory, and supply chain into one governed workspace —
                with linked procurement, role-based access, and reporting your team can run every day.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-10">
                <Link href="/auth/signup" className="marketing-btn-primary marketing-btn-primary-shadow">
                  Create your workspace
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
                <Link href="/auth/login" className="marketing-btn-ghost">
                  Sign in
                </Link>
              </div>

              <div className="marketing-trust-strip">
                {TRUST_LABELS.map((label) => (
                  <span key={label} className="marketing-trust-item">
                    <strong>{label}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex justify-end">
              <HeroErpPreview />
            </div>
          </div>

          <div className="lg:hidden mt-10">
            <HeroErpPreview />
          </div>
        </div>
      </section>

      <ErpModuleGrid />

      <section id="platform" className="relative px-6 py-24 scroll-mt-28">
        <div className="max-w-7xl mx-auto">
          <MarketingSectionHeader
            eyebrow="Platform"
            title={
              <>
                Built for operators,
                <span className="text-accent"> not slide decks.</span>
              </>
            }
            description="Every module shares the same workspace boundary, import tooling, and permission model — so finance, people, stock, and procurement stay aligned."
            className="mb-12"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORM_PILLARS.map((pillar) => (
              <article
                key={pillar.title}
                className="marketing-pillar rounded-xl p-6 lg:p-7"
              >
                <h3 className="text-[15px] font-semibold text-text-primary tracking-tight mb-2.5">
                  {pillar.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="approach" className="px-6 pb-24 scroll-mt-28">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-xl border border-border-primary bg-bg-secondary/40 p-8 md:p-12">
            <MarketingSectionHeader
              eyebrow="Approach"
              title="From setup to daily operations"
              description="A structured path — configure once, then run finance, CRM, HR, inventory, and procurement with consistent controls."
              className="mb-10"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {WORKFLOW_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-lg border border-border-primary/80 bg-bg-primary/50 p-6"
                >
                  <p className="text-xs font-mono text-accent mb-3">{item.step}</p>
                  <h3 className="text-base font-medium text-text-primary mb-2">{item.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto marketing-cta-panel rounded-xl border border-border-primary p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="max-w-lg">
            <p className="marketing-eyebrow mb-3">Get started</p>
            <h2 className="marketing-section-title text-xl sm:text-2xl">
              Configure your workspace in one session.
            </h2>
            <p className="text-sm text-text-secondary mt-3 leading-relaxed">
              Guided onboarding for modules, departments, roles, and KPIs. Import your data or load linked demo records to see finance, inventory, and procurement connected.
            </p>
          </div>
          <Link
            href="/auth/signup"
            className="marketing-btn-primary marketing-btn-primary-shadow shrink-0 self-start md:self-center"
          >
            Start setup
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
