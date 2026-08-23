import Link from 'next/link'
import { BrandMark } from '@/components/brand/brand-mark'
import { LEGAL_LINKS, SOCIAL_LINKS } from '@/lib/site-config'
import { TRUST_LABELS } from '@/lib/marketing/content'

const PRODUCT_LINKS = [
  { href: '#modules', label: 'Modules' },
  { href: '#platform', label: 'Platform' },
  { href: '#approach', label: 'Approach' },
] as const

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border-primary bg-bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-5">
            <BrandMark variant="footer" href="/" showPlatform={false} wordmarkSize="md" />
            <p className="mt-4 text-sm text-text-secondary leading-relaxed max-w-sm">
              Rig Base is an operations workspace for finance, CRM, HR, inventory, and supply chain — with role-based access and linked procurement built in.
            </p>
            <p className="mt-4 text-xs text-text-tertiary">
              {TRUST_LABELS.join(' · ')}
            </p>
          </div>

          <div className="lg:col-span-2 lg:col-start-7">
            <p className="marketing-eyebrow mb-4">Product</p>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/auth/signup" className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200">
                  Create workspace
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="marketing-eyebrow mb-4">Legal</p>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="marketing-eyebrow mb-4">Connect</p>
            <ul className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 rounded-md border border-border-primary text-sm text-text-secondary hover:text-text-primary hover:border-border-secondary transition-colors duration-200"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-text-muted">© {year} Rig Base. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-text-secondary transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
